import type {
  AiStatus,
  PronunciationFeedback,
  PronunciationTarget,
  RecordingEntry,
} from '../types/korean';

const DEFAULT_AI_STATUS: AiStatus = {
  configured: false,
  model: 'gemini-3.8-flash',
};

export async function fetchAiStatus(signal?: AbortSignal): Promise<AiStatus> {
  try {
    const response = await fetch('/api/ai-status', {
      method: 'GET',
      signal,
    });
    if (!response.ok) {
      return DEFAULT_AI_STATUS;
    }
    const data = (await response.json()) as Partial<AiStatus>;
    return {
      configured: Boolean(data.configured),
      model:
        typeof data.model === 'string' && data.model.trim()
          ? data.model.trim()
          : DEFAULT_AI_STATUS.model,
    };
  } catch {
    return DEFAULT_AI_STATUS;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('無法讀取錄音音訊內容。'));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => {
      reject(new Error('轉換錄音音訊格式時發生錯誤。'));
    };
    reader.readAsDataURL(blob);
  });
}

export async function analyzePronunciation(
  sentence: PronunciationTarget,
  recording: RecordingEntry,
  signal?: AbortSignal
): Promise<PronunciationFeedback> {
  const audioBase64 = await blobToBase64(recording.blob);

  const response = await fetch('/api/analyze-pronunciation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioBase64,
      mimeType: recording.mimeType || recording.blob.type || 'audio/webm',
      targetKorean: sentence.korean,
      pronunciationGuide: sentence.pronunciationGuide,
      romanization: sentence.romanization,
      translation: sentence.translation,
    }),
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
        : `AI 發音分析失敗（HTTP ${response.status}），請稍後再試。`;
    throw new Error(errMessage);
  }

  return payload as PronunciationFeedback;
}
