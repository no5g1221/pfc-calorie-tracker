export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealInfo {
  id: MealType;
  label: string;
  icon: string;
}

// プリセット（食材パーツ）の型定義
export interface PresetItem {
  id: string;
  name: string;           // 例: "白米"
  category: 'staple' | 'main' | 'sub'; // 主食 / 主菜 / 副菜・他
  unit: string;           // 単位（例: "g", "尾", "個", "パック"）
  baseAmount: number;     // 基準量（例: 150）
  baseP: number;          // 基準量に対するタンパク質(g)（例: 3.8）
  baseF: number;          // 基準量に対する脂質(g)（例: 0.5）
  baseC: number;          // 基準量に対する炭水化物(g)（例: 55.7）
}

// ざっくり記録プリセットの型定義
export interface RoughPresetItem {
  id: string;
  name: string;   // 例: "定食・丼もの"
  icon: string;   // 例: "🍱"
  baseP: number;  // 普通(1.0x)の目安P(g)
  baseF: number;  // 普通(1.0x)の目安F(g)
  baseC: number;  // 普通(1.0x)の目安C(g)
}

// 今日の摂取履歴の型定義
export interface IntakeLogItem {
  id: string;
  presetId?: string;      // 元のプリセットID（自由入力時は任意）
  name: string;           // 表示名（例: "白米 120g"）
  unit: string;
  baseAmount: number;     // 基準量（再計算の母数）
  currentAmount: number;  // 実際に食べた量
  baseP: number;          // 基準P
  baseF: number;          // 基準F
  baseC: number;          // 基準C
  currentP: number;       // 計算後のP = round1(baseP * (currentAmount / baseAmount))
  currentF: number;       // 計算後のF = round1(baseF * (currentAmount / baseAmount))
  currentC: number;       // 計算後のC = round1(baseC * (currentAmount / baseAmount))
  timestamp: number;
  mealType?: MealType;    // 朝食 / 昼食 / 夕食 / 間食
  isRough?: boolean;      // ざっくり記録・カロリーのみ入力フラグ
}

// マイ定食（コンボ）の1品目スナップショット型定義
export interface MealComboEntry {
  presetId?: string;
  name: string;
  unit: string;
  baseAmount: number;
  currentAmount: number;
  baseP: number;
  baseF: number;
  baseC: number;
  currentP: number;
  currentF: number;
  currentC: number;
  isRough?: boolean;
}

// マイ定食（コンボ）の型定義
export interface MealComboItem {
  id: string;
  name: string;
  items: MealComboEntry[];
  createdAt: number;
}

// アプリ全体のLocalStorage保存型定義
export interface AppState {
  lastActiveDate: string; // YYYY-MM-DD（日付判定用）
  target: {
    calories: number;     // 例: 2000
    pRatio: number;       // 例: 30 (%)
    fRatio: number;       // 例: 20 (%)
    cRatio: number;       // 例: 50 (%)
    targetP: number;      // 換算後の目標P(g)
    targetF: number;      // 換算後の目標F(g)
    targetC: number;      // 換算後の目標C(g)
  };
  presets: PresetItem[];  // ユーザーが編集・追加した食材パーツ（翌日も保持）
  todayLogs: IntakeLogItem[]; // 当日の摂取履歴（日付が変わったら空配列にリセット）
  roughPresets?: RoughPresetItem[]; // ざっくり記録用メニュー（未設定時はデフォルト8種で補完）
  weeklyGoalDays?: number;          // 週のゆる記録目標日数（デフォルト5日）
  restDays?: string[];              // お休み・チートデイに設定した日付配列 (YYYY-MM-DD)
  mealCombos?: MealComboItem[];     // 1食分をまとめて登録できるマイ定食（コンボ）
}

export type CategoryType = 'staple' | 'main' | 'sub';

// AI栄養成分推定の結果型定義
export interface NutritionEstimateResult {
  name: string;
  category: CategoryType;
  baseAmount: number;
  unit: string;
  baseP: number;
  baseF: number;
  baseC: number;
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

// プッシュ通知リマインダー設定の型定義
export type ReminderSlotKey = 'morning' | 'lunch' | 'dinner';

export interface ReminderSlotConfig {
  enabled: boolean;
  time: string; // "HH:MM"
}

export interface ReminderSettings {
  enabled: boolean;
  token?: string;
  slots: Record<ReminderSlotKey, ReminderSlotConfig>;
}
