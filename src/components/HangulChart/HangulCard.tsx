import type { ConsonantPlaybackMode, HangulItem } from '../../types/korean';
import { FavoriteHeartButton } from '../FavoriteHeartButton';

interface HangulCardProps {
  item: HangulItem;
  isSelected: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  consonantMode: ConsonantPlaybackMode;
  onSelectAndPlay: (item: HangulItem) => void;
  onToggleFavorite: (id: string) => void;
}

export function HangulCard({
  item,
  isSelected,
  isPlaying,
  isFavorite,
  consonantMode,
  onSelectAndPlay,
  onToggleFavorite,
}: HangulCardProps) {
  const isConsonant =
    item.category === 'basic-consonant' || item.category === 'double-consonant';

  const hintText = isConsonant
    ? consonantMode === 'name'
      ? item.letterName
      : item.ttsSyllable
    : null;

  const ariaLabel = isConsonant
    ? `${item.symbol}，${item.romanization}，點擊播放${
        consonantMode === 'name' ? `字母名 ${item.letterName}` : `發音 ${item.ttsSyllable}`
      }`
    : `${item.symbol}，${item.romanization}，點擊播放發音 ${item.ttsSyllable}`;

  return (
    <div className="hangul-card-wrap">
      <button
        type="button"
        className={`hangul-card ${isSelected ? 'is-selected' : ''} ${
          isPlaying ? 'is-playing' : ''
        }`}
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        onClick={() => onSelectAndPlay(item)}
      >
        {hintText && (
          <span className="hangul-card__syllable-hint" aria-hidden="true">
            {hintText}
          </span>
        )}

        {isPlaying && (
          <span className="hangul-card__sound-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}

        <span className="hangul-card__symbol">{item.symbol}</span>
        <span className="hangul-card__roman">{item.romanization}</span>
      </button>

      <FavoriteHeartButton
        size="sm"
        className="hangul-card__fav-btn"
        isFavorite={isFavorite}
        label={`${item.symbol}（${item.ttsSyllable}）`}
        onToggle={() => onToggleFavorite(item.id)}
      />
    </div>
  );
}
