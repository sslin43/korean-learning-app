import type { AppSectionId } from '../hooks/useActiveSection';
import './Header.css';

interface HeaderProps {
  rate: number;
  onRateChange: (rate: number) => void;
  isSpeechSupported: boolean;
  hasKoreanVoice: boolean;
  voiceName: string | null;
  activeSection: AppSectionId;
  onSelectSection: (sectionId: AppSectionId) => void;
}

const NAV_ITEMS: Array<{
  id: AppSectionId;
  label: string;
  icon: string;
  cornerSticker: string;
  trailGlyph: string;
  tint: 'pink' | 'blue' | 'green' | 'lilac';
}> = [
  {
    id: 'hangul-chart',
    label: '40 音發音表',
    icon: '🌸',
    cornerSticker: '✨',
    trailGlyph: '✿',
    tint: 'pink',
  },
  {
    id: 'practice-zone',
    label: '日常發音練習',
    icon: '🎀',
    cornerSticker: '🎧',
    trailGlyph: '♡',
    tint: 'blue',
  },
  {
    id: 'situational-conversations',
    label: '實用情境會話',
    icon: '🧸',
    cornerSticker: '📸',
    trailGlyph: '★',
    tint: 'green',
  },
  {
    id: 'daily-reading',
    label: '每日短篇閱讀',
    icon: '📖',
    cornerSticker: '🦋',
    trailGlyph: '✦',
    tint: 'lilac',
  },
];

export function Header({
  rate,
  onRateChange,
  isSpeechSupported,
  hasKoreanVoice,
  voiceName,
  activeSection,
  onSelectSection,
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
        <a
          href="#hangul-chart"
          className="site-brand"
          aria-label="한글 소리 韓語發音互動學習首頁"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('hangul-chart');
          }}
        >
          <span className="site-brand__mark" aria-hidden="true">
            한
            <span className="site-brand__sparkle">✨</span>
          </span>
          <span className="site-brand__text">
            <span className="site-brand__kr">한글 소리</span>
            <span className="site-brand__tc">韓語發音互動手帳</span>
          </span>
        </a>

        <nav className="site-nav" role="tablist" aria-label="頁面區塊導覽">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                id={`app-tab-${item.id}`}
                href={`#${item.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls="app-tab-panel"
                className={`site-nav__link ${isActive ? 'is-active' : ''}`}
                data-tint={item.tint}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectSection(item.id);
                }}
              >
                <span className="site-nav__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="site-nav__label">{item.label}</span>
                {isActive && (
                  <>
                    <span className="site-nav__glyph" aria-hidden="true">
                      {item.trailGlyph}
                    </span>
                    <span className="site-nav__corner-sticker" aria-hidden="true">
                      {item.cornerSticker}
                    </span>
                  </>
                )}
              </a>
            );
          })}
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
