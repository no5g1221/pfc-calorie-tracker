import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, Sparkles, Coffee } from 'lucide-react';
import type {
  AppState,
  IntakeLogItem,
  PresetItem,
  MealType,
  RoughPresetItem,
  ReminderSettings,
  MealComboEntry,
  MealComboItem,
} from './types';
import {
  DEFAULT_ROUGH_PRESETS,
  loadAppState,
  saveAppState,
  normalizeAppState,
  getDailyArchives,
  getLogsForDate,
  saveLogsForDate,
  saveDailyArchives,
  getDatesWithLogs,
  getMostRecentLoggedDateBefore,
} from './utils/storage';
import {
  createLogFromPreset,
  recalculateLogItem,
  calcCalories,
  calculateTotals,
  getDefaultMealType,
  getTodayDateString,
  getCurrentWeekDates,
  getLastNDates,
  diffDays,
} from './utils/calculations';
import { Header } from './components/Header';
import { DashboardHeader } from './components/DashboardHeader';
import { HabitStrip } from './components/HabitStrip';
import { QuickStartBanner } from './components/QuickStartBanner';
import { MealSelector, meals } from './components/MealSelector';
import { PresetGrid } from './components/PresetGrid';
import { IntakeLogsList } from './components/IntakeLogsList';
import { LogEditModal } from './components/LogEditModal';
import { PresetManageModal } from './components/PresetManageModal';
import { TargetSettingsModal } from './components/TargetSettingsModal';
import { QuickAddModal } from './components/QuickAddModal';
import { DataBackupModal } from './components/DataBackupModal';
import { CalendarModal } from './components/CalendarModal';
import { WeeklyReviewModal } from './components/WeeklyReviewModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { loadReminderSettings, syncPushActivity } from './utils/pushNotifications';
import { Toast, type ToastMessage } from './components/Toast';
import { GoalCelebration } from './components/GoalCelebration';

type MetricKey = 'calories' | 'p' | 'f' | 'c';
const EMPTY_REST_DAYS: string[] = [];

export function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isCelebrationVisible, setIsCelebrationVisible] = useState(false);

  // 表示・記録対象の日付（YYYY-MM-DD）および日付またぎ追従用ステート
  const [today, setToday] = useState<string>(() => getTodayDateString());
  const todayRef = useRef<string>(today);

  useEffect(() => {
    todayRef.current = today;
  }, [today]);

  const [selectedDate, setSelectedDate] = useState<string>(today);

  // 現在記録中の食事区分（朝食 / 昼食 / 夕食 / 間食）
  const [activeMealType, setActiveMealType] = useState<MealType>(() => getDefaultMealType());

  // 直前のログ変更を元に戻すためのスナップショット
  const undoSnapshotRef = useRef<{ date: string; logs: IntakeLogItem[] } | null>(null);

  // モーダル表示状態
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddInitialTab, setQuickAddInitialTab] = useState<
    'rough' | 'ai' | 'calories' | 'detail'
  >('rough');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<IntakeLogItem | null>(null);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() =>
    loadReminderSettings()
  );

  const openQuickAdd = useCallback(
    (tab: 'rough' | 'ai' | 'calories' | 'detail' = 'rough') => {
      setQuickAddInitialTab(tab);
      setIsQuickAddOpen(true);
    },
    []
  );

  const roughPresets = appState.roughPresets ?? DEFAULT_ROUGH_PRESETS;
  const weeklyGoalDays = appState.weeklyGoalDays ?? 5;
  const restDays = appState.restDays ?? EMPTY_REST_DAYS;
  const mealCombos = appState.mealCombos ?? [];
  const isSelectedRestDay = restDays.includes(selectedDate);

  // 日付ごとの目標達成演出発火済みフラグ（微調整による再発火防止）
  const celebratedByDateRef = useRef<Record<string, Set<MetricKey>>>({});

  // 選択中日付のログ一覧を取得
  const currentLogs = useMemo(() => {
    return getLogsForDate(selectedDate, appState.todayLogs);
  }, [selectedDate, appState]);

  // 指定日の目標達成発火フラグを現在のログ合計と整合させるヘルパー
  const syncCelebratedForDate = useCallback(
    (date: string, logs: IntakeLogItem[]) => {
      const set = new Set<MetricKey>();
      const totals = calculateTotals(logs);
      const { target } = appState;
      if (target.calories > 0 && totals.totalCalories >= target.calories) set.add('calories');
      if (target.targetP > 0 && totals.totalP >= target.targetP) set.add('p');
      if (target.targetF > 0 && totals.totalF >= target.targetF) set.add('f');
      if (target.targetC > 0 && totals.totalC >= target.targetC) set.add('c');
      celebratedByDateRef.current[date] = set;
    },
    [appState]
  );

  // 初回または日付切替時に、既に100%を超えている項目を発火済みとしてマーク（画面表示直後の誤発火防止）
  useEffect(() => {
    if (!celebratedByDateRef.current[selectedDate]) {
      syncCelebratedForDate(selectedDate, currentLogs);
    }
  }, [selectedDate, currentLogs, syncCelebratedForDate]);

  // 目標達成判定＆セレブレーション発火チェック
  const checkGoalAchievement = useCallback(
    (prevLogs: IntakeLogItem[], nextLogs: IntakeLogItem[]) => {
      if (isSelectedRestDay) return;

      const prevTotals = calculateTotals(prevLogs);
      const nextTotals = calculateTotals(nextLogs);
      const { target } = appState;

      if (!celebratedByDateRef.current[selectedDate]) {
        celebratedByDateRef.current[selectedDate] = new Set<MetricKey>();
      }
      const celebratedSet = celebratedByDateRef.current[selectedDate];

      let newlyAchieved = false;

      // 1. 総カロリーが初めて100%に達したか
      if (
        target.calories > 0 &&
        prevTotals.totalCalories < target.calories &&
        nextTotals.totalCalories >= target.calories &&
        !celebratedSet.has('calories')
      ) {
        celebratedSet.add('calories');
        newlyAchieved = true;
      }

      // 2. P（タンパク質）が初めて100%に達したか
      if (
        target.targetP > 0 &&
        prevTotals.totalP < target.targetP &&
        nextTotals.totalP >= target.targetP &&
        !celebratedSet.has('p')
      ) {
        celebratedSet.add('p');
        newlyAchieved = true;
      }

      // 3. F（脂質）が初めて100%に達したか
      if (
        target.targetF > 0 &&
        prevTotals.totalF < target.targetF &&
        nextTotals.totalF >= target.targetF &&
        !celebratedSet.has('f')
      ) {
        celebratedSet.add('f');
        newlyAchieved = true;
      }

      // 4. C（炭水化物）が初めて100%に達したか
      if (
        target.targetC > 0 &&
        prevTotals.totalC < target.targetC &&
        nextTotals.totalC >= target.targetC &&
        !celebratedSet.has('c')
      ) {
        celebratedSet.add('c');
        newlyAchieved = true;
      }

      if (newlyAchieved) {
        setIsCelebrationVisible(true);
      }
    },
    [appState, selectedDate, isSelectedRestDay]
  );

  // 記録が存在する日付一覧
  const loggedDates = useMemo(() => {
    return getDatesWithLogs(appState.todayLogs);
  }, [appState]);

  // 今週の日付（月〜日）と直近ログ情報
  const weekDates = useMemo(() => getCurrentWeekDates(today), [today]);

  const recentLogInfo = useMemo(() => {
    return getMostRecentLoggedDateBefore(today, appState.todayLogs);
  }, [today, appState]);

  const daysSinceLastLog = useMemo(() => {
    if (!recentLogInfo) return null;
    return diffDays(recentLogInfo.date, today);
  }, [recentLogInfo, today]);

  // 直近30日分のログから定番パーツの使用頻度を集計（当日の二重カウント防止マージ）
  const presetUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const archives = getDailyArchives();
    const mergedByDate: Record<string, IntakeLogItem[]> = {
      ...archives,
      [today]: appState.todayLogs,
    };
    const last30Dates = getLastNDates(30, today);

    for (const dateStr of last30Dates) {
      const logs = mergedByDate[dateStr];
      if (!Array.isArray(logs)) continue;
      for (const log of logs) {
        if (log.presetId) {
          counts[log.presetId] = (counts[log.presetId] || 0) + 1;
        }
      }
    }

    return counts;
  }, [today, appState]);

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
      const currentToday = getTodayDateString();
      if (currentToday !== todayRef.current) {
        const prevToday = todayRef.current;
        todayRef.current = currentToday;
        setToday(currentToday);

        const freshState = loadAppState();
        setAppState(freshState);
        setSelectedDate((prev) => (prev === prevToday ? currentToday : prev));
        setActiveMealType(getDefaultMealType());
      }
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

  // 当日（today）の記録済み食事区分・お休み状態をバックグラウンドで通知サーバーへ差分同期
  const todayLoggedMeals = useMemo(() => {
    return appState.todayLogs.map(
      (log) => log.mealType || getDefaultMealType(new Date(log.timestamp))
    );
  }, [appState.todayLogs]);

  const isTodayRestDay = restDays.includes(today);

  useEffect(() => {
    const runSync = () => {
      void syncPushActivity(reminderSettings, {
        date: today,
        loggedMeals: todayLoggedMeals,
        isRestDay: isTodayRestDay,
      });
    };

    runSync();
    window.addEventListener('online', runSync);
    return () => {
      window.removeEventListener('online', runSync);
    };
  }, [reminderSettings, today, todayLoggedMeals, isTodayRestDay]);

  const showToast = useCallback((text: string, subText?: string, onUndo?: () => void) => {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      text,
      subText,
      onUndo,
    });
  }, []);

  // 直前のログ操作を元に戻す（Undo）
  const handleUndo = useCallback(() => {
    const snapshot = undoSnapshotRef.current;
    if (!snapshot) return;
    undoSnapshotRef.current = null;

    if (snapshot.date === todayRef.current) {
      updateStateAndPersist((prev) => ({
        ...prev,
        todayLogs: snapshot.logs,
      }));
    } else {
      saveLogsForDate(snapshot.date, snapshot.logs);
      setAppState((prev) => ({ ...prev }));
    }

    syncCelebratedForDate(snapshot.date, snapshot.logs);
    showToast('直前の操作を元に戻しました');
  }, [updateStateAndPersist, syncCelebratedForDate, showToast]);

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
    undoSnapshotRef.current = { date: selectedDate, logs: currentLogs };
    const newLog = createLogFromPreset(preset, undefined, activeMealType);
    const updated = [newLog, ...currentLogs];
    checkGoalAchievement(currentLogs, updated);
    updateLogsForSelectedDate(updated);

    const cal = calcCalories(newLog.currentP, newLog.currentF, newLog.currentC);
    const mealLabel = meals.find((m) => m.id === activeMealType)?.label || '';
    showToast(
      `【${mealLabel}】に「${preset.name}」を追加`,
      `+${cal} kcal (P:${newLog.currentP} F:${newLog.currentF} C:${newLog.currentC})`,
      handleUndo
    );
  };

  // 履歴の量や食事区分を再計算して更新
  const handleUpdateLogAmount = (id: string, newAmount: number, newMealType: MealType) => {
    undoSnapshotRef.current = { date: selectedDate, logs: currentLogs };
    const updated = currentLogs.map((log) => {
      if (log.id === id) {
        return recalculateLogItem(log, newAmount, newMealType);
      }
      return log;
    });
    checkGoalAchievement(currentLogs, updated);
    updateLogsForSelectedDate(updated);
    showToast('記録を更新しました', undefined, handleUndo);
  };

  // 履歴アイテム削除
  const handleDeleteLog = (id: string) => {
    undoSnapshotRef.current = { date: selectedDate, logs: currentLogs };
    const updated = currentLogs.filter((log) => log.id !== id);
    syncCelebratedForDate(selectedDate, updated);
    updateLogsForSelectedDate(updated);
    showToast('記録を削除しました', undefined, handleUndo);
  };

  // 表示中日付の記録全消去（リセット時は発火フラグもクリア）
  const handleClearAllLogs = () => {
    if (currentLogs.length === 0) return;
    undoSnapshotRef.current = { date: selectedDate, logs: currentLogs };
    celebratedByDateRef.current[selectedDate] = new Set<MetricKey>();
    updateLogsForSelectedDate([]);
    showToast('この日の記録を全消去しました', undefined, handleUndo);
  };

  // 目標設定の更新
  const handleSaveTarget = (newTarget: AppState['target'], newWeeklyGoalDays: number) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      target: newTarget,
      weeklyGoalDays: newWeeklyGoalDays,
    }));
    showToast('目標設定を更新しました');
  };

  // お休み日（チートデイ）の切替
  const handleToggleRestDay = () => {
    const currentlyRest = restDays.includes(selectedDate);
    updateStateAndPersist((prev) => {
      const currentRestDays = prev.restDays ?? [];
      const nextRestDays = currentlyRest
        ? currentRestDays.filter((d) => d !== selectedDate)
        : [...currentRestDays, selectedDate];
      return {
        ...prev,
        restDays: nextRestDays,
      };
    });
    if (currentlyRest) {
      showToast('お休み日を解除しました');
    } else {
      showToast('🌿 お休み日に設定しました', '今日は気にせず楽しもう！');
    }
  };

  // ざっくりメニューの保存・削除・リセット
  const handleSaveRoughPreset = (item: RoughPresetItem) => {
    updateStateAndPersist((prev) => {
      const current = prev.roughPresets ?? DEFAULT_ROUGH_PRESETS;
      const exists = current.some((r) => r.id === item.id);
      const next = exists
        ? current.map((r) => (r.id === item.id ? item : r))
        : [item, ...current];
      return { ...prev, roughPresets: next };
    });
    showToast('ざっくりメニューを保存しました');
  };

  const handleDeleteRoughPreset = (id: string) => {
    updateStateAndPersist((prev) => {
      const current = prev.roughPresets ?? DEFAULT_ROUGH_PRESETS;
      return {
        ...prev,
        roughPresets: current.filter((r) => r.id !== id),
      };
    });
    showToast('ざっくりメニューを削除しました');
  };

  const handleResetRoughPresets = () => {
    updateStateAndPersist((prev) => ({
      ...prev,
      roughPresets: DEFAULT_ROUGH_PRESETS,
    }));
    showToast('ざっくりメニューを定番8種に戻しました');
  };

  // 前回記録のコピー
  const handleCopyRecentLogs = () => {
    if (!recentLogInfo || recentLogInfo.logs.length === 0) return;
    undoSnapshotRef.current = { date: selectedDate, logs: currentLogs };
    const now = Date.now();
    const copied: IntakeLogItem[] = recentLogInfo.logs.map((log, idx) => ({
      ...log,
      id: `${now}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
    }));
    const updated = [...copied, ...currentLogs];
    checkGoalAchievement(currentLogs, updated);
    updateLogsForSelectedDate(updated);
    showToast(`前回の食事（${copied.length}品）をコピーしました`, undefined, handleUndo);
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

  // マイ定食（コンボ）の保存
  const handleSaveMealCombo = (comboName: string, items: IntakeLogItem[]) => {
    const trimmedName = comboName.trim();
    if (!trimmedName || items.length === 0) return;

    const now = Date.now();
    const entries: MealComboEntry[] = items.map((item) => ({
      presetId: item.presetId,
      name: item.name,
      unit: item.unit,
      baseAmount: item.baseAmount,
      currentAmount: item.currentAmount,
      baseP: item.baseP,
      baseF: item.baseF,
      baseC: item.baseC,
      currentP: item.currentP,
      currentF: item.currentF,
      currentC: item.currentC,
      isRough: item.isRough,
    }));

    const newCombo: MealComboItem = {
      id: `combo-${now}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      items: entries,
      createdAt: now,
    };

    updateStateAndPersist((prev) => ({
      ...prev,
      mealCombos: [newCombo, ...(prev.mealCombos ?? [])],
    }));
    showToast(`マイ定食「${trimmedName}」を保存しました`, `${entries.length}品を登録`);
  };

  // マイ定食（コンボ）の削除
  const handleDeleteMealCombo = (id: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      mealCombos: (prev.mealCombos ?? []).filter((combo) => combo.id !== id),
    }));
    showToast('マイ定食を削除しました');
  };

  // マイ定食（コンボ）の1タップ一括投入（Undo連携）
  const handleAddMealCombo = (combo: MealComboItem) => {
    if (combo.items.length === 0) return;

    undoSnapshotRef.current = { date: selectedDate, logs: currentLogs };
    const now = Date.now();
    const newLogs: IntakeLogItem[] = combo.items.map((entry, idx) => ({
      presetId: entry.presetId,
      name: entry.name,
      unit: entry.unit,
      baseAmount: entry.baseAmount,
      currentAmount: entry.currentAmount,
      baseP: entry.baseP,
      baseF: entry.baseF,
      baseC: entry.baseC,
      currentP: entry.currentP,
      currentF: entry.currentF,
      currentC: entry.currentC,
      isRough: entry.isRough,
      id: `${now}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      mealType: activeMealType,
    }));

    const updated = [...newLogs, ...currentLogs];
    checkGoalAchievement(currentLogs, updated);
    updateLogsForSelectedDate(updated);

    const totals = calculateTotals(newLogs);
    const mealLabel = meals.find((m) => m.id === activeMealType)?.label || '';
    showToast(
      `【${mealLabel}】に「${combo.name}」を追加`,
      `${newLogs.length}品 / +${totals.totalCalories} kcal`,
      handleUndo
    );
  };

  // 自由入力の追加
  const handleQuickAdd = (log: IntakeLogItem) => {
    undoSnapshotRef.current = { date: selectedDate, logs: currentLogs };
    const updated = [log, ...currentLogs];
    checkGoalAchievement(currentLogs, updated);
    updateLogsForSelectedDate(updated);
    const cal = calcCalories(log.currentP, log.currentF, log.currentC);
    const mealLabel = meals.find((m) => m.id === log.mealType)?.label || '';
    showToast(`【${mealLabel}】に「${log.name}」を記録`, `+${cal} kcal`, handleUndo);
  };

  // バックアップ復元（過去アーカイブ一括復元および現在日付との整合同期）
  const handleRestoreState = (
    newState: AppState,
    dailyArchives?: Record<string, IntakeLogItem[]>
  ) => {
    undoSnapshotRef.current = null;
    celebratedByDateRef.current = {};

    if (dailyArchives) {
      saveDailyArchives(dailyArchives);
    }

    const normalized = normalizeAppState(newState);
    saveAppState(normalized);

    const synced = loadAppState();
    const currentToday = getTodayDateString();
    todayRef.current = currentToday;
    setToday(currentToday);
    setAppState(synced);
    setSelectedDate(synced.lastActiveDate);
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
      {/* 目標達成時のキャラクター祝福オーバーレイ演出 */}
      <GoalCelebration
        isVisible={isCelebrationVisible}
        onComplete={() => setIsCelebrationVisible(false)}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* トップアプリバー（ロゴ、日付切替、各種モーダル起動） */}
      <div className="w-full max-w-md mx-auto px-4 pt-1">
        <Header
          currentDate={selectedDate}
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onGoToday={handleGoToday}
          onOpenTargetModal={() => setIsTargetModalOpen(true)}
          onOpenBackupModal={() => setIsBackupOpen(true)}
          onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
          onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
          isNotificationEnabled={reminderSettings.enabled}
        />
      </div>

      {/* ダッシュボードヘッダー（通常フロー配置＋スクロールアウト時のみスリム固定バー表示） */}
      <DashboardHeader
        appState={displayState}
        onOpenTargetModal={() => setIsTargetModalOpen(true)}
        isRestDay={isSelectedRestDay}
        onToggleRestDay={handleToggleRestDay}
      />

      {/* メインスクロールエリア */}
      <main className="w-full max-w-md mx-auto px-4 pt-3 pb-28 space-y-3.5 flex-1">
        {/* 今週のゆる継続スタンプバー */}
        <HabitStrip
          weekDates={weekDates}
          today={today}
          loggedDates={loggedDates}
          restDays={restDays}
          weeklyGoalDays={weeklyGoalDays}
          onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
        />

        {/* 今日・記録0件・お休み日でないときのスタートガイド */}
        {selectedDate === today && currentLogs.length === 0 && !isSelectedRestDay && (
          <QuickStartBanner
            daysSinceLastLog={daysSinceLastLog}
            recentLogInfo={recentLogInfo}
            onCopyRecentLogs={handleCopyRecentLogs}
            onOpenRoughAdd={() => openQuickAdd('rough')}
            onMarkRestDay={handleToggleRestDay}
          />
        )}

        {/* 食事区分セレクター（朝食 / 昼食 / 夕食 / 間食） */}
        <MealSelector
          activeMealType={activeMealType}
          onChangeMealType={setActiveMealType}
          todayLogs={currentLogs}
        />

        {/* 定番パーツ・マイ定食一覧（1タップ加算・よく使う順） */}
        <PresetGrid
          presets={appState.presets}
          todayLogs={currentLogs}
          usageCounts={presetUsageCounts}
          mealCombos={mealCombos}
          onAddPresetToToday={handleAddPresetToToday}
          onOpenManageModal={() => setIsManageModalOpen(true)}
          onAddMealCombo={handleAddMealCombo}
          onDeleteMealCombo={handleDeleteMealCombo}
        />

        {/* 選択中の日の記録一覧（朝・昼・晩・間食ごとの小計＆一覧） */}
        <IntakeLogsList
          logs={currentLogs}
          onOpenEditModal={(log) => setSelectedLogForEdit(log)}
          onDeleteLog={handleDeleteLog}
          onClearAll={handleClearAllLogs}
          onSaveMealCombo={handleSaveMealCombo}
        />
      </main>

      {/* 下部固定アクションバー（親指ゾーン最適化） */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md mx-auto px-3 pt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => openQuickAdd('rough')}
            className="min-h-[44px] rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>ざっくり</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickAdd('ai')}
            className="min-h-[44px] rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center gap-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>AI検索</span>
          </button>

          <button
            type="button"
            onClick={handleToggleRestDay}
            className={`min-h-[44px] rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
              isSelectedRestDay
                ? 'bg-purple-600 text-white border border-purple-400/60 shadow-md'
                : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300'
            }`}
          >
            <Coffee className="w-4 h-4 shrink-0" />
            <span>{isSelectedRestDay ? 'お休み中' : 'お休み'}</span>
          </button>
        </div>
      </div>

      {/* モーダル群 */}
      {/* 0. カレンダーモーダル */}
      <CalendarModal
        isOpen={isCalendarOpen}
        selectedDate={selectedDate}
        loggedDates={loggedDates}
        restDays={restDays}
        onSelectDate={setSelectedDate}
        onClose={() => setIsCalendarOpen(false)}
      />

      {/* 0.5. 週間ふりかえりモーダル */}
      <WeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        onClose={() => setIsWeeklyReviewOpen(false)}
        target={appState.target}
        todayLogs={appState.todayLogs}
        restDays={restDays}
        weeklyGoalDays={weeklyGoalDays}
        loggedDates={loggedDates}
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
        weeklyGoalDays={weeklyGoalDays}
        onClose={() => setIsTargetModalOpen(false)}
        onSave={handleSaveTarget}
      />

      {/* 4. ざっくり・自由入力モーダル */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        defaultMealType={activeMealType}
        initialTab={quickAddInitialTab}
        target={appState.target}
        roughPresets={roughPresets}
        isRestDay={isSelectedRestDay}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={handleQuickAdd}
        onSavePreset={handleSavePreset}
        onSaveRoughPreset={handleSaveRoughPreset}
        onDeleteRoughPreset={handleDeleteRoughPreset}
        onResetRoughPresets={handleResetRoughPresets}
        onToggleRestDay={handleToggleRestDay}
      />

      {/* 5. バックアップ＆PWA設定モーダル */}
      <DataBackupModal
        isOpen={isBackupOpen}
        appState={appState}
        onClose={() => setIsBackupOpen(false)}
        onRestoreState={handleRestoreState}
      />

      {/* 6. 通知リマインダー設定モーダル */}
      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        settings={reminderSettings}
        onClose={() => setIsNotificationModalOpen(false)}
        onChangeSettings={setReminderSettings}
        onShowToast={showToast}
      />
    </div>
  );
}

export default App;
