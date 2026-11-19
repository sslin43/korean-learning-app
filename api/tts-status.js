import { DEFAULT_TTS_VOICE } from './_lib/ttsCore.js';
import { jsonResponse } from './_lib/httpUtils.js';

export function GET() {
  const apiKey = (process.env.GOOGLE_TTS_API_KEY || '').trim();
  const voice =
    (process.env.GOOGLE_TTS_VOICE || DEFAULT_TTS_VOICE).trim() ||
    DEFAULT_TTS_VOICE;

  return jsonResponse(200, {
    configured: Boolean(apiKey),
    voice,
  });
}
