import './Header.css';

interface HeaderProps {
  rate: number;
  onRateChange: (rate: number) => void;
  isSpeechSupported: boolean;
  hasKoreanVoice: boolean;
  voiceName: string | null;
}

export function Header({
  rate,
  onRateChange,
  isSpeechSupported,
  hasKoreanVoice,
  voiceName,
}: HeaderProps) {
  const voiceStatusClass = !isSpeechSupported || !hasKoreanVoice
    ? 'voice-status-pill voice-status-pill--warn'
    : 'voice-status-pill voice-status-pill--ready';

  const voiceStatusTitle = hasKoreanVoice
    ? `Google Cloud Text-to-Speech（${voiceName ?? 'ko-KR-Neural2-A'}）· 已啟用前端音訊快取`
    : '請於後端環境變數（本機 .env 或 Vercel Environment Variables）設定 GOOGLE_TTS_API_KEY';

  const voiceStatusLabel = hasKoreanVoice
    ? 'Neural2-A 女聲就緒'
    : '尚未設定 TTS 金鑰';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="#top" className="site-brand" aria-label="한글 소리 韓語發音互動學習首頁">
          <span className="site-brand__mark" aria-hidden="true">
            한
            <span className="site-brand__sparkle">✨</span>
          </span>
          <span className="site-brand__text">
            <span className="site-brand__kr">한글 소리</span>
            <span className="site-brand__tc">韓語發音互動手帳</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="頁面區塊導覽">
          <a href="#hangul-chart" className="site-nav__link">
            40 音發音表
          </a>
          <a href="#practice-zone" className="site-nav__link">
            日常發音練習
          </a>
          <a href="#situational-conversations" className="site-nav__link">
            實用情境會話
          </a>
          <a href="#daily-reading" className="site-nav__link">
            每日短篇閱讀
          </a>
        </nav>

        <div className="site-header__controls">
          <div className="rate-toggle" role="group" aria-label="全局語音播放速度">
            <button
              type="button"
              className={`rate-toggle__btn ${rate === 1.0 ? 'is-active' : ''}`}
              aria-pressed={rate === 1.0}
              onClick={() => onRateChange(1.0)}
            >
              正常 1.0x
            </button>
            <button
              type="button"
              className={`rate-toggle__btn ${rate === 0.75 ? 'is-active' : ''}`}
              aria-pressed={rate === 0.75}
              onClick={() => onRateChange(0.75)}
            >
              慢速 0.75x
            </button>
          </div>

          <span className={voiceStatusClass} title={voiceStatusTitle}>
            <span className="voice-status-dot" aria-hidden="true" />
            <span>{voiceStatusLabel}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
