import type { AppState, IntakeLogItem, MealComboItem, PresetItem, RoughPresetItem } from '../types';
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
    name: '全卵',
    category: 'main',
    unit: '個',
    baseAmount: 1,
    baseP: 7.4,
    baseF: 6.2,
    baseC: 0.2,
  },
  {
    id: 'main-mackerel',
    name: '塩サバ',
    category: 'main',
    unit: '切れ',
    baseAmount: 1,
    baseP: 16.5,
    baseF: 13.5,
    baseC: 0.2,
  },
  {
    id: 'main-shishamo',
    name: 'ししゃも',
    category: 'main',
    unit: '尾',
    baseAmount: 3,
    baseP: 6.8,
    baseF: 3.8,
    baseC: 0.3,
  },
  // 【副菜】
  {
    id: 'sub-natto',
    name: '納豆',
    category: 'sub',
    unit: 'パック',
    baseAmount: 1,
    baseP: 7.4,
    baseF: 5.0,
    baseC: 5.4,
  },
  {
    id: 'sub-mekabu',
    name: 'めかぶ',
    category: 'sub',
    unit: 'パック',
    baseAmount: 1,
    baseP: 0.8,
    baseF: 0.2,
    baseC: 2.5,
  },
  {
    id: 'sub-oliveoil',
    name: 'オリーブ油',
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
    mealCombos: [],
  };
}

// 旧初期プリセット（未編集データのみ対象）の自動マイグレーション定義
const LEGACY_PRESET_MIGRATIONS: Record<
  string,
  {
    oldName: string;
    oldUnit: string;
    oldBaseAmount: number;
    newName: string;
    newBaseAmount: number;
  }
> = {
  'main-egg': {
    oldName: '全卵 1個',
    oldUnit: '個',
    oldBaseAmount: 60,
    newName: '全卵',
    newBaseAmount: 1,
  },
  'main-mackerel': {
    oldName: '塩サバ 1切れ',
    oldUnit: '切れ',
    oldBaseAmount: 80,
    newName: '塩サバ',
    newBaseAmount: 1,
  },
  'main-shishamo': {
    oldName: 'ししゃも 3尾',
    oldUnit: '尾',
    oldBaseAmount: 45,
    newName: 'ししゃも',
    newBaseAmount: 3,
  },
  'sub-natto': {
    oldName: '納豆 1パック',
    oldUnit: 'パック',
    oldBaseAmount: 45,
    newName: '納豆',
    newBaseAmount: 1,
  },
  'sub-mekabu': {
    oldName: 'めかぶ 1パック',
    oldUnit: 'パック',
    oldBaseAmount: 45,
    newName: 'めかぶ',
    newBaseAmount: 1,
  },
  'sub-oliveoil': {
    oldName: 'オリーブ油 小さじ1',
    oldUnit: 'g',
    oldBaseAmount: 4,
    newName: 'オリーブ油',
    newBaseAmount: 4,
  },
};

/**
 * 旧バージョンからのデータ互換性を保ちつつ不足フィールド補完・未編集初期プリセット正規化を行う
 */
export function normalizeAppState(state: AppState): AppState {
  const rawGoal = typeof state.weeklyGoalDays === 'number' ? state.weeklyGoalDays : 5;
  const clampedGoal = Math.min(7, Math.max(3, Math.round(rawGoal)));

  let presetsMigrated = false;
  const migratedPresets = Array.isArray(state.presets)
    ? state.presets.map((preset) => {
        const rule = LEGACY_PRESET_MIGRATIONS[preset.id];
        if (
          rule &&
          preset.name === rule.oldName &&
          preset.unit === rule.oldUnit &&
          preset.baseAmount === rule.oldBaseAmount
        ) {
          presetsMigrated = true;
          return {
            ...preset,
            name: rule.newName,
            baseAmount: rule.newBaseAmount,
          };
        }
        return preset;
      })
    : DEFAULT_PRESETS;

  const safeMealCombos: MealComboItem[] = Array.isArray(state.mealCombos)
    ? state.mealCombos.filter(
        (combo): combo is MealComboItem =>
          combo !== null &&
          typeof combo === 'object' &&
          typeof combo.id === 'string' &&
          typeof combo.name === 'string' &&
          Array.isArray(combo.items)
      )
    : [];

  return {
    ...state,
    presets: presetsMigrated ? migratedPresets : state.presets,
    roughPresets: Array.isArray(state.roughPresets) ? state.roughPresets : DEFAULT_ROUGH_PRESETS,
    weeklyGoalDays: clampedGoal,
    restDays: Array.isArray(state.restDays) ? state.restDays : [],
    mealCombos: safeMealCombos,
  };
}

export interface BackupPayload {
  version: 2;
  exportedAt: string;
  appState: AppState;
  dailyArchives: Record<string, IntakeLogItem[]>;
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
 * 過去アーカイブ一覧（日付別ログ）を一括で安全に保存
 */
export function saveDailyArchives(archives: Record<string, IntakeLogItem[]>): void {
  try {
    localStorage.setItem(HISTORY_ARCHIVE_KEY, JSON.stringify(archives));
  } catch (e) {
    console.error('Failed to save daily archives:', e);
  }
}

/**
 * 過去アーカイブ込みのバックアップペイロード（v2）を生成
 */
export function createBackupPayload(appState: AppState): BackupPayload {
  const archives = getDailyArchives();
  const mergedArchives: Record<string, IntakeLogItem[]> = {
    ...archives,
    [appState.lastActiveDate]: Array.isArray(appState.todayLogs) ? appState.todayLogs : [],
  };

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    appState,
    dailyArchives: mergedArchives,
  };
}

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * バックアップJSON文字列を検証・パース（v2新形式および旧形式AppStateの両対応）
 */
export function parseBackupJson(
  rawJson: string
): { appState: AppState; dailyArchives?: Record<string, IntakeLogItem[]> } {
  if (!rawJson || !rawJson.trim()) {
    throw new Error('JSONテキストを入力してください。');
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawJson);
  } catch {
    throw new Error('JSONの構文が正しくありません。コピーした全文をそのまま貼り付けてください。');
  }

  if (!parsedUnknown || typeof parsedUnknown !== 'object' || Array.isArray(parsedUnknown)) {
    throw new Error('バックアップデータの形式が正しくありません。');
  }

  const rootObj = parsedUnknown as Record<string, unknown>;
  const isV2 =
    'appState' in rootObj &&
    rootObj.appState !== null &&
    typeof rootObj.appState === 'object' &&
    !Array.isArray(rootObj.appState);

  const candidateState = (isV2 ? rootObj.appState : rootObj) as Partial<AppState>;

  if (
    !candidateState.target ||
    typeof candidateState.target !== 'object' ||
    typeof candidateState.target.calories !== 'number' ||
    !Array.isArray(candidateState.presets) ||
    !Array.isArray(candidateState.todayLogs) ||
    typeof candidateState.lastActiveDate !== 'string' ||
    !DATE_KEY_REGEX.test(candidateState.lastActiveDate.trim())
  ) {
    throw new Error(
      'データ形式が正しくありません（目標設定・食材パーツ・記録データが見つかりません）。'
    );
  }

  const validatedState: AppState = {
    ...(candidateState as AppState),
    lastActiveDate: candidateState.lastActiveDate.trim(),
  };

  if (isV2 && 'dailyArchives' in rootObj && rootObj.dailyArchives !== undefined) {
    if (
      rootObj.dailyArchives === null ||
      typeof rootObj.dailyArchives !== 'object' ||
      Array.isArray(rootObj.dailyArchives)
    ) {
      throw new Error('バックアップ内の過去履歴（dailyArchives）の形式が正しくありません。');
    }

    const rawArchives = rootObj.dailyArchives as Record<string, unknown>;
    const sanitizedArchives: Record<string, IntakeLogItem[]> = {};
    for (const [key, value] of Object.entries(rawArchives)) {
      const trimmedKey = key.trim();
      if (DATE_KEY_REGEX.test(trimmedKey) && Array.isArray(value)) {
        sanitizedArchives[trimmedKey] = value as IntakeLogItem[];
      }
    }

    return {
      appState: validatedState,
      dailyArchives: sanitizedArchives,
    };
  }

  return {
    appState: validatedState,
  };
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

    // プリセットの自動マイグレーションが発生した場合は変換後の状態を永続化する
    if (state.presets !== parsed.presets) {
      saveAppState(state);
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
