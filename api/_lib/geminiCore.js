import { isTimeoutError } from './httpUtils.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

const TOTAL_BUDGET_MS = 45_000;
const FAST_FAILOVER_TIMEOUT_MS = 10_000;
const FINAL_ATTEMPT_TIMEOUT_MS = 20_000;
const MODEL_COOLDOWN_MS = 5 * 60 * 1000;
const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];
const ALLOWED_LEVELS = ['excellent', 'good', 'needs-practice', 'unclear'];

/** @type {{ keyPrefix: string; kind: 'vertexExpress' | 'aiStudio' } | null} */
let cachedEndpoint = null;

/** @type {Map<string, number>} */
const degradedModels = new Map();

/**
 * Error with an HTTP status code for Gemini pronunciation evaluation routes.
 */
export class GeminiHttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Normalize client audio MIME strings (dropping codec suffixes and aliases).
 * @param {string} [rawMime]
 * @returns {string}
 */
export function normalizeAudioMimeType(rawMime) {
  const base = (rawMime ?? '').split(';')[0].trim().toLowerCase();
  if (!base) {
    return 'audio/webm';
  }
  if (base === 'audio/x-wav') {
    return 'audio/wav';
  }
  if (base === 'audio/m4a' || base === 'audio/x-m4a' || base === 'video/mp4') {
    return 'audio/mp4';
  }
  return base;
}

/**
 * Build an ordered, deduplicated list of candidate models, deferring models
 * currently in cooldown behind healthy ones.
 * @param {string} preferredModel
 * @returns {string[]}
 */
function buildOrderedModels(preferredModel) {
  const now = Date.now();
  for (const [name, expiresAt] of degradedModels.entries()) {
    if (expiresAt <= now) {
      degradedModels.delete(name);
    }
  }

  const unique = [];
  for (const candidate of [preferredModel, ...FALLBACK_MODELS]) {
    const trimmed = (candidate || '').trim();
    if (trimmed && !unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  }

  const healthy = [];
  const cooledDown = [];
  for (const name of unique) {
    const expiresAt = degradedModels.get(name);
    if (expiresAt && expiresAt > now) {
      cooledDown.push(name);
    } else {
      healthy.push(name);
    }
  }

  return [...healthy, ...cooledDown];
}

/**
 * @param {'vertexExpress' | 'aiStudio'} kind
 * @param {string} model
 * @returns {string}
 */
function buildEndpointUrl(kind, model) {
  const encodedModel = encodeURIComponent(model);
  if (kind === 'vertexExpress') {
    return `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodedModel}:generateContent`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent`;
}

/**
 * @param {string} apiKey
 * @returns {Array<'vertexExpress' | 'aiStudio'>}
 */
function getCandidateEndpoints(apiKey) {
  const keyPrefix = apiKey.slice(0, 6);
  /** @type {Array<'vertexExpress' | 'aiStudio'>} */
  const defaultOrder = ['aiStudio', 'vertexExpress'];

  if (cachedEndpoint && cachedEndpoint.keyPrefix === keyPrefix) {
    const other =
      cachedEndpoint.kind === 'vertexExpress' ? 'aiStudio' : 'vertexExpress';
    return [cachedEndpoint.kind, other];
  }

  return defaultOrder;
}

/**
 * @param {{
 *   targetKorean: string;
 *   pronunciationGuide?: string;
 *   romanization?: string;
 *   translation?: string;
 * }} input
 * @returns {string}
 */
function buildPronunciationPrompt(input) {
  return [
    '你是一位專業、細心且熟悉台灣學習者發音習慣的韓語發音教練。',
    '請仔細聆聽附帶的使用者韓語錄音音檔，並對照目標練習句進行真實、客觀的發音準確度評估。',
    '',
    `目標韓文句子：${input.targetKorean}`,
    input.pronunciationGuide ? `標準實際連音／音變讀法：${input.pronunciationGuide}` : '',
    input.romanization ? `羅馬拼音：${input.romanization}` : '',
    input.translation ? `中文意思：${input.translation}` : '',
    '',
    '評估重點與規則：',
    '1. 必須以音檔中實際聽到的聲音為準。如果音檔幾乎無聲、只有環境噪音／雜訊、沒有可辨識的韓語語音，或明顯念錯成其他內容，請誠實給 0 到 20 分，將 level 設為 "unclear"，並在 heardKorean 如實說明聽到的狀況，絕對不要憑空稱讚。',
    '2. 檢查韓語音韻規則是否正確：包含子音送氣音／緊音／平音區分、母音口型圓展、收尾音（받침）、鼻音化（例如 ㅂ+ㄴ→ㅁ+ㄴ）、連音規則以及疑問句尾語調上揚。',
    '3. 全程必須使用自然流暢的台灣繁體中文（繁體中文）撰寫建議與評語；韓文字詞與發音標註可保留韓文。',
    '4. 針對 improvements：若仍有進步空間，請列出 1 至 3 個最關鍵的具體段落（segment）、問題點（issue）與可操作的口腔／舌位／語調矯正方式（suggestion）；若發音已經非常標準，可回傳空陣列或 1 則微調建議。',
    '5. strengths 請簡明列出 1 至 2 個做得不錯的地方（若為 unclear 則回傳空陣列）。',
    '6. score 必須為 0 到 100 的整數；level 對應為：85-100 "excellent"、70-84 "good"、30-69 "needs-practice"、0-29 或聽不清楚為 "unclear"。',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {string} rawText
 * @returns {string}
 */
function stripJsonFences(rawText) {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * @param {number} score
 * @returns {'excellent' | 'good' | 'needs-practice' | 'unclear'}
 */
function deriveLevelFromScore(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 30) return 'needs-practice';
  return 'unclear';
}

/**
 * @param {unknown} raw
 * @param {string} model
 */
function sanitizeFeedback(raw, model) {
  const obj = typeof raw === 'object' && raw !== null ? raw : {};

  const numericScore =
    typeof obj.score === 'number' && Number.isFinite(obj.score) ? obj.score : 0;
  const score = Math.max(0, Math.min(100, Math.round(numericScore)));

  const rawLevel = typeof obj.level === 'string' ? obj.level : null;
  const level =
    rawLevel && ALLOWED_LEVELS.includes(rawLevel)
      ? rawLevel
      : deriveLevelFromScore(score);

  const heardKorean =
    typeof obj.heardKorean === 'string' && obj.heardKorean.trim()
      ? obj.heardKorean.trim()
      : '無法清楚辨識語音內容';

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : '已完成本次發音評估，請參考下方矯正建議。';

  const strengths = Array.isArray(obj.strengths)
    ? obj.strengths
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 4)
    : [];

  const improvements = Array.isArray(obj.improvements)
    ? obj.improvements
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
          segment:
            typeof item.segment === 'string' && item.segment.trim()
              ? item.segment.trim()
              : '整體發音',
          issue:
            typeof item.issue === 'string' && item.issue.trim()
              ? item.issue.trim()
              : '咬字與語調仍有調整空間',
          suggestion:
            typeof item.suggestion === 'string' && item.suggestion.trim()
              ? item.suggestion.trim()
              : '建議先聽一次慢速原音示範，再放慢速度跟讀一次。',
        }))
        .slice(0, 4)
    : [];

  const nextStepTip =
    typeof obj.nextStepTip === 'string' && obj.nextStepTip.trim()
      ? obj.nextStepTip.trim()
      : '建議先聽一次「慢速 0.75x」原音，再重新錄製並點擊「原音對比」聆聽差異。';

  return {
    score,
    level,
    heardKorean,
    summary,
    strengths,
    improvements,
    nextStepTip,
    modelUsed: model,
  };
}

/**
 * @param {number} status
 * @param {string} upstreamMessage
 * @returns {GeminiHttpError}
 */
function mapUpstreamError(status, upstreamMessage) {
  if (status === 401 || status === 403) {
    return new GeminiHttpError(
      status,
      'Gemini API 金鑰驗證失敗或權限不足，請確認後端環境變數（GEMINI_API_KEY）是否有效。'
    );
  }
  if (status === 404) {
    return new GeminiHttpError(
      404,
      '找不到指定的 Gemini 模型，請確認 GEMINI_MODEL 環境變數設定（例如 gemini-3.5-flash-lite）。'
    );
  }
  if (status === 429) {
    return new GeminiHttpError(
      429,
      '目前 Gemini API 請求次數已達上限或流量過大，請稍候再試一次。'
    );
  }
  if (status === 503) {
    return new GeminiHttpError(
      503,
      'Gemini AI 目前使用量較高（HTTP 503），請稍候幾秒後點擊「重新分析」。'
    );
  }
  if (status === 400) {
    const detail = upstreamMessage ? `（${upstreamMessage.slice(0, 120)}）` : '';
    return new GeminiHttpError(
      400,
      `音訊格式或請求內容無法被 Gemini 模型解析，請重新錄製後再試。${detail}`
    );
  }
  return new GeminiHttpError(
    502,
    `Gemini AI 服務暫時無法回應（HTTP ${status}），請稍後再試。`
  );
}

/**
 * Evaluate recorded Korean pronunciation audio via Google Gemini REST API.
 * @param {{
 *   audioBase64: string;
 *   mimeType: string;
 *   targetKorean: string;
 *   pronunciationGuide?: string;
 *   romanization?: string;
 *   translation?: string;
 * }} input
 * @param {{ apiKey: string; model: string }} config
 */
export async function analyzeWithGemini(input, config) {
  const { apiKey, model } = config;
  const normalizedMime = normalizeAudioMimeType(input.mimeType);
  const prompt = buildPronunciationPrompt(input);

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: normalizedMime,
              data: input.audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          score: { type: 'INTEGER' },
          level: {
            type: 'STRING',
            enum: ['excellent', 'good', 'needs-practice', 'unclear'],
          },
          heardKorean: { type: 'STRING' },
          summary: { type: 'STRING' },
          strengths: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          improvements: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                segment: { type: 'STRING' },
                issue: { type: 'STRING' },
                suggestion: { type: 'STRING' },
              },
              required: ['segment', 'issue', 'suggestion'],
            },
          },
          nextStepTip: { type: 'STRING' },
        },
        required: [
          'score',
          'level',
          'heardKorean',
          'summary',
          'strengths',
          'improvements',
          'nextStepTip',
        ],
      },
    },
  };

  const serializedBody = JSON.stringify(requestBody);
  const candidates = getCandidateEndpoints(apiKey);
  const orderedModels = buildOrderedModels(model);
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  let lastStatus = 502;
  let lastMessage = '';
  let lastTimedOut = false;

  for (let attemptIdx = 0; attemptIdx < orderedModels.length; attemptIdx += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 2_000) {
      lastTimedOut = true;
      lastStatus = 504;
      break;
    }

    const activeModel = orderedModels[attemptIdx];
    const hasMoreAttempts = attemptIdx < orderedModels.length - 1;
    const attemptTimeoutMs = Math.min(
      hasMoreAttempts ? FAST_FAILOVER_TIMEOUT_MS : FINAL_ATTEMPT_TIMEOUT_MS,
      remainingMs
    );

    for (let i = 0; i < candidates.length; i += 1) {
      const kind = candidates[i];
      const url = buildEndpointUrl(kind, activeModel);

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: serializedBody,
          signal: AbortSignal.timeout(attemptTimeoutMs),
        });
      } catch (err) {
        if (isTimeoutError(err)) {
          degradedModels.set(activeModel, Date.now() + MODEL_COOLDOWN_MS);
          lastTimedOut = true;
          lastStatus = 504;
          if (hasMoreAttempts) {
            break;
          }
          throw new GeminiHttpError(
            504,
            'Gemini AI 回應逾時，請稍後再點擊「重新分析」試試看。'
          );
        }
        throw new GeminiHttpError(
          502,
          '無法連線至 Google Gemini API，請確認伺服器網路連線正常後再試。'
        );
      }

      if (!response.ok) {
        lastTimedOut = false;
        lastStatus = response.status;
        try {
          const errJson = await response.json();
          lastMessage = errJson?.error?.message ?? '';
        } catch {
          lastMessage = '';
        }

        const canEndpointFallback =
          i < candidates.length - 1 &&
          (response.status === 401 || response.status === 403);

        if (canEndpointFallback) {
          continue;
        }

        const isFailoverStatus =
          response.status === 503 ||
          response.status === 429 ||
          response.status === 404;

        if (isFailoverStatus && hasMoreAttempts) {
          degradedModels.set(activeModel, Date.now() + MODEL_COOLDOWN_MS);
          break;
        }

        throw mapUpstreamError(response.status, lastMessage);
      }

      degradedModels.delete(activeModel);
      cachedEndpoint = { keyPrefix: apiKey.slice(0, 6), kind };

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const rawText = parts
        .filter((part) => !part.thought && typeof part.text === 'string')
        .map((part) => part.text)
        .join('')
        .trim();

      if (!rawText) {
        throw new GeminiHttpError(
          502,
          'Gemini AI 未回傳有效評估內容，請重新分析一次。'
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(stripJsonFences(rawText));
      } catch {
        throw new GeminiHttpError(
          502,
          'Gemini AI 回傳格式無法解析，請再點擊「重新分析」。'
        );
      }

      return {
        feedback: sanitizeFeedback(parsed, activeModel),
        endpointKind: kind,
      };
    }
  }

  if (lastTimedOut) {
    throw new GeminiHttpError(
      504,
      'Gemini AI 回應逾時，請稍後再點擊「重新分析」試試看。'
    );
  }
  throw mapUpstreamError(lastStatus, lastMessage);
}

/**
 * Validate and extract pronunciation analysis payload fields from a parsed JSON body.
 * @param {Record<string, unknown>} body
 * @returns {{
 *   audioBase64: string;
 *   mimeType: string;
 *   targetKorean: string;
 *   pronunciationGuide?: string;
 *   romanization?: string;
 *   translation?: string;
 * }}
 */
export function parseAnalyzeRequestBody(body) {
  const audioBase64 =
    typeof body.audioBase64 === 'string' ? body.audioBase64.trim() : '';
  const mimeType =
    typeof body.mimeType === 'string' ? body.mimeType.trim() : 'audio/webm';
  const targetKorean =
    typeof body.targetKorean === 'string' ? body.targetKorean.trim() : '';

  if (!audioBase64 || !targetKorean) {
    throw new GeminiHttpError(
      400,
      '缺少錄音資料或目標韓文句子，無法進行分析。'
    );
  }

  return {
    audioBase64,
    mimeType,
    targetKorean,
    pronunciationGuide:
      typeof body.pronunciationGuide === 'string'
        ? body.pronunciationGuide
        : undefined,
    romanization:
      typeof body.romanization === 'string' ? body.romanization : undefined,
    translation:
      typeof body.translation === 'string' ? body.translation : undefined,
  };
}
