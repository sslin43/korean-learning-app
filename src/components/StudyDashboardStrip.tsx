import { useEffect, useState } from 'react';
import { DAILY_QUOTES, getDailyQuoteIndex } from '../data/dailyQuotes';
import type { TranslationMode } from '../types/korean';
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
  translationMode: TranslationMode;
  hideRomanization: boolean;
  onTranslationModeChange: (mode: TranslationMode) => void;
  onToggleHideRomanization: () => void;
  onSpeakQuote: (speechId: string, text: string) => void;
  onStopSpeech: () => void;
  onOpenDailyReading: () => void;
  onOpenPractice: () => void;
  onOpenFavorites: () => void;
}

const TRANSLATION_OPTIONS: Array<{ value: TranslationMode; label: string }> = [
  { value: 'tc', label: '繁中' },
  { value: 'en', label: 'EN' },
  { value: 'hidden', label: '🙈 隱藏' },
];

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
  translationMode,
  hideRomanization,
  onTranslationModeChange,
  onToggleHideRomanization,
  onSpeakQuote,
  onStopSpeech,
  onOpenDailyReading,
  onOpenPractice,
  onOpenFavorites,
}: StudyDashboardStripProps) {
  const [quoteOffset, setQuoteOffset] = useState<number>(0);
  const [peekQuoteMeaning, setPeekQuoteMeaning] = useState<boolean>(false);
  const [isHopping, setIsHopping] = useState<boolean>(false);

  const baseIndex = getDailyQuoteIndex(todayDateKey);
  const quote = DAILY_QUOTES[(baseIndex + quoteOffset) % DAILY_QUOTES.length];
  const quoteSpeechId = `daily-quote-${quote.id}`;
  const isPlayingQuote = speakingId === quoteSpeechId;

  useEffect(() => {
    setPeekQuoteMeaning(false);
  }, [translationMode, quote.id]);

  useEffect(() => {
    if (!isHopping) {
      return undefined;
    }
    const timer = window.setTimeout(() => setIsHopping(false), 460);
    return () => window.clearTimeout(timer);
  }, [isHopping]);

  const formattedDate = todayDateKey.replace(/-/g, '.');
  const activeQuoteTranslation =
    translationMode === 'en' ? quote.translationEn : quote.translation;

  return (
    <section className="study-strip" aria-label="今日韓文筆記與學習偏好設定">
      <div className="study-strip__top-row">
        <div className="study-strip__note-wrap">
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
                  onClick={() => {
                    setQuoteOffset((prev) => prev + 1);
                    setIsHopping(true);
                  }}
                >
                  🎲 換一句
                </button>
              </div>
            </div>

            <div className="study-strip__quote-sub">
              {!hideRomanization && (
                <span className="study-strip__roman">{quote.romanization}</span>
              )}
              {!hideRomanization && translationMode !== 'hidden' && (
                <span aria-hidden="true"> · </span>
              )}
              {translationMode === 'hidden' ? (
                peekQuoteMeaning ? (
                  <button
                    type="button"
                    className="quote-peek-btn is-revealed"
                    onClick={() => setPeekQuoteMeaning(false)}
                  >
                    {quote.translation} · {quote.translationEn}（點擊收合）
                  </button>
                ) : (
                  <button
                    type="button"
                    className="quote-peek-btn"
                    onClick={() => setPeekQuoteMeaning(true)}
                  >
                    🙈 點擊偷看譯文
                  </button>
                )
              ) : (
                <span>{activeQuoteTranslation}</span>
              )}
            </div>
          </div>

          <div
            className={`study-strip__mascot${isPlayingQuote ? ' is-singing' : ''}${isTodayReadingDone ? ' is-celebrating' : ''}${isHopping ? ' is-hopping' : ''}`}
          >
            <span className="mascot-notes" aria-hidden="true">
              <span>♪</span>
              <span>♫</span>
              <span>✦</span>
            </span>
            <img
              src="/stickers/duo-sticker.png"
              alt="Rei 倉鼠與 WOOKDONG 陪伴學習貼紙"
              className="study-strip__duo-img"
              width={112}
              height={83}
            />
            {isTodayReadingDone && (
              <span className="mascot-cheer-badge kr-cute">참 잘했어요! 🍑</span>
            )}
          </div>
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
      </div>

      <div className="study-strip__prefs" aria-label="全域學習輔助顯示設定">
        <div className="prefs-cluster">
          <span className="prefs-cluster__label">譯文顯示：</span>
          <div className="prefs-segment" role="group" aria-label="譯文顯示語言切換">
            {TRANSLATION_OPTIONS.map((opt) => {
              const isSelected = translationMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`prefs-segment__btn ${isSelected ? 'is-active' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => onTranslationModeChange(opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className={`prefs-roman-btn ${hideRomanization ? 'is-active' : ''}`}
          aria-pressed={hideRomanization}
          onClick={onToggleHideRomanization}
        >
          {hideRomanization ? '👁️ 已隱藏羅馬拼音（點擊顯示）' : '🙈 隱藏羅馬拼音'}
        </button>
      </div>
    </section>
  );
}
