import { useState } from 'react';
import { HANGUL_CATEGORY_META, HANGUL_ITEMS } from '../../data/hangulChart';
import type { FavoritesController } from '../../hooks/useFavorites';
import type {
  ConsonantPlaybackMode,
  HangulCategory,
  HangulItem,
} from '../../types/korean';
import { HangulCard } from './HangulCard';
import { HangulDetailBar } from './HangulDetailBar';
import './HangulChart.css';

type CategoryFilter = 'all' | HangulCategory;

interface HangulSectionProps {
  speakingId: string | null;
  favorites: FavoritesController;
  onSpeakText: (speechId: string, text: string, audioUrl?: string) => void;
}

export function HangulSection({
  speakingId,
  favorites,
  onSpeakText,
}: HangulSectionProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [consonantMode, setConsonantMode] = useState<ConsonantPlaybackMode>('syllable');
  const [selectedItem, setSelectedItem] = useState<HangulItem>(HANGUL_ITEMS[0]);

  const visibleCategories =
    activeFilter === 'all'
      ? HANGUL_CATEGORY_META
      : HANGUL_CATEGORY_META.filter((cat) => cat.key === activeFilter);

  const handleSelectAndPlay = (item: HangulItem) => {
    setSelectedItem(item);
    const isConsonant =
      item.category === 'basic-consonant' || item.category === 'double-consonant';
    const textToSpeak =
      isConsonant && consonantMode === 'name' ? item.letterName : item.ttsSyllable;
    const audioOverride =
      isConsonant && consonantMode === 'name' ? undefined : item.audioUrl;

    onSpeakText(`hangul-${item.id}`, textToSpeak, audioOverride);
  };

  return (
    <section id="hangul-chart" className="section-block" aria-labelledby="hangul-chart-heading">
      <div className="section-header">
        <div className="section-header__titles">
          <span className="section-badge">🌸 PART 01 · 한글 자모 40자 ✨</span>
          <h2 id="hangul-chart-heading" className="section-title">
            韓文 40 音互動發音表
          </h2>
          <p className="section-subtitle">
            點擊任意字母立即播放標準韓語發音，並可查看嘴型技巧與單字示範。
          </p>
        </div>
      </div>

      <div className="hangul-toolbar">
        <div className="hangul-tabs" role="tablist" aria-label="韓文字母分類篩選">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'all'}
            className={`hangul-tab ${activeFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>全部 40 音</span>
            <span className="hangul-tab__count">{HANGUL_ITEMS.length}</span>
          </button>

          {HANGUL_CATEGORY_META.map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={activeFilter === cat.key}
              className={`hangul-tab ${activeFilter === cat.key ? 'is-active' : ''}`}
              onClick={() => setActiveFilter(cat.key)}
            >
              <span>{cat.label}</span>
              <span className="hangul-tab__count">{cat.count}</span>
            </button>
          ))}
        </div>

        <div className="consonant-mode-toggle" role="group" aria-label="子音點擊發音模式">
          <button
            type="button"
            className={`consonant-mode-toggle__btn ${
              consonantMode === 'syllable' ? 'is-active' : ''
            }`}
            aria-pressed={consonantMode === 'syllable'}
            onClick={() => setConsonantMode('syllable')}
          >
            點擊念發音 가
          </button>
          <button
            type="button"
            className={`consonant-mode-toggle__btn ${
              consonantMode === 'name' ? 'is-active' : ''
            }`}
            aria-pressed={consonantMode === 'name'}
            onClick={() => setConsonantMode('name')}
          >
            點擊念字母名 기역
          </button>
        </div>
      </div>

      <HangulDetailBar
        item={selectedItem}
        speakingId={speakingId}
        isFavorite={favorites.isFavorite(selectedItem.id)}
        onToggleFavorite={favorites.toggleFavorite}
        onSpeakText={onSpeakText}
      />

      <div className="hangul-groups">
        {visibleCategories.map((category) => {
          const items = HANGUL_ITEMS.filter((item) => item.category === category.key);

          return (
            <div
              key={category.key}
              className="hangul-group"
              data-category={category.key}
            >
              <div className="hangul-group__header">
                <div className="hangul-group__title-wrap">
                  <span className="hangul-group__dot" aria-hidden="true" />
                  <h3 className="hangul-group__title">{category.label}</h3>
                  <span className="hangul-group__kr">{category.koreanLabel}</span>
                  <span className="hangul-group__count">{items.length} 音</span>
                </div>
                <p className="hangul-group__desc">{category.description}</p>
              </div>

              <div className={`hangul-grid hangul-grid--${category.key}`}>
                {items.map((item) => (
                  <HangulCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem.id === item.id}
                    isPlaying={
                      speakingId === `hangul-${item.id}` ||
                      speakingId === `detail-syllable-${item.id}` ||
                      speakingId === `detail-name-${item.id}`
                    }
                    isFavorite={favorites.isFavorite(item.id)}
                    consonantMode={consonantMode}
                    onSelectAndPlay={handleSelectAndPlay}
                    onToggleFavorite={favorites.toggleFavorite}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
