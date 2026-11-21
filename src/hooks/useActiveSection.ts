import { useCallback, useEffect, useRef, useState } from 'react';

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
  const lockUntilRef = useRef<number>(0);

  const selectSection = useCallback((sectionId: AppSectionId) => {
    lockUntilRef.current = Date.now() + 650;
    setActiveSection(sectionId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let rafId: number | null = null;

    const computeActiveSection = () => {
      if (Date.now() < lockUntilRef.current) {
        return;
      }

      const headerEl = document.querySelector('.site-header');
      const headerHeight = headerEl
        ? headerEl.getBoundingClientRect().height
        : 86;
      const triggerY = headerHeight + 48;

      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 24;

      if (nearBottom) {
        const lastEl = document.getElementById(
          APP_SECTION_IDS[APP_SECTION_IDS.length - 1]
        );
        if (lastEl) {
          setActiveSection(APP_SECTION_IDS[APP_SECTION_IDS.length - 1]);
          return;
        }
      }

      let current: AppSectionId = 'hangul-chart';
      for (const id of APP_SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= triggerY) {
          current = id;
        }
      }

      setActiveSection((prev) => (prev === current ? prev : current));
    };

    const scheduleCheck = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        computeActiveSection();
      });
    };

    const handleHashChange = () => {
      const hashId = window.location.hash.replace(/^#/, '');
      if (isAppSectionId(hashId)) {
        lockUntilRef.current = Date.now() + 650;
        setActiveSection(hashId);
      } else {
        scheduleCheck();
      }
    };

    computeActiveSection();
    window.addEventListener('scroll', scheduleCheck, { passive: true });
    window.addEventListener('resize', scheduleCheck);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
      window.removeEventListener('hashchange', handleHashChange);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return { activeSection, selectSection };
}
