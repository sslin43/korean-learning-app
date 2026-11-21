import { PRACTICE_SENTENCES } from '../../data/practiceSentences';
import type { FavoritesController } from '../../hooks/useFavorites';
import type { PronunciationCoachController } from '../../hooks/usePronunciationCoach';
import type { StudyDisplayPrefs } from '../../types/korean';
import { SentenceCard } from './SentenceCard';
import './PracticeZone.css';

interface PracticeSectionProps {
  coach: PronunciationCoachController;
  favorites: FavoritesController;
  studyPrefs: StudyDisplayPrefs;
}

export function PracticeSection({
  coach,
  favorites,
  studyPrefs,
}: PracticeSectionProps) {
  const completedCount = PRACTICE_SENTENCES.filter((s) =>
    Boolean(coach.recordings[s.id])
  ).length;
  const totalCount = PRACTICE_SENTENCES.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <section
      id="practice-zone"
      className="section-block"
      aria-labelledby="practice-zone-heading"
    >
      <div className="section-header">
        <div className="section-header__titles">
          <span className="section-badge">
            <img
              src="/stickers/headphones.png"
              alt=""
              className="section-badge__sticker"
              aria-hidden="true"
            />
            <span>PART 02 · 말하기 연습 ✨</span>
          </span>
          <h2 id="practice-zone-heading" className="section-title">
            發音練習區（5 句日常韓文錄音對比與 AI 評分）
          </h2>
          <p className="section-subtitle">
            先聽標準原音或慢速示範，錄下自己的聲音後可輪流對比原音，並由 Gemini AI 給予繁體中文發音矯正建議。
          </p>
        </div>

        <div className="practice-header-meta">
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

            {coach.aiStatus.configured && (
              <label className="auto-analyze-toggle">
                <input
                  type="checkbox"
                  checked={coach.autoAnalyze}
                  onChange={(e) => coach.setAutoAnalyze(e.target.checked)}
                />
                <span>錄完自動 AI 分析</span>
              </label>
            )}
          </div>

          <div className="practice-progress-pill">
            <span>練習進度</span>
            <strong>
              已完成 {completedCount} / {totalCount} 句錄音
            </strong>
          </div>
          <div
            className="practice-progress-bar"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label={`已完成 ${completedCount} / ${totalCount} 句錄音`}
          >
            <div
              className="practice-progress-bar__fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {!coach.isMicSupported && (
        <div className="notice-banner" role="alert">
          <span>
            目前瀏覽器或連線環境不支援麥克風錄音（請確認使用 HTTPS 或 localhost，並採用新版 Chrome、Edge、Firefox 或 Safari）。您仍可正常收聽標準韓語發音。
          </span>
        </div>
      )}

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

      <div className="sentence-list">
        {PRACTICE_SENTENCES.map((sentence) => (
          <SentenceCard
            key={sentence.id}
            sentence={sentence}
            coach={coach}
            favorites={favorites}
            studyPrefs={studyPrefs}
          />
        ))}
      </div>
    </section>
  );
}
