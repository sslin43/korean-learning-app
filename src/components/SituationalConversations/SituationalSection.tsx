import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import conversationsJson from '../../data/conversations.json';
import { HANGUL_ITEMS } from '../../data/hangulChart';
import { PRACTICE_SENTENCES } from '../../data/practiceSentences';
import type { FavoritesController } from '../../hooks/useFavorites';
import type { PronunciationCoachController } from '../../hooks/usePronunciationCoach';
import type { ConversationsDataset, StudyDisplayPrefs } from '../../types/korean';
import { FavoriteHeartButton } from '../FavoriteHeartButton';
import { SentenceCard } from '../PracticeZone/SentenceCard';
import { ConversationCard } from './ConversationCard';
import './SituationalConversations.css';

const conversationsData = conversationsJson as ConversationsDataset;
const FAVORITES_TAB_ID = 'favorites';

interface LoopQueueItem {
  id: string;
  textToSpeak: string;
  label: string;
  audioUrl?: string;
}

interface SituationalSectionProps {
  coach: PronunciationCoachController;
  favorites: FavoritesController;
  studyPrefs: StudyDisplayPrefs;
  activeTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onSpeakLoopItem: (
    speechId: string,
    text: string,
    overrideRate?: number,
    audioUrl?: string
  ) => Promise<boolean>;
  onStopSpeech: () => void;
  registerStopLoop: (stopFn: () => void) => void;
}

export function SituationalSection({
  coach,
  favorites,
  studyPrefs,
  activeTopicId,
  onSelectTopic,
  onSpeakLoopItem,
  onStopSpeech,
  registerStopLoop,
}: SituationalSectionProps) {
  const topics = conversationsData.topics;
  const isFavoritesTab = activeTopicId === FAVORITES_TAB_ID;
  const activeTopic =
    topics.find((topic) => topic.id === activeTopicId) ?? topics[0];

  const [isLoopPlaying, setIsLoopPlaying] = useState<boolean>(false);
  const [loopIndex, setLoopIndex] = useState<number>(0);
  const [loopRate, setLoopRate] = useState<1.0 | 0.75>(1.0);
  const [loopRepeat, setLoopRepeat] = useState<boolean>(true);

  const favConversations = useMemo(
    () =>
      topics.flatMap((topic) =>
        topic.phrases
          .filter((phrase) => favorites.favoriteSet.has(phrase.id))
          .map((phrase) => ({
            phrase,
            accentKey: topic.accentKey,
            topicTitle: topic.title,
          }))
      ),
    [favorites.favoriteSet, topics]
  );

  const favSentences = useMemo(
    () =>
      PRACTICE_SENTENCES.filter((sentence) =>
        favorites.favoriteSet.has(sentence.id)
      ),
    [favorites.favoriteSet]
  );

  const favHangul = useMemo(
    () => HANGUL_ITEMS.filter((item) => favorites.favoriteSet.has(item.id)),
    [favorites.favoriteSet]
  );

  const loopQueue = useMemo<LoopQueueItem[]>(
    () => [
      ...favConversations.map(({ phrase }) => ({
        id: phrase.id,
        textToSpeak: phrase.korean,
        label: phrase.korean,
        audioUrl: phrase.audioUrl,
      })),
      ...favSentences.map((sentence) => ({
        id: sentence.id,
        textToSpeak: sentence.korean,
        label: sentence.korean,
        audioUrl: sentence.audioUrl,
      })),
      ...favHangul.map((item) => ({
        id: item.id,
        textToSpeak: `${item.ttsSyllable}, ${item.example.word}`,
        label: `${item.symbol}（${item.ttsSyllable} · ${item.example.word}）`,
        audioUrl: item.audioUrl,
      })),
    ],
    [favConversations, favHangul, favSentences]
  );

  const loopTokenRef = useRef<number>(0);
  const loopTimerRef = useRef<number | null>(null);
  const loopQueueRef = useRef<LoopQueueItem[]>(loopQueue);
  const loopRateRef = useRef<1.0 | 0.75>(loopRate);
  const loopRepeatRef = useRef<boolean>(loopRepeat);
  const onSpeakLoopItemRef = useRef(onSpeakLoopItem);

  useEffect(() => {
    loopQueueRef.current = loopQueue;
  }, [loopQueue]);

  useEffect(() => {
    loopRateRef.current = loopRate;
  }, [loopRate]);

  useEffect(() => {
    loopRepeatRef.current = loopRepeat;
  }, [loopRepeat]);

  useEffect(() => {
    onSpeakLoopItemRef.current = onSpeakLoopItem;
  }, [onSpeakLoopItem]);

  const stopLoopState = useCallback(() => {
    loopTokenRef.current += 1;
    if (loopTimerRef.current !== null) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    setIsLoopPlaying(false);
    setLoopIndex(0);
  }, []);

  const stopLoopAndAudio = useCallback(() => {
    stopLoopState();
    onStopSpeech();
  }, [onStopSpeech, stopLoopState]);

  useEffect(() => {
    registerStopLoop(stopLoopState);
  }, [registerStopLoop, stopLoopState]);

  useEffect(() => {
    return () => {
      loopTokenRef.current += 1;
      if (loopTimerRef.current !== null) {
        window.clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isLoopPlaying && (!isFavoritesTab || loopQueue.length === 0)) {
      stopLoopAndAudio();
    }
  }, [isFavoritesTab, isLoopPlaying, loopQueue.length, stopLoopAndAudio]);

  const startLoop = useCallback(async () => {
    if (loopQueueRef.current.length === 0) {
      return;
    }

    coach.stopAll();
    onStopSpeech();

    const token = ++loopTokenRef.current;
    setIsLoopPlaying(true);

    let cursor = 0;

    while (loopTokenRef.current === token) {
      const queue = loopQueueRef.current;
      if (queue.length === 0) {
        break;
      }

      if (cursor >= queue.length) {
        if (!loopRepeatRef.current) {
          break;
        }
        cursor = 0;
      }

      const currentItem = queue[cursor];
      setLoopIndex(cursor);

      const finished = await onSpeakLoopItemRef.current(
        `fav-loop-${currentItem.id}`,
        currentItem.textToSpeak,
        loopRateRef.current,
        currentItem.audioUrl
      );

      if (loopTokenRef.current !== token) {
        return;
      }

      if (!finished) {
        break;
      }

      const isLastItem = cursor >= queue.length - 1;
      if (isLastItem && !loopRepeatRef.current) {
        break;
      }

      await new Promise<void>((resolve) => {
        loopTimerRef.current = window.setTimeout(() => {
          loopTimerRef.current = null;
          resolve();
        }, 850);
      });

      if (loopTokenRef.current !== token) {
        return;
      }

      cursor += 1;
    }

    if (loopTokenRef.current === token) {
      setIsLoopPlaying(false);
      setLoopIndex(0);
    }
  }, [coach, onStopSpeech]);

  const handleToggleLoop = useCallback(() => {
    if (isLoopPlaying) {
      stopLoopAndAudio();
      return;
    }
    void startLoop();
  }, [isLoopPlaying, startLoop, stopLoopAndAudio]);

  if (!activeTopic && !isFavoritesTab) {
    return null;
  }

  const safeLoopIndex =
    loopQueue.length > 0 ? Math.min(loopIndex, loopQueue.length - 1) : 0;
  const currentLoopItem = isLoopPlaying ? loopQueue[safeLoopIndex] : undefined;
  const currentLoopId = currentLoopItem?.id ?? null;

  const completedInTopic = activeTopic
    ? activeTopic.phrases.filter((phrase) => Boolean(coach.recordings[phrase.id]))
        .length
    : 0;
  const totalInTopic = activeTopic ? activeTopic.phrases.length : 0;
  const topicProgressPct =
    totalInTopic > 0 ? Math.round((completedInTopic / totalInTopic) * 100) : 0;

  return (
    <section
      id="situational-conversations"
      className="section-block"
      aria-labelledby="situational-conversations-heading"
    >
      <div className="section-header">
        <div className="section-header__titles">
          <span className="section-badge">
            <img
              src="/stickers/wookdong.png"
              alt=""
              className="section-badge__sticker"
              aria-hidden="true"
            />
            <span>PART 03 · 실전 상황 회화 ✨</span>
          </span>
          <h2 id="situational-conversations-heading" className="section-title">
            實用情境會話與發音
          </h2>
          <p className="section-subtitle">
            依旅遊實用情境分類，逐句解析台灣學習者易錯的連音化、鼻音化與收音細節，並可隨時收藏進個人單字本反覆聽力練習。
          </p>
        </div>

        <div className="practice-ai-bar">
          <span
            className={`ai-status-pill ${
              coach.aiStatus.configured ? 'is-ready' : 'is-off'
            }`}
          >
            <span className="ai-status-pill__dot" aria-hidden="true" />
            <span>
              {coach.aiStatus.configured
                ? `AI 發音教練就緒 · ${coach.aiStatus.model}`
                : 'AI 分析尚未啟用（未設定金鑰）'}
            </span>
          </span>
        </div>
      </div>

      <div
        className="topic-tabs"
        role="tablist"
        aria-label="實用情境主題與收藏分類切換標籤"
      >
        {topics.map((topic) => {
          const isActive = !isFavoritesTab && topic.id === activeTopic.id;
          return (
            <button
              key={topic.id}
              type="button"
              role="tab"
              id={`topic-tab-${topic.id}`}
              aria-selected={isActive}
              aria-controls={`topic-panel-${topic.id}`}
              data-accent={topic.accentKey}
              className={`topic-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectTopic(topic.id)}
            >
              <span className="topic-tab__main">
                <span className="topic-tab__icon" aria-hidden="true">
                  {topic.icon}
                </span>
                <span className="topic-tab__titles">
                  <span className="topic-tab__title">{topic.title}</span>
                  <span className="topic-tab__kr">{topic.koreanTitle}</span>
                </span>
              </span>
              <span className="topic-tab__count">{topic.phrases.length} 句</span>
            </button>
          );
        })}

        <button
          type="button"
          role="tab"
          id="topic-tab-favorites"
          aria-selected={isFavoritesTab}
          aria-controls="topic-panel-favorites"
          data-accent="favorites"
          className={`topic-tab ${isFavoritesTab ? 'is-active' : ''}`}
          onClick={() => onSelectTopic(FAVORITES_TAB_ID)}
        >
          <span className="topic-tab__main">
            <span className="topic-tab__icon" aria-hidden="true">
              ❤️
            </span>
            <span className="topic-tab__titles">
              <span className="topic-tab__title">我的收藏</span>
              <span className="topic-tab__kr">나만의 단어장 · 즐겨찾기</span>
            </span>
          </span>
          <span className="topic-tab__count">{favorites.count} 筆</span>
        </button>
      </div>

      {isFavoritesTab ? (
        <div
          role="tabpanel"
          id="topic-panel-favorites"
          aria-labelledby="topic-tab-favorites"
        >
          <div className="topic-banner topic-banner--favorites" data-accent="favorites">
            <div className="topic-banner__info">
              <div className="topic-banner__title-row">
                <span aria-hidden="true">❤️</span>
                <h3 className="topic-banner__title">
                  我的收藏夾（單字本）· {favorites.count} 筆
                </h3>
              </div>
              <p className="topic-banner__subtitle">
                所有收藏自動記憶於瀏覽器中，支援一鍵連續播放開啟循環聽力複習。
              </p>
            </div>

            <div className="loop-player-bar">
              <button
                type="button"
                className={`practice-btn loop-play-btn ${
                  isLoopPlaying ? 'is-active' : ''
                }`}
                disabled={loopQueue.length === 0}
                onClick={handleToggleLoop}
              >
                <span aria-hidden="true">{isLoopPlaying ? '⏹' : '▶'}</span>
                <span>
                  {isLoopPlaying ? '停止連續播放' : '一鍵連續播放（循環聽力）'}
                </span>
              </button>

              <div
                className="speed-pill-switch"
                role="group"
                aria-label="循環聽力播放速度"
              >
                <button
                  type="button"
                  className={`speed-pill-switch__btn ${
                    loopRate === 1.0 ? 'is-active' : ''
                  }`}
                  aria-pressed={loopRate === 1.0}
                  onClick={() => setLoopRate(1.0)}
                >
                  正常 1.0x
                </button>
                <button
                  type="button"
                  className={`speed-pill-switch__btn ${
                    loopRate === 0.75 ? 'is-active' : ''
                  }`}
                  aria-pressed={loopRate === 0.75}
                  onClick={() => setLoopRate(0.75)}
                >
                  慢速 0.75x
                </button>
              </div>

              <label className="loop-repeat-toggle">
                <input
                  type="checkbox"
                  checked={loopRepeat}
                  onChange={(e) => setLoopRepeat(e.target.checked)}
                />
                <span>🔁 無限循環</span>
              </label>

              {favorites.count > 0 && (
                <button
                  type="button"
                  className="practice-btn practice-btn--ghost"
                  onClick={() => {
                    stopLoopAndAudio();
                    favorites.clearFavorites();
                  }}
                >
                  清空收藏
                </button>
              )}
            </div>

            {isLoopPlaying && currentLoopItem && (
              <div className="loop-now-playing" role="status" aria-live="polite">
                <span className="loop-now-playing__bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>
                  循環聽力播放中（{safeLoopIndex + 1} / {loopQueue.length}）：
                  <strong className="kr-cute">{currentLoopItem.label}</strong>
                </span>
              </div>
            )}
          </div>

          {coach.recorderError && (
            <div className="notice-banner notice-banner--danger" role="alert">
              <span>{coach.recorderError}</span>
              <button
                type="button"
                className="notice-banner__close"
                onClick={coach.clearRecorderError}
              >
                關閉
              </button>
            </div>
          )}

          {coach.playbackError && (
            <div className="notice-banner notice-banner--danger" role="alert">
              <span>{coach.playbackError}</span>
              <button
                type="button"
                className="notice-banner__close"
                onClick={coach.clearPlaybackError}
              >
                關閉
              </button>
            </div>
          )}

          {favorites.count === 0 ? (
            <div className="fav-empty-state">
              <div className="fav-empty-state__icon" aria-hidden="true">
                🎀🤍✨
              </div>
              <h3 className="fav-empty-state__title">
                我的收藏夾目前還是空的喔！
              </h3>
              <p className="fav-empty-state__desc">
                點擊任一韓文情境會話、日常練習句或 40 音單字卡右上角的{' '}
                <strong>♡</strong> 愛心按鈕，就能加入專屬單字本並自動永久記憶。
              </p>
              <div className="fav-empty-state__actions">
                <button
                  type="button"
                  className="practice-btn practice-btn--native"
                  onClick={() => onSelectTopic(topics[0]?.id ?? 'airport')}
                >
                  ✈️ 逛逛機場通關會話
                </button>
                <a href="#hangul-chart" className="practice-btn practice-btn--record">
                  🌸 瀏覽韓文 40 音表
                </a>
              </div>
            </div>
          ) : (
            <div className="fav-groups">
              {favConversations.length > 0 && (
                <div className="fav-group-block">
                  <h4 className="fav-group-heading">
                    🧸 已收藏的情境會話（{favConversations.length} 句）
                  </h4>
                  <div className="conversation-list">
                    {favConversations.map(({ phrase, accentKey }) => (
                      <ConversationCard
                        key={phrase.id}
                        phrase={phrase}
                        accentKey={accentKey}
                        coach={coach}
                        favorites={favorites}
                        studyPrefs={studyPrefs}
                        isLoopActive={isLoopPlaying && currentLoopId === phrase.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {favSentences.length > 0 && (
                <div className="fav-group-block">
                  <h4 className="fav-group-heading">
                    🎀 已收藏的日常發音練習（{favSentences.length} 句）
                  </h4>
                  <div className="sentence-list">
                    {favSentences.map((sentence) => (
                      <SentenceCard
                        key={sentence.id}
                        sentence={sentence}
                        coach={coach}
                        favorites={favorites}
                        studyPrefs={studyPrefs}
                        isLoopActive={
                          isLoopPlaying && currentLoopId === sentence.id
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {favHangul.length > 0 && (
                <div className="fav-group-block">
                  <h4 className="fav-group-heading">
                    🌸 已收藏的 40 音單字卡（{favHangul.length} 個）
                  </h4>
                  <div className="fav-hangul-grid">
                    {favHangul.map((item) => {
                      const isPlayingItem =
                        coach.speakingId === `fav-hangul-${item.id}` ||
                        (isLoopPlaying && currentLoopId === item.id);

                      return (
                        <div
                          key={item.id}
                          className={`fav-hangul-card ${
                            isPlayingItem ? 'is-loop-active' : ''
                          }`}
                        >
                          <FavoriteHeartButton
                            size="sm"
                            className="fav-hangul-card__heart"
                            isFavorite={true}
                            label={`${item.symbol}（${item.ttsSyllable}）`}
                            onToggle={() => favorites.toggleFavorite(item.id)}
                          />

                          <button
                            type="button"
                            className="fav-hangul-card__body"
                            onClick={() => {
                              stopLoopState();
                              coach.playNative(
                                {
                                  id: item.id,
                                  korean: `${item.ttsSyllable}, ${item.example.word}`,
                                  pronunciationGuide: item.ttsSyllable,
                                  romanization: item.romanization,
                                  translation: item.example.meaning,
                                  audioUrl: item.audioUrl,
                                },
                                loopRate,
                                `fav-hangul-${item.id}`
                              );
                            }}
                          >
                            <span className="fav-hangul-card__symbol">
                              {item.symbol}
                            </span>
                            <span className="fav-hangul-card__syllable">
                              發音「{item.ttsSyllable}」 · {item.romanization}
                            </span>
                            <span className="fav-hangul-card__example">
                              🔊 {item.example.word}（{item.example.meaning}）
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`topic-panel-${activeTopic.id}`}
          aria-labelledby={`topic-tab-${activeTopic.id}`}
        >
          <div className="topic-banner" data-accent={activeTopic.accentKey}>
            <div className="topic-banner__info">
              <div className="topic-banner__title-row">
                <span aria-hidden="true">{activeTopic.icon}</span>
                <h3 className="topic-banner__title">{activeTopic.title}</h3>
              </div>
              <p className="topic-banner__subtitle">{activeTopic.subtitle}</p>
            </div>

            <div className="topic-banner__progress">
              <span className="topic-banner__progress-text">
                本主題已練習{' '}
                <strong>
                  {completedInTopic} / {totalInTopic} 句
                </strong>
              </span>
              <div
                className="topic-banner__progress-bar"
                role="progressbar"
                aria-valuenow={completedInTopic}
                aria-valuemin={0}
                aria-valuemax={totalInTopic}
                aria-label={`${activeTopic.title} 已練習 ${completedInTopic} / ${totalInTopic} 句`}
              >
                <div
                  className="topic-banner__progress-fill"
                  style={{ width: `${topicProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {coach.recorderError && (
            <div className="notice-banner notice-banner--danger" role="alert">
              <span>{coach.recorderError}</span>
              <button
                type="button"
                className="notice-banner__close"
                onClick={coach.clearRecorderError}
              >
                關閉
              </button>
            </div>
          )}

          {coach.playbackError && (
            <div className="notice-banner notice-banner--danger" role="alert">
              <span>{coach.playbackError}</span>
              <button
                type="button"
                className="notice-banner__close"
                onClick={coach.clearPlaybackError}
              >
                關閉
              </button>
            </div>
          )}

          <div className="conversation-list">
            {activeTopic.phrases.map((phrase) => (
              <ConversationCard
                key={phrase.id}
                phrase={phrase}
                accentKey={activeTopic.accentKey}
                coach={coach}
                favorites={favorites}
                studyPrefs={studyPrefs}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
