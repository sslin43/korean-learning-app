import { useCallback, useRef, useState } from 'react';
import conversationsJson from './data/conversations.json';
import { HangulSection } from './components/HangulChart/HangulSection';
import { Header } from './components/Header';
import { PracticeSection } from './components/PracticeZone/PracticeSection';
import { SituationalSection } from './components/SituationalConversations/SituationalSection';
import { DailyReadingSection } from './components/DailyReading/DailyReadingSection';
import { useDailyReading } from './hooks/useDailyReading';
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

  return (
    <div id="top" className="app-shell">
      <Header
        rate={rate}
        onRateChange={setRate}
        isSpeechSupported={isSpeechSupported}
        hasKoreanVoice={hasKoreanVoice}
        voiceName={voiceName}
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
            <a href="#hangul-chart" className="hero-stat-pill" data-tint="pink">
              <span>🌸 韓文互動表</span>
              <strong>40 音</strong>
            </a>
            <a href="#practice-zone" className="hero-stat-pill" data-tint="blue">
              <span>🎀 錄音跟讀對比</span>
              <strong>5 句日常韓文</strong>
            </a>
            <a
              href="#situational-conversations"
              className="hero-stat-pill"
              data-tint="green"
            >
              <span>🧸 實用情境會話</span>
              <strong>
                {topicCount} 主題 {phraseCount} 句
              </strong>
            </a>
            <a
              href="#daily-reading"
              className="hero-stat-pill"
              data-tint="lilac"
            >
              <span>📖 每日閱讀小課</span>
              <strong>已推 {dailyReading.lessons.length} 篇</strong>
            </a>
            <a
              href="#situational-conversations"
              className="hero-stat-pill"
              data-tint="rose"
              onClick={() => setActiveTopicId('favorites')}
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

        <HangulSection
          speakingId={speakingId}
          favorites={favorites}
          onSpeakText={handleHangulSpeak}
        />

        <PracticeSection coach={coach} favorites={favorites} />

        <SituationalSection
          coach={coach}
          favorites={favorites}
          activeTopicId={activeTopicId}
          onSelectTopic={setActiveTopicId}
          onSpeakLoopItem={speak}
          onStopSpeech={stopSpeech}
          registerStopLoop={registerStopLoop}
        />

        <DailyReadingSection
          reading={dailyReading}
          speakingId={speakingId}
          aiConfigured={coach.aiStatus.configured}
          onSpeakText={handleReadingSpeak}
          onStopSpeech={stopSpeech}
        />
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <div className="app-footer__top">
            <div className="app-footer__brand">
              <strong className="app-footer__title">
                <span className="kr-cute">한글 소리</span> · 韓語發音互動手帳 🎀
              </strong>
              <p className="app-footer__tagline">
                專為韓語初學者打造的 40 音、情境會話與 TOPIK 1→2 每日閱讀練習空間
              </p>
            </div>
            <a href="#top" className="app-footer__top-btn">
              回到頂部 ↑
            </a>
          </div>

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
