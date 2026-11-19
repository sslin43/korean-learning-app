/**
 * Shared Vite dev/preview Connect-middleware request/response utilities.
 */

export interface MiddlewareRequest {
  method?: string;
  url?: string;
  on(event: 'data', listener: (chunk: Uint8Array) => void): void;
  on(event: 'end', listener: () => void): void;
  on(event: 'error', listener: (err: Error) => void): void;
  destroy?: () => void;
}

export interface MiddlewareResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export interface MiddlewareServer {
  middlewares: {
    use: (
      handler: (
        req: MiddlewareRequest,
        res: MiddlewareResponse,
        next: () => void
      ) => void
    ) => void;
  };
}

export function sendJson(
  res: MiddlewareResponse,
  statusCode: number,
  payload: unknown
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function readJsonBody<E extends Error>(
  req: MiddlewareRequest,
  options: {
    maxBytes: number;
    createError: (statusCode: number, message: string) => E;
    tooLargeMessage: string;
  }
): Promise<Record<string, unknown>> {
  const { maxBytes, createError, tooLargeMessage } = options;

  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder();
    let body = '';
    let receivedBytes = 0;
    let aborted = false;

    req.on('data', (chunk: Uint8Array) => {
      if (aborted) return;
      receivedBytes += chunk.byteLength;
      if (receivedBytes > maxBytes) {
        aborted = true;
        req.destroy?.();
        reject(createError(413, tooLargeMessage));
        return;
      }
      body += decoder.decode(chunk, { stream: true });
    });

    req.on('end', () => {
      if (aborted) return;
      body += decoder.decode();
      try {
        const parsed = JSON.parse(body || '{}') as unknown;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          reject(createError(400, '請求格式不正確。'));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        reject(createError(400, '無法解析請求 JSON 內容。'));
      }
    });

    req.on('error', () => {
      if (!aborted) {
        reject(createError(400, '讀取請求資料失敗。'));
      }
    });
  });
}
