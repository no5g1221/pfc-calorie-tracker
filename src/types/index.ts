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
}

export type CategoryType = 'staple' | 'main' | 'sub';
