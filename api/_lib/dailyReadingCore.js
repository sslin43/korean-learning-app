import { GeminiHttpError, callGeminiJson } from './geminiCore.js';

/**
 * Resolve progressive TOPIK difficulty stage metadata based on day number.
 * Gradually transitions learners from TOPIK 1 starter to TOPIK 2 early level.
 * @param {number} dayNumber
 * @returns {{
 *   stageKey: 'topik1-starter' | 'topik1-solid' | 'topik1-to-2' | 'topik2-early';
 *   levelTag: string;
 *   targetChars: string;
 *   guidance: string;
 * }}
 */
export function resolveTopikStage(dayNumber) {
  if (dayNumber <= 3) {
    return {
      stageKey: 'topik1-starter',
      levelTag: 'TOPIK 1 級 · 入門',
      targetChars: '100-130',
      guidance: '極簡短句、基礎高頻日常詞彙、-아/어요 敬語與基本助詞（은/는, 이/가, 을/를, 에/에서）',
    };
  }
  if (dayNumber <= 6) {
    return {
      stageKey: 'topik1-solid',
      levelTag: 'TOPIK 1 級 · 穩固',
      targetChars: '120-160',
      guidance: '加入過去式（-았/었어요）／未來計畫（-(으)ㄹ 거예요）、時間地點助詞與簡單原因／轉折連接（-아서/어서, -지만）',
    };
  }
  if (dayNumber <= 12) {
    return {
      stageKey: 'topik1-to-2',
      levelTag: 'TOPIK 1 → 2 過渡',
      targetChars: '140-180',
      guidance: '自然生活短文、複合句、條件／能力／嘗試表達（-(으)면, -(으)ㄹ 수 있다, -아/어 보다, -고 싶다）',
    };
  }
  return {
    stageKey: 'topik2-early',
    levelTag: 'TOPIK 2 級 · 初階',
    targetChars: '160-200',
    guidance: '完整日常敘事與個人感想、推測／變化／經歷／目的等 TOPIK 2 初階語法（-(으)ㄴ 것 같다, -게 되다, -(으)려고, -기 때문에）',
  };
}

/**
 * Validate and extract request fields for daily reading lesson generation.
 * @param {Record<string, unknown>} body
 * @returns {{
 *   dayNumber: number;
 *   date: string;
 *   topicHint?: string;
 *   recentTitles: string[];
 * }}
 */
export function parseDailyReadingRequestBody(body) {
  const rawDay = typeof body.dayNumber === 'number' ? Math.floor(body.dayNumber) : 1;
  const dayNumber = Number.isFinite(rawDay) && rawDay >= 1 ? Math.min(rawDay, 3650) : 1;

  const rawDate = typeof body.date === 'string' ? body.date.trim() : '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? rawDate
    : new Date().toISOString().slice(0, 10);

  const rawTopic = typeof body.topicHint === 'string' ? body.topicHint.trim() : '';
  const topicHint = rawTopic ? rawTopic.slice(0, 60) : undefined;

  const recentTitles = Array.isArray(body.recentTitles)
    ? body.recentTitles
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 80))
        .slice(0, 20)
    : [];

  return {
    dayNumber,
    date,
    topicHint,
    recentTitles,
  };
}

/**
 * @param {{
 *   dayNumber: number;
 *   date: string;
 *   topicHint?: string;
 *   recentTitles: string[];
 * }} input
 * @param {ReturnType<typeof resolveTopikStage>} stage
 * @returns {string}
 */
function buildDailyReadingPrompt(input, stage) {
  return [
    '你是一位經驗豐富的韓語教學老師，專門協助詞彙量較少、以日常韓語交流為目標的台灣學習者，循序漸進從 TOPIK 1 級過渡到 TOPIK 2 級。',
    `請為第 ${input.dayNumber} 天的「每日韓語短篇閱讀小課」編寫一篇全新課程。`,
    '',
    `目前學習階段：${stage.levelTag}`,
    `建議文章韓文字數：${stage.targetChars} 個字（不含空白，嚴格控制在 100 至 200 個韓文字之間）`,
    `階段教學重點：${stage.guidance}`,
    input.topicHint
      ? `指定生活主題：${input.topicHint}（請緊扣此主題創作自然生活情境）`
      : '生活主題不限，可選日常作息、超商美食、咖啡廳、散步運動、週末計畫、看劇追星、交通問路、網購取貨等貼近台灣學習者日常交流的主題。',
    input.recentTitles.length > 0
      ? `請避免與以下近期已學過的主題／標題重複：${input.recentTitles.join('、')}`
      : '',
    '',
    '課程結構與品質嚴格要求：',
    '1. passage（以 sentences 陣列回傳，每句含韓文 ko 與自然台灣繁體中文翻譯 tc）：',
    '   - 合併後的韓文短文（不含空白）必須落在大約 100 到 200 個韓文字之間（約 5～8 句自然口語／書面日記）。',
    '   - 句子自然道地，讓使用者先背詞彙與語法後就能順暢自行讀懂。',
    '2. vocabulary（8 至 12 個核心詞彙）：',
    '   - 每個詞彙必須真實出現在上述韓文課文中（動詞／形容詞請寫原形 -다，名詞／副詞寫課文中基本詞形）。',
    '   - 必須包含：word（韓文）、romanization（韓語羅馬拼音）、pos（繁體中文詞性標註，如「名詞」「動詞」「形容詞」「副詞」）、meaningTc（繁體中文釋義）、usageNote（實用的搭配或記憶小提醒）。',
    '3. grammar（2 至 3 個課文相關語法）：',
    '   - 必須挑選課文中實際有使用到的關鍵語法。',
    '   - 每個語法必須包含：pattern（語法型態，如「-(으)려고 하다」）、connection（詳細接續規則，註明有收尾音／無收尾音或母音陰陽變化）、meaningTc（意義與語氣）、exampleKo（與生活交流相關的韓文例句）、exampleTc（例句繁體中文翻譯）、differenceNote（與初學者最容易混淆之相似語法的清楚區別對比）。',
    '4. 全程中文部分必須使用自然流暢的台灣繁體中文（繁體中文）。',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {unknown} raw
 * @param {{ dayNumber: number; date: string }} input
 * @param {ReturnType<typeof resolveTopikStage>} stage
 * @param {string} modelUsed
 */
function sanitizeDailyReadingLesson(raw, input, stage, modelUsed) {
  const obj = typeof raw === 'object' && raw !== null ? raw : {};

  const titleKo =
    typeof obj.titleKo === 'string' && obj.titleKo.trim()
      ? obj.titleKo.trim()
      : '오늘의 한국어 읽기';
  const titleTc =
    typeof obj.titleTc === 'string' && obj.titleTc.trim()
      ? obj.titleTc.trim()
      : '今日韓語短篇閱讀';
  const topicTag =
    typeof obj.topicTag === 'string' && obj.topicTag.trim()
      ? obj.topicTag.trim()
      : '日常交流';

  const sentences = Array.isArray(obj.sentences)
    ? obj.sentences
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
          ko: typeof item.ko === 'string' ? item.ko.trim() : '',
          tc: typeof item.tc === 'string' ? item.tc.trim() : '',
        }))
        .filter((item) => item.ko.length > 0)
    : [];

  if (sentences.length === 0) {
    throw new GeminiHttpError(
      502,
      'Gemini AI 未產生有效韓文課文句子，請重新產生一次。'
    );
  }

  const passage = sentences.map((s) => s.ko).join(' ');
  const translationTc = sentences
    .map((s) => s.tc)
    .filter(Boolean)
    .join('');
  const charCount = passage.replace(/\s+/g, '').length;

  const vocabulary = Array.isArray(obj.vocabulary)
    ? obj.vocabulary
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
          word: typeof item.word === 'string' ? item.word.trim() : '',
          romanization:
            typeof item.romanization === 'string' ? item.romanization.trim() : '',
          pos: typeof item.pos === 'string' && item.pos.trim() ? item.pos.trim() : '詞彙',
          meaningTc: typeof item.meaningTc === 'string' ? item.meaningTc.trim() : '',
          usageNote: typeof item.usageNote === 'string' ? item.usageNote.trim() : '',
        }))
        .filter((item) => item.word.length > 0 && item.meaningTc.length > 0)
        .slice(0, 12)
    : [];

  if (vocabulary.length < 6) {
    throw new GeminiHttpError(
      502,
      'Gemini AI 回傳的核心詞彙數量不足，請點擊按鈕重新產生。'
    );
  }

  const grammar = Array.isArray(obj.grammar)
    ? obj.grammar
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
          pattern: typeof item.pattern === 'string' ? item.pattern.trim() : '',
          connection: typeof item.connection === 'string' ? item.connection.trim() : '',
          meaningTc: typeof item.meaningTc === 'string' ? item.meaningTc.trim() : '',
          exampleKo: typeof item.exampleKo === 'string' ? item.exampleKo.trim() : '',
          exampleTc: typeof item.exampleTc === 'string' ? item.exampleTc.trim() : '',
          differenceNote:
            typeof item.differenceNote === 'string' ? item.differenceNote.trim() : '',
        }))
        .filter((item) => item.pattern.length > 0 && item.meaningTc.length > 0)
        .slice(0, 3)
    : [];

  if (grammar.length < 2) {
    throw new GeminiHttpError(
      502,
      'Gemini AI 回傳的語法解析不足，請點擊按鈕重新產生。'
    );
  }

  return {
    id: `ai-day-${input.dayNumber}-${input.date}-${Date.now()}`,
    dayNumber: input.dayNumber,
    date: input.date,
    levelStage: stage.stageKey,
    levelTag: stage.levelTag,
    titleKo,
    titleTc,
    topicTag,
    charCount,
    passage,
    sentences,
    translationTc: translationTc || '暫無全文翻譯',
    vocabulary,
    grammar,
    source: 'ai',
    modelUsed,
  };
}

/**
 * Generate a daily progressive TOPIK 1->2 Korean short reading lesson via Gemini.
 * @param {{
 *   dayNumber: number;
 *   date: string;
 *   topicHint?: string;
 *   recentTitles: string[];
 * }} input
 * @param {{ apiKey: string; model: string }} config
 */
export async function generateDailyReadingWithGemini(input, config) {
  const stage = resolveTopikStage(input.dayNumber);
  const prompt = buildDailyReadingPrompt(input, stage);

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      titleKo: { type: 'STRING' },
      titleTc: { type: 'STRING' },
      topicTag: { type: 'STRING' },
      sentences: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            ko: { type: 'STRING' },
            tc: { type: 'STRING' },
          },
          required: ['ko', 'tc'],
        },
      },
      vocabulary: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            word: { type: 'STRING' },
            romanization: { type: 'STRING' },
            pos: { type: 'STRING' },
            meaningTc: { type: 'STRING' },
            usageNote: { type: 'STRING' },
          },
          required: ['word', 'romanization', 'pos', 'meaningTc', 'usageNote'],
        },
      },
      grammar: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            pattern: { type: 'STRING' },
            connection: { type: 'STRING' },
            meaningTc: { type: 'STRING' },
            exampleKo: { type: 'STRING' },
            exampleTc: { type: 'STRING' },
            differenceNote: { type: 'STRING' },
          },
          required: [
            'pattern',
            'connection',
            'meaningTc',
            'exampleKo',
            'exampleTc',
            'differenceNote',
          ],
        },
      },
    },
    required: ['titleKo', 'titleTc', 'topicTag', 'sentences', 'vocabulary', 'grammar'],
  };

  const { parsed, modelUsed } = await callGeminiJson(
    {
      parts: [{ text: prompt }],
      responseSchema,
      temperature: 0.5,
    },
    config
  );

  return sanitizeDailyReadingLesson(parsed, input, stage, modelUsed);
}
