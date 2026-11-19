import type { PracticeSentence } from '../types/korean';

export const PRACTICE_SENTENCES: PracticeSentence[] = [
  {
    id: 'sentence-1',
    order: 1,
    korean: '안녕하세요.',
    pronunciationGuide: '[안녕하세요]',
    romanization: 'Annyeonghaseyo',
    translation: '您好',
    tip: '最常用的禮貌問候語；注意「녕」的收尾音「ㅇ」要帶出清晰的鼻音，「요」語調平穩微降。',
  },
  {
    id: 'sentence-2',
    order: 2,
    korean: '감사합니다.',
    pronunciationGuide: '[감사함니다]',
    romanization: 'Gamsahamnida',
    translation: '謝謝',
    tip: '發生「鼻音化」現象：「합」的收尾音「ㅂ」遇到後面的「ㄴ」，需同化改讀成「ㅁ」→「감사함니다」。',
  },
  {
    id: 'sentence-3',
    order: 3,
    korean: '죄송합니다.',
    pronunciationGuide: '[죄송함니다]',
    romanization: 'Joesonghamnida',
    translation: '對不起',
    tip: '開頭「죄」由複合母音「ㅚ」發音（嘴唇先圓再微展）；同樣受鼻音化影響，「합니」連讀為「함니」。',
  },
  {
    id: 'sentence-4',
    order: 4,
    korean: '화장실이 어디예요?',
    pronunciationGuide: '[화장시리 어디예요]',
    romanization: 'Hwajangsiri eodiyeyo?',
    translation: '洗手間在哪裡？',
    tip: '發生「連音規則」：「실」的收尾音「ㄹ」往後移到「이」的無聲子音位置，連讀成「시리」；句尾疑問語調略微上揚。',
  },
  {
    id: 'sentence-5',
    order: 5,
    korean: '이거 얼마예요?',
    pronunciationGuide: '[이거 얼마예요]',
    romanization: 'Igeo eolmayeyo?',
    translation: '這個多少錢？',
    tip: '「얼」收尾音「ㄹ」舌尖需輕貼上齒齦後再銜接「마」；整句結尾「예요?」自然上揚呈現詢問語氣。',
  },
];
