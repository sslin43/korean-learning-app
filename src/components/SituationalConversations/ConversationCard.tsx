import { useState } from 'react';
import type { FavoritesController } from '../../hooks/useFavorites';
import type { PronunciationCoachController } from '../../hooks/usePronunciationCoach';
import type { ConversationPhrase } from '../../types/korean';
import { FavoriteHeartButton } from '../FavoriteHeartButton';
import { AiFeedbackPanel } from '../PracticeZone/AiFeedbackPanel';
import { AudioVisualizer } from '../PracticeZone/AudioVisualizer';

interface ConversationCardProps {
  phrase: ConversationPhrase;
  accentKey: string;
  coach: PronunciationCoachController;
  favorites: FavoritesController;
  isLoopActive?: boolean;
}

function getCompareLabel(phase: 'native' | 'pause' | 'user' | null): string {
  switch (phase) {
    case 'native':
      return '原音示範中…';
    case 'pause':
      return '切換中…';
    case 'user':
      return '播放我的錄音…';
    default:
      return '';
  }
}

const CONVERSATION_STICKERS = ['✨', '🎀', '🌸', '⭐', '🧸', '🤍'];

export function ConversationCard({
  phrase,
  accentKey,
  coach,
  favorites,
  isLoopActive = false,
}: ConversationCardProps) {
  const [playbackRate, setPlaybackRate] = useState<1.0 | 0.75>(1.0);

  const recording = coach.recordings[phrase.id];
  const analysis = coach.analyses[phrase.id];
  const isRecording = coach.recordingTargetId === phrase.id;
  const isAnyRecording = coach.recordingTargetId !== null;
  const comparePhase =
    coach.compareState?.targetId === phrase.id ? coach.compareState.phase : null;

  const normalSpeechId = `conv-${phrase.id}-1`;
  const slowSpeechId = `conv-${phrase.id}-0.75`;
  const activeSpeechId = playbackRate === 1.0 ? normalSpeechId : slowSpeechId;

  const isPlayingNative =
    (coach.speakingId === normalSpeechId || coach.speakingId === slowSpeechId) &&
    comparePhase === null;
  const isPlayingUser =
    coach.playingUserTargetId === phrase.id && comparePhase === null;
  const isComparing = comparePhase !== null;
  const isOtherRecording = isAnyRecording && !isRecording;
  const isAnalyzing = analysis?.status === 'analyzing';

  const orderLabel = String(phrase.order).padStart(2, '0');
  const durationSec = recording ? (recording.durationMs / 1000).toFixed(1) : null;
  const sticker =
    CONVERSATION_STICKERS[(phrase.order - 1) % CONVERSATION_STICKERS.length];

  const handleSpeedSelect = (nextRate: 1.0 | 0.75) => {
    setPlaybackRate(nextRate);
    if (isPlayingNative && playbackRate !== nextRate) {
      const nextSpeechId = nextRate === 1.0 ? normalSpeechId : slowSpeechId;
      coach.playNative(phrase, nextRate, nextSpeechId);
    }
  };

  return (
    <article
      className={`conversation-card ${isRecording ? 'is-recording' : ''} ${
        recording ? 'is-recorded' : ''
      } ${isLoopActive ? 'is-loop-active' : ''}`}
      data-accent={accentKey}
    >
      <div className="card-corner-actions">
        <span className="card-corner-sticker deco-sticker" aria-hidden="true">
          {sticker}
        </span>
        <FavoriteHeartButton
          isFavorite={favorites.isFavorite(phrase.id)}
          label={phrase.korean}
          onToggle={() => favorites.toggleFavorite(phrase.id)}
        />
      </div>

      <div className="conversation-card__meta-row">
        <div className="conversation-card__meta-left">
          <span className="conversation-card__order" aria-hidden="true">
            {orderLabel}
          </span>
          <span className="conversation-card__situation-tag">
            {phrase.situationTag}
          </span>
        </div>

        {recording && (
          <span className="sentence-card__status-badge">
            <span aria-hidden="true">✓</span>
            <span>已錄製 {durationSec} 秒</span>
          </span>
        )}
      </div>

      <div className="conversation-card__texts">
        <div className="conversation-card__korean-row">
          <h3 className="conversation-card__korean">{phrase.korean}</h3>
          <span className="conversation-card__guide">
            實際讀音 {phrase.pronunciationGuide}
          </span>
        </div>
        <div className="conversation-card__roman">{phrase.romanization}</div>
        <div className="conversation-card__translation">{phrase.translation}</div>
      </div>

      <div className="conversation-card__analysis">
        <div className="conversation-card__analysis-head">
          <span className="conversation-card__analysis-title">發音難點解析</span>
          {phrase.difficultyTags.map((tag) => (
            <span key={tag} className="difficulty-tag">
              {tag}
            </span>
          ))}
        </div>
        <p className="conversation-card__analysis-text">
          {phrase.pronunciationAnalysis}
        </p>
      </div>

      {isRecording && (
        <AudioVisualizer
          levelsHistory={coach.levelsHistory}
          elapsedMs={coach.elapsedMs}
        />
      )}

      <div className="conversation-card__controls">
        <div className="sentence-card__btn-group">
          <div className="listen-cluster">
            <button
              type="button"
              className={`practice-btn practice-btn--native ${
                isPlayingNative ? 'is-active' : ''
              }`}
              disabled={isRecording}
              onClick={() => coach.playNative(phrase, playbackRate, activeSpeechId)}
            >
              <span aria-hidden="true">{isPlayingNative ? '⏹' : '🔊'}</span>
              <span>
                {isPlayingNative
                  ? '停止播放'
                  : `聆聽標準發音（${playbackRate === 1.0 ? '正常' : '慢速 0.75x'}）`}
              </span>
            </button>

            <div
              className="speed-pill-switch"
              role="group"
              aria-label={`${phrase.korean} 播放速度切換`}
            >
              <button
                type="button"
                className={`speed-pill-switch__btn ${
                  playbackRate === 1.0 ? 'is-active' : ''
                }`}
                aria-pressed={playbackRate === 1.0}
                disabled={isRecording}
                onClick={() => handleSpeedSelect(1.0)}
              >
                正常 1.0x
              </button>
              <button
                type="button"
                className={`speed-pill-switch__btn ${
                  playbackRate === 0.75 ? 'is-active' : ''
                }`}
                aria-pressed={playbackRate === 0.75}
                disabled={isRecording}
                onClick={() => handleSpeedSelect(0.75)}
              >
                慢速 0.75x
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`practice-btn conversation-card__ai-btn ${
              isRecording ? 'is-recording' : ''
            }`}
            disabled={!coach.isMicSupported || isOtherRecording}
            onClick={() => coach.toggleRecording(phrase, { forceAnalyze: true })}
          >
            <span aria-hidden="true">{isRecording ? '⏹' : '🎙️'}</span>
            <span>
              {isRecording
                ? '停止錄音並 AI 矯正'
                : recording
                  ? '重新錄音並 AI 矯正'
                  : '錄音並請 AI 矯正發音'}
            </span>
          </button>
        </div>

        {recording && (
          <div className="sentence-card__btn-group">
            {isComparing && (
              <span className="compare-phase-pill" role="status" aria-live="polite">
                {getCompareLabel(comparePhase)}
              </span>
            )}

            <button
              type="button"
              className={`practice-btn practice-btn--user ${
                isPlayingUser ? 'is-active' : ''
              }`}
              disabled={isRecording}
              onClick={() => coach.toggleUserPlayback(phrase.id)}
            >
              <span aria-hidden="true">{isPlayingUser ? '⏹' : '▶'}</span>
              <span>{isPlayingUser ? '停止播放' : '播放我的錄音'}</span>
            </button>

            <button
              type="button"
              className={`practice-btn practice-btn--compare ${
                isComparing ? 'is-active' : ''
              }`}
              disabled={isRecording}
              onClick={() => coach.toggleCompare(phrase)}
            >
              <span aria-hidden="true">{isComparing ? '⏹' : '🎧'}</span>
              <span>{isComparing ? '停止對比' : '原音對比'}</span>
            </button>

            <button
              type="button"
              className={`practice-btn practice-btn--ai ${
                isAnalyzing ? 'is-active' : ''
              }`}
              disabled={isRecording || isAnalyzing || !coach.aiStatus.configured}
              title={
                !coach.aiStatus.configured
                  ? '尚未偵測到 GEMINI_API_KEY，無法啟用 AI 發音矯正'
                  : undefined
              }
              onClick={() => coach.analyzeTarget(phrase)}
            >
              <span aria-hidden="true">✨</span>
              <span>{isAnalyzing ? 'AI 矯正中…' : '重新 AI 矯正'}</span>
            </button>

            <button
              type="button"
              className="practice-btn practice-btn--ghost"
              disabled={isRecording}
              onClick={() => coach.deleteRecording(phrase.id)}
              aria-label={`清除「${phrase.korean}」的錄音`}
            >
              清除錄音
            </button>
          </div>
        )}
      </div>

      {analysis && analysis.status !== 'idle' && (
        <AiFeedbackPanel
          target={phrase}
          analysis={analysis}
          onRetry={coach.analyzeTarget}
        />
      )}
    </article>
  );
}
