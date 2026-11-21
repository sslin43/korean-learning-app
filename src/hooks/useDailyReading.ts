import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import seedJson from '../data/dailyReadingsSeed.json';
import { requestAiDailyReading } from '../services/dailyReadingService';
import type {
  DailyReadingLesson,
  DailyReadingProgress,
} from '../types/korean';

const STORAGE_KEY = 'korean_daily_readings_v1';

interface SeedLessonRaw extends Omit<DailyReadingLesson, 'date'> {
  date?: string;
}

const CURATED_SEEDS = seedJson as SeedLessonRaw[];

interface PersistedDailyReadingStore {
  lessons: DailyReadingLesson[];
  selectedLessonId: string | null;
  progressById: Record<string, DailyReadingProgress>;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createSeedLessonForDate(
  seed: SeedLessonRaw,
  dateKey: string
): DailyReadingLesson {
  return {
    ...seed,
    date: dateKey,
  };
}

function getNextSeedForLessons(
  existingLessons: DailyReadingLesson[]
): SeedLessonRaw | null {
  const usedSeedIds = new Set(existingLessons.map((lesson) => lesson.id));
  return CURATED_SEEDS.find((seed) => !usedSeedIds.has(seed.id)) ?? null;
}

function getMaxDayNumber(lessons: DailyReadingLesson[]): number {
  return lessons.reduce((max, lesson) => Math.max(max, lesson.dayNumber), 0);
}

function readStoredState(): PersistedDailyReadingStore {
  if (typeof window === 'undefined') {
    const todayKey = getTodayDateKey();
    const first = createSeedLessonForDate(CURATED_SEEDS[0], todayKey);
    return {
      lessons: [first],
      selectedLessonId: first.id,
      progressById: {},
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { lessons: [], selectedLessonId: null, progressById: {} };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedDailyReadingStore>;
    const seedById = new Map(CURATED_SEEDS.map((seed) => [seed.id, seed]));
    const lessons = Array.isArray(parsed.lessons)
      ? parsed.lessons
          .filter(
            (item): item is DailyReadingLesson =>
              Boolean(item && typeof item.id === 'string' && typeof item.passage === 'string')
          )
          .map((item) => {
            const seed = seedById.get(item.id);
            if (!seed) return item;
            return {
              ...seed,
              ...item,
              titleEn: item.titleEn ?? seed.titleEn,
              translationEn: item.translationEn ?? seed.translationEn,
              sentences: seed.sentences.length === item.sentences.length
                ? item.sentences.map((s, idx) => ({
                    ...s,
                    en: s.en ?? seed.sentences[idx]?.en,
                  }))
                : item.sentences,
              vocabulary: seed.vocabulary.length === item.vocabulary.length
                ? item.vocabulary.map((v, idx) => ({
                    ...v,
                    meaningEn: v.meaningEn ?? seed.vocabulary[idx]?.meaningEn,
                  }))
                : item.vocabulary,
              grammar: seed.grammar.length === item.grammar.length
                ? item.grammar.map((g, idx) => ({
                    ...g,
                    exampleEn: g.exampleEn ?? seed.grammar[idx]?.exampleEn,
                  }))
                : item.grammar,
            };
          })
      : [];
    const selectedLessonId =
      typeof parsed.selectedLessonId === 'string' ? parsed.selectedLessonId : null;
    const progressById =
      parsed.progressById && typeof parsed.progressById === 'object'
        ? parsed.progressById
        : {};
    return { lessons, selectedLessonId, progressById };
  } catch {
    return { lessons: [], selectedLessonId: null, progressById: {} };
  }
}

function buildInitialStore(todayKey: string): PersistedDailyReadingStore {
  const stored = readStoredState();
  const hasTodayPush = stored.lessons.some((lesson) => lesson.date === todayKey);

  if (hasTodayPush || stored.lessons.length === 0) {
    if (stored.lessons.length === 0 && CURATED_SEEDS[0]) {
      const dayOne = createSeedLessonForDate(CURATED_SEEDS[0], todayKey);
      return {
        lessons: [dayOne],
        selectedLessonId: dayOne.id,
        progressById: stored.progressById,
      };
    }

    const fallbackSelected =
      stored.lessons.find((l) => l.id === stored.selectedLessonId)?.id ??
      stored.lessons[stored.lessons.length - 1]?.id ??
      null;
    return {
      lessons: stored.lessons,
      selectedLessonId: fallbackSelected,
      progressById: stored.progressById,
    };
  }

  // New calendar date and no push recorded for today yet: push next curated seed immediately if available
  const nextSeed = getNextSeedForLessons(stored.lessons);
  if (nextSeed) {
    const pushed = createSeedLessonForDate(nextSeed, todayKey);
    const updatedLessons = [...stored.lessons, pushed];
    return {
      lessons: updatedLessons,
      selectedLessonId: pushed.id,
      progressById: stored.progressById,
    };
  }

  // Day 8+: keep stored state; guarded effect will trigger AI push for today
  const fallbackSelected =
    stored.lessons.find((l) => l.id === stored.selectedLessonId)?.id ??
    stored.lessons[stored.lessons.length - 1]?.id ??
    null;
  return {
    lessons: stored.lessons,
    selectedLessonId: fallbackSelected,
    progressById: stored.progressById,
  };
}

function writeStore(store: PersistedDailyReadingStore): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export interface DailyReadingController {
  lessons: DailyReadingLesson[];
  selectedLesson: DailyReadingLesson | null;
  selectedLessonId: string | null;
  selectLesson: (lessonId: string) => void;
  todayDateKey: string;
  hasPushedToday: boolean;
  progressById: Record<string, DailyReadingProgress>;
  completedCount: number;
  isGenerating: boolean;
  generateError: string | null;
  clearGenerateError: () => void;
  toggleMasteredWord: (lessonId: string, word: string) => void;
  toggleCompleted: (lessonId: string) => void;
  pushNextLesson: () => Promise<void>;
  generateCustomLesson: (topicHint: string) => Promise<boolean>;
}

export function useDailyReading(): DailyReadingController {
  const todayDateKey = getTodayDateKey();
  const [store, setStore] = useState<PersistedDailyReadingStore>(() =>
    buildInitialStore(todayDateKey)
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const autoPushedDateRef = useRef<string | null>(null);
  const activeAbortRef = useRef<AbortController | null>(null);
  const storeRef = useRef(store);

  useEffect(() => {
    storeRef.current = store;
    writeStore(store);
  }, [store]);

  useEffect(() => {
    return () => {
      activeAbortRef.current?.abort();
    };
  }, []);

  // Automatically push a new AI lesson for today once Days 1-7 curated seeds are exhausted
  useEffect(() => {
    const hasToday = store.lessons.some((lesson) => lesson.date === todayDateKey);
    if (hasToday || autoPushedDateRef.current === todayDateKey) {
      return;
    }

    autoPushedDateRef.current = todayDateKey;
    const nextDayNumber = getMaxDayNumber(store.lessons) + 1;
    const recentTitles = store.lessons.slice(-15).map((l) => l.titleTc);

    const controller = new AbortController();
    activeAbortRef.current?.abort();
    activeAbortRef.current = controller;
    let settled = false;

    setIsGenerating(true);
    setGenerateError(null);

    void requestAiDailyReading(
      {
        dayNumber: nextDayNumber,
        date: todayDateKey,
        recentTitles,
      },
      controller.signal
    )
      .then((newLesson) => {
        settled = true;
        if (controller.signal.aborted) return;
        setStore((prev) => ({
          ...prev,
          lessons: [...prev.lessons, newLesson],
          selectedLessonId: newLesson.id,
        }));
      })
      .catch((err) => {
        settled = true;
        if (controller.signal.aborted) return;
        setGenerateError(
          err instanceof Error
            ? err.message
            : '自動推送今日閱讀小課失敗，請點擊下方按鈕重試。'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsGenerating(false);
        }
      });

    return () => {
      if (!settled) {
        autoPushedDateRef.current = null;
        setIsGenerating(false);
      }
      controller.abort();
    };
  }, [store.lessons, todayDateKey]);

  const orderedLessons = useMemo(
    () => [...store.lessons].sort((a, b) => b.dayNumber - a.dayNumber),
    [store.lessons]
  );

  const selectedLesson = useMemo(
    () =>
      orderedLessons.find((l) => l.id === store.selectedLessonId) ??
      orderedLessons[0] ??
      null,
    [orderedLessons, store.selectedLessonId]
  );

  const hasPushedToday = useMemo(
    () => store.lessons.some((l) => l.date === todayDateKey),
    [store.lessons, todayDateKey]
  );

  const completedCount = useMemo(
    () =>
      store.lessons.filter((lesson) => Boolean(store.progressById[lesson.id]?.completed))
        .length,
    [store.lessons, store.progressById]
  );

  const selectLesson = useCallback((lessonId: string) => {
    setStore((prev) => ({
      ...prev,
      selectedLessonId: lessonId,
    }));
  }, []);

  const clearGenerateError = useCallback(() => {
    setGenerateError(null);
  }, []);

  const toggleMasteredWord = useCallback((lessonId: string, word: string) => {
    setStore((prev) => {
      const current = prev.progressById[lessonId] ?? {
        masteredWords: [],
        completed: false,
      };
      const exists = current.masteredWords.includes(word);
      const nextWords = exists
        ? current.masteredWords.filter((item) => item !== word)
        : [...current.masteredWords, word];

      return {
        ...prev,
        progressById: {
          ...prev.progressById,
          [lessonId]: {
            ...current,
            masteredWords: nextWords,
          },
        },
      };
    });
  }, []);

  const toggleCompleted = useCallback((lessonId: string) => {
    setStore((prev) => {
      const current = prev.progressById[lessonId] ?? {
        masteredWords: [],
        completed: false,
      };
      const nextCompleted = !current.completed;

      return {
        ...prev,
        progressById: {
          ...prev.progressById,
          [lessonId]: {
            ...current,
            completed: nextCompleted,
            completedAt: nextCompleted ? Date.now() : undefined,
          },
        },
      };
    });
  }, []);

  const pushNextLesson = useCallback(async () => {
    if (isGenerating) return;
    setGenerateError(null);

    const currentLessons = storeRef.current.lessons;
    const nextSeed = getNextSeedForLessons(currentLessons);
    if (nextSeed) {
      const pushed = createSeedLessonForDate(nextSeed, todayDateKey);
      setStore((prev) => ({
        ...prev,
        lessons: [...prev.lessons, pushed],
        selectedLessonId: pushed.id,
      }));
      return;
    }

    const nextDayNumber = getMaxDayNumber(currentLessons) + 1;
    const recentTitles = currentLessons.slice(-15).map((l) => l.titleTc);
    const controller = new AbortController();
    activeAbortRef.current?.abort();
    activeAbortRef.current = controller;

    setIsGenerating(true);
    try {
      const newLesson = await requestAiDailyReading(
        {
          dayNumber: nextDayNumber,
          date: todayDateKey,
          recentTitles,
        },
        controller.signal
      );
      if (controller.signal.aborted) return;
      setStore((prev) => ({
        ...prev,
        lessons: [...prev.lessons, newLesson],
        selectedLessonId: newLesson.id,
      }));
    } catch (err) {
      if (!controller.signal.aborted) {
        setGenerateError(
          err instanceof Error
            ? err.message
            : '無法生成下一課內容，請稍後再試一次。'
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
      }
    }
  }, [isGenerating, todayDateKey]);

  const generateCustomLesson = useCallback(
    async (topicHint: string): Promise<boolean> => {
      if (isGenerating) return false;
      setGenerateError(null);

      const currentLessons = storeRef.current.lessons;
      const nextDayNumber = getMaxDayNumber(currentLessons) + 1;
      const recentTitles = currentLessons.slice(-15).map((l) => l.titleTc);

      const controller = new AbortController();
      activeAbortRef.current?.abort();
      activeAbortRef.current = controller;

      setIsGenerating(true);
      try {
        const newLesson = await requestAiDailyReading(
          {
            dayNumber: nextDayNumber,
            date: todayDateKey,
            topicHint: topicHint.trim() || undefined,
            recentTitles,
          },
          controller.signal
        );
        if (controller.signal.aborted) return false;
        setStore((prev) => ({
          ...prev,
          lessons: [...prev.lessons, newLesson],
          selectedLessonId: newLesson.id,
        }));
        return true;
      } catch (err) {
        if (!controller.signal.aborted) {
          setGenerateError(
            err instanceof Error
              ? err.message
              : '無法產生自訂主題閱讀小課，請稍後再試一次。'
          );
        }
        return false;
      } finally {
        if (!controller.signal.aborted) {
          setIsGenerating(false);
        }
      }
    },
    [isGenerating, todayDateKey]
  );

  return {
    lessons: orderedLessons,
    selectedLesson,
    selectedLessonId: selectedLesson?.id ?? null,
    selectLesson,
    todayDateKey,
    hasPushedToday,
    progressById: store.progressById,
    completedCount,
    isGenerating,
    generateError,
    clearGenerateError,
    toggleMasteredWord,
    toggleCompleted,
    pushNextLesson,
    generateCustomLesson,
  };
}
