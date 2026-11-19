import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchTtsStatus,
  speakKorean,
  stopSpeech,
} from '../services/speechService';

export interface UseKoreanSpeechResult {
  speakingId: string | null;
  rate: number;
  isSupported: boolean;
  hasKoreanVoice: boolean;
  voiceName: string | null;
  error: string | null;
  speak: (
    id: string,
    text: string,
    overrideRate?: number,
    audioUrl?: string
  ) => Promise<boolean>;
  stop: () => void;
  setRate: (rate: number) => void;
  clearError: () => void;
}

export function useKoreanSpeech(): UseKoreanSpeechResult {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(1.0);
  const [ttsConfigured, setTtsConfigured] = useState<boolean>(false);
  const [voiceName, setVoiceName] = useState<string>('ko-KR-Neural2-A');
  const [error, setError] = useState<string | null>(null);

  const activeTokenRef = useRef<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchTtsStatus(controller.signal).then((status) => {
      if (!controller.signal.aborted) {
        setTtsConfigured(status.configured);
        setVoiceName(status.voice);
      }
    });

    return () => {
      controller.abort();
      stopSpeech();
    };
  }, []);

  const stop = useCallback(() => {
    activeTokenRef.current += 1;
    stopSpeech();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    async (
      id: string,
      text: string,
      overrideRate?: number,
      audioUrl?: string
    ): Promise<boolean> => {
      setError(null);

      const token = ++activeTokenRef.current;
      setSpeakingId(id);

      const result = await speakKorean(text, {
        rate: overrideRate ?? rate,
        voice: voiceName,
        audioUrl,
      });

      if (activeTokenRef.current === token) {
        setSpeakingId(null);
      }

      if (result.outcome === 'error') {
        setError(
          result.errorMessage ??
            '無法播放 Google Cloud 韓語發音，請確認後端環境變數 GOOGLE_TTS_API_KEY 與網路連線。'
        );
        return false;
      }

      return result.outcome === 'completed' && activeTokenRef.current === token;
    },
    [rate, voiceName]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    speakingId,
    rate,
    isSupported: true,
    hasKoreanVoice: ttsConfigured,
    voiceName,
    error,
    speak,
    stop,
    setRate,
    clearError,
  };
}
