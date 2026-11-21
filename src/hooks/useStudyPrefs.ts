import { useCallback, useEffect, useState } from 'react';
import type { StudyDisplayPrefs, TranslationMode } from '../types/korean';

const STORAGE_KEY = 'korean_study_prefs_v1';

const DEFAULT_PREFS: StudyDisplayPrefs = {
  translationMode: 'tc',
  hideRomanization: false,
};

function readStoredPrefs(): StudyDisplayPrefs {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<StudyDisplayPrefs>;
    const translationMode: TranslationMode =
      parsed.translationMode === 'tc' ||
      parsed.translationMode === 'en' ||
      parsed.translationMode === 'hidden'
        ? parsed.translationMode
        : 'tc';
    const hideRomanization = Boolean(parsed.hideRomanization);
    return { translationMode, hideRomanization };
  } catch {
    return DEFAULT_PREFS;
  }
}

export interface StudyPrefsController extends StudyDisplayPrefs {
  setTranslationMode: (mode: TranslationMode) => void;
  toggleHideRomanization: () => void;
}

export function useStudyPrefs(): StudyPrefsController {
  const [prefs, setPrefs] = useState<StudyDisplayPrefs>(readStoredPrefs);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }, [prefs]);

  const setTranslationMode = useCallback((translationMode: TranslationMode) => {
    setPrefs((prev) => ({
      ...prev,
      translationMode,
    }));
  }, []);

  const toggleHideRomanization = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      hideRomanization: !prev.hideRomanization,
    }));
  }, []);

  return {
    translationMode: prefs.translationMode,
    hideRomanization: prefs.hideRomanization,
    setTranslationMode,
    toggleHideRomanization,
  };
}
