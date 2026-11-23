import React from 'react';
import { Check, ChevronRight, Sparkles } from 'lucide-react';

interface HabitStripProps {
  weekDates: string[];
  today: string;
  loggedDates: string[];
  restDays: string[];
  weeklyGoalDays: number;
  onOpenWeeklyReview: () => void;
}

const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

export const HabitStrip: React.FC<HabitStripProps> = ({
  weekDates,
  today,
  loggedDates,
  restDays,
  weeklyGoalDays,
  onOpenWeeklyReview,
}) => {
  const loggedSet = new Set(loggedDates);
  const restSet = new Set(restDays);

  const achievedCount = weekDates.filter((d) => loggedSet.has(d) || restSet.has(d)).length;
  const isWeeklyAchieved = achievedCount >= weeklyGoalDays;

  return (
    <button
      type="button"
      onClick={onOpenWeeklyReview}
      className="w-full text-left bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl px-3.5 py-2.5 shadow-sm transition-all duration-150 active:scale-[0.99] group"
      title="週間ふりかえりを開く"
    >
      {/* 上段: タイトル + 達成進捗 + ふりかえりリンク */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold text-slate-300 tracking-wide">
            今週のゆる記録
          </span>
          <span
            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
              isWeeklyAchieved
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700/70 text-sky-300'
            }`}
          >
            {isWeeklyAchieved ? (
              <>
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>🎉 今週達成！ ({achievedCount}/{weeklyGoalDays}日)</span>
              </>
            ) : (
              <span>
                {achievedCount} / {weeklyGoalDays}日
              </span>
            )}
          </span>
        </div>

        <span className="text-[11px] font-bold text-slate-400 group-hover:text-sky-400 flex items-center gap-0.5 transition-colors">
          <span>振り返り</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* 下段: 月〜日の7日間スタンプ */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((dateStr, idx) => {
          const isLogged = loggedSet.has(dateStr);
          const isRest = restSet.has(dateStr);
          const isToday = dateStr === today;

          let circleClass = 'bg-slate-950/70 border-slate-800 text-slate-600';
          let content: React.ReactNode = <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />;

          if (isRest) {
            circleClass = isToday
              ? 'bg-purple-500/25 border-purple-400 text-purple-200 ring-2 ring-purple-500/25'
              : 'bg-purple-500/20 border-purple-400/60 text-purple-200';
            content = <span className="text-[11px] leading-none">🌿</span>;
          } else if (isLogged) {
            circleClass = isToday
              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/25'
              : 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300';
            content = <Check className="w-3.5 h-3.5 stroke-[3]" />;
          } else if (isToday) {
            circleClass = 'bg-sky-500/15 border-sky-400 text-sky-300 ring-2 ring-sky-500/20';
            content = <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />;
          }

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1">
              <span
                className={`text-[10px] font-bold ${
                  isToday ? 'text-sky-400' : 'text-slate-500'
                }`}
              >
                {dayLabels[idx]}
              </span>
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${circleClass}`}
              >
                {content}
              </div>
            </div>
          );
        })}
      </div>
    </button>
  );
};
