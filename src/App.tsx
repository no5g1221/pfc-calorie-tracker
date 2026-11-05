import { useState, useEffect, useCallback } from 'react';
import type { AppState, IntakeLogItem, PresetItem, MealType } from './types';
import { loadAppState, saveAppState } from './utils/storage';
import {
  createLogFromPreset,
  recalculateLogItem,
  calcCalories,
  getDefaultMealType,
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
import { Toast, type ToastMessage } from './components/Toast';

export function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // 現在記録中の食事区分（朝食 / 昼食 / 夕食 / 間食）
  const [activeMealType, setActiveMealType] = useState<MealType>(() => getDefaultMealType());

  // モーダル表示状態
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<IntakeLogItem | null>(null);

  // 状態変更時のLocalStorage同期
  const updateStateAndPersist = useCallback((updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  }, []);

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
      // 時間帯が変わっていたらデフォルト食事区分も自然に更新
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

  // 1タップ加算（現在のactiveMealTypeで加算）
  const handleAddPresetToToday = (preset: PresetItem) => {
    const newLog = createLogFromPreset(preset, undefined, activeMealType);
    updateStateAndPersist((prev) => ({
      ...prev,
      todayLogs: [newLog, ...prev.todayLogs],
    }));

    const cal = calcCalories(newLog.currentP, newLog.currentF, newLog.currentC);
    const mealLabel = meals.find((m) => m.id === activeMealType)?.label || '';
    showToast(
      `【${mealLabel}】に「${preset.name}」を追加`,
      `+${cal} kcal (P:${newLog.currentP} F:${newLog.currentF} C:${newLog.currentC})`
    );
  };

  // 履歴の量や食事区分を再計算して更新
  const handleUpdateLogAmount = (id: string, newAmount: number, newMealType: MealType) => {
    updateStateAndPersist((prev) => {
      const updatedLogs = prev.todayLogs.map((log) => {
        if (log.id === id) {
          return recalculateLogItem(log, newAmount, newMealType);
        }
        return log;
      });
      return { ...prev, todayLogs: updatedLogs };
    });
    showToast('記録を更新しました');
  };

  // 履歴アイテム削除
  const handleDeleteLog = (id: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      todayLogs: prev.todayLogs.filter((log) => log.id !== id),
    }));
    showToast('記録を削除しました');
  };

  // 今日の全消去
  const handleClearAllLogs = () => {
    updateStateAndPersist((prev) => ({
      ...prev,
      todayLogs: [],
    }));
    showToast('今日の記録を全消去しました');
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
    updateStateAndPersist((prev) => ({
      ...prev,
      todayLogs: [log, ...prev.todayLogs],
    }));
    const cal = calcCalories(log.currentP, log.currentF, log.currentC);
    const mealLabel = meals.find((m) => m.id === log.mealType)?.label || '';
    showToast(`【${mealLabel}】に「${log.name}」を記録`, `+${cal} kcal`);
  };

  // バックアップ復元
  const handleRestoreState = (newState: AppState) => {
    setAppState(newState);
    saveAppState(newState);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white pb-safe">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="w-full max-w-md mx-auto px-4 pt-1 pb-16 space-y-3.5">
        {/* ヘッダー */}
        <Header
          currentDate={appState.lastActiveDate}
          onOpenTargetModal={() => setIsTargetModalOpen(true)}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenBackupModal={() => setIsBackupOpen(true)}
        />

        {/* 今日のサマリー（合計カロリー & PFCバー） */}
        <DailySummary
          appState={appState}
          onOpenTargetModal={() => setIsTargetModalOpen(true)}
        />

        {/* 食事区分セレクター（朝食 / 昼食 / 夕食 / 間食） */}
        <MealSelector
          activeMealType={activeMealType}
          onChangeMealType={setActiveMealType}
          todayLogs={appState.todayLogs}
        />

        {/* 定番パーツ一覧（1タップ加算） */}
        <PresetGrid
          presets={appState.presets}
          todayLogs={appState.todayLogs}
          onAddPresetToToday={handleAddPresetToToday}
          onOpenManageModal={() => setIsManageModalOpen(true)}
        />

        {/* 今日の記録一覧（朝・昼・晩・間食ごとの小計＆一覧） */}
        <IntakeLogsList
          logs={appState.todayLogs}
          onOpenEditModal={(log) => setSelectedLogForEdit(log)}
          onDeleteLog={handleDeleteLog}
          onClearAll={handleClearAllLogs}
        />
      </main>

      {/* モーダル群 */}
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
