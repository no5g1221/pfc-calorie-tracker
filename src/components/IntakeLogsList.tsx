import React from 'react';
import type { IntakeLogItem, MealType } from '../types';
import { calcCalories, calculateTotals, getDefaultMealType } from '../utils/calculations';
import { Trash2, Clock, Utensils, ChevronRight } from 'lucide-react';

interface IntakeLogsListProps {
  logs: IntakeLogItem[];
  onOpenEditModal: (log: IntakeLogItem) => void;
  onDeleteLog: (id: string) => void;
  onClearAll: () => void;
}

const mealSections: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: '朝食', icon: '🌅' },
  { id: 'lunch', label: '昼食', icon: '☀️' },
  { id: 'dinner', label: '夕食', icon: '🌙' },
  { id: 'snack', label: '間食', icon: '☕' },
];

export const IntakeLogsList: React.FC<IntakeLogsListProps> = ({
  logs,
  onOpenEditModal,
  onDeleteLog,
  onClearAll,
}) => {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // 食事区分ごとにグループ化（古いデータ等でmealTypeがない場合はtimestampからフォールバック判定）
  const groupedLogs: Record<MealType, IntakeLogItem[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  logs.forEach((log) => {
    const meal = log.mealType || getDefaultMealType(new Date(log.timestamp));
    if (meal in groupedLogs) {
      groupedLogs[meal].push(log);
    } else {
      groupedLogs.lunch.push(log);
    }
  });

  return (
    <div className="space-y-3 pt-2">
      {/* 見出し */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            今日の記録（朝・昼・晩・間食）
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
            食事（朝/昼/晩）を選んで、上の食材パーツをタップすると加算されます。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mealSections.map((section) => {
            const mealItems = groupedLogs[section.id];
            if (mealItems.length === 0) return null; // 未記録の食事区分は非表示にしてスッキリ

            const totals = calculateTotals(mealItems);

            return (
              <div
                key={section.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md"
              >
                {/* 食事ヘッダー: 区分名 & その食事の小計カロリー・PFC */}
                <div className="px-3.5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{section.icon}</span>
                    <span className="text-xs font-bold text-white">{section.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ({mealItems.length}品)
                    </span>
                  </div>

                  {/* その食事の小計 */}
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs font-black text-orange-400">
                      {totals.totalCalories} <span className="text-[10px] font-normal text-slate-400">kcal</span>
                    </span>
                    <div className="hidden xs:flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      <span className="text-sky-400">P:{totals.totalP}</span>
                      <span className="text-amber-400">F:{totals.totalF}</span>
                      <span className="text-emerald-400">C:{totals.totalC}</span>
                    </div>
                  </div>
                </div>

                {/* アイテム一覧 */}
                <div className="divide-y divide-slate-800/50">
                  {mealItems.map((log) => {
                    const cal = calcCalories(log.currentP, log.currentF, log.currentC);

                    return (
                      <div
                        key={log.id}
                        onClick={() => onOpenEditModal(log)}
                        className="group cursor-pointer hover:bg-slate-800/50 px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors active:scale-[0.99]"
                      >
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

                          <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                            <span className="text-orange-400 font-bold">{cal} kcal</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-sky-400">P:{log.currentP}g</span>
                            <span className="text-amber-400">F:{log.currentF}g</span>
                            <span className="text-emerald-400">C:{log.currentC}g</span>
                          </div>
                        </div>

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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
