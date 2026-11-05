import type { AppState, IntakeLogItem, PresetItem } from '../types';
import { calcTargetMacros, getTodayDateString } from './calculations';

export const STORAGE_KEY = 'pfc_tracker_app_state';
export const HISTORY_ARCHIVE_KEY = 'pfc_tracker_daily_archives';

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

    const state: AppState = JSON.parse(raw);

    if (!state.target || !Array.isArray(state.presets) || !Array.isArray(state.todayLogs)) {
      const defaultState = getDefaultAppState();
      saveAppState(defaultState);
      return defaultState;
    }

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
