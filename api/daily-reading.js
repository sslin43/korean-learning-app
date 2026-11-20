import { DEFAULT_GEMINI_MODEL, GeminiHttpError } from './_lib/geminiCore.js';
import {
  generateDailyReadingWithGemini,
  parseDailyReadingRequestBody,
} from './_lib/dailyReadingCore.js';
import { jsonResponse, readWebJsonBody } from './_lib/httpUtils.js';

const MAX_BODY_BYTES = 32 * 1024;

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
      maxBytes: MAX_BODY_BYTES,
      createError: (statusCode, message) => new GeminiHttpError(statusCode, message),
      tooLargeMessage: '請求內容過大，無法產生每日閱讀小課。',
    });

    const input = parseDailyReadingRequestBody(body);
    const lesson = await generateDailyReadingWithGemini(input, { apiKey, model });

    return jsonResponse(200, lesson);
  } catch (err) {
    if (err instanceof GeminiHttpError) {
      return jsonResponse(err.statusCode, { error: err.message });
    }
    return jsonResponse(500, {
      error: '產生每日韓語閱讀小課時發生未預期錯誤，請稍後再試。',
    });
  }
}
