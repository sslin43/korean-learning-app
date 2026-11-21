import { useCallback, useRef, useState } from 'react';
import conversationsJson from './data/conversations.json';
import { PRACTICE_SENTENCES } from './data/practiceSentences';
import { HangulSection } from './components/HangulChart/HangulSection';
import { Header } from './components/Header';
import { StudyDashboardStrip } from './components/StudyDashboardStrip';
import { PracticeSection } from './components/PracticeZone/PracticeSection';
import { SituationalSection } from './components/SituationalConversations/SituationalSection';
import { DailyReadingSection } from './components/DailyReading/DailyReadingSection';
import { useDailyReading } from './hooks/useDailyReading';
import { useActiveSection, type AppSectionId } from './hooks/useActiveSection';
import { useFavorites } from './hooks/useFavorites';
import { useStudyPrefs } from './hooks/useStudyPrefs';
import { useKoreanSpeech } from './hooks/useKoreanSpeech';
import { usePronunciationCoach } from './hooks/usePronunciationCoach';
import type { ConversationsDataset } from './types/korean';

const conversationsData = conversationsJson as ConversationsDataset;
const phraseCount = conversationsData.topics.reduce(
  (sum, topic) => sum + topic.phrases.length,
  0
);
const totalPracticeTargets = PRACTICE_SENTENCES.length + phraseCount;

const FOOTER_RECEIPT_ITEMS: Array<{
  id: AppSectionId;
  num: string;
  stickerSrc: string;
  label: string;
  meta: string;
  tint: 'pink' | 'blue' | 'green' | 'lilac';
}> = [
  {
    id: 'hangul-chart',
    num: '01',
    stickerSrc: '/stickers/rei-hamster.png',
    label: '40 音發音表',
    meta: '40 音',
    tint: 'pink',
  },
  {
    id: 'practice-zone',
    num: '02',
    stickerSrc: '/stickers/headphones.png',
    label: '日常發音練習',
    meta: `${PRACTICE_SENTENCES.length} 句`,
    tint: 'blue',
  },
  {
    id: 'situational-conversations',
    num: '03',
    stickerSrc: '/stickers/wookdong.png',
    label: '實用情境會話',
    meta: `${phraseCount} 句`,
    tint: 'green',
  },
  {
    id: 'daily-reading',
    num: '04',
    stickerSrc: '/stickers/peach.png',
    label: '每日短篇閱讀',
    meta: 'TOPIK',
    tint: 'lilac',
  },
];

export function App() {
  const {
    speakingId,
    rate,
    isSupported: isSpeechSupported,
    hasKoreanVoice,
    voiceName,
    error: speechError,
    speak,
    stop: stopSpeech,
    setRate,
    clearError: clearSpeechError,
  } = useKoreanSpeech();

  const favorites = useFavorites();
  const dailyReading = useDailyReading();
  const studyPrefs = useStudyPrefs();
  const { activeSection, selectSection } = useActiveSection();
  const [activeTopicId, setActiveTopicId] = useState<string>(
    conversationsData.topics[0]?.id ?? 'airport'
  );

  const stopLoopRef = useRef<() => void>(() => {});

  const registerStopLoop = useCallback((stopFn: () => void) => {
    stopLoopRef.current = stopFn;
  }, []);

  const handleBeforeCoachAction = useCallback(() => {
    stopLoopRef.current();
  }, []);

  const coach = usePronunciationCoach({
    speakingId,
    onSpeakText: speak,
    onStopSpeech: stopSpeech,
    onBeforeAction: handleBeforeCoachAction,
  });

  const handleHangulSpeak = useCallback(
    (speechId: string, text: string, audioUrl?: string) => {
      stopLoopRef.current();
      coach.stopAll();
      void speak(speechId, text, undefined, audioUrl);
    },
    [coach, speak]
  );

  const handleReadingSpeak = useCallback(
    (speechId: string, text: string, overrideRate?: number) => {
      stopLoopRef.current();
      coach.stopAll();
      return speak(speechId, text, overrideRate);
    },
    [coach, speak]
  );

  const handleSelectTab = useCallback(
    (sectionId: AppSectionId) => {
      if (sectionId !== activeSection) {
        stopLoopRef.current();
        coach.stopAll();
        stopSpeech();
      }
      selectSection(sectionId);
    },
    [activeSection, coach, selectSection, stopSpeech]
  );

  const handleQuoteSpeak = useCallback(
    (speechId: string, text: string) => {
      stopLoopRef.current();
      coach.stopAll();
      void speak(speechId, text);
    },
    [coach, speak]
  );

  const recordedCount = Object.keys(coach.recordings).length;
  const todayLesson =
    dailyReading.lessons.find((l) => l.date === dailyReading.todayDateKey) ??
    dailyReading.lessons[0] ??
    null;
  const isTodayReadingDone = todayLesson
    ? Boolean(dailyReading.progressById[todayLesson.id]?.completed)
    : false;

  return (
    <div id="top" className="app-shell">
      <div className="ambient-stickers" aria-hidden="true">
        <img src="/stickers/peach.png" alt="" className="ambient-sticker ambient-sticker--tl" />
        <img src="/stickers/bow.png" alt="" className="ambient-sticker ambient-sticker--tr" />
        <img src="/stickers/headphones.png" alt="" className="ambient-sticker ambient-sticker--bl" />
        <img src="/stickers/peach.png" alt="" className="ambient-sticker ambient-sticker--br" />
      </div>

      <Header
        rate={rate}
        onRateChange={setRate}
        isSpeechSupported={isSpeechSupported}
        hasKoreanVoice={hasKoreanVoice}
        voiceName={voiceName}
        activeSection={activeSection}
        onSelectSection={handleSelectTab}
      />

      <main className="app-main">
        <StudyDashboardStrip
          todayDateKey={dailyReading.todayDateKey}
          todayLessonDay={todayLesson?.dayNumber ?? null}
          isTodayReadingDone={isTodayReadingDone}
          readingCompletedCount={dailyReading.completedCount}
          readingTotalCount={dailyReading.lessons.length}
          recordedCount={recordedCount}
          totalPracticeTargets={totalPracticeTargets}
          favoritesCount={favorites.count}
          speakingId={speakingId}
          translationMode={studyPrefs.translationMode}
          hideRomanization={studyPrefs.hideRomanization}
          onTranslationModeChange={studyPrefs.setTranslationMode}
          onToggleHideRomanization={studyPrefs.toggleHideRomanization}
          onSpeakQuote={handleQuoteSpeak}
          onStopSpeech={stopSpeech}
          onOpenDailyReading={() => handleSelectTab('daily-reading')}
          onOpenPractice={() => handleSelectTab('practice-zone')}
          onOpenFavorites={() => {
            setActiveTopicId('favorites');
            handleSelectTab('situational-conversations');
          }}
        />

        {speechError && (
          <div className="notice-banner notice-banner--danger" role="alert">
            <span>{speechError}</span>
            <button
              type="button"
              className="notice-banner__close"
              onClick={clearSpeechError}
            >
              關閉
            </button>
          </div>
        )}

        <div
          key={activeSection}
          id="app-tab-panel"
          role="tabpanel"
          aria-labelledby={`app-tab-${activeSection}`}
          className="app-tab-panel"
        >
          {activeSection === 'hangul-chart' && (
            <HangulSection
              speakingId={speakingId}
              favorites={favorites}
              onSpeakText={handleHangulSpeak}
            />
          )}

          {activeSection === 'practice-zone' && (
            <PracticeSection
              coach={coach}
              favorites={favorites}
              studyPrefs={studyPrefs}
            />
          )}

          {activeSection === 'situational-conversations' && (
            <SituationalSection
              coach={coach}
              favorites={favorites}
              studyPrefs={studyPrefs}
              activeTopicId={activeTopicId}
              onSelectTopic={setActiveTopicId}
              onSpeakLoopItem={speak}
              onStopSpeech={stopSpeech}
              registerStopLoop={registerStopLoop}
            />
          )}

          {activeSection === 'daily-reading' && (
            <DailyReadingSection
              reading={dailyReading}
              speakingId={speakingId}
              aiConfigured={coach.aiStatus.configured}
              studyPrefs={studyPrefs}
              onSpeakText={handleReadingSpeak}
              onStopSpeech={stopSpeech}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="app-footer__receipt">
          <div className="app-footer__tear app-footer__tear--top" aria-hidden="true" />
          <div className="app-footer__sheet">
            <div className="app-footer__receipt-head">
              <div className="app-footer__stamp" aria-hidden="true">
                <img
                  src="/icon-192.png"
                  alt=""
                  className="app-footer__stamp-img"
                  width={54}
                  height={54}
                />
                <img
                  src="/stickers/peach.png"
                  alt=""
                  className="app-footer__stamp-peach"
                  width={22}
                  height={22}
                />
              </div>
              <span className="app-footer__receipt-edition">
                ✦ <span className="kr-cute">한글 소리</span> · REI × WOOKDONG EDITION v1.0 ✦
              </span>
            </div>

            <div className="app-footer__top">
              <div className="app-footer__brand">
                <strong className="app-footer__title">
                  <span className="kr-cute">한글 소리</span> · 韓語發音互動手帳 🎀
                </strong>
                <p className="app-footer__tagline">
                  專為韓語初學者打造的 40 音、情境會話與 TOPIK 1→2 每日閱讀練習空間
                </p>
              </div>
              <a
                href="#top"
                className="app-footer__top-btn"
                aria-label="回到頂部"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                TOP ↑
              </a>
            </div>

            <nav className="app-footer__nav" aria-label="頁尾快速導覽">
              {FOOTER_RECEIPT_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`app-footer__nav-row${isActive ? ' is-active' : ''}`}
                    data-tint={item.tint}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectTab(item.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <span className="app-footer__nav-num">{item.num}</span>
                    <img
                      src={item.stickerSrc}
                      alt=""
                      className="app-footer__nav-sticker"
                      aria-hidden="true"
                    />
                    <span className="app-footer__nav-label">{item.label}</span>
                    <span className="app-footer__dots" aria-hidden="true" />
                    <span className="app-footer__nav-count">{item.meta}</span>
                    <span className="app-footer__nav-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                );
              })}
            </nav>

            <div className="app-footer__notice">
              <span className="app-footer__notice-label">※ PRIVACY NOTICE</span>
              <p>
                🎙️ 錄音僅用於當次 AI 發音分析，不會留存於伺服器；「我的收藏」與「每日閱讀紀錄」皆保存於您的瀏覽器本機。AI 發音評分、建議與生成內容僅供學習輔助參考。
              </p>
            </div>

            <div className="app-footer__bottom">
              <div className="app-footer__barcode" aria-hidden="true" />
              <div className="app-footer__creator-row">
                <img
                  src="/stickers/bow.png"
                  alt=""
                  className="app-footer__charm"
                  aria-hidden="true"
                />
                <span className="app-footer__creator">* MADE WITH ♡ BY SUSAN.L *</span>
                <img
                  src="/stickers/peach.png"
                  alt=""
                  className="app-footer__charm"
                  aria-hidden="true"
                />
              </div>
              <span className="app-footer__meta">
                Powered by Google Cloud TTS &amp; Google Gemini{' '}
                <span className="app-footer__meta-copy">· © 2026 Susan.L</span>
              </span>
            </div>
          </div>
          <div className="app-footer__tear app-footer__tear--bottom" aria-hidden="true" />
        </div>
      </footer>
    </div>
  );
}

export default App;
