import type { NutritionEstimateResult } from '../types';

const AI_CACHE_KEY = 'pfc_tracker_ai_cache';
const MAX_CACHE_ITEMS = 30;

interface CachedNutritionEntry {
  key: string;
  result: NutritionEstimateResult;
  cachedAt: number;
}

const normalizeQueryKey = (query: string): string => {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
};

const loadCache = (): CachedNutritionEntry[] => {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCache = (entries: CachedNutritionEntry[]): void => {
  try {
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(entries.slice(0, MAX_CACHE_ITEMS)));
  } catch {
    // LocalStorage書き込みエラー時はキャッシュ保存をスキップ
  }
};

export async function estimateNutrition(
  query: string,
  options?: { skipCache?: boolean }
): Promise<{ result: NutritionEstimateResult; fromCache: boolean }> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('調べたい食品・メニュー名を入力してください。');
  }
  if (trimmed.length > 80) {
    throw new Error('検索キーワードは80文字以内で入力してください。');
  }

  const normalizedKey = normalizeQueryKey(trimmed);

  if (!options?.skipCache) {
    const cache = loadCache();
    const hit = cache.find((entry) => entry.key === normalizedKey);
    if (hit) {
      // 最近使ったエントリを先頭へ移動
      const reordered = [hit, ...cache.filter((e) => e.key !== normalizedKey)];
      saveCache(reordered);
      return { result: hit.result, fromCache: true };
    }
  }

  let response: Response;
  try {
    response = await fetch('/api/estimate-nutrition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: trimmed }),
    });
  } catch {
    throw new Error('通信できませんでした。インターネット接続を確認してください。');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (response.status === 404) {
      throw new Error(
        'AI検索APIが見つかりません（ローカル開発時は vercel dev を使うか、Vercel本番環境でお試しください）。'
      );
    }
    throw new Error('AI検索サーバーから予期しない応答が返されました。');
  }

  let payload: { result?: NutritionEstimateResult; error?: string };
  try {
    payload = (await response.json()) as { result?: NutritionEstimateResult; error?: string };
  } catch {
    throw new Error('AI検索の応答を読み取れませんでした。');
  }

  if (!response.ok || !payload.result) {
    throw new Error(payload.error || '栄養成分の取得に失敗しました。');
  }

  const cache = loadCache();
  const nextCache: CachedNutritionEntry[] = [
    { key: normalizedKey, result: payload.result, cachedAt: Date.now() },
    ...cache.filter((e) => e.key !== normalizedKey),
  ];
  saveCache(nextCache);

  return { result: payload.result, fromCache: false };
}
