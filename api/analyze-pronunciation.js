import {
  DEFAULT_GEMINI_MODEL,
  GeminiHttpError,
  analyzeWithGemini,
  parseAnalyzeRequestBody,
} from './_lib/geminiCore.js';
import { jsonResponse, readWebJsonBody } from './_lib/httpUtils.js';

const MAX_VERCEL_BODY_BYTES = Math.floor(4.5 * 1024 * 1024);

export async function POST(request) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const model =
      (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim() ||
      DEFAULT_GEMINI_MODEL;

    if (!apiKey) {
      return jsonResponse(503, {
        error: '尚未設定 GEMINI_API_KEY，請先於後端環境變數中加入金鑰。',
      });
    }

    const body = await readWebJsonBody(request, {
      maxBytes: MAX_VERCEL_BODY_BYTES,
      createError: (statusCode, message) => new GeminiHttpError(statusCode, message),
      tooLargeMessage:
        '錄音檔案過大，請錄製 10 秒內的音訊再試（單次請求上限 4.5 MB）。',
    });

    const input = parseAnalyzeRequestBody(body);
    const { feedback } = await analyzeWithGemini(input, { apiKey, model });

    return jsonResponse(200, feedback);
  } catch (err) {
    if (err instanceof GeminiHttpError) {
      return jsonResponse(err.statusCode, { error: err.message });
    }
    return jsonResponse(500, {
      error: '分析韓語發音時發生未預期錯誤，請稍後再試。',
    });
  }
}
