import React, { useMemo, useState } from 'react';
import type { CategoryType, PresetItem, IntakeLogItem } from '../types';
import { calcCalories } from '../utils/calculations';
import { Plus, SlidersHorizontal, Search } from 'lucide-react';

interface PresetGridProps {
  presets: PresetItem[];
  todayLogs: IntakeLogItem[];
  usageCounts?: Record<string, number>;
  onAddPresetToToday: (preset: PresetItem) => void;
  onOpenManageModal: () => void;
}

type PresetTabId = 'frequent' | CategoryType;

export const PresetGrid: React.FC<PresetGridProps> = ({
  presets,
  todayLogs,
  usageCounts = {},
  onAddPresetToToday,
  onOpenManageModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PresetTabId>('frequent');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { id: PresetTabId; label: string }[] = [
    { id: 'frequent', label: 'よく使う' },
    { id: 'staple', label: '主食' },
    { id: 'main', label: '主菜・P' },
    { id: 'sub', label: '副菜・他' },
  ];

  // 本日何回タップしたかのバッジ用カウント
  const tapCounts: Record<string, number> = {};
  todayLogs.forEach((log) => {
    if (log.presetId) {
      tapCounts[log.presetId] = (tapCounts[log.presetId] || 0) + 1;
    }
  });

  // カテゴリ絞り込み + 使用頻度降順ソート（同数時は元のpresets配列順を維持）
  const filteredPresets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return presets
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        const matchesCategory =
          selectedCategory === 'frequent' || item.category === selectedCategory;
        const matchesSearch =
          normalizedQuery === '' || item.name.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const countDiff = (usageCounts[b.item.id] || 0) - (usageCounts[a.item.id] || 0);
        if (countDiff !== 0) return countDiff;
        return a.originalIndex - b.originalIndex;
      })
      .map(({ item }) => item);
  }, [presets, selectedCategory, searchQuery, usageCounts]);

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => {
      if (prev) {
        setSearchQuery('');
      }
      return !prev;
    });
  };

  const handleTap = (preset: PresetItem) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
    onAddPresetToToday(preset);
  };

  return (
    <div className="space-y-3">
      {/* 見出し & 検索トグル・パーツ編集ボタン */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          定番パーツ（1タップで加算）
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSearch}
            aria-label={isSearchOpen ? '検索を閉じる' : '食材名を検索'}
            title={isSearchOpen ? '検索を閉じる' : '食材名を検索'}
            className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border shadow-sm transition-all duration-150 active:scale-95 ${
              isSearchOpen
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-sky-300'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenManageModal}
            className="min-h-[36px] flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm transition-all duration-150 active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>パーツ編集</span>
          </button>
        </div>
      </div>

      {/* タブ切り替え：「よく使う」「主食」「主菜・P」「副菜・他」 */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 shadow-inner">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 text-center ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* 検索ボタン押下時のみ展開する絞り込み入力 */}
        {isSearchOpen && (
          <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="食材名を検索..."
              className="w-full bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 focus:border-sky-500 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
            />
          </div>
        )}
      </div>

      {/* プリセットボタングリッド */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredPresets.map((preset) => {
          const cal = calcCalories(preset.baseP, preset.baseF, preset.baseC);
          const count = tapCounts[preset.id] || 0;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleTap(preset)}
              className="relative group bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 text-left flex flex-col justify-between"
            >
              {/* 本日何回タップしたかのバッジ（例: ×2） */}
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-md animate-in zoom-in-50 duration-150 border border-sky-400/30">
                  ×{count}
                </span>
              )}

              <div>
                <p className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors leading-tight truncate">
                  {preset.name}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  {preset.baseAmount}{preset.unit}
                  <span className="text-slate-600 mx-1">/</span>
                  <span className="text-orange-400 font-semibold">{cal} kcal</span>
                </p>
              </div>

              <div className="mt-2.5 pt-1.5 border-t border-slate-800/70 flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-sky-400 font-bold">P:{preset.baseP}</span>
                  <span className="text-amber-400 font-bold">F:{preset.baseF}</span>
                  <span className="text-emerald-400 font-bold">C:{preset.baseC}</span>
                </div>
                <div className="w-5 h-5 rounded-lg bg-sky-500/15 text-sky-400 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredPresets.length === 0 && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-6 text-center space-y-2">
          <p className="text-xs text-slate-400">該当する食材パーツがありません</p>
          <button
            type="button"
            onClick={onOpenManageModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all duration-150 active:scale-95 shadow-md shadow-sky-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新しい食材パーツを追加する</span>
          </button>
        </div>
      )}
    </div>
  );
};
