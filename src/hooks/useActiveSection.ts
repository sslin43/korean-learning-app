import { useCallback, useEffect, useState } from 'react';

export const APP_SECTION_IDS = [
  'hangul-chart',
  'practice-zone',
  'situational-conversations',
  'daily-reading',
] as const;

export type AppSectionId = (typeof APP_SECTION_IDS)[number];

function isAppSectionId(value: string): value is AppSectionId {
  return (APP_SECTION_IDS as readonly string[]).includes(value);
}

function getInitialSection(): AppSectionId {
  if (typeof window === 'undefined') {
    return 'hangul-chart';
  }
  const hashId = window.location.hash.replace(/^#/, '');
  return isAppSectionId(hashId) ? hashId : 'hangul-chart';
}

export function useActiveSection() {
  const [activeSection, setActiveSection] = useState<AppSectionId>(getInitialSection);

  const selectSection = useCallback((sectionId: AppSectionId) => {
    setActiveSection(sectionId);

    if (typeof window !== 'undefined') {
      const nextHash = `#${sectionId}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', nextHash);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncFromHash = () => {
      const hashId = window.location.hash.replace(/^#/, '');
      if (isAppSectionId(hashId)) {
        setActiveSection(hashId);
      }
    };

    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);

    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, []);

  return { activeSection, selectSection };
}
