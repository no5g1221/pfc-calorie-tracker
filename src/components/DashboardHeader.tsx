import React from 'react';
import type { AppState } from '../types';
import { calculateTotals, round1 } from '../utils/calculations';
import { Flame, Target } from 'lucide-react';

interface DashboardHeaderProps {
  appState: AppState;
  onOpenTargetModal: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  appState,
  onOpenTargetModal,
}) => {
  const { target, todayLogs } = appState;
  const totals = calculateTotals(todayLogs);

  const calorieRemaining = target.calories - totals.totalCalories;
  const rawCaloriePercent = (totals.totalCalories / (target.calories || 1)) * 100;
  const caloriePercent = Math.min(100, Math.round(rawCaloriePercent));
  const isTargetAchieved = totals.totalCalories >= target.calories && target.calories > 0;

  const pPercent = Math.min(100, Math.round((totals.totalP / (target.targetP || 1)) * 100));
  const fPercent = Math.min(100, Math.round((totals.totalF / (target.targetF || 1)) * 100));
  const cPercent = Math.min(100, Math.round((totals.totalC / (target.targetC || 1)) * 100));

  const pRemaining = round1(target.targetP - totals.totalP);
  const fRemaining = round1(target.targetF - totals.totalF);
  const cRemaining = round1(target.targetC - totals.totalC);

  return (
    <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/80 px-4 pt-4 pb-3 shadow-lg shadow-black/20">
      <div className="w-full max-w-md mx-auto">
        {/* メインカロリーカード */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            {/* 左側: 現在の摂取カロリー強調表示 */}
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  摂取カロリー
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tracking-tight leading-none">
                    {totals.totalCalories}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">kcal</span>
                </div>
              </div>
            </div>

            {/* 右側: 目標カロリーと残りカロリー */}
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={onOpenTargetModal}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 px-2 py-0.5 rounded-lg transition-all active:scale-95"
                title="目標値を変更"
              >
                <Target className="w-3 h-3 text-sky-400" />
                <span>目標 {target.calories} kcal</span>
              </button>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium block">残り</span>
                <span
                  className={`text-xs font-extrabold ${
                    calorieRemaining < 0
                      ? 'text-rose-400'
                      : isTargetAchieved
                      ? 'text-teal-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {calorieRemaining >= 0
                    ? `${calorieRemaining} kcal`
                    : `+${Math.abs(calorieRemaining)} kcal 超過`}
                </span>
              </div>
            </div>
          </div>

          {/* カロリー進捗バー: h-2.5, transition-all duration-500 ease-out */}
          <div className="mt-3 space-y-1">
            <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isTargetAchieved
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                }`}
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>進捗率: <strong className="text-slate-200">{caloriePercent}%</strong></span>
              <span>{isTargetAchieved ? '目標達成！' : `あと ${calorieRemaining} kcal`}</span>
            </div>
          </div>

          {/* PFC 3分割サブカード: grid-cols-3 gap-2 mt-2.5 */}
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            {/* P: タンパク質 */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400">P</span>
                <span className="text-[10px] text-slate-400 font-mono">{target.pRatio}%</span>
              </div>
              <div className="my-1">
                <div className="text-xs font-extrabold text-white leading-tight">
                  {totals.totalP}
                  <span className="text-[10px] text-slate-400 font-normal"> / {target.targetP}g</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${pPercent}%` }}
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between items-center">
                <span>残</span>
                <span className={pRemaining < 0 ? 'text-sky-300 font-bold' : 'text-slate-300'}>
                  {pRemaining >= 0 ? `${pRemaining}g` : `+${Math.abs(pRemaining)}g`}
                </span>
              </div>
            </div>

            {/* F: 脂質 */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">F</span>
                <span className="text-[10px] text-slate-400 font-mono">{target.fRatio}%</span>
              </div>
              <div className="my-1">
                <div className="text-xs font-extrabold text-white leading-tight">
                  {totals.totalF}
                  <span className="text-[10px] text-slate-400 font-normal"> / {target.targetF}g</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${fPercent}%` }}
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between items-center">
                <span>残</span>
                <span className={fRemaining < 0 ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                  {fRemaining >= 0 ? `${fRemaining}g` : `+${Math.abs(fRemaining)}g`}
                </span>
              </div>
            </div>

            {/* C: 炭水化物 */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">C</span>
                <span className="text-[10px] text-slate-400 font-mono">{target.cRatio}%</span>
              </div>
              <div className="my-1">
                <div className="text-xs font-extrabold text-white leading-tight">
                  {totals.totalC}
                  <span className="text-[10px] text-slate-400 font-normal"> / {target.targetC}g</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${cPercent}%` }}
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between items-center">
                <span>残</span>
                <span className={cRemaining < 0 ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                  {cRemaining >= 0 ? `${cRemaining}g` : `+${Math.abs(cRemaining)}g`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
