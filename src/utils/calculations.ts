import type { IntakeLogItem, PresetItem, MealType } from '../types';

/**
 * ユーティリティ関数: 小数第1位に四捨五入する（浮動小数点丸め誤差防止）
 */
export const round1 = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 10) / 10;
};

/**
 * 数値入力フィールド用のサニタイズ関数
 * 1. "010" や "01.5" のように先頭に不要な0がついた場合、自動で先頭の0を除去して "10", "1.5" にする
 * 2. "0" 単体や "0.5" などの正当な0始まりはそのまま維持する
 */
export const cleanNumberInput = (val: string): string => {
  if (!val) return '';
  return val.replace(/^0+([1-9])/, '$1');
};

/**
 * カロリー計算式：round1(P) * 4 + round1(F) * 9 + round1(C) * 4（整数表示は Math.round()）
 * 手入力は行わず、常にPFCグラム数から自動算出する。
 */
export const calcCalories = (p: number, f: number, c: number): number => {
  return Math.round(round1(p) * 4 + round1(f) * 9 + round1(c) * 4);
};

/**
 * 目標カロリーとPFC比率から目標PFCグラム数を自動換算
 */
export const calcTargetMacros = (calories: number, pRatio: number, fRatio: number, cRatio: number) => {
  const targetP = round1((calories * (pRatio / 100)) / 4);
  const targetF = round1((calories * (fRatio / 100)) / 9);
  const targetC = round1((calories * (cRatio / 100)) / 4);
  return { targetP, targetF, targetC };
};

/**
 * 今日の日付文字列を取得 (YYYY-MM-DD, ローカル時刻基準)
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 現在の時刻からデフォルトの食事区分を判定
 * 04:00〜10:59: 朝食
 * 11:00〜16:59: 昼食
 * 17:00〜21:59: 夕食
 * 22:00〜03:59: 間食/夜食
 */
export const getDefaultMealType = (date: Date = new Date()): MealType => {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 17) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
};

/**
 * プリセット食材から指定量でのIntakeLogItemを生成
 */
export const createLogFromPreset = (
  preset: PresetItem,
  amount?: number,
  mealType?: MealType
): IntakeLogItem => {
  const currentAmount = amount !== undefined ? round1(amount) : preset.baseAmount;
  const ratio = preset.baseAmount > 0 ? currentAmount / preset.baseAmount : 1;

  const currentP = round1(preset.baseP * ratio);
  const currentF = round1(preset.baseF * ratio);
  const currentC = round1(preset.baseC * ratio);

  const formattedAmount = Number.isInteger(currentAmount) ? currentAmount : round1(currentAmount);
  const displayName = `${preset.name} ${formattedAmount}${preset.unit}`;

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    presetId: preset.id,
    name: displayName,
    unit: preset.unit,
    baseAmount: preset.baseAmount,
    currentAmount,
    baseP: preset.baseP,
    baseF: preset.baseF,
    baseC: preset.baseC,
    currentP,
    currentF,
    currentC,
    timestamp: Date.now(),
    mealType: mealType || getDefaultMealType(),
  };
};

/**
 * ログアイテムの量(currentAmount)や食事区分を再計算して新しいオブジェクトを返す
 */
export const recalculateLogItem = (
  item: IntakeLogItem,
  newAmount: number,
  newMealType?: MealType
): IntakeLogItem => {
  const safeAmount = Math.max(0, round1(newAmount));
  const ratio = item.baseAmount > 0 ? safeAmount / item.baseAmount : 1;

  const currentP = round1(item.baseP * ratio);
  const currentF = round1(item.baseF * ratio);
  const currentC = round1(item.baseC * ratio);

  const baseName = item.name.replace(/\s+\d+(\.\d+)?[^\s]*$/, '');
  const formattedAmount = Number.isInteger(safeAmount) ? safeAmount : round1(safeAmount);
  const newName = `${baseName} ${formattedAmount}${item.unit}`;

  return {
    ...item,
    name: newName,
    currentAmount: safeAmount,
    currentP,
    currentF,
    currentC,
    mealType: newMealType !== undefined ? newMealType : (item.mealType || getDefaultMealType(new Date(item.timestamp))),
  };
};

/**
 * ログの合計値を計算
 */
export const calculateTotals = (logs: IntakeLogItem[]) => {
  return logs.reduce(
    (acc, log) => {
      const p = round1(acc.totalP + log.currentP);
      const f = round1(acc.totalF + log.currentF);
      const c = round1(acc.totalC + log.currentC);
      return {
        totalP: p,
        totalF: f,
        totalC: c,
        totalCalories: acc.totalCalories + calcCalories(log.currentP, log.currentF, log.currentC),
      };
    },
    { totalP: 0, totalF: 0, totalC: 0, totalCalories: 0 }
  );
};
