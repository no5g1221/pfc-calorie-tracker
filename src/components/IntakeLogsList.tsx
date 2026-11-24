import React, { useState, useRef, useEffect } from 'react';
import type { IntakeLogItem, MealType } from '../types';
import { calcCalories, calculateTotals, getDefaultMealType } from '../utils/calculations';
import { Trash2, Clock, Utensils, ChevronRight, BookmarkPlus, X, Check } from 'lucide-react';

interface IntakeLogsListProps {
  logs: IntakeLogItem[];
  onOpenEditModal: (log: IntakeLogItem) => void;
  onDeleteLog: (id: string) => void;
  onClearAll: () => void;
  onSaveMealCombo: (comboName: string, items: IntakeLogItem[]) => void;
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
  onSaveMealCombo,
}) => {
  const [comboModalTarget, setComboModalTarget] = useState<{
    sectionLabel: string;
    items: IntakeLogItem[];
  } | null>(null);
  const [comboNameInput, setComboNameInput] = useState('');
  const comboInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!comboModalTarget) return;
    const timer = setTimeout(() => {
      comboInputRef.current?.focus();
      comboInputRef.current?.select();
    }, 30);
    return () => clearTimeout(timer);
  }, [comboModalTarget]);

  const openComboModal = (sectionLabel: string, items: IntakeLogItem[]) => {
    setComboNameInput(`定番の${sectionLabel}`);
    setComboModalTarget({ sectionLabel, items });
  };

  const closeComboModal = () => {
    setComboModalTarget(null);
  };

  const handleConfirmSaveCombo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboModalTarget) return;
    const trimmedName = comboNameInput.trim();
    if (!trimmedName) return;
    onSaveMealCombo(trimmedName, comboModalTarget.items);
    setComboModalTarget(null);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

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

  const modalTotals = comboModalTarget ? calculateTotals(comboModalTarget.items) : null;

  return (
    <div className="space-y-3 pt-2">
      {/* 見出し */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            今日の記録（朝・昼・晩・間食）
          </span>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('今日の記録をすべて消去しますか？')) {
                onClearAll();
              }
            }}
            className="text-[11px] font-bold text-slate-500 hover:text-rose-400 transition-all duration-150 active:scale-95 px-2 py-0.5 rounded-lg"
          >
            全消去
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800/80 rounded-2xl p-7 text-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-2">
            <Utensils className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-300">まだ今日の記録がありません</p>
          <p className="text-[11px] text-slate-500 mt-1">
            食事（朝/昼/晩）を選んで、上の食材パーツをタップすると加算されます。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mealSections.map((section) => {
            const mealItems = groupedLogs[section.id];
            if (mealItems.length === 0) return null;

            const totals = calculateTotals(mealItems);

            return (
              <div
                key={section.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md"
              >
                {/* 食事ヘッダー: 上段(区分名・品数・セット保存) / 下段(小計カロリー・PFC) */}
                <div className="px-3.5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{section.icon}</span>
                      <span className="text-xs font-bold text-white shrink-0">{section.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        ({mealItems.length}品)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openComboModal(section.label, mealItems)}
                      className="min-h-[32px] px-2 inline-flex items-center gap-1 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95 shrink-0"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>セット保存</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-orange-400 shrink-0">
                      {totals.totalCalories}{' '}
                      <span className="text-[10px] font-normal text-slate-400">kcal</span>
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
                      <span className="text-sky-400 font-bold">P:{totals.totalP}</span>
                      <span className="text-amber-400 font-bold">F:{totals.totalF}</span>
                      <span className="text-emerald-400 font-bold">C:{totals.totalC}</span>
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
                        className="group cursor-pointer hover:bg-slate-800/60 px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all duration-150 active:scale-[0.98]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate group-hover:text-sky-300 transition-colors">
                              {log.name}
                            </span>
                            {log.isRough && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
                                ざっくり
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(log.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                            <span className="text-orange-400 font-bold">{cal} kcal</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-sky-400 font-bold">P:{log.currentP}g</span>
                            <span className="text-amber-400 font-bold">F:{log.currentF}g</span>
                            <span className="text-emerald-400 font-bold">C:{log.currentC}g</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLog(log.id);
                            }}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 active:scale-95"
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

      {/* マイ定食保存名入力モーダル */}
      {comboModalTarget && modalTotals && (
        <div
          onClick={closeComboModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <form
            onSubmit={handleConfirmSaveCombo}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                    マイ定食として保存
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {comboModalTarget.sectionLabel}のセット名を入力
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeComboModal}
                aria-label="閉じる"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 保存対象プレビュー（1行） */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-mono">
              <span className="font-sans font-bold text-slate-300 shrink-0">
                対象 {comboModalTarget.items.length}品
              </span>
              <div className="flex items-center gap-2 truncate">
                <span className="text-orange-400 font-extrabold shrink-0">
                  {modalTotals.totalCalories} kcal
                </span>
                <span className="text-sky-400 font-bold shrink-0">P:{modalTotals.totalP}</span>
                <span className="text-amber-400 font-bold shrink-0">F:{modalTotals.totalF}</span>
                <span className="text-emerald-400 font-bold shrink-0">C:{modalTotals.totalC}</span>
              </div>
            </div>

            {/* セット名入力欄 */}
            <div className="space-y-1.5">
              <label
                htmlFor="meal-combo-name-input"
                className="text-xs font-bold text-slate-300"
              >
                マイ定食の名前
              </label>
              <input
                id="meal-combo-name-input"
                ref={comboInputRef}
                type="text"
                value={comboNameInput}
                onChange={(e) => setComboNameInput(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                placeholder={`例: 定番の${comboModalTarget.sectionLabel}`}
                className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3.5 py-3 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none transition-colors"
              />
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeComboModal}
                className="flex-1 min-h-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors active:scale-95"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!comboNameInput.trim()}
                className="flex-1 min-h-[44px] rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>保存する</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
