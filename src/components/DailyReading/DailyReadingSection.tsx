import { useEffect, useState } from 'react';
import type { DailyReadingController } from '../../hooks/useDailyReading';
import type { DailyReadingLevelStage } from '../../types/korean';
import './DailyReading.css';

interface DailyReadingSectionProps {
  reading: DailyReadingController;
  speakingId: string | null;
  aiConfigured: boolean;
  onSpeakText: (
    speechId: string,
    text: string,
    overrideRate?: number
  ) => Promise<boolean>;
  onStopSpeech: () => void;
}

const QUICK_TOPIC_PRESETS = [
  '咖啡廳日常',
  '便利商店美食',
  '韓國旅遊問路',
  '朋友週末聚餐',
  '追星看演唱會',
];

const TOPIK_STEPS: Array<{ key: DailyReadingLevelStage; label: string }> = [
  { key: 'topik1-starter', label: 'TOPIK 1 入門' },
  { key: 'topik1-solid', label: 'TOPIK 1 穩固' },
  { key: 'topik1-to-2', label: '1 → 2 過渡' },
  { key: 'topik2-early', label: 'TOPIK 2 初階' },
];

export function DailyReadingSection({
  reading,
  speakingId,
  aiConfigured,
  onSpeakText,
  onStopSpeech,
}: DailyReadingSectionProps) {
  const [maskMeaning, setMaskMeaning] = useState<boolean>(false);
  const [peekedWords, setPeekedWords] = useState<Record<string, boolean>>({});
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customTopic, setCustomTopic] = useState<string>('');

  const lesson = reading.selectedLesson;

  // Reset per-lesson temporary study view toggles when switching lessons
  useEffect(() => {
    setPeekedWords({});
    setShowTranslation(false);
  }, [lesson?.id]);

  if (!lesson) {
    return null;
  }

  const progress = reading.progressById[lesson.id] ?? {
    masteredWords: [],
    completed: false,
  };
  const masteredSet = new Set(progress.masteredWords);
  const masteredCount = progress.masteredWords.length;

  const fullNormalId = `reading-full-normal-${lesson.id}`;
  const fullSlowId = `reading-full-slow-${lesson.id}`;
  const isPlayingFullNormal = speakingId === fullNormalId;
  const isPlayingFullSlow = speakingId === fullSlowId;

  const handleTogglePeek = (word: string) => {
    if (!maskMeaning) return;
    setPeekedWords((prev) => ({
      ...prev,
      [word]: !prev[word],
    }));
  };

  const handleSubmitCustomTopic = async (topicValue: string) => {
    const ok = await reading.generateCustomLesson(topicValue);
    if (ok) {
      setCustomTopic('');
      setShowCustomForm(false);
    }
  };

  return (
    <section
      id="daily-reading"
      className="section-block"
      aria-labelledby="daily-reading-heading"
    >
      <div className="section-header">
        <div className="section-header__titles">
          <span className="section-badge">📖 PART 04 · 매일 한국어 읽기 ✨</span>
          <h2 id="daily-reading-heading" className="section-title">
            每日韓語短篇閱讀小課（TOPIK 1 → TOPIK 2 漸進式）
          </h2>
          <p className="section-subtitle">
            專為初學者打造的每日生活閱讀推播：先背熟核心詞彙與關鍵語法，再搭配標準韓語朗讀自行挑戰短文，所有每日推播紀錄皆保留於此供隨時複習。
          </p>
        </div>

        <div className="reading-header-actions">
          <div className="reading-stats-row">
            <span className="reading-stat-chip">
              已推送 <strong>{reading.lessons.length}</strong> 篇
            </span>
            <span className="reading-stat-chip is-done">
              已讀完 <strong>{reading.completedCount}</strong> 篇
            </span>
          </div>

          <div className="reading-action-btns">
            <button
              type="button"
              className="reading-action-btn reading-action-btn--primary"
              disabled={reading.isGenerating}
              onClick={() => void reading.pushNextLesson()}
            >
              {reading.isGenerating ? '✨ AI 編寫中…' : '✨ 領取下一課'}
            </button>
            <button
              type="button"
              className={`reading-action-btn ${showCustomForm ? 'is-open' : ''}`}
              aria-expanded={showCustomForm}
              onClick={() => setShowCustomForm((prev) => !prev)}
            >
              🪄 AI 自訂主題課
            </button>
          </div>
        </div>
      </div>

      {showCustomForm && (
        <div className="reading-custom-box">
          <div className="reading-custom-box__head">
            <span>
              🪄 選擇想看的生活主題或自行輸入（將依目前進度自動調整至合適的 TOPIK 1 → 2 難度）：
            </span>
            {!aiConfigured && (
              <span className="reading-custom-box__warn">
                ⚠️ 需於後端設定 GEMINI_API_KEY 才能生成 AI 自訂課程
              </span>
            )}
          </div>

          <div className="reading-preset-chips">
            {QUICK_TOPIC_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="reading-preset-chip"
                disabled={reading.isGenerating}
                onClick={() => void handleSubmitCustomTopic(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <form
            className="reading-custom-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmitCustomTopic(customTopic);
            }}
          >
            <input
              type="text"
              className="reading-custom-input"
              placeholder="例如：首爾夜市小吃、跟韓國朋友約看電影、超市買水果…"
              value={customTopic}
              maxLength={60}
              disabled={reading.isGenerating}
              onChange={(e) => setCustomTopic(e.target.value)}
            />
            <button
              type="submit"
              className="reading-action-btn reading-action-btn--primary"
              disabled={reading.isGenerating}
            >
              {reading.isGenerating ? '生成中…' : '立即生成小課'}
            </button>
          </form>
        </div>
      )}

      {reading.generateError && (
        <div className="notice-banner notice-banner--danger" role="alert">
          <span>{reading.generateError}</span>
          <button
            type="button"
            className="notice-banner__close"
            onClick={reading.clearGenerateError}
          >
            關閉
          </button>
        </div>
      )}

      {/* Daily Push History Archive */}
      <div className="reading-archive-panel" aria-label="每日推送紀錄列表">
        <div className="reading-archive-panel__head">
          <div className="reading-archive-panel__title">
            <span>📅 每日推送紀錄（保留隨時查閱）</span>
            <span className="reading-archive-panel__count">
              共 {reading.lessons.length} 筆紀錄
            </span>
          </div>
          <div className="topik-ladder" aria-label="TOPIK 程度漸進路線">
            {TOPIK_STEPS.map((step, idx) => (
              <span
                key={step.key}
                className={`topik-ladder__step ${
                  lesson.levelStage === step.key ? 'is-current' : ''
                }`}
              >
                {idx > 0 && <span className="topik-ladder__arrow">→</span>}
                <span>{step.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="reading-archive-list" role="tablist" aria-label="歷史每日閱讀課程">
          {reading.lessons.map((item) => {
            const isSelected = item.id === lesson.id;
            const itemProgress = reading.progressById[item.id];
            const itemMastered = itemProgress?.masteredWords.length ?? 0;
            const isToday = item.date === reading.todayDateKey;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`reading-archive-card ${isSelected ? 'is-active' : ''}`}
                onClick={() => reading.selectLesson(item.id)}
              >
                <div className="reading-archive-card__top">
                  <span className="reading-archive-day">Day {item.dayNumber}</span>
                  <span className="reading-archive-date">{item.date}</span>
                  {isToday && <span className="reading-today-pill">今日推送</span>}
                </div>

                <div className="reading-archive-card__titles">
                  <span className="reading-archive-title-kr kr-cute">{item.titleKo}</span>
                  <span className="reading-archive-title-tc">{item.titleTc}</span>
                </div>

                <div className="reading-archive-card__meta">
                  <span className="reading-level-mini" data-stage={item.levelStage}>
                    {item.levelTag}
                  </span>
                  <span className="reading-archive-progress">
                    詞彙 {itemMastered}/{item.vocabulary.length}
                    {itemProgress?.completed ? ' · ✓ 已讀完' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Active Lesson Diary Notebook */}
      <article className="reading-notebook" aria-label={`Day ${lesson.dayNumber} ${lesson.titleTc}`}>
        <div className="reading-notebook__header">
          <div className="reading-notebook__badges">
            <span className="reading-day-badge">DAY {String(lesson.dayNumber).padStart(2, '0')}</span>
            <span className="reading-date-chip">{lesson.date}</span>
            <span className="reading-level-badge" data-stage={lesson.levelStage}>
              {lesson.levelTag}
            </span>
            <span className="reading-topic-chip">🏷️ {lesson.topicTag}</span>
            <span className="reading-chars-chip">約 {lesson.charCount} 韓文字</span>
            <span className="reading-source-chip">
              {lesson.source === 'ai'
                ? `AI 生成${lesson.modelUsed ? ` · ${lesson.modelUsed}` : ''}`
                : '精選漸進課綱'}
            </span>
          </div>

          <div className="reading-notebook__titles">
            <h3 className="reading-notebook__title-kr kr-cute">{lesson.titleKo}</h3>
            <p className="reading-notebook__title-tc">{lesson.titleTc}</p>
          </div>
        </div>

        {/* Explicit 3-Step Learning Order Prompt (Requirement 4) */}
        <div className="reading-study-guide" role="note" aria-label="建議學習順序提示">
          <div className="reading-study-guide__copy">
            <strong>💡 建議學習順序（請先打底再讀課文）：</strong>
            <span>
              請先背熟下方「<strong>① 核心詞彙</strong>」並看懂「<strong>② 課文語法</strong>」，最後再自行挑戰閱讀「<strong>③ 今日短篇課文</strong>」並搭配語音朗讀核對發音與意思！
            </span>
          </div>

          <div className="reading-step-nav">
            <a href="#reading-step-vocab" className="reading-step-pill" data-step="1">
              ① 先背核心詞彙（{lesson.vocabulary.length} 詞）
            </a>
            <span className="reading-step-arrow" aria-hidden="true">
              →
            </span>
            <a href="#reading-step-grammar" className="reading-step-pill" data-step="2">
              ② 學習課文語法（{lesson.grammar.length} 個）
            </a>
            <span className="reading-step-arrow" aria-hidden="true">
              →
            </span>
            <a href="#reading-step-passage" className="reading-step-pill" data-step="3">
              ③ 自行閱讀＆全文朗讀
            </a>
          </div>
        </div>

        {/* STEP 1: Core Vocabulary (8-12 Words) */}
        <section id="reading-step-vocab" className="reading-block" aria-labelledby="reading-vocab-title">
          <div className="reading-block__header">
            <div className="reading-block__titles">
              <span className="reading-step-tag">STEP 01 · 先背單字</span>
              <h4 id="reading-vocab-title" className="reading-block__title">
                核心詞彙（{lesson.vocabulary.length} 詞）
              </h4>
            </div>

            <div className="reading-vocab-controls">
              <span className="reading-mastery-pill">
                已背熟 <strong>{masteredCount}</strong> / {lesson.vocabulary.length} 詞
              </span>
              <button
                type="button"
                className={`reading-mask-btn ${maskMeaning ? 'is-active' : ''}`}
                aria-pressed={maskMeaning}
                onClick={() => {
                  setMaskMeaning((prev) => !prev);
                  setPeekedWords({});
                }}
              >
                {maskMeaning ? '👀 取消遮罩' : '🙈 遮罩中文背誦'}
              </button>
            </div>
          </div>

          <div className="reading-vocab-grid">
            {lesson.vocabulary.map((vocab) => {
              const vocabSpeechId = `reading-vocab-${lesson.id}-${vocab.word}`;
              const isPlaying = speakingId === vocabSpeechId;
              const isMastered = masteredSet.has(vocab.word);
              const isHidden = maskMeaning && !peekedWords[vocab.word];

              return (
                <div
                  key={vocab.word}
                  className={`vocab-card ${isMastered ? 'is-mastered' : ''}`}
                >
                  <div className="vocab-card__top">
                    <div className="vocab-card__word-row">
                      <span className="vocab-card__word kr-cute">{vocab.word}</span>
                      <span className="vocab-card__pos">{vocab.pos}</span>
                    </div>

                    <div className="vocab-card__btns">
                      <button
                        type="button"
                        className={`vocab-speak-btn ${isPlaying ? 'is-playing' : ''}`}
                        aria-label={`朗讀單字 ${vocab.word}`}
                        title="聆聽單字發音"
                        onClick={() => void onSpeakText(vocabSpeechId, vocab.word)}
                      >
                        🔊
                      </button>
                      <button
                        type="button"
                        className={`vocab-check-btn ${isMastered ? 'is-checked' : ''}`}
                        aria-pressed={isMastered}
                        onClick={() => reading.toggleMasteredWord(lesson.id, vocab.word)}
                      >
                        {isMastered ? '✓ 已背熟' : '背起來'}
                      </button>
                    </div>
                  </div>

                  {vocab.romanization && (
                    <span className="vocab-card__roman">{vocab.romanization}</span>
                  )}

                  <div
                    className={`vocab-card__meaning-wrap ${isHidden ? 'is-masked' : ''}`}
                    onClick={() => handleTogglePeek(vocab.word)}
                    role={maskMeaning ? 'button' : undefined}
                    tabIndex={maskMeaning ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (maskMeaning && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleTogglePeek(vocab.word);
                      }
                    }}
                  >
                    {isHidden ? (
                      <span className="vocab-card__mask-hint">點擊查看中文釋義與用法</span>
                    ) : (
                      <>
                        <p className="vocab-card__meaning">{vocab.meaningTc}</p>
                        {vocab.usageNote && (
                          <p className="vocab-card__usage">{vocab.usageNote}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* STEP 2: Related Grammar (2-3 Points) */}
        <section id="reading-step-grammar" className="reading-block" aria-labelledby="reading-grammar-title">
          <div className="reading-block__header">
            <div className="reading-block__titles">
              <span className="reading-step-tag">STEP 02 · 再學語法</span>
              <h4 id="reading-grammar-title" className="reading-block__title">
                課文重點語法（{lesson.grammar.length} 個）
              </h4>
            </div>
          </div>

          <div className="reading-grammar-list">
            {lesson.grammar.map((gram, index) => {
              const exSpeechId = `reading-gram-${lesson.id}-${index}`;
              const isPlayingExample = speakingId === exSpeechId;

              return (
                <div key={`${gram.pattern}-${index}`} className="grammar-card">
                  <div className="grammar-card__head">
                    <span className="grammar-card__num">語法 0{index + 1}</span>
                    <h5 className="grammar-card__pattern kr-cute">{gram.pattern}</h5>
                  </div>

                  <div className="grammar-card__rows">
                    <div className="grammar-detail-row">
                      <span className="grammar-label">接續</span>
                      <p className="grammar-text">{gram.connection}</p>
                    </div>
                    <div className="grammar-detail-row">
                      <span className="grammar-label">意義</span>
                      <p className="grammar-text">{gram.meaningTc}</p>
                    </div>
                    <div className="grammar-detail-row grammar-detail-row--example">
                      <span className="grammar-label">例句</span>
                      <div className="grammar-example-box">
                        <div className="grammar-example-box__kr">
                          <span className="kr-text">{gram.exampleKo}</span>
                          <button
                            type="button"
                            className={`vocab-speak-btn ${isPlayingExample ? 'is-playing' : ''}`}
                            aria-label={`朗讀例句 ${gram.exampleKo}`}
                            onClick={() => void onSpeakText(exSpeechId, gram.exampleKo)}
                          >
                            🔊
                          </button>
                        </div>
                        <p className="grammar-example-box__tc">{gram.exampleTc}</p>
                      </div>
                    </div>
                    <div className="grammar-detail-row grammar-detail-row--diff">
                      <span className="grammar-label is-diff">區別</span>
                      <p className="grammar-text">{gram.differenceNote}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* STEP 3: Short Reading Passage + Audio Narration */}
        <section id="reading-step-passage" className="reading-block" aria-labelledby="reading-passage-title">
          <div className="reading-block__header">
            <div className="reading-block__titles">
              <span className="reading-step-tag">STEP 03 · 自行閱讀課文與朗讀</span>
              <h4 id="reading-passage-title" className="reading-block__title">
                今日短篇課文（約 {lesson.charCount} 韓文字）
              </h4>
            </div>

            <div className="reading-audio-bar">
              <button
                type="button"
                className={`reading-audio-btn is-normal ${isPlayingFullNormal ? 'is-playing' : ''}`}
                onClick={() => {
                  if (isPlayingFullNormal) {
                    onStopSpeech();
                  } else {
                    void onSpeakText(fullNormalId, lesson.passage, 1.0);
                  }
                }}
              >
                {isPlayingFullNormal ? '⏹ 停止朗讀' : '🔊 朗讀整篇文章（1.0x）'}
              </button>
              <button
                type="button"
                className={`reading-audio-btn is-slow ${isPlayingFullSlow ? 'is-playing' : ''}`}
                onClick={() => {
                  if (isPlayingFullSlow) {
                    onStopSpeech();
                  } else {
                    void onSpeakText(fullSlowId, lesson.passage, 0.75);
                  }
                }}
              >
                {isPlayingFullSlow ? '⏹ 停止慢速' : '🐢 慢速朗讀全文（0.75x）'}
              </button>
            </div>
          </div>

          <div className="reading-passage-paper">
            <p className="reading-passage-hint">
              試著不看中文翻譯自己讀一遍；點擊任一句右側的 🔊 也可單句重聽！
            </p>

            <div className="reading-sentences-list">
              {lesson.sentences.map((sent, idx) => {
                const sentSpeechId = `reading-sent-${lesson.id}-${idx}`;
                const isSentencePlaying = speakingId === sentSpeechId;

                return (
                  <div
                    key={`${lesson.id}-s-${idx}`}
                    className={`reading-sentence-line ${isSentencePlaying ? 'is-playing' : ''}`}
                  >
                    <span className="reading-sentence-index">{idx + 1}</span>
                    <span className="reading-sentence-ko kr-text">{sent.ko}</span>
                    <button
                      type="button"
                      className={`vocab-speak-btn ${isSentencePlaying ? 'is-playing' : ''}`}
                      aria-label={`朗讀第 ${idx + 1} 句：${sent.ko}`}
                      title="單句朗讀"
                      onClick={() => {
                        if (isSentencePlaying) {
                          onStopSpeech();
                        } else {
                          void onSpeakText(sentSpeechId, sent.ko);
                        }
                      }}
                    >
                      🔊
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="reading-translation-wrap">
              <button
                type="button"
                className={`reading-translation-toggle ${showTranslation ? 'is-open' : ''}`}
                aria-expanded={showTranslation}
                onClick={() => setShowTranslation((prev) => !prev)}
              >
                {showTranslation
                  ? '🙈 收合中文翻譯'
                  : '👀 展開中文翻譯（建議先自行閱讀完畢再核對）'}
              </button>

              {showTranslation && (
                <div className="reading-translation-box">
                  <div className="reading-translation-pairs">
                    {lesson.sentences.map((sent, idx) => (
                      <div key={`tr-${idx}`} className="reading-translation-pair">
                        <span className="reading-tr-num">{idx + 1}.</span>
                        <div>
                          <p className="reading-tr-ko kr-text">{sent.ko}</p>
                          <p className="reading-tr-tc">{sent.tc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="reading-notebook__footer">
            <button
              type="button"
              className={`reading-complete-btn ${progress.completed ? 'is-completed' : ''}`}
              aria-pressed={progress.completed}
              onClick={() => reading.toggleCompleted(lesson.id)}
            >
              {progress.completed
                ? '🎉 已完成本課閱讀打卡（點擊可取消）'
                : '✅ 標記完成本課閱讀'}
            </button>
          </div>
        </section>
      </article>
    </section>
  );
}
