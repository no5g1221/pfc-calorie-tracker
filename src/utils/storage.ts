import type { AppState, IntakeLogItem, PresetItem, RoughPresetItem } from '../types';
import { calcTargetMacros, calculateTotals, getTodayDateString } from './calculations';

export const STORAGE_KEY = 'pfc_tracker_app_state';
export const HISTORY_ARCHIVE_KEY = 'pfc_tracker_daily_archives';

// ざっくり記録用の定番メニュー8種（あとから編集・追加・削除可能）
export const DEFAULT_ROUGH_PRESETS: RoughPresetItem[] = [
  { id: 'rough-teishoku', name: '定食・丼もの', icon: '🍱', baseP: 28, baseF: 22, baseC: 105 },
  { id: 'rough-ramen', name: 'ラーメン・麺類', icon: '🍜', baseP: 25, baseF: 25, baseC: 90 },
  { id: 'rough-pasta', name: 'パスタ・洋食', icon: '🍝', baseP: 22, baseF: 26, baseC: 95 },
  { id: 'rough-conbini', name: 'コンビニ・パン軽食', icon: '🥪', baseP: 15, baseF: 16, baseC: 60 },
  { id: 'rough-izakaya', name: '居酒屋・飲み会', icon: '🍺', baseP: 35, baseF: 38, baseC: 70 },
  { id: 'rough-sweets', name: 'カフェ・スイーツ', icon: '🍰', baseP: 5, baseF: 16, baseC: 45 },
  { id: 'rough-salad', name: 'ヘルシー外食・サラダ', icon: '🥗', baseP: 30, baseF: 16, baseC: 50 },
  { id: 'rough-curry', name: 'カレー・揚げ物系', icon: '🍛', baseP: 22, baseF: 32, baseC: 115 },
];

// ユーザー指定の厳密な初期プリセット（8品目）
export const DEFAULT_PRESETS: PresetItem[] = [
  // 【主食】
  {
    id: 'staple-rice',
    name: '白米',
    category: 'staple',
    unit: 'g',
    baseAmount: 150,
    baseP: 3.8,
    baseF: 0.5,
    baseC: 55.7,
  },
  // 【主菜】
  {
    id: 'main-chicken',
    name: '皮なし鶏むね肉',
    category: 'main',
    unit: 'g',
    baseAmount: 100,
    baseP: 23.3,
    baseF: 1.9,
    baseC: 0.0,
  },
  {
    id: 'main-egg',
    name: '全卵 1個',
    category: 'main',
    unit: '個',
    baseAmount: 60,
    baseP: 7.4,
    baseF: 6.2,
    baseC: 0.2,
  },
  {
    id: 'main-mackerel',
    name: '塩サバ 1切れ',
    category: 'main',
    unit: '切れ',
    baseAmount: 80,
    baseP: 16.5,
    baseF: 13.5,
    baseC: 0.2,
  },
  {
    id: 'main-shishamo',
    name: 'ししゃも 3尾',
    category: 'main',
    unit: '尾',
    baseAmount: 45,
    baseP: 6.8,
    baseF: 3.8,
    baseC: 0.3,
  },
  // 【副菜】
  {
    id: 'sub-natto',
    name: '納豆 1パック',
    category: 'sub',
    unit: 'パック',
    baseAmount: 45,
    baseP: 7.4,
    baseF: 5.0,
    baseC: 5.4,
  },
  {
    id: 'sub-mekabu',
    name: 'めかぶ 1パック',
    category: 'sub',
    unit: 'パック',
    baseAmount: 45,
    baseP: 0.8,
    baseF: 0.2,
    baseC: 2.5,
  },
  {
    id: 'sub-oliveoil',
    name: 'オリーブ油 小さじ1',
    category: 'sub',
    unit: 'g',
    baseAmount: 4,
    baseP: 0.0,
    baseF: 4.0,
    baseC: 0.0,
  },
];

export function getDefaultAppState(): AppState {
  const calories = 2000;
  const pRatio = 30;
  const fRatio = 20;
  const cRatio = 50;
  const { targetP, targetF, targetC } = calcTargetMacros(calories, pRatio, fRatio, cRatio);

  return {
    lastActiveDate: getTodayDateString(),
    target: {
      calories,
      pRatio,
      fRatio,
      cRatio,
      targetP,
      targetF,
      targetC,
    },
    presets: DEFAULT_PRESETS,
    todayLogs: [],
    roughPresets: DEFAULT_ROUGH_PRESETS,
    weeklyGoalDays: 5,
    restDays: [],
  };
}

/**
 * 旧バージョンからのデータ互換性を保ちつつ不足フィールドを補完する
 */
export function normalizeAppState(state: AppState): AppState {
  const rawGoal = typeof state.weeklyGoalDays === 'number' ? state.weeklyGoalDays : 5;
  const clampedGoal = Math.min(7, Math.max(3, Math.round(rawGoal)));

  return {
    ...state,
    roughPresets: Array.isArray(state.roughPresets) ? state.roughPresets : DEFAULT_ROUGH_PRESETS,
    weeklyGoalDays: clampedGoal,
    restDays: Array.isArray(state.restDays) ? state.restDays : [],
  };
}

/**
 * 過去アーカイブ一覧（日付別ログ）を取得
 */
export function getDailyArchives(): Record<string, IntakeLogItem[]> {
  try {
    const raw = localStorage.getItem(HISTORY_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 特定の日付のログを取得（該当日にログがなければ空配列）
 */
export function getLogsForDate(date: string, todayLogs: IntakeLogItem[]): IntakeLogItem[] {
  const today = getTodayDateString();
  if (date === today) {
    return todayLogs;
  }
  const archives = getDailyArchives();
  return archives[date] || [];
}

/**
 * 特定の日付のログを保存
 */
export function saveLogsForDate(date: string, logs: IntakeLogItem[]): void {
  try {
    const archives = getDailyArchives();
    archives[date] = logs;
    localStorage.setItem(HISTORY_ARCHIVE_KEY, JSON.stringify(archives));
  } catch (e) {
    console.error('Failed to save logs for date:', e);
  }
}

/**
 * 記録が存在する日付の一覧（YYYY-MM-DD）を取得
 */
export function getDatesWithLogs(todayLogs: IntakeLogItem[]): string[] {
  const archives = getDailyArchives();
  const dates = new Set<string>(Object.keys(archives).filter(d => archives[d] && archives[d].length > 0));
  if (todayLogs.length > 0) {
    dates.add(getTodayDateString());
  }
  return Array.from(dates);
}

/**
 * 指定日より前で最も直近にログが存在する日付とそのログ一覧を取得
 */
export function getMostRecentLoggedDateBefore(
  targetDate: string,
  todayLogs: IntakeLogItem[]
): { date: string; logs: IntakeLogItem[] } | null {
  const archives = getDailyArchives();
  const today = getTodayDateString();
  const candidates: Record<string, IntakeLogItem[]> = { ...archives };

  if (todayLogs.length > 0) {
    candidates[today] = todayLogs;
  }

  const pastDates = Object.keys(candidates)
    .filter((d) => d < targetDate && Array.isArray(candidates[d]) && candidates[d].length > 0)
    .sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

  if (pastDates.length === 0) return null;
  const latestDate = pastDates[0];
  return {
    date: latestDate,
    logs: candidates[latestDate],
  };
}

export interface DailySummaryItem {
  date: string;
  hasLogs: boolean;
  isRestDay: boolean;
  totalCalories: number;
  totalP: number;
  totalF: number;
  totalC: number;
}

/**
 * 指定された日付配列ごとの集計サマリーを取得（週間トラッカー・振り返り用）
 */
export function getDailySummariesForDates(
  dates: string[],
  todayLogs: IntakeLogItem[],
  restDays: string[]
): DailySummaryItem[] {
  const today = getTodayDateString();
  const archives = getDailyArchives();
  const restSet = new Set(restDays);

  return dates.map((date) => {
    const logs = date === today ? todayLogs : archives[date] || [];
    const totals = calculateTotals(logs);
    return {
      date,
      hasLogs: logs.length > 0,
      isRestDay: restSet.has(date),
      totalCalories: totals.totalCalories,
      totalP: totals.totalP,
      totalF: totals.totalF,
      totalC: totals.totalC,
    };
  });
}

/**
 * LocalStorageから状態を読み込み、日付変更時のハンドリングを実行
 */
export function loadAppState(): AppState {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultState = getDefaultAppState();
      saveAppState(defaultState);
      return defaultState;
    }

    const parsed: AppState = JSON.parse(raw);

    if (!parsed.target || !Array.isArray(parsed.presets) || !Array.isArray(parsed.todayLogs)) {
      const defaultState = getDefaultAppState();
      saveAppState(defaultState);
      return defaultState;
    }

    const state = normalizeAppState(parsed);

    // 日付変更時のデータハンドリング
    if (state.lastActiveDate !== today) {
      // 前日のログがあればアーカイブに退避
      if (state.todayLogs && state.todayLogs.length > 0) {
        saveLogsForDate(state.lastActiveDate, state.todayLogs);
      }

      const updatedState: AppState = {
        ...state,
        lastActiveDate: today,
        todayLogs: [], // 当日の摂取履歴のみ空配列にリセット
      };
      saveAppState(updatedState);
      return updatedState;
    }

    return state;
  } catch (error) {
    console.error('Failed to load app state from localStorage:', error);
    const defaultState = getDefaultAppState();
    saveAppState(defaultState);
    return defaultState;
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // 当日のアーカイブもリアルタイム同期
    if (state.todayLogs) {
      saveLogsForDate(state.lastActiveDate, state.todayLogs);
    }
  } catch (error) {
    console.error('Failed to save app state to localStorage:', error);
  }
}
