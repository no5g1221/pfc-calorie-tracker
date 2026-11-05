import React from 'react';
import type { IntakeLogItem } from '../types';
import { calcCalories } from '../utils/calculations';
import { Trash2, Clock, Utensils, ChevronRight } from 'lucide-react';

interface IntakeLogsListProps {
  logs: IntakeLogItem[];
  onOpenEditModal: (log: IntakeLogItem) => void;
  onDeleteLog: (id: string) => void;
  onClearAll: () => void;
}

export const IntakeLogsList: React.FC<IntakeLogsListProps> = ({
  logs,
  onOpenEditModal,
  onDeleteLog,
  onClearAll,
}) => {
  // 新しいログが上に来るようにソート
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3 pt-2">
      {/* 見出し */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            今日の記録一覧（{logs.length}件）
          </span>
        </div>

        {logs.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('今日の記録をすべて消去しますか？')) {
                onClearAll();
              }
            }}
            className="text-[11px] font-medium text-slate-500 hover:text-rose-400 transition-colors"
          >
            全消去
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-7 text-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2">
            <Utensils className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-300">まだ今日の記録がありません</p>
          <p className="text-[11px] text-slate-500 mt-1">
            上の食材パーツをタップすると、1タップでここに追加されます。
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedLogs.map((log) => {
            const cal = calcCalories(log.currentP, log.currentF, log.currentC);

            return (
              <div
                key={log.id}
                onClick={() => onOpenEditModal(log)}
                className="group cursor-pointer bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 hover:border-sky-500/40 rounded-2xl p-3 shadow-md flex items-center justify-between gap-3 transition-all active:scale-[0.98]"
              >
                {/* 左側: アイテム情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate group-hover:text-sky-300 transition-colors">
                      {log.name}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(log.timestamp)}
                    </span>
                  </div>

                  {/* PFC内訳バッジ */}
                  <div className="flex items-center gap-2 text-xs font-mono mt-1">
                    <span className="text-orange-400 font-bold">{cal} kcal</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-sky-400">P:{log.currentP}g</span>
                    <span className="text-amber-400">F:{log.currentF}g</span>
                    <span className="text-emerald-400">C:{log.currentC}g</span>
                  </div>
                </div>

                {/* 右側: 調整へ誘導矢印 & 削除ボタン */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLog(log.id);
                    }}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="削除"
                    aria-label="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
