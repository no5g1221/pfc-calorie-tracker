import type { IntakeLogItem, PresetItem, MealType, RoughPresetItem } from '../types';

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
 * Dateをローカル時刻基準の YYYY-MM-DD 文字列に整形
 */
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * YYYY-MM-DD 文字列をローカル時刻基準の Date に変換（UTCズレ防止）
 */
export const parseDateString = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/**
 * 指定日付から delta 日前後の YYYY-MM-DD を取得
 */
export const addDays = (dateStr: string, delta: number): string => {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + delta);
  return formatDateString(date);
};

/**
 * 今日の日付文字列を取得 (YYYY-MM-DD, ローカル時刻基準)
 */
export const getTodayDateString = (): string => {
  return formatDateString(new Date());
};

/**
 * 指定日を含む月〜日の7日間の日付文字列配列を返す
 */
export const getCurrentWeekDates = (baseDateStr: string = getTodayDateString()): string[] => {
  const baseDate = parseDateString(baseDateStr);
  const day = baseDate.getDay(); // 0:日, 1:月, ..., 6:土
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return formatDateString(d);
  });
};

/**
 * 指定日を末尾とする直近 N 日間の日付文字列配列を古い順で返す
 */
export const getLastNDates = (n: number, endDateStr: string = getTodayDateString()): string[] => {
  return Array.from({ length: n }, (_, i) => addDays(endDateStr, i - (n - 1)));
};

/**
 * 2つの YYYY-MM-DD 日付文字列の整数日数差 (toDateStr - fromDateStr)
 */
export const diffDays = (fromDateStr: string, toDateStr: string): number => {
  const from = parseDateString(fromDateStr);
  const to = parseDateString(toDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
};

/**
 * カロリーとPFC比率から仮のPFCグラム数を換算（比率合計が100でない場合は 20/30/50 にフォールバック）
 */
export const calcMacrosFromCalories = (
  calories: number,
  pRatio: number,
  fRatio: number,
  cRatio: number
): { p: number; f: number; c: number } => {
  const safeCalories = Math.max(0, calories);
  const isValidRatio = pRatio + fRatio + cRatio === 100;
  const effP = isValidRatio ? pRatio : 20;
  const effF = isValidRatio ? fRatio : 30;
  const effC = isValidRatio ? cRatio : 50;

  return {
    p: round1((safeCalories * (effP / 100)) / 4),
    f: round1((safeCalories * (effF / 100)) / 9),
    c: round1((safeCalories * (effC / 100)) / 4),
  };
};

/**
 * ざっくり記録プリセットからIntakeLogItemを生成
 */
export const createRoughLogItem = (
  preset: RoughPresetItem,
  scale: number,
  scaleLabel: string,
  mealType: MealType
): IntakeLogItem => {
  const currentP = round1(preset.baseP * scale);
  const currentF = round1(preset.baseF * scale);
  const currentC = round1(preset.baseC * scale);

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    presetId: preset.id,
    name: `${preset.icon} ${preset.name}（${scaleLabel}）`,
    unit: '食',
    baseAmount: 1,
    currentAmount: scale,
    baseP: preset.baseP,
    baseF: preset.baseF,
    baseC: preset.baseC,
    currentP,
    currentF,
    currentC,
    timestamp: Date.now(),
    mealType,
    isRough: true,
  };
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
