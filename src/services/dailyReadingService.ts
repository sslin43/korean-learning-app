import type { DailyReadingLesson } from '../types/korean';

export interface RequestAiDailyReadingParams {
  dayNumber: number;
  date: string;
  topicHint?: string;
  recentTitles?: string[];
}

export async function requestAiDailyReading(
  params: RequestAiDailyReadingParams,
  signal?: AbortSignal
): Promise<DailyReadingLesson> {
  const response = await fetch('/api/daily-reading', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errMessage =
      typeof payload === 'object' &&
      payload !== null &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `無法取得 AI 每日閱讀小課（HTTP ${response.status}），請稍後再試。`;
    throw new Error(errMessage);
  }

  return payload as DailyReadingLesson;
}
