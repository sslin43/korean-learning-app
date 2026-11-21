import { useState } from 'react';
import { DAILY_QUOTES, getDailyQuoteIndex } from '../data/dailyQuotes';
import './StudyDashboardStrip.css';

interface StudyDashboardStripProps {
  todayDateKey: string;
  todayLessonDay: number | null;
  isTodayReadingDone: boolean;
  readingCompletedCount: number;
  readingTotalCount: number;
  recordedCount: number;
  totalPracticeTargets: number;
  favoritesCount: number;
  speakingId: string | null;
  onSpeakQuote: (speechId: string, text: string) => void;
  onStopSpeech: () => void;
  onOpenDailyReading: () => void;
  onOpenPractice: () => void;
  onOpenFavorites: () => void;
}

export function StudyDashboardStrip({
  todayDateKey,
  todayLessonDay,
  isTodayReadingDone,
  readingCompletedCount,
  readingTotalCount,
  recordedCount,
  totalPracticeTargets,
  favoritesCount,
  speakingId,
  onSpeakQuote,
  onStopSpeech,
  onOpenDailyReading,
  onOpenPractice,
  onOpenFavorites,
}: StudyDashboardStripProps) {
  const [quoteOffset, setQuoteOffset] = useState<number>(0);

  const baseIndex = getDailyQuoteIndex(todayDateKey);
  const quote = DAILY_QUOTES[(baseIndex + quoteOffset) % DAILY_QUOTES.length];
  const quoteSpeechId = `daily-quote-${quote.id}`;
  const isPlayingQuote = speakingId === quoteSpeechId;

  const formattedDate = todayDateKey.replace(/-/g, '.');

  return (
    <section className="study-strip" aria-label="今日韓文筆記與學習進度">
      <div className="study-strip__stickers" aria-hidden="true">
        <span className="deco-sticker">🎀</span>
        <span className="deco-sticker">✨</span>
        <span className="deco-sticker">🧸</span>
      </div>

      <div className="study-strip__note">
        <div className="study-strip__meta-row">
          <span className="study-strip__eyebrow">
            <span className="study-strip__rec-dot" aria-hidden="true" />
            <span>REC ● TODAY&apos;S NOTE · {formattedDate}</span>
          </span>
        </div>

        <div className="study-strip__quote-row">
          <span className="study-strip__quote-kr kr-cute">
            {quote.emoji} {quote.korean}
          </span>

          <div className="study-strip__quote-btns">
            <button
              type="button"
              className={`study-quote-btn is-speak ${isPlayingQuote ? 'is-playing' : ''}`}
              aria-label={isPlayingQuote ? '停止朗讀今日小語' : `朗讀今日小語：${quote.korean}`}
              title="聆聽今日韓文小語"
              onClick={() => {
                if (isPlayingQuote) {
                  onStopSpeech();
                } else {
                  onSpeakQuote(quoteSpeechId, quote.korean);
                }
              }}
            >
              {isPlayingQuote ? '⏹ 停止' : '🔊 朗讀'}
            </button>

            <button
              type="button"
              className="study-quote-btn is-shuffle"
              aria-label="換一句今日韓文鼓勵小語"
              onClick={() => setQuoteOffset((prev) => prev + 1)}
            >
              🎲 換一句
            </button>
          </div>
        </div>

        <p className="study-strip__quote-sub">
          <span className="study-strip__roman">{quote.romanization}</span>
          <span aria-hidden="true"> · </span>
          <span>{quote.translation}</span>
        </p>
      </div>

      <div className="study-strip__dashboard" aria-label="個人即時學習紀錄">
        <button
          type="button"
          className={`dash-pill ${isTodayReadingDone ? 'is-done' : ''}`}
          data-tint={isTodayReadingDone ? 'green' : 'lilac'}
          onClick={onOpenDailyReading}
        >
          <span className="dash-pill__icon" aria-hidden="true">
            📅
          </span>
          <span className="dash-pill__body">
            <span className="dash-pill__label">今日閱讀</span>
            <strong className="dash-pill__value">
              {isTodayReadingDone
                ? `✓ 已打卡（${readingCompletedCount}/${readingTotalCount}）`
                : `Day ${todayLessonDay ?? 1} 待讀 · 已完讀 ${readingCompletedCount}/${readingTotalCount}`}
            </strong>
          </span>
        </button>

        <button
          type="button"
          className="dash-pill"
          data-tint="blue"
          onClick={onOpenPractice}
        >
          <span className="dash-pill__icon" aria-hidden="true">
            🎙️
          </span>
          <span className="dash-pill__body">
            <span className="dash-pill__label">錄音累積</span>
            <strong className="dash-pill__value">
              {recordedCount} / {totalPracticeTargets} 句
            </strong>
          </span>
        </button>

        <button
          type="button"
          className="dash-pill"
          data-tint="rose"
          onClick={onOpenFavorites}
        >
          <span className="dash-pill__icon" aria-hidden="true">
            ❤️
          </span>
          <span className="dash-pill__body">
            <span className="dash-pill__label">我的收藏</span>
            <strong className="dash-pill__value">{favoritesCount} 筆單字本</strong>
          </span>
        </button>
      </div>
    </section>
  );
}
