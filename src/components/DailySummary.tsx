import React from 'react';
import type { AppState } from '../types';
import { calculateTotals, round1 } from '../utils/calculations';
import { Flame } from 'lucide-react';

interface DailySummaryProps {
  appState: AppState;
  onOpenTargetModal: () => void;
}

export const DailySummary: React.FC<DailySummaryProps> = ({ appState, onOpenTargetModal }) => {
  const { target, todayLogs } = appState;
  const totals = calculateTotals(todayLogs);

  const calorieRemaining = target.calories - totals.totalCalories;
  const caloriePercent = Math.min(100, Math.round((totals.totalCalories / (target.calories || 1)) * 100));

  const pPercent = Math.min(100, Math.round((totals.totalP / (target.targetP || 1)) * 100));
  const fPercent = Math.min(100, Math.round((totals.totalF / (target.targetF || 1)) * 100));
  const cPercent = Math.min(100, Math.round((totals.totalC / (target.targetC || 1)) * 100));

  const pRemaining = round1(target.targetP - totals.totalP);
  const fRemaining = round1(target.targetF - totals.totalF);
  const cRemaining = round1(target.targetC - totals.totalC);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-sm">
      {/* メインカロリーゲージ */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">合計摂取カロリー</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-white">{totals.totalCalories}</span>
              <span className="text-xs text-slate-400 font-medium">/ {target.calories} kcal</span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenTargetModal}
          className="text-right px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold transition-colors"
        >
          <span className="text-[10px] text-slate-400 block">目標残</span>
          <span className={calorieRemaining < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
            {calorieRemaining >= 0 ? `${calorieRemaining} kcal` : `+${Math.abs(calorieRemaining)} kcal`}
          </span>
        </button>
      </div>

      {/* カロリープログレスバー */}
      <div className="space-y-1 mb-3.5">
        <div className="h-2.5 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              calorieRemaining < 0
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
            }`}
            style={{ width: `${caloriePercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span>進捗: <strong className="text-slate-200">{caloriePercent}%</strong></span>
          <span>{calorieRemaining >= 0 ? `残り ${calorieRemaining} kcal` : `${Math.abs(calorieRemaining)} kcal オーバー`}</span>
        </div>
      </div>

      {/* PFC 3分割プログレス & 現在値 / 目標値 (g) */}
      <div className="grid grid-cols-3 gap-2">
        {/* P: タンパク質 */}
        <div className="bg-slate-950/70 border border-sky-500/20 rounded-2xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400">P (タンパク)</span>
            <span className="text-[10px] text-slate-400">{target.pRatio}%</span>
          </div>
          <div className="my-1.5">
            <div className="text-sm font-black text-white">
              {totals.totalP} <span className="text-[10px] text-slate-400 font-normal">/ {target.targetP}g</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-300"
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
        <div className="bg-slate-950/70 border border-amber-500/20 rounded-2xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">F (脂質)</span>
            <span className="text-[10px] text-slate-400">{target.fRatio}%</span>
          </div>
          <div className="my-1.5">
            <div className="text-sm font-black text-white">
              {totals.totalF} <span className="text-[10px] text-slate-400 font-normal">/ {target.targetF}g</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
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
        <div className="bg-slate-950/70 border border-emerald-500/20 rounded-2xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">C (炭水化物)</span>
            <span className="text-[10px] text-slate-400">{target.cRatio}%</span>
          </div>
          <div className="my-1.5">
            <div className="text-sm font-black text-white">
              {totals.totalC} <span className="text-[10px] text-slate-400 font-normal">/ {target.targetC}g</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
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
  );
};
