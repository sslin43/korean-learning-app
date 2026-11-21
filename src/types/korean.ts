export type HangulCategory =
  | 'basic-consonant'
  | 'double-consonant'
  | 'basic-vowel'
  | 'compound-vowel';

export interface HangulExample {
  word: string;
  romanization: string;
  meaning: string;
}

export interface HangulItem {
  id: string;
  symbol: string;
  category: HangulCategory;
  romanization: string;
  ttsSyllable: string;
  letterName: string;
  letterNameRomanization: string;
  tip: string;
  example: HangulExample;
  audioUrl?: string;
}

export interface HangulCategoryMeta {
  key: HangulCategory;
  label: string;
  koreanLabel: string;
  count: number;
  description: string;
}

export type TranslationMode = 'tc' | 'en' | 'hidden';

export interface StudyDisplayPrefs {
  translationMode: TranslationMode;
  hideRomanization: boolean;
}

export interface PronunciationTarget {
  id: string;
  korean: string;
  pronunciationGuide: string;
  romanization: string;
  translation: string;
  translationEn?: string;
  audioUrl?: string;
}

export interface PracticeSentence extends PronunciationTarget {
  order: number;
  tip: string;
}

export interface ConversationPhrase extends PronunciationTarget {
  order: number;
  situationTag: string;
  difficultyTags: string[];
  pronunciationAnalysis: string;
}

export interface ConversationTopic {
  id: string;
  title: string;
  koreanTitle: string;
  icon: string;
  subtitle: string;
  accentKey: 'airport' | 'transit' | 'social' | 'fandom' | 'shopping' | string;
  phrases: ConversationPhrase[];
}

export interface ConversationsDataset {
  topics: ConversationTopic[];
}

export interface RecordingEntry {
  url: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: number;
}

export type ConsonantPlaybackMode = 'syllable' | 'name';

export type ComparePhase = 'native' | 'pause' | 'user' | null;

export type PronunciationLevel = 'excellent' | 'good' | 'needs-practice' | 'unclear';

export interface PronunciationImprovement {
  segment: string;
  issue: string;
  suggestion: string;
}

export interface PronunciationFeedback {
  score: number;
  level: PronunciationLevel;
  heardKorean: string;
  summary: string;
  strengths: string[];
  improvements: PronunciationImprovement[];
  nextStepTip: string;
  modelUsed?: string;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'success' | 'error';
  feedback?: PronunciationFeedback;
  error?: string;
}

export interface AiStatus {
  configured: boolean;
  model: string;
}

export type DailyReadingLevelStage =
  | 'topik1-starter'
  | 'topik1-solid'
  | 'topik1-to-2'
  | 'topik2-early';

export interface DailyReadingSentence {
  ko: string;
  tc: string;
  en?: string;
}

export interface DailyReadingVocab {
  word: string;
  romanization: string;
  pos: string;
  meaningTc: string;
  meaningEn?: string;
  usageNote: string;
}

export interface DailyReadingGrammar {
  pattern: string;
  connection: string;
  meaningTc: string;
  exampleKo: string;
  exampleTc: string;
  exampleEn?: string;
  differenceNote: string;
}

export interface DailyReadingLesson {
  id: string;
  dayNumber: number;
  date: string;
  levelStage: DailyReadingLevelStage;
  levelTag: string;
  titleKo: string;
  titleTc: string;
  titleEn?: string;
  topicTag: string;
  charCount: number;
  passage: string;
  sentences: DailyReadingSentence[];
  translationTc: string;
  translationEn?: string;
  vocabulary: DailyReadingVocab[];
  grammar: DailyReadingGrammar[];
  source: 'curated' | 'ai';
  modelUsed?: string;
}

export interface DailyReadingProgress {
  masteredWords: string[];
  completed: boolean;
  completedAt?: number;
}
