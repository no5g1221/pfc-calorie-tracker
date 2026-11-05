import { useState, useEffect, useCallback } from 'react';
import type { AppState, IntakeLogItem, PresetItem } from './types';
import { loadAppState, saveAppState } from './utils/storage';
import {
  createLogFromPreset,
  recalculateLogItem,
  calcCalories,
} from './utils/calculations';
import { Header } from './components/Header';
import { DailySummary } from './components/DailySummary';
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
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDateChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(checkDateChange, 60000); // 1分毎に日付変更チェック

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  // トースト表示ヘルパー
  const showToast = (text: string, subText?: string) => {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      text,
      subText,
    });
  };

  // 1タップ加算
  const handleAddPresetToToday = (preset: PresetItem) => {
    const newLog = createLogFromPreset(preset);
    updateStateAndPersist((prev) => ({
      ...prev,
      todayLogs: [newLog, ...prev.todayLogs],
    }));

    const cal = calcCalories(newLog.currentP, newLog.currentF, newLog.currentC);
    showToast(
      `「${preset.name}」を追加しました`,
      `+${cal} kcal (P:${newLog.currentP} F:${newLog.currentF} C:${newLog.currentC})`
    );
  };

  // 履歴の量を再計算して更新
  const handleUpdateLogAmount = (id: string, newAmount: number) => {
    updateStateAndPersist((prev) => {
      const updatedLogs = prev.todayLogs.map((log) => {
        if (log.id === id) {
          return recalculateLogItem(log, newAmount);
        }
        return log;
      });
      return { ...prev, todayLogs: updatedLogs };
    });
    showToast('摂取量を更新しました');
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
    showToast(`「${log.name}」を記録しました`, `+${cal} kcal`);
  };

  // バックアップ復元
  const handleRestoreState = (newState: AppState) => {
    setAppState(newState);
    saveAppState(newState);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white pb-safe">
      {/* トースト通知 */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* メインコンテナ（スマホ最適化: max-w-md） */}
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

        {/* 定番パーツ一覧（メイン入力部） */}
        <PresetGrid
          presets={appState.presets}
          todayLogs={appState.todayLogs}
          onAddPresetToToday={handleAddPresetToToday}
          onOpenManageModal={() => setIsManageModalOpen(true)}
        />

        {/* 今日の記録一覧 */}
        <IntakeLogsList
          logs={appState.todayLogs}
          onOpenEditModal={(log) => setSelectedLogForEdit(log)}
          onDeleteLog={handleDeleteLog}
          onClearAll={handleClearAllLogs}
        />
      </main>

      {/* モーダル群 */}
      {/* 1. 量の再調整モーダル */}
      <LogEditModal
        log={selectedLogForEdit}
        isOpen={!!selectedLogForEdit}
        onClose={() => setSelectedLogForEdit(null)}
        onSave={(id, newAmount) => {
          handleUpdateLogAmount(id, newAmount);
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
