import React, { useState } from 'react';
import type { NutritionEstimateResult } from '../types';
import { estimateNutrition } from '../utils/nutritionApi';
import { Sparkles, Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface AiNutritionSearchProps {
  onSelectResult: (result: NutritionEstimateResult) => void;
  compact?: boolean;
  placeholder?: string;
}

export const AiNutritionSearch: React.FC<AiNutritionSearchProps> = ({
  onSelectResult,
  compact = false,
  placeholder = '例: 吉野家 牛丼 並盛、鶏もも肉 100g',
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<NutritionEstimateResult | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  const handleSearch = async (skipCache = false) => {
    const targetQuery = (skipCache && !query.trim() ? lastSearchedQuery : query).trim();
    if (!targetQuery || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { result, fromCache: cached } = await estimateNutrition(targetQuery, { skipCache });
      setLastResult(result);
      setFromCache(cached);
      setLastSearchedQuery(targetQuery);
      onSelectResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '栄養成分の検索に失敗しました。';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceBadge = (confidence: NutritionEstimateResult['confidence']) => {
    if (confidence === 'high') {
      return {
        label: '公式目安',
        cls: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
      };
    }
    if (confidence === 'medium') {
      return {
        label: '一般推定',
        cls: 'bg-sky-500/15 border-sky-500/35 text-sky-300',
      };
    }
    return {
      label: '要確認',
      cls: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
    };
  };

  const badge = lastResult ? confidenceBadge(lastResult.confidence) : null;

  return (
    <div
      className={`rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-950/80 to-purple-950/30 ${
        compact ? 'p-2.5 space-y-2' : 'p-3 space-y-2.5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-[11px] font-extrabold text-sky-300">
            AI栄養成分検索（自動入力）
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Gemini無料枠</span>
      </div>

      {/* 検索入力バー */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            disabled={isLoading}
            placeholder={placeholder}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                void handleSearch(false);
              }
            }}
            className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 rounded-xl pl-8 pr-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSearch(false)}
          disabled={isLoading || !query.trim()}
          className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>検索中</span>
            </>
          ) : (
            <span>調べる</span>
          )}
        </button>
      </div>

      {/* ローディングメッセージ */}
      {isLoading && (
        <div className="text-[11px] text-sky-300 font-medium flex items-center gap-1.5 px-1">
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span>AIが栄養成分を調べています…</span>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-2.5 py-2 text-[11px] font-semibold text-rose-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 結果フィードバックバナー */}
      {lastResult && badge && !isLoading && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-2.5 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}
              >
                {badge.label}
              </span>
              <span className="text-[11px] text-slate-300 truncate">{lastResult.note}</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSearch(true)}
              className="text-[10px] font-bold text-slate-400 hover:text-sky-300 flex items-center gap-0.5 shrink-0"
              title="キャッシュを使わず再検索"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>{fromCache ? '再検索' : '更新'}</span>
            </button>
          </div>
          <div className="text-[10px] text-slate-500">
            ※ 推定値のため必要に応じて微調整してください
            {fromCache && '（前回の検索結果を再利用）'}
          </div>
        </div>
      )}
    </div>
  );
};
