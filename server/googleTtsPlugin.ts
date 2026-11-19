import { loadEnv, type Plugin } from 'vite';
import {
  DEFAULT_TTS_VOICE,
  TtsHttpError,
  synthesizeKoreanSpeech,
} from '../api/_lib/ttsCore.js';
import {
  readJsonBody,
  sendJson,
  type MiddlewareServer,
} from './middlewareUtils.ts';

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

export interface SynthesizeInput {
  text: string;
  speakingRate?: number;
}

export interface SynthesizeResult {
  audioContent: string;
  mimeType: 'audio/mpeg';
  voice: string;
  speakingRate: number;
  cached: boolean;
}

export { TtsHttpError, synthesizeKoreanSpeech };

const MAX_BODY_BYTES = 32 * 1024;

function attachTtsRoutes(
  server: MiddlewareServer,
  getConfig: () => { apiKey: string; voice: string }
): void {
  server.middlewares.use((req, res, next) => {
    const pathname = (req.url ?? '').split('?')[0];

    if (req.method === 'GET' && pathname === '/api/tts-status') {
      const { apiKey, voice } = getConfig();
      sendJson(res, 200, {
        configured: Boolean(apiKey),
        voice,
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/tts') {
      void (async () => {
        try {
          const { apiKey, voice } = getConfig();
          if (!apiKey) {
            sendJson(res, 503, {
              error:
                '尚未設定 GOOGLE_TTS_API_KEY，請先於專案根目錄 .env 加入金鑰並重新啟動伺服器。',
            });
            return;
          }

          const body = await readJsonBody(req, {
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

          sendJson(res, 200, result);
        } catch (err) {
          if (err instanceof TtsHttpError) {
            sendJson(res, err.statusCode, { error: err.message });
            return;
          }
          sendJson(res, 500, {
            error: '合成韓語語音時發生未預期錯誤，請稍後再試。',
          });
        }
      })();
      return;
    }

    next();
  });
}

export function googleTtsPlugin(mode: string): Plugin {
  const resolveConfig = () => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey = (
      env.GOOGLE_TTS_API_KEY ||
      process.env.GOOGLE_TTS_API_KEY ||
      ''
    ).trim();
    const voice =
      (
        env.GOOGLE_TTS_VOICE ||
        process.env.GOOGLE_TTS_VOICE ||
        DEFAULT_TTS_VOICE
      ).trim() || DEFAULT_TTS_VOICE;

    return { apiKey, voice };
  };

  return {
    name: 'google-cloud-tts-proxy',
    configureServer(server) {
      attachTtsRoutes(server, resolveConfig);
    },
    configurePreviewServer(server) {
      attachTtsRoutes(server, resolveConfig);
    },
  };
}
