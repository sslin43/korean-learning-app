export type SpeechOutcome = 'completed' | 'interrupted' | 'error';

export interface SpeechResult {
  outcome: SpeechOutcome;
  errorMessage?: string;
}

export interface SpeakOptions {
  rate?: number;
  voice?: string;
  audioUrl?: string;
}

export interface TtsStatus {
  configured: boolean;
  voice: string;
}

const DEFAULT_VOICE = 'ko-KR-Neural2-A';
const BROWSER_CACHE_NAME = 'korean-tts-neural2-a-v1';

const memoryObjectUrlCache = new Map<string, string>();
const inFlightSyntheses = new Map<string, Promise<string>>();

let activeRequestId = 0;
let activeAudioElement: HTMLAudioElement | null = null;
let pendingResolve: ((result: SpeechResult) => void) | null = null;

function resolvePending(result: SpeechResult): void {
  if (pendingResolve) {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve(result);
  }
}

function normalizeRate(rawRate?: number): number {
  if (typeof rawRate !== 'number' || !Number.isFinite(rawRate)) {
    return 1.0;
  }
  const clamped = Math.max(0.5, Math.min(1.5, rawRate));
  return Math.round(clamped * 100) / 100;
}

function buildCacheKey(voice: string, rate: number, text: string): string {
  return `${voice}|${rate.toFixed(2)}|${text}`;
}

function buildCacheRequest(cacheKey: string): Request {
  return new Request(`/__tts-cache/${encodeURIComponent(cacheKey)}`);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType || 'audio/mpeg' });
}

async function readFromBrowserCache(cacheKey: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  try {
    const cache = await window.caches.open(BROWSER_CACHE_NAME);
    const matched = await cache.match(buildCacheRequest(cacheKey));
    if (!matched) {
      return null;
    }
    const blob = await matched.blob();
    if (blob.size === 0) {
      return null;
    }
    const objectUrl = URL.createObjectURL(blob);
    memoryObjectUrlCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}

async function writeToBrowserCache(
  cacheKey: string,
  blob: Blob,
  mimeType: string
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cache = await window.caches.open(BROWSER_CACHE_NAME);
    await cache.put(
      buildCacheRequest(cacheKey),
      new Response(blob, {
        headers: {
          'Content-Type': mimeType || 'audio/mpeg',
        },
      })
    );
  } catch {
    // Graceful fallback to L1 memory cache when Cache API is unavailable
  }
}

async function resolveTtsObjectUrl(
  text: string,
  rate: number,
  voice: string
): Promise<string> {
  const trimmedText = text.trim();
  const cacheKey = buildCacheKey(voice, rate, trimmedText);

  const l1Url = memoryObjectUrlCache.get(cacheKey);
  if (l1Url) {
    return l1Url;
  }

  const pending = inFlightSyntheses.get(cacheKey);
  if (pending) {
    return pending;
  }

  const fetchTask = (async () => {
    const l2Url = await readFromBrowserCache(cacheKey);
    if (l2Url) {
      return l2Url;
    }

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: trimmedText,
        speakingRate: rate,
      }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errorMsg =
        typeof payload === 'object' &&
        payload !== null &&
        typeof (payload as { error?: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : `Google Cloud TTS 合成失敗（HTTP ${response.status}），請稍後再試。`;
      throw new Error(errorMsg);
    }

    const data = payload as { audioContent?: unknown; mimeType?: unknown };
    const audioContent =
      typeof data?.audioContent === 'string' ? data.audioContent.trim() : '';
    const mimeType =
      typeof data?.mimeType === 'string' && data.mimeType.trim()
        ? data.mimeType.trim()
        : 'audio/mpeg';

    if (!audioContent) {
      throw new Error('伺服器未回傳有效音訊內容，請稍後再試。');
    }

    const blob = base64ToBlob(audioContent, mimeType);
    const objectUrl = URL.createObjectURL(blob);
    memoryObjectUrlCache.set(cacheKey, objectUrl);
    void writeToBrowserCache(cacheKey, blob, mimeType);

    return objectUrl;
  })();

  inFlightSyntheses.set(cacheKey, fetchTask);
  try {
    return await fetchTask;
  } finally {
    if (inFlightSyntheses.get(cacheKey) === fetchTask) {
      inFlightSyntheses.delete(cacheKey);
    }
  }
}

export async function fetchTtsStatus(signal?: AbortSignal): Promise<TtsStatus> {
  try {
    const response = await fetch('/api/tts-status', {
      method: 'GET',
      signal,
    });
    if (!response.ok) {
      return { configured: false, voice: DEFAULT_VOICE };
    }
    const data = (await response.json()) as Partial<TtsStatus>;
    return {
      configured: Boolean(data.configured),
      voice:
        typeof data.voice === 'string' && data.voice.trim()
          ? data.voice.trim()
          : DEFAULT_VOICE,
    };
  } catch {
    return { configured: false, voice: DEFAULT_VOICE };
  }
}

export function getCachedAudioCount(): number {
  return memoryObjectUrlCache.size;
}

export function stopSpeech(): void {
  activeRequestId += 1;

  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement.onended = null;
    activeAudioElement.onerror = null;
    activeAudioElement = null;
  }

  resolvePending({ outcome: 'interrupted' });
}

function playAudioElement(
  audioUrl: string,
  playbackRate: number,
  requestId: number
): Promise<SpeechResult> {
  return new Promise((resolve) => {
    pendingResolve = resolve;
    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackRate;
    activeAudioElement = audio;

    const finish = (result: SpeechResult) => {
      if (activeRequestId !== requestId) {
        return;
      }
      if (activeAudioElement === audio) {
        activeAudioElement = null;
      }
      audio.onended = null;
      audio.onerror = null;
      resolvePending(result);
    };

    audio.onended = () => finish({ outcome: 'completed' });
    audio.onerror = () =>
      finish({
        outcome: 'error',
        errorMessage: '無法播放韓語音訊檔案，請再試一次。',
      });

    audio.play().catch(() =>
      finish({
        outcome: 'error',
        errorMessage: '瀏覽器攔截了音訊播放，請再點擊一次播放按鈕。',
      })
    );
  });
}

export async function speakKorean(
  text: string,
  options: SpeakOptions = {}
): Promise<SpeechResult> {
  const rate = normalizeRate(options.rate);
  const voice = (options.voice || DEFAULT_VOICE).trim() || DEFAULT_VOICE;

  stopSpeech();
  const requestId = ++activeRequestId;

  if (options.audioUrl) {
    return playAudioElement(options.audioUrl, rate, requestId);
  }

  try {
    const objectUrl = await resolveTtsObjectUrl(text, rate, voice);
    if (activeRequestId !== requestId) {
      return { outcome: 'interrupted' };
    }
    return await playAudioElement(objectUrl, 1.0, requestId);
  } catch (err) {
    if (activeRequestId !== requestId) {
      return { outcome: 'interrupted' };
    }
    const errorMessage =
      err instanceof Error
        ? err.message
        : '無法連線至 Google Cloud TTS 服務，請稍後再試。';
    return {
      outcome: 'error',
      errorMessage,
    };
  }
}
