import { useCallback, useRef, useState } from 'react';
import conversationsJson from './data/conversations.json';
import { HangulSection } from './components/HangulChart/HangulSection';
import { Header } from './components/Header';
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
const topicCount = conversationsData.topics.length;
const phraseCount = conversationsData.topics.reduce(
  (sum, topic) => sum + topic.phrases.length,
  0
);

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
        <section className="hero-strip" aria-label="學習導覽">
          <div className="hero-stickers" aria-hidden="true">
            <span className="deco-sticker">🎀</span>
            <span className="deco-sticker">✨</span>
            <span className="deco-sticker">🧸</span>
          </div>

          <div className="hero-strip__copy">
            <span className="hero-strip__eyebrow">
              <span className="hero-strip__rec-dot" aria-hidden="true" />
              <span>REC ● DIGICAM KOREAN DIARY ✨</span>
            </span>
            <h1 className="hero-strip__title">從韓文 40 音、情境會話到每日短篇閱讀，聽說讀同步練習</h1>
            <p className="hero-strip__desc">
              先點選字母表熟悉 40 音嘴型技巧，透過日常短句與情境會話由 Gemini AI 矯正發音，再到每日 TOPIK 1→2 短篇閱讀小課累積詞彙與語法！
            </p>
          </div>

          <div className="hero-strip__stats">
            <a
              href="#hangul-chart"
              className={`hero-stat-pill ${activeSection === 'hangul-chart' ? 'is-active' : ''}`}
              data-tint="pink"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('hangul-chart');
              }}
            >
              <span>🌸 韓文互動表</span>
              <strong>40 音</strong>
            </a>
            <a
              href="#practice-zone"
              className={`hero-stat-pill ${activeSection === 'practice-zone' ? 'is-active' : ''}`}
              data-tint="blue"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('practice-zone');
              }}
            >
              <span>🎀 錄音跟讀對比</span>
              <strong>5 句日常韓文</strong>
            </a>
            <a
              href="#situational-conversations"
              className={`hero-stat-pill ${
                activeSection === 'situational-conversations' &&
                activeTopicId !== 'favorites'
                  ? 'is-active'
                  : ''
              }`}
              data-tint="green"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('situational-conversations');
              }}
            >
              <span>🧸 實用情境會話</span>
              <strong>
                {topicCount} 主題 {phraseCount} 句
              </strong>
            </a>
            <a
              href="#daily-reading"
              className={`hero-stat-pill ${activeSection === 'daily-reading' ? 'is-active' : ''}`}
              data-tint="lilac"
              onClick={(e) => {
                e.preventDefault();
                handleSelectTab('daily-reading');
              }}
            >
              <span>📖 每日閱讀小課</span>
              <strong>已推 {dailyReading.lessons.length} 篇</strong>
            </a>
            <a
              href="#situational-conversations"
              className={`hero-stat-pill ${
                activeSection === 'situational-conversations' &&
                activeTopicId === 'favorites'
                  ? 'is-active'
                  : ''
              }`}
              data-tint="rose"
              onClick={(e) => {
                e.preventDefault();
                setActiveTopicId('favorites');
                handleSelectTab('situational-conversations');
              }}
            >
              <span>❤️ 我的收藏</span>
              <strong>{favorites.count} 筆</strong>
            </a>
          </div>
        </section>

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
