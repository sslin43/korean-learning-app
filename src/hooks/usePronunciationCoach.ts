import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import {
  analyzePronunciation,
  fetchAiStatus,
} from '../services/pronunciationAiService';
import type {
  AiStatus,
  AnalysisState,
  ComparePhase,
  PronunciationTarget,
  RecordingEntry,
} from '../types/korean';

export interface CompareState {
  targetId: string;
  phase: Exclude<ComparePhase, null>;
}

export interface UsePronunciationCoachOptions {
  speakingId: string | null;
  onSpeakText: (
    speechId: string,
    text: string,
    overrideRate?: number,
    audioUrl?: string
  ) => Promise<boolean>;
  onStopSpeech: () => void;
  onBeforeAction?: () => void;
}

export interface PronunciationCoachController {
  aiStatus: AiStatus;
  autoAnalyze: boolean;
  setAutoAnalyze: (value: boolean) => void;
  recordings: Record<string, RecordingEntry>;
  recordingTargetId: string | null;
  elapsedMs: number;
  levelsHistory: number[];
  isMicSupported: boolean;
  recorderError: string | null;
  clearRecorderError: () => void;
  playbackError: string | null;
  clearPlaybackError: () => void;
  analyses: Record<string, AnalysisState>;
  playingUserTargetId: string | null;
  compareState: CompareState | null;
  speakingId: string | null;
  playNative: (
    target: PronunciationTarget,
    rate: number,
    speechId: string
  ) => void;
  toggleRecording: (
    target: PronunciationTarget,
    options?: { forceAnalyze?: boolean }
  ) => void;
  toggleUserPlayback: (targetId: string) => void;
  toggleCompare: (target: PronunciationTarget) => void;
  analyzeTarget: (target: PronunciationTarget) => void;
  deleteRecording: (targetId: string) => void;
  stopAll: () => void;
}

export function usePronunciationCoach({
  speakingId,
  onSpeakText,
  onStopSpeech,
  onBeforeAction,
}: UsePronunciationCoachOptions): PronunciationCoachController {
  const [aiStatus, setAiStatus] = useState<AiStatus>({
    configured: false,
    model: 'gemini-3.5-flash-lite',
  });
  const [autoAnalyze, setAutoAnalyze] = useState<boolean>(true);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisState>>({});
  const [playingUserTargetId, setPlayingUserTargetId] = useState<string | null>(
    null
  );
  const [compareState, setCompareState] = useState<CompareState | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const compareTokenRef = useRef<number>(0);
  const compareTimerRef = useRef<number | null>(null);
  const recordingTargetIdRef = useRef<string | null>(null);
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const pendingTargetsRef = useRef<
    Record<string, { target: PronunciationTarget; forceAnalyze: boolean }>
  >({});
  const aiStatusRef = useRef<AiStatus>(aiStatus);
  const autoAnalyzeRef = useRef<boolean>(autoAnalyze);
  const onBeforeActionRef = useRef(onBeforeAction);

  useEffect(() => {
    onBeforeActionRef.current = onBeforeAction;
  }, [onBeforeAction]);

  useEffect(() => {
    aiStatusRef.current = aiStatus;
  }, [aiStatus]);

  useEffect(() => {
    autoAnalyzeRef.current = autoAnalyze;
  }, [autoAnalyze]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAiStatus(controller.signal).then((status) => {
      if (!controller.signal.aborted) {
        setAiStatus(status);
      }
    });
    return () => controller.abort();
  }, []);

  const abortTargetAnalysis = useCallback((targetId: string) => {
    const existing = abortControllersRef.current[targetId];
    if (existing) {
      existing.abort();
      delete abortControllersRef.current[targetId];
    }
  }, []);

  const runAnalysis = useCallback(
    async (target: PronunciationTarget, recording: RecordingEntry) => {
      abortTargetAnalysis(target.id);

      const controller = new AbortController();
      abortControllersRef.current[target.id] = controller;

      setAnalyses((prev) => ({
        ...prev,
        [target.id]: { status: 'analyzing' },
      }));

      try {
        const feedback = await analyzePronunciation(
          target,
          recording,
          controller.signal
        );

        if (
          controller.signal.aborted ||
          abortControllersRef.current[target.id] !== controller
        ) {
          return;
        }

        delete abortControllersRef.current[target.id];
        setAnalyses((prev) => ({
          ...prev,
          [target.id]: { status: 'success', feedback },
        }));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (
          controller.signal.aborted ||
          abortControllersRef.current[target.id] !== controller
        ) {
          return;
        }

        delete abortControllersRef.current[target.id];
        const message =
          err instanceof Error
            ? err.message
            : 'AI 發音分析失敗，請稍後再試一次。';

        setAnalyses((prev) => ({
          ...prev,
          [target.id]: { status: 'error', error: message },
        }));
      }
    },
    [abortTargetAnalysis]
  );

  const handleRecordingComplete = useCallback(
    (targetId: string, entry: RecordingEntry) => {
      abortTargetAnalysis(targetId);

      const pending = pendingTargetsRef.current[targetId];
      delete pendingTargetsRef.current[targetId];

      const shouldAnalyze =
        aiStatusRef.current.configured &&
        Boolean(pending?.target) &&
        (Boolean(pending?.forceAnalyze) || autoAnalyzeRef.current);

      if (shouldAnalyze && pending?.target) {
        void runAnalysis(pending.target, entry);
        return;
      }

      setAnalyses((prev) => {
        if (!prev[targetId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    },
    [abortTargetAnalysis, runAnalysis]
  );

  const {
    recordings,
    recordingSentenceId: recordingTargetId,
    elapsedMs,
    levelsHistory,
    isSupported: isMicSupported,
    error: recorderError,
    startRecording,
    stopRecording,
    deleteRecording: deleteRecordedBlob,
    clearError: clearRecorderError,
  } = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete,
  });

  useEffect(() => {
    recordingTargetIdRef.current = recordingTargetId;
  }, [recordingTargetId]);

  const stopUserAudio = useCallback(() => {
    if (audioElementRef.current) {
      const audio = audioElementRef.current;
      audioElementRef.current = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingUserTargetId(null);
  }, []);

  const stopPlaybackAndCompare = useCallback(() => {
    compareTokenRef.current += 1;
    if (compareTimerRef.current !== null) {
      window.clearTimeout(compareTimerRef.current);
      compareTimerRef.current = null;
    }
    setCompareState(null);
    stopUserAudio();
  }, [stopUserAudio]);

  const stopAll = useCallback(() => {
    stopPlaybackAndCompare();
    if (recordingTargetIdRef.current !== null) {
      stopRecording();
    }
  }, [stopPlaybackAndCompare, stopRecording]);

  useEffect(() => {
    return () => {
      compareTokenRef.current += 1;
      if (compareTimerRef.current !== null) {
        window.clearTimeout(compareTimerRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      Object.values(abortControllersRef.current).forEach((ctrl) => ctrl.abort());
      abortControllersRef.current = {};
    };
  }, []);

  const playUserAudioBlob = useCallback(
    (targetId: string, url: string): Promise<boolean> => {
      stopUserAudio();
      setPlaybackError(null);

      return new Promise((resolve) => {
        const audio = new Audio(url);
        audioElementRef.current = audio;
        setPlayingUserTargetId(targetId);

        const finish = (ok: boolean) => {
          if (audioElementRef.current === audio) {
            audioElementRef.current = null;
          }
          audio.onended = null;
          audio.onerror = null;
          setPlayingUserTargetId((current) =>
            current === targetId ? null : current
          );
          resolve(ok);
        };

        audio.onended = () => finish(true);
        audio.onerror = () => {
          setPlaybackError('無法播放這段錄音，請試著重新錄製一次。');
          finish(false);
        };

        audio.play().catch(() => {
          setPlaybackError('瀏覽器阻止了錄音播放，請再點擊一次播放按鈕。');
          finish(false);
        });
      });
    },
    [stopUserAudio]
  );

  const playNative = useCallback(
    (target: PronunciationTarget, targetRate: number, speechId: string) => {
      onBeforeActionRef.current?.();
      setPlaybackError(null);
      const isSamePlaying = speakingId === speechId && compareState === null;

      stopPlaybackAndCompare();
      if (recordingTargetId !== null) {
        stopRecording();
      }

      if (isSamePlaying) {
        onStopSpeech();
        return;
      }

      void onSpeakText(speechId, target.korean, targetRate, target.audioUrl);
    },
    [
      compareState,
      onSpeakText,
      onStopSpeech,
      recordingTargetId,
      speakingId,
      stopPlaybackAndCompare,
      stopRecording,
    ]
  );

  const toggleRecording = useCallback(
    (target: PronunciationTarget, options?: { forceAnalyze?: boolean }) => {
      onBeforeActionRef.current?.();
      setPlaybackError(null);
      stopPlaybackAndCompare();
      onStopSpeech();

      if (recordingTargetId === target.id) {
        stopRecording();
        return;
      }

      pendingTargetsRef.current[target.id] = {
        target,
        forceAnalyze: Boolean(options?.forceAnalyze),
      };

      abortTargetAnalysis(target.id);
      setAnalyses((prev) => {
        if (!prev[target.id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[target.id];
        return next;
      });

      void startRecording(target.id);
    },
    [
      abortTargetAnalysis,
      onStopSpeech,
      recordingTargetId,
      startRecording,
      stopPlaybackAndCompare,
      stopRecording,
    ]
  );

  const toggleUserPlayback = useCallback(
    (targetId: string) => {
      onBeforeActionRef.current?.();
      const entry = recordings[targetId];
      if (!entry) {
        return;
      }

      const wasPlayingThis =
        playingUserTargetId === targetId && compareState === null;

      stopPlaybackAndCompare();
      onStopSpeech();

      if (wasPlayingThis) {
        return;
      }

      void playUserAudioBlob(targetId, entry.url);
    },
    [
      compareState,
      onStopSpeech,
      playUserAudioBlob,
      playingUserTargetId,
      recordings,
      stopPlaybackAndCompare,
    ]
  );

  const toggleCompare = useCallback(
    async (target: PronunciationTarget) => {
      onBeforeActionRef.current?.();
      const entry = recordings[target.id];
      if (!entry) {
        return;
      }

      const wasComparingThis = compareState?.targetId === target.id;
      stopPlaybackAndCompare();
      onStopSpeech();

      if (wasComparingThis) {
        return;
      }

      const token = ++compareTokenRef.current;
      setCompareState({ targetId: target.id, phase: 'native' });

      const finishedNative = await onSpeakText(
        `compare-${target.id}`,
        target.korean,
        1.0,
        target.audioUrl
      );

      if (compareTokenRef.current !== token) {
        return;
      }

      if (!finishedNative) {
        setCompareState(null);
        return;
      }

      setCompareState({ targetId: target.id, phase: 'pause' });

      await new Promise<void>((resolve) => {
        compareTimerRef.current = window.setTimeout(() => {
          compareTimerRef.current = null;
          resolve();
        }, 600);
      });

      if (compareTokenRef.current !== token) {
        return;
      }

      setCompareState({ targetId: target.id, phase: 'user' });
      await playUserAudioBlob(target.id, entry.url);

      if (compareTokenRef.current === token) {
        setCompareState(null);
      }
    },
    [
      compareState,
      onSpeakText,
      onStopSpeech,
      playUserAudioBlob,
      recordings,
      stopPlaybackAndCompare,
    ]
  );

  const analyzeTarget = useCallback(
    (target: PronunciationTarget) => {
      const entry = recordings[target.id];
      if (!entry || !aiStatus.configured) {
        return;
      }
      void runAnalysis(target, entry);
    },
    [aiStatus.configured, recordings, runAnalysis]
  );

  const deleteRecording = useCallback(
    (targetId: string) => {
      if (
        playingUserTargetId === targetId ||
        compareState?.targetId === targetId
      ) {
        stopPlaybackAndCompare();
        onStopSpeech();
      }
      delete pendingTargetsRef.current[targetId];
      abortTargetAnalysis(targetId);
      setAnalyses((prev) => {
        if (!prev[targetId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      deleteRecordedBlob(targetId);
    },
    [
      abortTargetAnalysis,
      compareState,
      deleteRecordedBlob,
      onStopSpeech,
      playingUserTargetId,
      stopPlaybackAndCompare,
    ]
  );

  const clearPlaybackError = useCallback(() => {
    setPlaybackError(null);
  }, []);

  return {
    aiStatus,
    autoAnalyze,
    setAutoAnalyze,
    recordings,
    recordingTargetId,
    elapsedMs,
    levelsHistory,
    isMicSupported,
    recorderError,
    clearRecorderError,
    playbackError,
    clearPlaybackError,
    analyses,
    playingUserTargetId,
    compareState,
    speakingId,
    playNative,
    toggleRecording,
    toggleUserPlayback,
    toggleCompare,
    analyzeTarget,
    deleteRecording,
    stopAll,
  };
}
