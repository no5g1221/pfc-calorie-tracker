import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppState, IntakeLogItem, PresetItem, MealType } from './types';
import {
  loadAppState,
  saveAppState,
  getLogsForDate,
  saveLogsForDate,
  getDatesWithLogs,
} from './utils/storage';
import {
  createLogFromPreset,
  recalculateLogItem,
  calcCalories,
  getDefaultMealType,
  getTodayDateString,
} from './utils/calculations';
import { Header } from './components/Header';
import { DailySummary } from './components/DailySummary';
import { MealSelector, meals } from './components/MealSelector';
import { PresetGrid } from './components/PresetGrid';
import { IntakeLogsList } from './components/IntakeLogsList';
import { LogEditModal } from './components/LogEditModal';
import { PresetManageModal } from './components/PresetManageModal';
import { TargetSettingsModal } from './components/TargetSettingsModal';
import { QuickAddModal } from './components/QuickAddModal';
import { DataBackupModal } from './components/DataBackupModal';
import { CalendarModal } from './components/CalendarModal';
import { Toast, type ToastMessage } from './components/Toast';

export function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // 表示・記録対象の日付（YYYY-MM-DD）
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // 現在記録中の食事区分（朝食 / 昼食 / 夕食 / 間食）
  const [activeMealType, setActiveMealType] = useState<MealType>(() => getDefaultMealType());

  // モーダル表示状態
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<IntakeLogItem | null>(null);

  // 選択中日付のログ一覧を取得
  const currentLogs = useMemo(() => {
    return getLogsForDate(selectedDate, appState.todayLogs);
  }, [selectedDate, appState.todayLogs]);

  // 記録が存在する日付一覧
  const loggedDates = useMemo(() => {
    return getDatesWithLogs(appState.todayLogs);
  }, [appState.todayLogs]);

  // 状態変更時のLocalStorage同期
  const updateStateAndPersist = useCallback((updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  }, []);

  // 選択中日付のログを更新するヘルパー
  const updateLogsForSelectedDate = useCallback(
    (newLogs: IntakeLogItem[]) => {
      if (selectedDate === today) {
        updateStateAndPersist((prev) => ({
          ...prev,
          todayLogs: newLogs,
        }));
      } else {
        saveLogsForDate(selectedDate, newLogs);
        // 再レンダリングをトリガーするため一時ステート更新
        setAppState((prev) => ({ ...prev }));
      }
    },
    [selectedDate, today, updateStateAndPersist]
  );

  // 日付変更の自動ハンドリング（起動時・可視状態復帰時・タイマー）
  useEffect(() => {
    const checkDateChange = () => {
      const freshState = loadAppState();
      setAppState((current) => {
        if (freshState.lastActiveDate !== current.lastActiveDate) {
          return freshState;
        }
        return current;
      });
      setActiveMealType(getDefaultMealType());
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDateChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(checkDateChange, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const showToast = (text: string, subText?: string) => {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      text,
      subText,
    });
  };

  // 前日へ
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(prevStr);
  };

  // 翌日へ
  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  // 今日に戻る
  const handleGoToday = () => {
    setSelectedDate(today);
  };

  // 1タップ加算
  const handleAddPresetToToday = (preset: PresetItem) => {
    const newLog = createLogFromPreset(preset, undefined, activeMealType);
    const updated = [newLog, ...currentLogs];
    updateLogsForSelectedDate(updated);

    const cal = calcCalories(newLog.currentP, newLog.currentF, newLog.currentC);
    const mealLabel = meals.find((m) => m.id === activeMealType)?.label || '';
    showToast(
      `【${mealLabel}】に「${preset.name}」を追加`,
      `+${cal} kcal (P:${newLog.currentP} F:${newLog.currentF} C:${newLog.currentC})`
    );
  };

  // 履歴の量や食事区分を再計算して更新
  const handleUpdateLogAmount = (id: string, newAmount: number, newMealType: MealType) => {
    const updated = currentLogs.map((log) => {
      if (log.id === id) {
        return recalculateLogItem(log, newAmount, newMealType);
      }
      return log;
    });
    updateLogsForSelectedDate(updated);
    showToast('記録を更新しました');
  };

  // 履歴アイテム削除
  const handleDeleteLog = (id: string) => {
    const updated = currentLogs.filter((log) => log.id !== id);
    updateLogsForSelectedDate(updated);
    showToast('記録を削除しました');
  };

  // 表示中日付の記録全消去
  const handleClearAllLogs = () => {
    updateLogsForSelectedDate([]);
    showToast('この日の記録を全消去しました');
  };

  // 目標設定の更新
  const handleSaveTarget = (newTarget: AppState['target']) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      target: newTarget,
    }));
    showToast('目標カロリー・PFCを更新しました');
  };

  // 食材パーツ（プリセット）の作成・更新
  const handleSavePreset = (preset: PresetItem) => {
    updateStateAndPersist((prev) => {
      const exists = prev.presets.some((p) => p.id === preset.id);
      let updatedPresets: PresetItem[];
      if (exists) {
        updatedPresets = prev.presets.map((p) => (p.id === preset.id ? preset : p));
      } else {
        updatedPresets = [preset, ...prev.presets];
      }
      return { ...prev, presets: updatedPresets };
    });
    showToast('食材パーツを保存しました');
  };

  // 食材パーツの削除
  const handleDeletePreset = (id: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      presets: prev.presets.filter((p) => p.id !== id),
    }));
    showToast('食材パーツを削除しました');
  };

  // 自由入力の追加
  const handleQuickAdd = (log: IntakeLogItem) => {
    const updated = [log, ...currentLogs];
    updateLogsForSelectedDate(updated);
    const cal = calcCalories(log.currentP, log.currentF, log.currentC);
    const mealLabel = meals.find((m) => m.id === log.mealType)?.label || '';
    showToast(`【${mealLabel}】に「${log.name}」を記録`, `+${cal} kcal`);
  };

  // バックアップ復元
  const handleRestoreState = (newState: AppState) => {
    setAppState(newState);
    saveAppState(newState);
    setSelectedDate(newState.lastActiveDate);
  };

  // 表示用AppState（サマリー表示にcurrentLogsを反映）
  const displayState: AppState = useMemo(() => {
    return {
      ...appState,
      lastActiveDate: selectedDate,
      todayLogs: currentLogs,
    };
  }, [appState, selectedDate, currentLogs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white pb-safe">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="w-full max-w-md mx-auto px-4 pt-1 pb-16 space-y-3.5">
        {/* ヘッダー（日付切替・カレンダー起動） */}
        <Header
          currentDate={selectedDate}
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onGoToday={handleGoToday}
          onOpenTargetModal={() => setIsTargetModalOpen(true)}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenBackupModal={() => setIsBackupOpen(true)}
        />

        {/* 選択中の日のサマリー（合計カロリー & PFCバー） */}
        <DailySummary
          appState={displayState}
          onOpenTargetModal={() => setIsTargetModalOpen(true)}
        />

        {/* 食事区分セレクター（朝食 / 昼食 / 夕食 / 間食） */}
        <MealSelector
          activeMealType={activeMealType}
          onChangeMealType={setActiveMealType}
          todayLogs={currentLogs}
        />

        {/* 定番パーツ一覧（1タップ加算） */}
        <PresetGrid
          presets={appState.presets}
          todayLogs={currentLogs}
          onAddPresetToToday={handleAddPresetToToday}
          onOpenManageModal={() => setIsManageModalOpen(true)}
        />

        {/* 選択中の日の記録一覧（朝・昼・晩・間食ごとの小計＆一覧） */}
        <IntakeLogsList
          logs={currentLogs}
          onOpenEditModal={(log) => setSelectedLogForEdit(log)}
          onDeleteLog={handleDeleteLog}
          onClearAll={handleClearAllLogs}
        />
      </main>

      {/* モーダル群 */}
      {/* 0. カレンダーモーダル */}
      <CalendarModal
        isOpen={isCalendarOpen}
        selectedDate={selectedDate}
        loggedDates={loggedDates}
        onSelectDate={setSelectedDate}
        onClose={() => setIsCalendarOpen(false)}
      />

      {/* 1. 量・食事区分の再調整モーダル */}
      <LogEditModal
        log={selectedLogForEdit}
        isOpen={!!selectedLogForEdit}
        onClose={() => setSelectedLogForEdit(null)}
        onSave={(id, newAmount, newMealType) => {
          handleUpdateLogAmount(id, newAmount, newMealType);
          setSelectedLogForEdit(null);
        }}
        onDelete={(id) => {
          handleDeleteLog(id);
          setSelectedLogForEdit(null);
        }}
      />

      {/* 2. 定番パーツ編集モーダル */}
      <PresetManageModal
        isOpen={isManageModalOpen}
        presets={appState.presets}
        onClose={() => setIsManageModalOpen(false)}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
      />

      {/* 3. 目標設定モーダル */}
      <TargetSettingsModal
        isOpen={isTargetModalOpen}
        target={appState.target}
        onClose={() => setIsTargetModalOpen(false)}
        onSave={handleSaveTarget}
      />

      {/* 4. 自由入力モーダル */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        defaultMealType={activeMealType}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={handleQuickAdd}
      />

      {/* 5. バックアップ＆PWA設定モーダル */}
      <DataBackupModal
        isOpen={isBackupOpen}
        appState={appState}
        onClose={() => setIsBackupOpen(false)}
        onRestoreState={handleRestoreState}
      />
    </div>
  );
}

export default App;
