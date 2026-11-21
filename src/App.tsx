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
import { useKoreanSpeech } from './hooks/useKoreanSpeech';
import { usePronunciationCoach } from './hooks/usePronunciationCoach';
import type { ConversationsDataset } from './types/korean';

const conversationsData = conversationsJson as ConversationsDataset;
const phraseCount = conversationsData.topics.reduce(
  (sum, topic) => sum + topic.phrases.length,
  0
);
const totalPracticeTargets = PRACTICE_SENTENCES.length + phraseCount;

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
            <PracticeSection coach={coach} favorites={favorites} />
          )}

          {activeSection === 'situational-conversations' && (
            <SituationalSection
              coach={coach}
              favorites={favorites}
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
              onSpeakText={handleReadingSpeak}
              onStopSpeech={stopSpeech}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <div className="app-footer__top">
            <div className="app-footer__brand">
              <div className="app-footer__title-row">
                <strong className="app-footer__title">
                  <span className="kr-cute">한글 소리</span> · 韓語發音互動手帳 🎀
                </strong>
                <span className="app-footer__version">v1.0</span>
              </div>
              <p className="app-footer__tagline">
                專為韓語初學者打造的 40 音、情境會話與 TOPIK 1→2 每日閱讀練習空間
              </p>
            </div>
            <a
              href="#top"
              className="app-footer__top-btn"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              回到頂部 ↑
            </a>
          </div>

          <nav className="app-footer__nav" aria-label="頁尾快速導覽">
            <a
              href="#hangul-chart"
              className="app-footer__nav-link"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('hangul-chart');
              }}
            >
              40 音發音表
            </a>
            <a
              href="#practice-zone"
              className="app-footer__nav-link"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('practice-zone');
              }}
            >
              日常發音練習
            </a>
            <a
              href="#situational-conversations"
              className="app-footer__nav-link"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('situational-conversations');
              }}
            >
              實用情境會話
            </a>
            <a
              href="#daily-reading"
              className="app-footer__nav-link"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('daily-reading');
              }}
            >
              每日短篇閱讀
            </a>
          </nav>

          <p className="app-footer__notice">
            🎙️ 錄音僅用於當次 AI 發音分析，不會留存於伺服器；「我的收藏」與「每日閱讀紀錄」皆保存於您的瀏覽器本機。AI 發音評分、建議與生成內容僅供學習輔助參考。
          </p>

          <div className="app-footer__bottom">
            <span className="app-footer__creator">Made with ♡ by Susan.L</span>
            <span className="app-footer__meta">
              Powered by Google Cloud TTS &amp; Google Gemini · © 2026 Susan.L
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
