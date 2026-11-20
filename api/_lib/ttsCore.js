import { isTimeoutError } from './httpUtils.js';

export const DEFAULT_TTS_VOICE = 'ko-KR-Neural2-A';

const MAX_TEXT_LENGTH = 800;
const MAX_CACHE_ENTRIES = 250;
const UPSTREAM_TIMEOUT_MS = 15_000;

/** @type {Map<string, string>} */
const serverAudioCache = new Map();

/**
 * Error with an HTTP status code for Google Cloud TTS proxy routes.
 */
export class TtsHttpError extends Error {
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
 * @param {unknown} rawRate
 * @returns {number}
 */
function clampSpeakingRate(rawRate) {
  if (typeof rawRate !== 'number' || !Number.isFinite(rawRate)) {
    return 1.0;
  }
  const clamped = Math.max(0.5, Math.min(1.5, rawRate));
  return Math.round(clamped * 100) / 100;
}

/**
 * @param {string} voice
 * @param {number} rate
 * @param {string} text
 * @returns {string}
 */
function getCacheKey(voice, rate, text) {
  return `${voice}|${rate.toFixed(2)}|${text}`;
}

/**
 * @param {string} key
 * @param {string} audioContent
 */
function setServerCache(key, audioContent) {
  if (serverAudioCache.has(key)) {
    serverAudioCache.delete(key);
  } else if (serverAudioCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = serverAudioCache.keys().next().value;
    if (oldestKey !== undefined) {
      serverAudioCache.delete(oldestKey);
    }
  }
  serverAudioCache.set(key, audioContent);
}

/**
 * @param {number} status
 * @param {string} upstreamMessage
 * @returns {TtsHttpError}
 */
function mapUpstreamTtsError(status, upstreamMessage) {
  if (status === 401 || status === 403) {
    return new TtsHttpError(
      status,
      'Google Cloud Text-to-Speech API 金鑰驗證失敗或尚未啟用 Cloud Text-to-Speech API，請檢查後端環境變數（GOOGLE_TTS_API_KEY）與 Google Cloud 專案權限。'
    );
  }
  if (status === 429) {
    return new TtsHttpError(
      429,
      'Google Cloud Text-to-Speech 請求已達目前配額上限，請稍候再試。'
    );
  }
  if (status === 400) {
    const detail = upstreamMessage ? `（${upstreamMessage.slice(0, 120)}）` : '';
    return new TtsHttpError(
      400,
      `Google Cloud TTS 無法合成此段韓文語音，請確認文字內容與語音模型設定。${detail}`
    );
  }
  return new TtsHttpError(
    502,
    `Google Cloud TTS 服務暫時無法回應（HTTP ${status}），請稍後再試。`
  );
}

/**
 * Synthesize Korean MP3 audio through Google Cloud Text-to-Speech REST API.
 * @param {{ text: string; speakingRate?: number }} input
 * @param {{ apiKey: string; voice?: string }} config
 * @returns {Promise<{
 *   audioContent: string;
 *   mimeType: 'audio/mpeg';
 *   voice: string;
 *   speakingRate: number;
 *   cached: boolean;
 * }>}
 */
export async function synthesizeKoreanSpeech(input, config) {
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    throw new TtsHttpError(400, '請提供要朗讀的韓文內容。');
  }
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    throw new TtsHttpError(400, '單次語音合成字數過長，請縮短後再試。');
  }

  const voice = (config.voice || DEFAULT_TTS_VOICE).trim() || DEFAULT_TTS_VOICE;
  const speakingRate = clampSpeakingRate(input.speakingRate);
  const cacheKey = getCacheKey(voice, speakingRate, trimmedText);

  const cachedAudio = serverAudioCache.get(cacheKey);
  if (cachedAudio) {
    return {
      audioContent: cachedAudio,
      mimeType: 'audio/mpeg',
      voice,
      speakingRate,
      cached: true,
    };
  }

  let response;
  try {
    response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body: JSON.stringify({
        input: { text: trimmedText },
        voice: {
          languageCode: 'ko-KR',
          name: voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
        },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      throw new TtsHttpError(
        504,
        'Google Cloud TTS 語音合成逾時，請稍後再試一次。'
      );
    }
    throw new TtsHttpError(
      502,
      '無法連線至 Google Cloud Text-to-Speech API，請確認伺服器網路連線正常。'
    );
  }

  if (!response.ok) {
    let upstreamMessage = '';
    try {
      const errJson = await response.json();
      upstreamMessage = errJson?.error?.message ?? '';
    } catch {
      upstreamMessage = '';
    }
    throw mapUpstreamTtsError(response.status, upstreamMessage);
  }

  const data = await response.json();
  const audioContent =
    typeof data?.audioContent === 'string' ? data.audioContent.trim() : '';

  if (!audioContent) {
    throw new TtsHttpError(
      502,
      'Google Cloud TTS 未回傳有效音訊內容，請稍後再試。'
    );
  }

  setServerCache(cacheKey, audioContent);

  return {
    audioContent,
    mimeType: 'audio/mpeg',
    voice,
    speakingRate,
    cached: false,
  };
}
