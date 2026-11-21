export interface DailyQuote {
  id: string;
  korean: string;
  romanization: string;
  translation: string;
  translationEn: string;
  emoji: string;
}

export const DAILY_QUOTES: DailyQuote[] = [
  {
    id: 'quote-1',
    korean: '오늘도 화이팅!',
    romanization: 'Oneuldo hwaiting!',
    translation: '今天也要加油喔！',
    translationEn: 'You’ve got this today!',
    emoji: '✨',
  },
  {
    id: 'quote-2',
    korean: '천천히 해도 괜찮아요.',
    romanization: 'Cheoncheonhi haedo gwaenchanayo.',
    translation: '慢慢來也沒關係的。',
    translationEn: 'It’s okay to take it slow.',
    emoji: '🌷',
  },
  {
    id: 'quote-3',
    korean: '매일 조금씩 성장하고 있어요.',
    romanization: 'Maeil jogeumssik seongjanghago isseoyo.',
    translation: '每天都在一點一滴進步著呢。',
    translationEn: 'You are growing a little bit every day.',
    emoji: '🌱',
  },
  {
    id: 'quote-4',
    korean: '잘하고 있어요, 힘내요!',
    romanization: 'Jalhago isseoyo, himnaeyo!',
    translation: '你做得很好，打起精神吧！',
    translationEn: 'You’re doing great—keep going!',
    emoji: '🎀',
  },
  {
    id: 'quote-5',
    korean: '오늘 한 문장이 내일의 실력이 돼요.',
    romanization: 'Oneul han munjangi naeirui sillyeogi dwaeyo.',
    translation: '今天學的一句話，會變成明天的實力。',
    translationEn: 'One sentence today becomes tomorrow’s skill.',
    emoji: '📖',
  },
  {
    id: 'quote-6',
    korean: '실수해도 괜찮아요, 다시 해 봐요!',
    romanization: 'Silsuhaedo gwaenchanayo, dasi hae bwayo!',
    translation: '就算犯錯也沒關係，再試一次吧！',
    translationEn: 'Making mistakes is okay—try again!',
    emoji: '🍓',
  },
  {
    id: 'quote-7',
    korean: '꾸준히 하면 꼭 잘할 수 있어요.',
    romanization: 'Kkujunhi hamyeon kkok jalhal su isseoyo.',
    translation: '持之以恆的話，一定能越說越棒。',
    translationEn: 'Stay consistent and you’ll definitely master it.',
    emoji: '🧸',
  },
  {
    id: 'quote-8',
    korean: '오늘도 즐겁게 한국어 공부해요!',
    romanization: 'Oneuldo jeulgeopge hangugeo gongbuhaeyo!',
    translation: '今天也要開心地學韓語喔！',
    translationEn: 'Let’s enjoy studying Korean today too!',
    emoji: '🎧',
  },
  {
    id: 'quote-9',
    korean: '지금 이 순간도 멋져요!',
    romanization: 'Jigeum i sungando meotjyeoyo!',
    translation: '現在認真練習的這一刻也很棒喔！',
    translationEn: 'This moment of effort shines too!',
    emoji: '📸',
  },
  {
    id: 'quote-10',
    korean: '한 걸음씩 나아가고 있어요.',
    romanization: 'Han georeumssik naagago isseoyo.',
    translation: '正一步一腳印地向前邁進呢。',
    translationEn: 'Moving forward one step at a time.',
    emoji: '☁️',
  },
  {
    id: 'quote-11',
    korean: '목소리를 내서 따라 읽어 봐요!',
    romanization: 'Moksorireul naeseo ttara ilgeo bwayo!',
    translation: '試著大聲唸出來跟讀看看吧！',
    translationEn: 'Read along out loud and give it a try!',
    emoji: '🎙️',
  },
  {
    id: 'quote-12',
    korean: '작은 습관이 큰 변화를 만들어요.',
    romanization: 'Jageun seupgwani keun byeonhwareul mandeureoyo.',
    translation: '小小的習慣會帶來大大的改變。',
    translationEn: 'Small habits create big changes.',
    emoji: '🦋',
  },
  {
    id: 'quote-13',
    korean: '포기하지 않는 내가 최고예요!',
    romanization: 'Pogihaji anneun naega choegoyeyo!',
    translation: '不輕言放棄的自己是最棒的！',
    translationEn: 'Never giving up makes you the best!',
    emoji: '🏆',
  },
  {
    id: 'quote-14',
    korean: '내일은 오늘보다 더 자연스러울 거예요.',
    romanization: 'Naeireun oneulboda deo jayeonseureoul geoyeyo.',
    translation: '明天的韓語一定會比今天更自然！',
    translationEn: 'Tomorrow will sound even more natural than today.',
    emoji: '🌸',
  },
];

export function getDailyQuoteIndex(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash % DAILY_QUOTES.length;
}
