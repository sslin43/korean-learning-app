import { DEFAULT_GEMINI_MODEL } from './_lib/geminiCore.js';
import { jsonResponse } from './_lib/httpUtils.js';

export function GET() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const model =
    (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim() ||
    DEFAULT_GEMINI_MODEL;

  return jsonResponse(200, {
    configured: Boolean(apiKey),
    model,
  });
}
