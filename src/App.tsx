import { useCallback, useRef, useState } from 'react';
import conversationsJson from './data/conversations.json';
import { HangulSection } from './components/HangulChart/HangulSection';
import { Header } from './components/Header';
import { PracticeSection } from './components/PracticeZone/PracticeSection';
import { SituationalSection } from './components/SituationalConversations/SituationalSection';
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
            <h1 className="hero-strip__title">從韓文 40 音到旅遊情境會話，聽說同步練習</h1>
            <p className="hero-strip__desc">
              先點選字母表熟悉 40 音嘴型技巧，再透過日常短句與旅遊情境會話錄音對比，讓 Gemini AI 即時給予繁體中文發音矯正建議。
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
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>한글 소리 · 韓語發音互動學習</span>
          <span>
            標準韓語發音透過後端 API 代理呼叫 Google Cloud Text-to-Speech（ko-KR-Neural2-A）並啟用前端音訊快取；錄音與 AI 發音矯正亦經由後端代理呼叫 Google Gemini API（GOOGLE_TTS_API_KEY 與 GEMINI_API_KEY 皆安全保存於伺服器端，不會暴露於前端瀏覽器）。
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
