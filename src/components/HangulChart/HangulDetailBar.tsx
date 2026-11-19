import { HANGUL_CATEGORY_META } from '../../data/hangulChart';
import type { HangulItem } from '../../types/korean';
import { FavoriteHeartButton } from '../FavoriteHeartButton';

interface HangulDetailBarProps {
  item: HangulItem;
  speakingId: string | null;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSpeakText: (speechId: string, text: string, audioUrl?: string) => void;
}

export function HangulDetailBar({
  item,
  speakingId,
  isFavorite,
  onToggleFavorite,
  onSpeakText,
}: HangulDetailBarProps) {
  const categoryMeta = HANGUL_CATEGORY_META.find((c) => c.key === item.category);
  const isConsonant =
    item.category === 'basic-consonant' || item.category === 'double-consonant';

  const syllableSpeechId = `detail-syllable-${item.id}`;
  const nameSpeechId = `detail-name-${item.id}`;
  const exampleSpeechId = `detail-example-${item.id}`;

  const isSpeakingSyllable =
    speakingId === syllableSpeechId || speakingId === `hangul-${item.id}`;
  const isSpeakingName = speakingId === nameSpeechId;
  const isSpeakingExample = speakingId === exampleSpeechId;

  return (
    <div
      className="hangul-detail"
      data-category={item.category}
      aria-live="polite"
      aria-label="當前選取字母發音說明"
    >
      <div className="hangul-detail__glyph-box">
        <span className="hangul-detail__symbol">{item.symbol}</span>
        <span className="hangul-detail__roman">{item.romanization}</span>
      </div>

      <div className="hangul-detail__info">
        <div className="hangul-detail__meta">
          <span className="hangul-detail__cat-pill">{categoryMeta?.label}</span>
          <span className="hangul-detail__name-pill kr-text">
            {isConsonant
              ? `字母名稱：${item.letterName} (${item.letterNameRomanization})`
              : `音節示範：${item.ttsSyllable} (${item.romanization})`}
          </span>
          <FavoriteHeartButton
            size="sm"
            isFavorite={isFavorite}
            label={`${item.symbol}（${item.ttsSyllable}）`}
            onToggle={() => onToggleFavorite(item.id)}
          />
        </div>

        <p className="hangul-detail__tip">{item.tip}</p>

        <div className="hangul-detail__actions">
          <button
            type="button"
            className={`detail-action-btn detail-action-btn--primary ${
              isSpeakingSyllable ? 'is-playing' : ''
            }`}
            onClick={() => onSpeakText(syllableSpeechId, item.ttsSyllable, item.audioUrl)}
          >
            <span aria-hidden="true">🔊</span>
            <span>朗讀發音「{item.ttsSyllable}」</span>
          </button>

          {isConsonant && (
            <button
              type="button"
              className={`detail-action-btn ${isSpeakingName ? 'is-playing' : ''}`}
              onClick={() => onSpeakText(nameSpeechId, item.letterName)}
            >
              <span aria-hidden="true">🏷️</span>
              <span>朗讀字母名「{item.letterName}」</span>
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className={`hangul-detail__example ${isSpeakingExample ? 'is-playing' : ''}`}
        onClick={() => onSpeakText(exampleSpeechId, item.example.word)}
        aria-label={`朗讀範例單字 ${item.example.word}，${item.example.meaning}`}
      >
        <span className="hangul-detail__example-label">
          <span aria-hidden="true">🔊</span>
          <span>範例單字（點擊試聽）</span>
        </span>
        <span className="hangul-detail__example-word">{item.example.word}</span>
        <span className="hangul-detail__example-sub">
          {item.example.romanization} · {item.example.meaning}
        </span>
      </button>
    </div>
  );
}
