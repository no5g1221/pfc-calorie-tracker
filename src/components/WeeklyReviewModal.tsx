import React from 'react';
import type { AppState, IntakeLogItem } from '../types';
import {
  getCurrentWeekDates,
  getLastNDates,
  getTodayDateString,
  parseDateString,
  round1,
} from '../utils/calculations';
import { getDailySummariesForDates } from '../utils/storage';
import { X, BarChart3, TrendingUp, CalendarCheck } from 'lucide-react';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: AppState['target'];
  todayLogs: IntakeLogItem[];
  restDays: string[];
  weeklyGoalDays: number;
  loggedDates: string[];
}

const weekdayShort = ['日', '月', '火', '水', '木', '金', '土'];

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
  isOpen,
  onClose,
  target,
  todayLogs,
  restDays,
  weeklyGoalDays,
  loggedDates,
}) => {
  if (!isOpen) return null;

  const today = getTodayDateString();
  const last7Dates = getLastNDates(7, today);
  const summaries = getDailySummariesForDates(last7Dates, todayLogs, restDays);

  const maxDayCalories = Math.max(...summaries.map((s) => s.totalCalories), 0);
  const chartMax = Math.max(target.calories * 1.25, maxDayCalories, 500);
  const targetLinePercent = Math.min(96, Math.max(8, Math.round((target.calories / chartMax) * 100)));

  // 7日平均（お休み日以外の記録がある日のみを集計）
  const activeLoggedDays = summaries.filter((s) => s.hasLogs && !s.isRestDay);
  const activeCount = activeLoggedDays.length;

  const avgCal =
    activeCount > 0
      ? Math.round(activeLoggedDays.reduce((sum, s) => sum + s.totalCalories, 0) / activeCount)
      : 0;
  const avgP =
    activeCount > 0
      ? round1(activeLoggedDays.reduce((sum, s) => sum + s.totalP, 0) / activeCount)
      : 0;
  const avgF =
    activeCount > 0
      ? round1(activeLoggedDays.reduce((sum, s) => sum + s.totalF, 0) / activeCount)
      : 0;
  const avgC =
    activeCount > 0
      ? round1(activeLoggedDays.reduce((sum, s) => sum + s.totalC, 0) / activeCount)
      : 0;

  const avgRatio = target.calories > 0 ? avgCal / target.calories : 1;
  const avgRatioPercent = Math.round(avgRatio * 100);

  const getCoachingMessage = () => {
    if (activeCount === 0) {
      return 'まずは直近7日で1日分の記録を入れてみよう！週平均が見えてきます 🌱';
    }
    if (avgRatio >= 0.85 && avgRatio <= 1.15) {
      return '7日平均は目標ぴったり！1日のズレは気にしなくてOK 👍';
    }
    if (avgRatio < 0.85) {
      return '少し控えめペース。我慢しすぎずしっかり食べてOK！';
    }
    return '少し高めペース。明日以降でゆるく調整しよう 🌱';
  };

  // 継続サマリー計算
  const currentWeekDates = getCurrentWeekDates(today);
  const loggedSet = new Set(loggedDates);
  const restSet = new Set(restDays);

  const weekAchievedCount = currentWeekDates.filter(
    (d) => loggedSet.has(d) || restSet.has(d)
  ).length;
  const weekRestCount = currentWeekDates.filter((d) => restSet.has(d)).length;

  const currentMonthPrefix = today.slice(0, 7); // YYYY-MM
  const monthUniqueDays = new Set([
    ...loggedDates.filter((d) => d.startsWith(currentMonthPrefix)),
    ...restDays.filter((d) => d.startsWith(currentMonthPrefix)),
  ]);
  const monthAchievedCount = monthUniqueDays.size;

  const formatLabel = (dateStr: string) => {
    const d = parseDateString(dateStr);
    const md = `${d.getMonth() + 1}/${d.getDate()}`;
    const wd = weekdayShort[d.getDay()];
    return { md, wd };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                週間ふりかえり
              </span>
              <h3 className="text-base font-bold text-white">7日平均 & ゆる継続レポート</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. 7日平均サマリーカード */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">
                直近7日の1日平均（{activeCount}日分）
              </span>
            </div>
            {activeCount > 0 && (
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${
                  avgRatio >= 0.85 && avgRatio <= 1.15
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : avgRatio < 0.85
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                目標比 {avgRatioPercent}%
              </span>
            )}
          </div>

          {activeCount > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-white">{avgCal}</span>
                  <span className="text-xs font-semibold text-slate-400 ml-1">kcal / 日</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-sky-400 font-bold">P:{avgP}g</span>
                  <span className="text-amber-400 font-bold">F:{avgF}g</span>
                  <span className="text-emerald-400 font-bold">C:{avgC}g</span>
                </div>
              </div>
              <p className="text-xs font-bold text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                {getCoachingMessage()}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 py-1">{getCoachingMessage()}</p>
          )}
        </div>

        {/* 2. 直近7日間のカロリー棒グラフ */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">直近7日間のカロリー推移</span>
            <span className="text-[11px] font-bold text-slate-400">
              目標ライン: {target.calories} kcal
            </span>
          </div>

          <div className="relative h-40 pt-4 pb-1 px-1">
            {/* 目標カロリーの破線ライン */}
            <div
              className="absolute left-0 right-0 border-t border-dashed border-sky-400/60 z-10 pointer-events-none flex justify-end"
              style={{ bottom: `${targetLinePercent}%` }}
            >
              <span className="text-[9px] font-bold text-sky-300 bg-slate-900/90 px-1 rounded -mt-2.5">
                {target.calories}
              </span>
            </div>

            {/* 7本のバー */}
            <div className="relative z-20 h-full grid grid-cols-7 gap-2 items-end">
              {summaries.map((s) => {
                const heightPercent =
                  s.totalCalories > 0
                    ? Math.max(8, Math.min(100, Math.round((s.totalCalories / chartMax) * 100)))
                    : 0;
                const ratio = target.calories > 0 ? s.totalCalories / target.calories : 1;

                let barEl: React.ReactNode;
                if (s.isRestDay && !s.hasLogs) {
                  barEl = (
                    <div
                      className="w-full max-w-[26px] rounded-t-lg border border-dashed border-purple-400/60 bg-purple-500/15 flex items-center justify-center text-[11px]"
                      style={{ height: '34%' }}
                      title="お休み日"
                    >
                      🌿
                    </div>
                  );
                } else if (!s.hasLogs) {
                  barEl = (
                    <div
                      className="w-full max-w-[26px] h-1.5 rounded-full bg-slate-800/80 border border-slate-700/40"
                      title="未記録"
                    />
                  );
                } else {
                  let colorClass = 'from-emerald-600 to-emerald-400';
                  if (s.isRestDay) {
                    colorClass = 'from-purple-600 to-purple-400';
                  } else if (ratio < 0.85) {
                    colorClass = 'from-sky-600 to-sky-400';
                  } else if (ratio > 1.15) {
                    colorClass = 'from-amber-600 to-amber-400';
                  }

                  barEl = (
                    <div
                      className={`w-full max-w-[26px] rounded-t-lg bg-gradient-to-t ${colorClass} transition-all duration-300 flex items-start justify-center pt-0.5`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${s.totalCalories} kcal`}
                    >
                      {s.isRestDay && <span className="text-[9px] leading-none">🌿</span>}
                    </div>
                  );
                }

                return (
                  <div key={s.date} className="h-full flex flex-col justify-end items-center gap-1">
                    {s.hasLogs && (
                      <span className="text-[9px] font-mono font-bold text-slate-300 leading-none">
                        {s.totalCalories}
                      </span>
                    )}
                    {barEl}
                  </div>
                );
              })}
            </div>
          </div>

          {/* X軸ラベル */}
          <div className="grid grid-cols-7 gap-2 text-center pt-1 border-t border-slate-800/80">
            {summaries.map((s) => {
              const { md, wd } = formatLabel(s.date);
              const isToday = s.date === today;
              return (
                <div key={s.date} className="leading-tight">
                  <div
                    className={`text-[10px] font-bold ${
                      isToday ? 'text-sky-400' : 'text-slate-400'
                    }`}
                  >
                    {md}
                  </div>
                  <div
                    className={`text-[9px] font-bold ${
                      isToday ? 'text-sky-300' : 'text-slate-500'
                    }`}
                  >
                    ({wd})
                  </div>
                </div>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              目標±15%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              控えめ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              少し高め
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              お休み日
            </span>
          </div>
        </div>

        {/* 3. 継続サマリー */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <CalendarCheck className="w-4 h-4 text-sky-400" />
            <span>継続ステータス</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 text-center">
              <div className="text-[10px] font-bold text-slate-400">今週の記録</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {weekAchievedCount}
                <span className="text-xs font-bold text-slate-400"> / {weeklyGoalDays}日</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 text-center">
              <div className="text-[10px] font-bold text-slate-400">今週のお休み</div>
              <div className="text-base font-black text-purple-300 mt-0.5">
                {weekRestCount}
                <span className="text-xs font-bold text-slate-400">日</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 text-center">
              <div className="text-[10px] font-bold text-slate-400">今月の記録</div>
              <div className="text-base font-black text-sky-400 mt-0.5">
                {monthAchievedCount}
                <span className="text-xs font-bold text-slate-400">日</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
