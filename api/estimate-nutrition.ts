type CategoryType = 'staple' | 'main' | 'sub';
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface GeminiParsedNutrition {
  isFood?: boolean;
  name?: string;
  category?: string;
  baseAmount?: number;
  unit?: string;
  baseP?: number;
  baseF?: number;
  baseC?: number;
  confidence?: string;
  note?: string;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface NutritionEstimateResult {
  name: string;
  category: CategoryType;
  baseAmount: number;
  unit: string;
  baseP: number;
  baseF: number;
  baseC: number;
  confidence: ConfidenceLevel;
  note: string;
}

const round1 = (num: number): number => {
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 10) / 10;
};

const clampMacro = (num: unknown): number => {
  if (typeof num !== 'number' || !Number.isFinite(num) || num < 0) return 0;
  return round1(num);
};

const VALID_CATEGORIES = new Set<CategoryType>(['staple', 'main', 'sub']);
const VALID_CONFIDENCE = new Set<ConfidenceLevel>(['high', 'medium', 'low']);

const SYSTEM_INSTRUCTION = [
  'あなたは日本の経験豊富な管理栄養士です。ユーザーが入力した食品名・料理名・外食チェーンメニュー・コンビニ商品の栄養成分（PFCと基準量）を推定してください。',
  '判断ルール:',
  '1. 日本食品標準成分表および日本の大手飲食チェーン・コンビニ・カフェの公表栄養成分の知識を優先して推定すること。',
  '2. 食品・飲料として認識できない入力（無意味な文字列、食べ物以外の物など）の場合は isFood を false にすること。',
  '3. 分量が明記されていない一般的な食材（例: 「鶏むね肉 皮なし」「白米」）は baseAmount を 100、unit を "g" にして100gあたりのPFCを返すこと。',
  '4. 外食チェーンのメニュー・コンビニ商品・単品料理（例: 「吉野家 牛丼 並盛」「セブン 塩むすび」「スタバ ソイラテ トール」）は、原則として baseAmount を 1、unit を適切な単位（「杯」「個」「人前」「本」「パック」「袋」など）にして1食あたりのPFCを返すこと。',
  '5. ユーザー入力に具体的な量が含まれる場合（例: 「鶏もも肉 150g」「白米 200g」）はその分量・単位を基準量として返すこと。',
  '6. category は主食（ご飯・パン・麺・丼・カレー・おにぎり等）なら "staple"、主菜・高タンパク源（肉・魚・卵・プロテイン・単品メインおかず等）なら "main"、副菜・飲料・スイーツ・調味料等なら "sub" を選ぶこと。',
  '7. confidence は定番チェーンや成分表が明確な食材なら "high"、一般的な料理なら "medium"、曖昧な入力なら "low" にすること。',
  '8. note は40文字以内の簡潔な日本語で推定の根拠・目安（例: 「吉野家公式栄養成分の目安（1杯あたり）」）を記載すること。',
].join('\n');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isFood: { type: 'BOOLEAN' },
    name: { type: 'STRING' },
    category: { type: 'STRING', enum: ['staple', 'main', 'sub'] },
    baseAmount: { type: 'NUMBER' },
    unit: { type: 'STRING' },
    baseP: { type: 'NUMBER' },
    baseF: { type: 'NUMBER' },
    baseC: { type: 'NUMBER' },
    confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
    note: { type: 'STRING' },
  },
  required: [
    'isFood',
    'name',
    'category',
    'baseAmount',
    'unit',
    'baseP',
    'baseF',
    'baseC',
    'confidence',
    'note',
  ],
};

export async function POST(request: Request): Promise<Response> {
  try {
    let body: { query?: unknown };
    try {
      body = (await request.json()) as { query?: unknown };
    } catch {
      return Response.json(
        { error: 'リクエスト形式が不正です。', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }

    const rawQuery = typeof body?.query === 'string' ? body.query.trim() : '';
    if (rawQuery.length < 1 || rawQuery.length > 80) {
      return Response.json(
        {
          error: '食品・メニュー名を1〜80文字で入力してください。',
          code: 'INVALID_QUERY',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      console.error('[estimate-nutrition] GEMINI_API_KEY is not set');
      return Response.json(
        {
          error:
            'サーバーに GEMINI_API_KEY が設定されていません。Vercelの環境変数にAPIキーを設定してください。',
          code: 'MISSING_API_KEY',
        },
        { status: 503 }
      );
    }

    const primaryModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const modelsToTry = Array.from(new Set([primaryModel, 'gemini-2.5-flash-lite']));

    let lastStatus = 500;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      const geminiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: `食品・メニュー: ${rawQuery}` }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      });

      if (geminiRes.ok) {
        const responseData = (await geminiRes.json()) as GeminiApiResponse;
        const usedModel = model;

        const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          console.error('[estimate-nutrition] Empty Gemini response from model:', usedModel);
          return Response.json(
            { error: 'AIから栄養情報を取得できませんでした。表現を変えて再試行してください。', code: 'EMPTY_RESPONSE' },
            { status: 502 }
          );
        }

        let parsed: GeminiParsedNutrition;
        try {
          parsed = JSON.parse(text) as GeminiParsedNutrition;
        } catch (parseErr) {
          console.error('[estimate-nutrition] Failed to parse Gemini JSON:', parseErr);
          return Response.json(
            { error: 'AIの応答解析に失敗しました。もう一度お試しください。', code: 'PARSE_ERROR' },
            { status: 502 }
          );
        }

        if (parsed.isFood === false) {
          return Response.json(
            {
              error: '食品・メニューとして認識できませんでした。もう少し具体的に入力してみてください。',
              code: 'NOT_FOOD',
            },
            { status: 400 }
          );
        }

        const safeCategory: CategoryType = VALID_CATEGORIES.has(parsed.category as CategoryType)
          ? (parsed.category as CategoryType)
          : 'main';
        const safeConfidence: ConfidenceLevel = VALID_CONFIDENCE.has(
          parsed.confidence as ConfidenceLevel
        )
          ? (parsed.confidence as ConfidenceLevel)
          : 'medium';

        const rawAmount = typeof parsed.baseAmount === 'number' ? parsed.baseAmount : 1;
        const safeAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? round1(rawAmount) : 1;

        const result: NutritionEstimateResult = {
          name: (typeof parsed.name === 'string' && parsed.name.trim()) || rawQuery,
          category: safeCategory,
          baseAmount: safeAmount,
          unit: (typeof parsed.unit === 'string' && parsed.unit.trim()) || '食',
          baseP: clampMacro(parsed.baseP),
          baseF: clampMacro(parsed.baseF),
          baseC: clampMacro(parsed.baseC),
          confidence: safeConfidence,
          note:
            (typeof parsed.note === 'string' && parsed.note.trim().slice(0, 60)) ||
            '一般的な栄養成分の目安',
        };

        return Response.json({ result, model: usedModel }, { status: 200 });
      }

      lastStatus = geminiRes.status;
      const errText = await geminiRes.text().catch(() => '');
      console.error(
        `[estimate-nutrition] Gemini API error (${geminiRes.status}) on model ${model}:`,
        errText.slice(0, 300)
      );

      const canFallback =
        (geminiRes.status === 429 || geminiRes.status === 404 || geminiRes.status === 503) &&
        i < modelsToTry.length - 1;

      if (canFallback) {
        continue;
      }
      break;
    }

    if (lastStatus === 429) {
      return Response.json(
        {
          error: 'AI検索の無料枠上限に達しました。少し時間をおいて再度お試しください。',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    if (lastStatus === 401 || lastStatus === 403) {
      return Response.json(
        {
          error: 'GEMINI_API_KEY が無効か権限がありません。設定を確認してください。',
          code: 'INVALID_API_KEY',
        },
        { status: 503 }
      );
    }

    return Response.json(
      {
        error: '現在AI検索に接続できません。しばらくしてから再度お試しください。',
        code: 'UPSTREAM_ERROR',
      },
      { status: 502 }
    );
  } catch (err) {
    console.error('[estimate-nutrition] Unexpected error:', err);
    return Response.json(
      {
        error: 'サーバー処理中にエラーが発生しました。時間をおいて再度お試しください。',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
