import type {
  AnalysisState,
  PronunciationLevel,
  PronunciationTarget,
} from '../../types/korean';

interface AiFeedbackPanelProps {
  target: PronunciationTarget;
  analysis: AnalysisState;
  onRetry: (target: PronunciationTarget) => void;
}

function getLevelLabel(level: PronunciationLevel): string {
  switch (level) {
    case 'excellent':
      return '發音優秀';
    case 'good':
      return '表現不錯';
    case 'needs-practice':
      return '可再精進';
    case 'unclear':
      return '聲音不清晰';
  }
}

export function AiFeedbackPanel({
  target,
  analysis,
  onRetry,
}: AiFeedbackPanelProps) {
  if (analysis.status === 'idle') {
    return null;
  }

  if (analysis.status === 'analyzing') {
    return (
      <div className="ai-feedback-panel ai-feedback-panel--loading" role="status" aria-live="polite">
        <span className="ai-spinner" aria-hidden="true" />
        <div className="ai-feedback-panel__loading-copy">
          <strong>Gemini AI 正在聆聽並分析你的韓語發音…</strong>
          <span>正在比對子母音咬字、連音／鼻音化規則與語調起伏</span>
        </div>
      </div>
    );
  }

  if (analysis.status === 'error') {
    return (
      <div className="ai-feedback-panel ai-feedback-panel--error" role="alert">
        <div className="ai-feedback-panel__error-row">
          <span>{analysis.error ?? 'AI 發音分析失敗，請再試一次。'}</span>
          <button
            type="button"
            className="ai-retry-btn"
            onClick={() => onRetry(target)}
          >
            重新分析
          </button>
        </div>
      </div>
    );
  }

  const feedback = analysis.feedback;
  if (!feedback) {
    return null;
  }

  const isPraiseworthy =
    feedback.level === 'excellent' || feedback.level === 'good';

  return (
    <div
      className="ai-feedback-panel ai-feedback-panel--success"
      data-level={feedback.level}
      aria-live="polite"
    >
      <div className="ai-feedback__header">
        <div className="ai-feedback__score-wrap">
          <div className="ai-score-badge" data-level={feedback.level}>
            <span className="ai-score-badge__inner">
              <span className="ai-score-badge__value">{feedback.score}</span>
              <span className="ai-score-badge__unit">分</span>
            </span>
          </div>

          <div className="ai-feedback__title-group">
            <div className="ai-feedback__badges">
              <span className="ai-level-pill" data-level={feedback.level}>
                {getLevelLabel(feedback.level)}
              </span>
              <span className="ai-model-chip">
                Gemini AI · {feedback.modelUsed ?? 'gemini-3.5-flash-lite'}
              </span>
            </div>

            <div className="ai-heard-row">
              <span className="ai-heard-row__label">AI 聽到的發音：</span>
              <span className="ai-heard-row__value kr-text">{feedback.heardKorean}</span>
            </div>
          </div>
        </div>

        {isPraiseworthy && (
          <div className="ai-reward-stamp" data-level={feedback.level}>
            <img
              src="/stickers/duo-sticker.png"
              alt=""
              className="ai-reward-stamp__duo"
              aria-hidden="true"
            />
            <div className="ai-reward-stamp__copy">
              <span className="ai-reward-stamp__kr kr-cute">
                {feedback.level === 'excellent' ? '최고예요!' : '잘했어요!'}
              </span>
              <span className="ai-reward-stamp__sub">Rei × WOOKDONG 認證</span>
            </div>
            <img
              src="/stickers/peach.png"
              alt=""
              className="ai-reward-stamp__peach"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <p className="ai-feedback__summary">{feedback.summary}</p>

      {feedback.strengths.length > 0 && (
        <div className="ai-feedback__section">
          <h4 className="ai-feedback__section-title">做得好的地方</h4>
          <ul className="ai-strengths-list">
            {feedback.strengths.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div className="ai-feedback__section">
          <h4 className="ai-feedback__section-title">繁體中文矯正建議</h4>
          <div className="ai-improvements-grid">
            {feedback.improvements.map((item, idx) => (
              <div key={idx} className="ai-improvement-card">
                <div className="ai-improvement-card__head">
                  <span className="ai-improvement-card__segment kr-text">
                    {item.segment}
                  </span>
                  <span className="ai-improvement-card__issue">{item.issue}</span>
                </div>
                <p className="ai-improvement-card__suggestion">{item.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ai-next-tip">
        <strong>下一步練習建議：</strong>
        <span>{feedback.nextStepTip}</span>
      </div>
    </div>
  );
}
