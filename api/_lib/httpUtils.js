/**
 * Shared HTTP, JSON, and timeout utilities for backend serverless handlers
 * and local Vite middleware adapters.
 */

const textEncoder = new TextEncoder();

/**
 * Determine whether an error represents an upstream fetch/socket timeout.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isTimeoutError(err) {
  if (!(err instanceof Error)) {
    return false;
  }
  if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    return true;
  }
  const causeCode =
    err.cause && typeof err.cause === 'object' ? err.cause.code : undefined;
  const code = err.code ?? causeCode;
  return code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'ETIMEDOUT';
}

/**
 * Build a Web Standard JSON Response with no-store caching.
 * @param {number} statusCode
 * @param {unknown} payload
 * @returns {Response}
 */
export function jsonResponse(statusCode, payload) {
  return Response.json(payload, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Safely read and validate a JSON object body from a Web Standard Request.
 * @param {Request} request
 * @param {{
 *   maxBytes: number;
 *   createError: (statusCode: number, message: string) => Error;
 *   tooLargeMessage: string;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readWebJsonBody(request, options) {
  const { maxBytes, createError, tooLargeMessage } = options;

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const declaredBytes = Number(contentLengthHeader);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw createError(413, tooLargeMessage);
    }
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    throw createError(400, '讀取請求資料失敗。');
  }

  if (textEncoder.encode(rawBody).byteLength > maxBytes) {
    throw createError(413, tooLargeMessage);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody || '{}');
  } catch {
    throw createError(400, '無法解析請求 JSON 內容。');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw createError(400, '請求格式不正確。');
  }

  return parsed;
}
