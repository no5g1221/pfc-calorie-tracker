import React from 'react';
import type { IntakeLogItem } from '../types';
import { Copy, Zap, Coffee } from 'lucide-react';

interface QuickStartBannerProps {
  daysSinceLastLog: number | null;
  recentLogInfo: { date: string; logs: IntakeLogItem[] } | null;
  onCopyRecentLogs: () => void;
  onOpenRoughAdd: () => void;
  onMarkRestDay: () => void;
}

export const QuickStartBanner: React.FC<QuickStartBannerProps> = ({
  daysSinceLastLog,
  recentLogInfo,
  onCopyRecentLogs,
  onOpenRoughAdd,
  onMarkRestDay,
}) => {
  const getGreetingMessage = () => {
    if (daysSinceLastLog === 1) {
      return '今日もいいペース！まずは1品入れよう ✨';
    }
    if (daysSinceLastLog === 2 || daysSinceLastLog === 3) {
      return 'おかえりなさい！1日くらい抜けても全然大丈夫 👍';
    }
    return 'まずはざっくり1タップから、ゆるく始めよう 🌱';
  };

  const formatShortDate = (dateStr: string) => {
    const [, m, d] = dateStr.split('-').map(Number);
    return `${m}/${d}`;
  };

  return (
    <div className="bg-gradient-to-br from-sky-950/60 via-slate-900/90 to-purple-950/40 border border-sky-500/30 rounded-2xl p-3.5 shadow-md space-y-2.5 animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
            今日のスタートガイド
          </span>
          <p className="text-xs font-bold text-white mt-0.5 leading-snug">
            {getGreetingMessage()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {recentLogInfo && (
          <button
            type="button"
            onClick={onCopyRecentLogs}
            className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              前回コピー（{formatShortDate(recentLogInfo.date)}・{recentLogInfo.logs.length}品）
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenRoughAdd}
          className="flex-1 min-w-[110px] py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5 text-purple-300 shrink-0" />
          <span>ざっくり記録</span>
        </button>

        <button
          type="button"
          onClick={onMarkRestDay}
          className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-purple-500/20 border border-slate-700 hover:border-purple-500/40 text-slate-300 hover:text-purple-200 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Coffee className="w-3.5 h-3.5 text-purple-300 shrink-0" />
          <span>今日はお休み日 🌿</span>
        </button>
      </div>
    </div>
  );
};
