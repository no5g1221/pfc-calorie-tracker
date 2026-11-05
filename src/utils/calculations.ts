import type { IntakeLogItem, PresetItem } from '../types';

/**
 * ユーティリティ関数: 小数第1位に四捨五入する（浮動小数点丸め誤差防止）
 */
export const round1 = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 10) / 10;
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
 * targetP = round1((calories * (pRatio / 100)) / 4)
 * targetF = round1((calories * (fRatio / 100)) / 9)
 * targetC = round1((calories * (cRatio / 100)) / 4)
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
 * プリセット食材から指定量でのIntakeLogItemを生成
 */
export const createLogFromPreset = (preset: PresetItem, amount?: number): IntakeLogItem => {
  const currentAmount = amount !== undefined ? round1(amount) : preset.baseAmount;
  const ratio = preset.baseAmount > 0 ? currentAmount / preset.baseAmount : 1;

  const currentP = round1(preset.baseP * ratio);
  const currentF = round1(preset.baseF * ratio);
  const currentC = round1(preset.baseC * ratio);

  // 表示名: 例 "白米 150g"
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
  };
};

/**
 * ログアイテムの量(currentAmount)を再計算して新しいオブジェクトを返す
 */
export const recalculateLogItem = (item: IntakeLogItem, newAmount: number): IntakeLogItem => {
  const safeAmount = Math.max(0, round1(newAmount));
  const ratio = item.baseAmount > 0 ? safeAmount / item.baseAmount : 1;

  const currentP = round1(item.baseP * ratio);
  const currentF = round1(item.baseF * ratio);
  const currentC = round1(item.baseC * ratio);

  // 元の食材名（末尾の数値・単位を除去したもの）を取得して、新しい量を付け直す
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
  };
};

/**
 * 今日の摂取ログの合計値を計算（round1で加算丸め）
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
