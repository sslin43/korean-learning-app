import { loadEnv, type Plugin } from 'vite';
import {
  DEFAULT_GEMINI_MODEL,
  GeminiHttpError,
  analyzeWithGemini,
  normalizeAudioMimeType,
  parseAnalyzeRequestBody,
} from '../api/_lib/geminiCore.js';
import {
  readJsonBody,
  sendJson,
  type MiddlewareServer,
} from './middlewareUtils.ts';

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

export type PronunciationLevel = 'excellent' | 'good' | 'needs-practice' | 'unclear';

export interface PronunciationImprovement {
  segment: string;
  issue: string;
  suggestion: string;
}

export interface PronunciationFeedback {
  score: number;
  level: PronunciationLevel;
  heardKorean: string;
  summary: string;
  strengths: string[];
  improvements: PronunciationImprovement[];
  nextStepTip: string;
  modelUsed?: string;
}

export interface AnalyzePronunciationInput {
  audioBase64: string;
  mimeType: string;
  targetKorean: string;
  pronunciationGuide?: string;
  romanization?: string;
  translation?: string;
}

export { GeminiHttpError, analyzeWithGemini, normalizeAudioMimeType };

const MAX_BODY_BYTES = 12 * 1024 * 1024;

function attachPronunciationRoutes(
  server: MiddlewareServer,
  getConfig: () => { apiKey: string; model: string }
): void {
  server.middlewares.use((req, res, next) => {
    const pathname = (req.url ?? '').split('?')[0];

    if (req.method === 'GET' && pathname === '/api/ai-status') {
      const { apiKey, model } = getConfig();
      sendJson(res, 200, {
        configured: Boolean(apiKey),
        model,
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/analyze-pronunciation') {
      void (async () => {
        try {
          const { apiKey, model } = getConfig();
          if (!apiKey) {
            sendJson(res, 503, {
              error: '尚未設定 GEMINI_API_KEY，請先在專案根目錄建立 .env 並重新啟動伺服器。',
            });
            return;
          }

          const body = await readJsonBody(req, {
            maxBytes: MAX_BODY_BYTES,
            createError: (statusCode, message) => new GeminiHttpError(statusCode, message),
            tooLargeMessage: '錄音檔案過大，請錄製 15 秒內的音訊再試。',
          });

          const input = parseAnalyzeRequestBody(body);
          const { feedback } = await analyzeWithGemini(input, { apiKey, model });

          sendJson(res, 200, feedback);
        } catch (err) {
          if (err instanceof GeminiHttpError) {
            sendJson(res, err.statusCode, { error: err.message });
            return;
          }
          sendJson(res, 500, {
            error: '分析韓語發音時發生未預期錯誤，請稍後再試。',
          });
        }
      })();
      return;
    }

    next();
  });
}

export function geminiPronunciationPlugin(mode: string): Plugin {
  const resolveConfig = () => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    const model =
      (
        env.GEMINI_MODEL ||
        process.env.GEMINI_MODEL ||
        DEFAULT_GEMINI_MODEL
      ).trim() || DEFAULT_GEMINI_MODEL;

    return { apiKey, model };
  };

  return {
    name: 'gemini-pronunciation-proxy',
    configureServer(server) {
      attachPronunciationRoutes(server, resolveConfig);
    },
    configurePreviewServer(server) {
      attachPronunciationRoutes(server, resolveConfig);
    },
  };
}
