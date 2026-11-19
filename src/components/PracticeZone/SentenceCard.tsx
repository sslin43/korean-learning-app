import type { FavoritesController } from '../../hooks/useFavorites';
import type { PronunciationCoachController } from '../../hooks/usePronunciationCoach';
import type { PracticeSentence } from '../../types/korean';
import { FavoriteHeartButton } from '../FavoriteHeartButton';
import { AiFeedbackPanel } from './AiFeedbackPanel';
import { AudioVisualizer } from './AudioVisualizer';

interface SentenceCardProps {
  sentence: PracticeSentence;
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

const SENTENCE_STICKERS = ['🎀', '✨', '🌸', '⭐', '🧸'];

export function SentenceCard({
  sentence,
  coach,
  favorites,
  isLoopActive = false,
}: SentenceCardProps) {
  const recording = coach.recordings[sentence.id];
  const analysis = coach.analyses[sentence.id];
  const isRecording = coach.recordingTargetId === sentence.id;
  const isAnyRecording = coach.recordingTargetId !== null;
  const comparePhase =
    coach.compareState?.targetId === sentence.id ? coach.compareState.phase : null;

  const normalSpeechId = `practice-normal-${sentence.id}`;
  const slowSpeechId = `practice-slow-${sentence.id}`;

  const isPlayingNormal = coach.speakingId === normalSpeechId;
  const isPlayingSlow = coach.speakingId === slowSpeechId;
  const isPlayingUser =
    coach.playingUserTargetId === sentence.id && comparePhase === null;
  const isComparing = comparePhase !== null;
  const isOtherRecording = isAnyRecording && !isRecording;
  const isAnalyzing = analysis?.status === 'analyzing';

  const orderLabel = String(sentence.order).padStart(2, '0');
  const durationSec = recording ? (recording.durationMs / 1000).toFixed(1) : null;
  const sticker =
    SENTENCE_STICKERS[(sentence.order - 1) % SENTENCE_STICKERS.length];

  return (
    <article
      className={`sentence-card ${isRecording ? 'is-recording' : ''} ${
        recording ? 'is-recorded' : ''
      } ${isLoopActive ? 'is-loop-active' : ''}`}
    >
      <div className="card-corner-actions">
        <span className="card-corner-sticker deco-sticker" aria-hidden="true">
          {sticker}
        </span>
        <FavoriteHeartButton
          isFavorite={favorites.isFavorite(sentence.id)}
          label={sentence.korean}
          onToggle={() => favorites.toggleFavorite(sentence.id)}
        />
      </div>
      <div className="sentence-card__top">
        <div className="sentence-card__main">
          <span className="sentence-card__order" aria-hidden="true">
            {orderLabel}
          </span>

          <div className="sentence-card__texts">
            <div className="sentence-card__korean-row">
              <h3 className="sentence-card__korean">{sentence.korean}</h3>
              <span className="sentence-card__guide">
                實際讀音 {sentence.pronunciationGuide}
              </span>
            </div>

            <div className="sentence-card__translation-row">
              <span className="sentence-card__roman">{sentence.romanization}</span>
              <span className="sentence-card__sep" aria-hidden="true">
                ·
              </span>
              <span className="sentence-card__tc">{sentence.translation}</span>
            </div>
          </div>
        </div>

        {recording && (
          <span className="sentence-card__status-badge">
            <span aria-hidden="true">✓</span>
            <span>已錄製 {durationSec} 秒</span>
          </span>
        )}
      </div>

      <p className="sentence-card__tip">
        <strong>發音小提醒：</strong>
        {sentence.tip}
      </p>

      {isRecording && (
        <AudioVisualizer
          levelsHistory={coach.levelsHistory}
          elapsedMs={coach.elapsedMs}
        />
      )}

      <div className="sentence-card__controls">
        <div className="sentence-card__btn-group">
          <button
            type="button"
            className={`practice-btn practice-btn--native ${
              isPlayingNormal ? 'is-active' : ''
            }`}
            disabled={isRecording}
            onClick={() => coach.playNative(sentence, 1.0, normalSpeechId)}
          >
            <span aria-hidden="true">{isPlayingNormal ? '⏹' : '🔊'}</span>
            <span>{isPlayingNormal ? '停止原音' : '標準原音'}</span>
          </button>

          <button
            type="button"
            className={`practice-btn practice-btn--native ${isPlayingSlow ? 'is-active' : ''}`}
            disabled={isRecording}
            onClick={() => coach.playNative(sentence, 0.75, slowSpeechId)}
          >
            <span aria-hidden="true">{isPlayingSlow ? '⏹' : '🐢'}</span>
            <span>{isPlayingSlow ? '停止慢速' : '慢速 0.75x'}</span>
          </button>

          <button
            type="button"
            className={`practice-btn practice-btn--record ${
              isRecording ? 'is-recording' : ''
            }`}
            disabled={!coach.isMicSupported || isOtherRecording}
            onClick={() => coach.toggleRecording(sentence)}
          >
            <span aria-hidden="true">{isRecording ? '⏹' : '🎙️'}</span>
            <span>
              {isRecording ? '停止錄音' : recording ? '重新錄音' : '開始錄音'}
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
              className={`practice-btn practice-btn--user ${isPlayingUser ? 'is-active' : ''}`}
              disabled={isRecording}
              onClick={() => coach.toggleUserPlayback(sentence.id)}
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
              onClick={() => coach.toggleCompare(sentence)}
            >
              <span aria-hidden="true">{isComparing ? '⏹' : '🎧'}</span>
              <span>{isComparing ? '停止對比' : '原音對比'}</span>
            </button>

            <button
              type="button"
              className={`practice-btn practice-btn--ai ${isAnalyzing ? 'is-active' : ''}`}
              disabled={isRecording || isAnalyzing || !coach.aiStatus.configured}
              title={
                !coach.aiStatus.configured
                  ? '尚未偵測到 GEMINI_API_KEY，無法啟用 AI 發音評分'
                  : undefined
              }
              onClick={() => coach.analyzeTarget(sentence)}
            >
              <span aria-hidden="true">✨</span>
              <span>
                {isAnalyzing
                  ? 'AI 分析中…'
                  : analysis?.status === 'success'
                    ? '重新 AI 評分'
                    : 'AI 發音評分'}
              </span>
            </button>

            <button
              type="button"
              className="practice-btn practice-btn--ghost"
              disabled={isRecording}
              onClick={() => coach.deleteRecording(sentence.id)}
              aria-label={`清除第 ${sentence.order} 句的錄音`}
            >
              清除錄音
            </button>
          </div>
        )}
      </div>

      {analysis && analysis.status !== 'idle' && (
        <AiFeedbackPanel
          target={sentence}
          analysis={analysis}
          onRetry={coach.analyzeTarget}
        />
      )}
    </article>
  );
}
