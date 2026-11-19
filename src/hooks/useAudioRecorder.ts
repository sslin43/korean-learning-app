import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordingEntry } from '../types/korean';

export const MAX_RECORDING_DURATION_MS = 15000;
const HISTORY_BAR_COUNT = 24;

function createEmptyLevels(): number[] {
  return Array.from({ length: HISTORY_BAR_COUNT }, () => 0.08);
}

function selectSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return '';
}

function mapMicError(err: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return '麥克風錄音需要在 HTTPS 或 localhost 安全環境下才能啟用。';
  }

  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return '尚未取得麥克風權限，請點擊瀏覽器網址列左側的權限圖示並允許使用麥克風。';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return '找不到可用的麥克風裝置，請確認耳機或麥克風已正確連接。';
      case 'NotReadableError':
      case 'TrackStartError':
        return '麥克風目前可能正被其他應用程式佔用，請關閉後再試一次。';
      default:
        return `無法啟動麥克風錄音（${err.name}）。`;
    }
  }

  return '無法啟動麥克風錄音，請檢查裝置權限或更換瀏覽器再試。';
}

export interface UseAudioRecorderOptions {
  onRecordingComplete?: (sentenceId: string, entry: RecordingEntry) => void;
}

export interface UseAudioRecorderResult {
  recordings: Record<string, RecordingEntry>;
  recordingSentenceId: string | null;
  elapsedMs: number;
  levelsHistory: number[];
  isSupported: boolean;
  error: string | null;
  startRecording: (sentenceId: string) => Promise<void>;
  stopRecording: () => void;
  deleteRecording: (sentenceId: string) => void;
  clearError: () => void;
}

export function useAudioRecorder(
  options?: UseAudioRecorderOptions
): UseAudioRecorderResult {
  const [recordings, setRecordings] = useState<Record<string, RecordingEntry>>({});
  const [recordingSentenceId, setRecordingSentenceId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [levelsHistory, setLevelsHistory] = useState<number[]>(() => createEmptyLevels());
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const maxTimeoutRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const activeSentenceRef = useRef<string | null>(null);
  const recordingsRef = useRef<Record<string, RecordingEntry>>({});
  const onRecordingCompleteRef = useRef(options?.onRecordingComplete);

  useEffect(() => {
    onRecordingCompleteRef.current = options?.onRecordingComplete;
  }, [options?.onRecordingComplete]);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  const cleanupCaptureResources = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (maxTimeoutRef.current !== null) {
      window.clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      ctx.close().catch(() => {});
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        cleanupCaptureResources();
        setRecordingSentenceId(null);
        activeSentenceRef.current = null;
      }
    } else {
      cleanupCaptureResources();
      setRecordingSentenceId(null);
      activeSentenceRef.current = null;
    }
  }, [cleanupCaptureResources]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null;
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore cleanup errors on unmount
        }
      }
      cleanupCaptureResources();
      Object.values(recordingsRef.current).forEach((entry) => {
        URL.revokeObjectURL(entry.url);
      });
    };
  }, [cleanupCaptureResources]);

  const startRecording = useCallback(
    async (sentenceId: string) => {
      setError(null);

      if (!isSupported) {
        setError('目前瀏覽器不支援麥克風錄音，請使用新版 Chrome、Edge、Firefox 或 Safari。');
        return;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        stopRecording();
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        streamRef.current = stream;
        activeSentenceRef.current = sentenceId;
        chunksRef.current = [];

        const preferredMime = selectSupportedMimeType();
        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onerror = () => {
          cleanupCaptureResources();
          setRecordingSentenceId(null);
          activeSentenceRef.current = null;
          setError('錄音過程發生錯誤，請再試一次。');
        };

        recorder.onstop = () => {
          const targetId = activeSentenceRef.current;
          const durationMs = Math.max(200, Date.now() - startTimeRef.current);
          const resolvedMime =
            recorder.mimeType || preferredMime || chunksRef.current[0]?.type || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: resolvedMime });

          cleanupCaptureResources();
          mediaRecorderRef.current = null;
          activeSentenceRef.current = null;
          setRecordingSentenceId(null);
          setElapsedMs(0);
          setLevelsHistory(createEmptyLevels());

          if (!targetId || blob.size === 0) {
            setError('沒有錄到有效聲音，請靠近麥克風再試一次。');
            return;
          }

          const url = URL.createObjectURL(blob);
          const entry: RecordingEntry = {
            url,
            blob,
            mimeType: resolvedMime,
            durationMs,
            createdAt: Date.now(),
          };

          setRecordings((prev) => {
            const old = prev[targetId];
            if (old) {
              URL.revokeObjectURL(old.url);
            }
            return {
              ...prev,
              [targetId]: entry,
            };
          });

          onRecordingCompleteRef.current?.(targetId, entry);
        };

        // Set up Web Audio AnalyserNode for live waveform visualization
        const AudioCtx =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (AudioCtx) {
          try {
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.6;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.fftSize);
            let lastPush = 0;

            const sampleLevel = (now: number) => {
              if (now - lastPush >= 65) {
                analyser.getByteTimeDomainData(dataArray);
                let sumSquares = 0;
                for (let i = 0; i < dataArray.length; i += 1) {
                  const normalized = (dataArray[i] - 128) / 128;
                  sumSquares += normalized * normalized;
                }
                const rms = Math.sqrt(sumSquares / dataArray.length);
                const level = Math.min(1, Math.max(0.08, rms * 3.8));
                setLevelsHistory((prev) => [...prev.slice(1), level]);
                lastPush = now;
              }
              rafIdRef.current = requestAnimationFrame(sampleLevel);
            };

            rafIdRef.current = requestAnimationFrame(sampleLevel);
          } catch {
            // Audio visualization is progressive enhancement; keep recording even if AudioContext fails
          }
        }

        startTimeRef.current = Date.now();
        setElapsedMs(0);
        setLevelsHistory(createEmptyLevels());
        setRecordingSentenceId(sentenceId);

        timerIdRef.current = window.setInterval(() => {
          setElapsedMs(Math.min(MAX_RECORDING_DURATION_MS, Date.now() - startTimeRef.current));
        }, 100);

        maxTimeoutRef.current = window.setTimeout(() => {
          stopRecording();
        }, MAX_RECORDING_DURATION_MS);

        recorder.start(200);
      } catch (err) {
        cleanupCaptureResources();
        setRecordingSentenceId(null);
        activeSentenceRef.current = null;
        setError(mapMicError(err));
      }
    },
    [cleanupCaptureResources, isSupported, stopRecording]
  );

  const deleteRecording = useCallback((sentenceId: string) => {
    setRecordings((prev) => {
      const target = prev[sentenceId];
      if (!target) {
        return prev;
      }
      URL.revokeObjectURL(target.url);
      const next = { ...prev };
      delete next[sentenceId];
      return next;
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    recordings,
    recordingSentenceId,
    elapsedMs,
    levelsHistory,
    isSupported,
    error,
    startRecording,
    stopRecording,
    deleteRecording,
    clearError,
  };
}
