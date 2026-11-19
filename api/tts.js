import {
  DEFAULT_TTS_VOICE,
  TtsHttpError,
  synthesizeKoreanSpeech,
} from './_lib/ttsCore.js';
import { jsonResponse, readWebJsonBody } from './_lib/httpUtils.js';

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request) {
  try {
    const apiKey = (process.env.GOOGLE_TTS_API_KEY || '').trim();
    const voice =
      (process.env.GOOGLE_TTS_VOICE || DEFAULT_TTS_VOICE).trim() ||
      DEFAULT_TTS_VOICE;

    if (!apiKey) {
      return jsonResponse(503, {
        error: '尚未設定 GOOGLE_TTS_API_KEY，請先於後端環境變數中加入金鑰。',
      });
    }

    const body = await readWebJsonBody(request, {
      maxBytes: MAX_BODY_BYTES,
      createError: (statusCode, message) => new TtsHttpError(statusCode, message),
      tooLargeMessage: '請求內容過大，請縮短朗讀文字。',
    });

    const text = typeof body.text === 'string' ? body.text : '';
    const speakingRate =
      typeof body.speakingRate === 'number' ? body.speakingRate : 1.0;

    const result = await synthesizeKoreanSpeech(
      { text, speakingRate },
      { apiKey, voice }
    );

    return jsonResponse(200, result);
  } catch (err) {
    if (err instanceof TtsHttpError) {
      return jsonResponse(err.statusCode, { error: err.message });
    }
    return jsonResponse(500, {
      error: '合成韓語語音時發生未預期錯誤，請稍後再試。',
    });
  }
}
