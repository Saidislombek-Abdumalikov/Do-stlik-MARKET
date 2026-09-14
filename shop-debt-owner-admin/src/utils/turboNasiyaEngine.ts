/**
 * ============================================================================
 * DO'STLIK MARKET — LOCAL TURBO NASIYA ENGINE (<1ms NLP Parser)
 * 
 * Ushbu modul oziq-ovqat, xo'jalik mollari, kiyim yoki qurilish do'konlarida
 * sotuvchilar aytgan og'zaki yoki yozgan matnli nasiya xabarlarini (<1ms) ichida
 * to'liq tahlil qilib, qat'iy JSON formatga o'tkazib beradi.
 * 
 * Hech qanday tashqi AI API (OpenAI/Gemini) talab qilmaydi, offline ishlaydi.
 * ============================================================================
 */

export type NasiyaActionType = 
  | 'nasiya_berish'      // Do'kondan tovar/summa nasiyaga berildi (Nasiya ko'payadi)
  | 'nasiya_tolash'      // Mijoz nasiyasini to'ladi yoki qismini berdi (Nasiya kamayadi)
  | 'balans_sorash'      // Mijozning qancha qarzi qolganini yoki do'kondagi jami nasiyani so'rash
  | 'umumiy_savol';

export interface NasiyaItem {
  name: string;          // Masalan: "non", "go'sht", "un", "shakar", "yog'"
  quantity?: number;     // Masalan: 2, 1, 0.5
  unit?: string;         // Masalan: "ta", "kg", "qop", "litr", "dona", "blok"
  price?: number;        // Agar alohida aytilgan bo'lsa
}

export interface NasiyaTransaction {
  action: NasiyaActionType;
  customer_name: string; // Mijoz ismi va unvoni (masalan: "Akmal aka", "Nodira opa", "Sardor usta")
  customer_phone?: string | null;
  amount: number;        // Jami summa (so'mda)
  currency: 'UZS' | 'USD';
  items: NasiyaItem[];   // Olingan tovarlar ro'yxati
  due_date: string | null; // Qachon berishi kerak (YYYY-MM-DD)
  due_condition?: string | null; // "oyligida", "pensiyada", "hafta oxirida", "kechga", "ertaga"
  date: string;          // Savdo sanasi (YYYY-MM-DD, Asia/Tashkent UTC+5)
  note: string;          // Asl matn yoki qisqa izoh
  confidence: number;    // 0.0 dan 1.0 gacha
  is_partial_payment?: boolean; // Qisman to'lovmi?
}

export interface TurboNasiyaResult {
  success: boolean;
  action: NasiyaActionType;
  transactions: NasiyaTransaction[];
  overall_confidence: number;
  raw_text: string;
  execution_ms?: number; // <1ms ultra-fast benchmark indicator
}

// ── 1. DICTIONARIES & VOCABULARY ──────────────────────────────

const UZBEK_WORD_NUMBERS: Record<string, number> = {
  'nol': 0, 'bir': 1, 'ikki': 2, 'uch': 3, "to'rt": 4, 'tort': 4, 'besh': 5,
  'olti': 6, 'yetti': 7, 'etti': 7, 'sakkiz': 8, "to'qqiz": 9, 'toqqiz': 9,
  "o'n": 10, 'on': 10, 'yigirma': 20, "o'ttiz": 30, 'ottiz': 30, 'qirq': 40,
  'ellik': 50, 'oltmish': 60, 'yetmish': 70, 'etmish': 70, 'sakson': 80,
  "to'qson": 90, 'toqson': 90, 'yuz': 100, 'yarim': 0.5,
};

const UNITS_MAP: Record<string, string> = {
  'ta': 'ta', 'dona': 'dona', 'kg': 'kg', 'kilo': 'kg', 'kilogramm': 'kg',
  'gr': 'gr', 'gramm': 'gr', 'qop': 'qop', 'blok': 'blok', 'litr': 'litr',
  'l': 'litr', 'pochka': 'pochka', 'karobka': 'karobka', 'balka': 'balka',
  'shisha': 'dona', 'bakalashka': 'dona', 'banka': 'dona', 'dasta': 'dasta',
};

const COMMON_GROCERIES = [
  'non', "go'sht", 'gosht', "go'sh", 'gosh', 'un', 'shakar', "yog'", 'yog', 'sut', 'tuxum',
  'choy', 'kola', 'fanta', 'pepsi', 'kartoshka', 'piyoz', 'sabzi', 'guruch',
  'makaron', 'pishloq', 'qaymoq', "sariyog'", 'sariyog', 'kolbasa', 'sosiska',
  'pechenye', 'shirinlik', 'konfet', 'suv', 'sharbat', 'sigaret', 'qovun',
  'tarvuz', 'olma', 'pamidor', 'bodring', 'mayonez', 'ketchup', 'tuz',
];

const HONORIFICS = [
  'aka', 'oka', 'okam', 'akam', 'akaxon', 'okaxon', 'okasi', 'akasi',
  'opa', 'opam', 'opaxon', 'opasi',
  'uka', 'ukam', 'singil',
  'toga', "tog'a", 'togam', "tog'am",
  'amaki', 'amakim',
  'xola', 'xolam',
  'amma', 'ammam',
  'usta', 'ustam',
  "qo'shni", 'qoshni',
  "do'xtir", 'doxtir',
  'pochcha', 'kelin', 'kuyov',
  'mulla', 'domla', 'muallim', 'hoji', 'qori', 'rais',
  'qassob', 'qossop', 'qossob', 'kassob', 'novvoy', 'novoy', 'nonvoy',
  'bozorchi', 'haydovchi', 'shofyor', 'shofir', 'taksist', 'dokondor', "do'kondor",
  'suvoqchi', 'suvokchi', 'boyoqchi', "bo'yoqchi", 'kraskachi', 'santexnik', 'santex',
  'svarchik', 'duradgor', 'jiyan', 'bola', 'akfachi', 'akfashik', 'akfa',
];

// O'zbek xalqona shevalari va og'zaki talaffuzlarini me'yoriy shaklga keltirish
export function normalizeWord(w: string): string {
  let clean = w.trim().toLowerCase().replace(/[ʻʼ`´]/g, "'");

  // Protect common Uzbek names from accidental suffix truncation (Ali, Vali, Guli, Ziyoda, Saida, etc.)
  const PRESERVE_NAMES = new Set([
    'ali', 'vali', 'guli', 'ziyoda', 'saida', 'hamida', 'farida', 'mavluda',
    'shahzoda', 'dilnoza', 'dilshod', 'otabek', 'katta', 'bolta', 'balka'
  ]);
  if (PRESERVE_NAMES.has(clean)) return clean;

  // Strip compound plural / case suffixes if word is long enough
  if (clean.length >= 7) {
    clean = clean.replace(/(?:lardan|larga|larda|larni|larning|larniki)$/, '');
  }
  // Strip simple case suffixes (e.g. Farhodga -> Farhod, Akmaldan -> Akmal)
  if (clean.length >= 6) {
    clean = clean.replace(/(?:dan|tan|ning|larga|lardan)$/, '');
  }
  if (clean.length >= 5) {
    clean = clean.replace(/(?:ga|ka|qa|ni)$/, '');
  }
  clean = clean.trim();
  
  // Aka / Oka shevalari va ovoz xatolari (o'quv, oquv, okoga, akaga)
  if (
    clean === 'oka' ||
    clean === 'okam' ||
    clean === 'akam' ||
    clean === 'akaxon' ||
    clean === 'okaxon' ||
    clean === 'okasi' ||
    clean === 'akasi' ||
    clean === 'oko' ||
    clean === "o'quv" ||
    clean === 'oquv' ||
    clean === "o'qu" ||
    clean === 'okov'
  ) return 'aka';
  // Opa shevalari
  if (clean === 'opam' || clean === 'opaxon' || clean === 'opasi') return 'opa';
  // Tog'a / Amaki
  if (clean === 'toga' || clean === 'togam' || clean === "tog'am") return "tog'a";
  if (clean === 'amakim' || clean === 'amasi') return 'amaki';
  if (clean === 'xolam') return 'xola';
  if (clean === 'ammam') return 'amma';
  if (clean === 'ustam') return 'usta';

  // Farhod shevalari (Farxod, Farxot, Farhot, Farxat, Farhat)
  if (clean === 'farxod' || clean === 'farxot' || clean === 'farhot' || clean === 'farxat' || clean === 'farhat') return 'farhod';

  // Qassob shevalari
  if (clean === 'qossob' || clean === 'qossop' || clean === 'kassob' || clean === 'qasob') return 'qassob';
  // Rasul ismining talaffuzlari (rosil, rosl, rosul, rasl)
  if (clean === 'rosil' || clean === 'rosl' || clean === 'rosul' || clean === 'rasl') return 'rasul';
  // Akfachi / plastik ustasi
  if (clean === 'akfa' || clean === 'akfashik' || clean === 'akfachi') return 'akfachi';
  // Novvoy shevalari
  if (clean === 'novoy' || clean === 'nonvoy') return 'novvoy';
  // Shofyor / haydovchi
  if (clean === 'shofir' || clean === 'shofyor') return 'haydovchi';
  // Qurilish ustalari
  if (clean === 'suvokchi') return 'suvoqchi';
  if (clean === 'kraskachi') return 'boyoqchi';
  if (clean === 'santex') return 'santexnik';
  // Go'sht / yog'
  if (clean === "go'sh" || clean === 'gosh') return "go'sht";
  if (clean === 'yog' || clean === 'yogʻ') return "yog'";
  return clean || w.trim().toLowerCase();
}

// Levenshtein masofasi (Fuzzy matn o'xshashligi)
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// O'zbekona fonetik va shevaviy aqlli qidiruv (Smart Fuzzy Matcher)
// Hech qachon qisqa ismlarni boshqa uzun ismlarga qorishtirmaydi (masalan, "Ali" ni "Alisher" ga aralashtirmaydi)
export function fuzzyMatchUzbek(query: string, target: string): boolean {
  if (!query || !target) return false;
  const cleanQ = query.toLowerCase().replace(/[ʻʼ`´]/g, "'").trim();
  const cleanT = target.toLowerCase().replace(/[ʻʼ`´]/g, "'").trim();

  // 1. To'liq bir xil bo'lsa
  if (cleanQ === cleanT) return true;

  // 2. So'z chegarasi bo'yicha boshlanishi yoki tugashi (masalan: "Farhod" va "Farhod aka")
  if (cleanT.startsWith(cleanQ + ' ') || cleanT.endsWith(' ' + cleanQ) || cleanT.includes(' ' + cleanQ + ' ')) {
    return true;
  }
  if (cleanQ.startsWith(cleanT + ' ') || cleanQ.endsWith(' ' + cleanT) || cleanQ.includes(' ' + cleanT + ' ')) {
    return true;
  }

  // 3. Normalizatsiya qilingan so'zlar bo'yicha taqqoslash
  const qWords = cleanQ.split(/\s+/).map(normalizeWord).filter((w) => w.length >= 2);
  const tWords = cleanT.split(/\s+/).map(normalizeWord).filter((w) => w.length >= 2);

  // Agar barcha so'zlar bir xil bo'lsa (tartibidan qat'i nazar)
  if (qWords.length > 0 && tWords.length > 0) {
    for (const qw of qWords) {
      for (const tw of tWords) {
        // To'liq so'z tengligi
        if (qw === tw) return true;

        // Faqat uzunligi yaqin bo'lgan so'zlarda fonetik tahrir masofasi (masalan Farxod <-> Farhod, Shohruh <-> Shoxrux)
        // Hech qachon turli uzunlikdagi so'zlarni (Ali vs Alisher) aralashtirmaydi!
        const lenDiff = Math.abs(qw.length - tw.length);
        if (lenDiff <= 1 && qw.length >= 4 && tw.length >= 4) {
          const dist = levenshteinDistance(qw, tw);
          if (dist <= 1) return true;
        } else if (lenDiff <= 2 && qw.length >= 6 && tw.length >= 6) {
          const dist = levenshteinDistance(qw, tw);
          if (dist <= 2) return true;
        }
      }
    }
  }

  return false;
}


const STOP_WORDS = new Set([
  'non', "go'sht", 'gosht', "go'sh", 'gosh', 'un', 'shakar', "yog'", 'yog', 'sut', 'tuxum', 'choy',
  'kartoshka', 'piyoz', 'sabzi', 'guruch', 'makaron', 'qarz', 'nasiya', 'nasiyaga',
  "so'm", 'som', 'ming', 'mln', 'million', 'dollar', 'daftar', 'daftari', 'daftariga',
  'yoz', 'yozib', "qo'y", 'qoy', 'oldi', 'olib', 'ketdi', 'ketti', 'beradi', 'berdi',
  'jami', 'pul', 'pulini', 'narsa', 'bugun', 'kecha', 'ertaga', 'kechga', 'kechqurun',
  'qancha', 'qoldi', 'hisob', 'hisobi', 'boladi', "bo'ldi", 'boldi', 'beraman', 'dedi',
  'tashlab', 'qarzidan', 'uzdi', 'yopildi', 'berib', 'bervordim', 'yozvordim', 'berildi',
  'ta', 'kg', 'kilo', 'qop', 'blok', 'litr', 'dona',
]);

// ── 2. HELPER UTILITIES ───────────────────────────────────────

export function getTashkentDateString(refDate = new Date()): string {
  // Asia/Tashkent UTC+5 calculation
  const utc = refDate.getTime() + refDate.getTimezoneOffset() * 60000;
  const tashkentTime = new Date(utc + 5 * 3600000);
  return tashkentTime.toISOString().split('T')[0];
}

/**
 * Normalizes live speech recognition distortions before parsing or displaying:
 * - "sherzod akfa" -> "sherzod akfachi"
 * - "30224 030" / "30 224 030" -> "30 000"
 * - "30 berish kerak" -> "30 ming berishi kerak"
 */
export function cleanSpeechInput(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\bakfa\b/gi, 'akfachi')
    .replace(/\bakfashik\b/gi, 'akfachi')
    // Speech-to-text stutter/garbles: "30224 030" -> "30 000", "50123 050" -> "50 000"
    .replace(/\b(10|15|20|25|30|35|40|45|50|60|70|80|90|100)\d{1,4}\s+0*(\1)\b/gi, '$1 000')
    // Speech garble with berish kerak: "30 berish kerak" -> "30 ming berishi kerak"
    .replace(/\b([1-9]\d?)\s*berish(?:i)?\s*kerak\b/gi, '$1 ming berishi kerak');
}

function cleanUzbekText(text: string): string {
  return cleanSpeechInput(text)
    .toLowerCase()
    .replace(/[ʻʼ`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[,;:]/g, ' ')
    // Normalize dots between thousands (e.g. 30.000 -> 30000, 1.500.000 -> 1500000)
    .replace(/(\d+)\.(\d{3})(?!\d)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 3. EXTRACT UZBEK NUMBER & COMPOUND NUMBERS ────────────────

export function extractUzbekNumber(word: string): number | null {
  const clean = word.toLowerCase().trim();
  if (UZBEK_WORD_NUMBERS[clean] !== undefined) {
    return UZBEK_WORD_NUMBERS[clean];
  }
  const numeric = parseFloat(clean.replace(/[^\d.]/g, ''));
  if (!isNaN(numeric)) {
    return numeric;
  }
  return null;
}

/**
 * Parses amounts like:
 * - "145 ming" -> 145000
 * - "320k" -> 320000
 * - "2 mln 500 ming" -> 2500000
 * - "50 ming 500" -> 50500
 * - "85 minglik" -> 85000
 * - "1 yarim mln" -> 1500000
 * - "50$" or "50 dollar" -> 50 (USD)
 */
export function resolveCompoundNumbers(rawText: string): { amount: number; currency: 'UZS' | 'USD' } {
  let text = cleanUzbekText(rawText);
  // Normalize multi-group dotted and space separated thousands: e.g. "1 500 000" -> "1500000", "50 000" -> "50000"
  text = text.replace(/(\b\d{1,3})[.\s]+(\d{3})[.\s]+(\d{3})\b/g, '$1$2$3');
  text = text.replace(/(\b\d{1,3})[.\s]+(\d{3})\b/g, '$1$2');

  // 1. Currency Check (USD)
  const usdMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:\$|dollar|usd)/i);
  if (usdMatch) {
    return { amount: parseFloat(usdMatch[1]), currency: 'USD' };
  }

  // 2. Pattern: "1 yarim mln" or "bir yarim million"
  const yarimMlnMatch = text.match(/(\d+|bir|ikki|uch)?\s*yarim\s*(?:mln|million|milyon)/i);
  if (yarimMlnMatch) {
    const base = yarimMlnMatch[1] ? extractUzbekNumber(yarimMlnMatch[1]) || 1 : 0;
    return { amount: (base + 0.5) * 1000000, currency: 'UZS' };
  }

  // 3. Pattern: "2 mln 500 ming"
  const mlnMingMatch = text.match(/(\d+)\s*(?:mln|million|milyon)\s*(\d+)\s*(?:minglik|mingli|mingta|ming|minlik|minli|min|mng|k)/i);
  if (mlnMingMatch) {
    const mlnPart = parseInt(mlnMingMatch[1], 10) * 1000000;
    const mingPart = parseInt(mlnMingMatch[2], 10) * 1000;
    return { amount: mlnPart + mingPart, currency: 'UZS' };
  }

  // 4. Pattern: "50 ming 500"
  const mingTailMatch = text.match(/(\d+)\s*(?:ming|min|k)\s*(\d{2,3})(?!\d)/i);
  if (mingTailMatch) {
    const mingPart = parseInt(mingTailMatch[1], 10) * 1000;
    const tailPart = parseInt(mingTailMatch[2], 10);
    return { amount: mingPart + tailPart, currency: 'UZS' };
  }

  // 5. Pattern: "320k" or "85k"
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return { amount: Math.round(parseFloat(kMatch[1]) * 1000), currency: 'UZS' };
  }

  // 6. Spoken word numbers + ming: e.g. "ellik ming", "ellik mingli", "yigirma besh ming", "yuz ming"
  const wordMingRegex = /\b(bir|ikki|uch|to['ʻʼ`]?rt|tort|besh|olti|yetti|etti|sakkiz|to['ʻʼ`]?qqiz|toqqiz|o['ʻʼ`]?n|on|yigirma|o['ʻʼ`]?ttiz|ottiz|qirq|ellik|oltmish|yetmish|etmish|sakson|to['ʻʼ`]?qson|toqson|yuz|yarim)(?:\s+(bir|ikki|uch|to['ʻʼ`]?rt|tort|besh|olti|yetti|etti|sakkiz|to['ʻʼ`]?qqiz|toqqiz|o['ʻʼ`]?n|on|yigirma|o['ʻʼ`]?ttiz|ottiz|qirq|ellik|oltmish|yetmish|etmish|sakson|to['ʻʼ`]?qson|toqson|yuz))?\s*(?:minglik|mingli|mingta|ming|minlik|minli|min|mng)\b/i;
  const wordMingMatch = text.match(wordMingRegex);
  if (wordMingMatch) {
    const w1 = extractUzbekNumber(wordMingMatch[1]) || 0;
    const w2 = wordMingMatch[2] ? extractUzbekNumber(wordMingMatch[2]) || 0 : 0;
    const totalMultiplier = w1 + w2;
    if (totalMultiplier > 0) {
      return { amount: Math.round(totalMultiplier * 1000), currency: 'UZS' };
    }
  }

  // 7. Pattern: "50 ming", "50 mingli", "50 minli", "50 minglik", "145 ming", "85 minglik"
  const mingMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minglik|mingli|mingta|ming|minlik|minli|minti|min|mng)\b/i);
  if (mingMatch) {
    return { amount: Math.round(parseFloat(mingMatch[1]) * 1000), currency: 'UZS' };
  }

  // 8. Pattern: "2 mln" or "2 million" or "ikki million"
  const pureMlnMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mln|million|milyon)\b/i);
  if (pureMlnMatch) {
    return { amount: Math.round(parseFloat(pureMlnMatch[1]) * 1000000), currency: 'UZS' };
  }

  // 9. Plain numeric search (e.g., 145000, 85000, 50000, 30000, 3000)
  const allNums = text.match(/\b\d{4,9}\b/g);
  if (allNums && allNums.length > 0) {
    let num = parseInt(allNums[allNums.length - 1], 10);
    // In grocery stores, if speech engine transcribed e.g. 30224 where the first 2 digits are a round decade (10, 20, 30, 40, 50)
    // and ends in an unnatural number not divisible by 500, round to the decade:
    if (num >= 10000 && num <= 99999 && num % 1000 !== 0 && num % 500 !== 0) {
      const leadingDecade = Math.floor(num / 1000);
      if ([10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90].includes(leadingDecade)) {
        num = leadingDecade * 1000;
      }
    }
    return { amount: num, currency: 'UZS' };
  }

  // 10. Store shortcut: "Farhod aka 30", "Olimjon oka 50", "100 yoz" (between 10 and 999 where no unit like kg/ta is attached)
  const shortNumMatch = text.match(/\b([1-9]\d{1,2})\b(?!\s*(?:ta|dona|kg|kilo|litr|gr|qop|blok|metr|dast))/i);
  if (shortNumMatch) {
    const val = parseInt(shortNumMatch[1], 10);
    // In grocery stores, 10 to 999 means thousands of sums (e.g. 30 -> 30000, 50 -> 50000)
    if (val >= 10 && val <= 999) {
      return { amount: val * 1000, currency: 'UZS' };
    }
  }

  // 11. Standalone single spoken numbers like "o'ttiz", "ellik", "yigirma"
  const standaloneWordMatch = text.match(/\b(o['ʻʼ`]?n|on|yigirma|o['ʻʼ`]?ttiz|ottiz|qirq|ellik|oltmish|yetmish|etmish|sakson|to['ʻʼ`]?qson|toqson|yuz)\b/i);
  if (standaloneWordMatch) {
    const val = extractUzbekNumber(standaloneWordMatch[1]);
    if (val && val >= 10) {
      return { amount: val * 1000, currency: 'UZS' };
    }
  }

  return { amount: 0, currency: 'UZS' };
}

// ── 4. EXTRACT CUSTOMER NAME & HONORIFICS ─────────────────────

function stripGrammarSuffixes(word: string): string {
  let w = word.trim().toLowerCase().replace(/[ʻʼ`´]/g, "'");

  // If the word starts with honorifics: okaga, okamga, okasiga, akaga, akamga
  if (/^(?:oka|aka)(?:ga|mga|mizga|siga|cha|xon)?$/.test(w)) {
    return 'aka';
  }
  if (/^opa(?:ga|mga|mizga|siga|xon)?$/.test(w)) {
    return 'opa';
  }
  if (/^(?:toga|tog'a)(?:ga|mga|siga)?$/.test(w)) {
    return "tog'a";
  }
  if (/^amaki(?:ga|mga|siga)?$/.test(w)) {
    return 'amaki';
  }

  // If the word itself is an exact honorific (e.g. "aka", "uka", "qassob"), do not strip
  if (HONORIFICS.includes(w)) {
    return w;
  }

  // Protected name list
  const PRESERVE_NAMES = new Set([
    'ali', 'vali', 'guli', 'ziyoda', 'saida', 'hamida', 'farida', 'mavluda',
    'shahzoda', 'dilnoza', 'dilshod', 'otabek', 'katta', 'bolta', 'balka'
  ]);
  if (PRESERVE_NAMES.has(w)) {
    return w;
  }

  // Remove Uzbek plural and possessive/case suffixes (only if length >= 6)
  if (w.length >= 6) {
    w = w.replace(/(?:larga|larning|lardan|lardi|larda|larniki|niki)$/i, '');
  }

  // Remove dative/accusative/genitive/ablative case markers (e.g. Alisherga -> Alisher, Farhoddan -> Farhod)
  // We do NOT strip 'da' here to prevent breaking female names (Ziyoda, Saida, Hamida, Shahzoda)
  if (w.length >= 5 && !PRESERVE_NAMES.has(w)) {
    w = w.replace(/(?:ga|ka|qa|dan|tan|ning|ni)$/i, '');
  }
  return w;
}


export function extractCustomerName(rawText: string): string {
  const originalWords = rawText
    .replace(/[,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');

  const cleanedWords = originalWords.map((w) => w.replace(/[ʻʼ`´]/g, "'").toLowerCase());

  // 1. Look for [Name] + [Honorific/Title] pairs
  // e.g. "abu qossopga" -> "Abu qassob", "jasur akaga" -> "Jasur aka", "nodira opaga" -> "Nodira opa"
  for (let i = 0; i < cleanedWords.length; i++) {
    const rawWord = originalWords[i];
    const cleanWord = normalizeWord(stripGrammarSuffixes(cleanedWords[i]));

    if (STOP_WORDS.has(cleanWord) || /^\d+$/.test(cleanWord) || cleanWord.length < 2) {
      continue;
    }

    // Check if next word is an honorific/title
    if (i + 1 < cleanedWords.length) {
      const nextClean = normalizeWord(stripGrammarSuffixes(cleanedWords[i + 1]));
      if (HONORIFICS.includes(nextClean)) {
        const titleFormatted = nextClean.toLowerCase();
        const firstName = rawWord.charAt(0).toUpperCase() + rawWord.slice(1).replace(/[,.?!]/g, '').toLowerCase();
        const capFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        return `${capFirstName} ${titleFormatted}`;
      }
    }

    // Check if current word itself is a title/profession (e.g. "qassobga 50 ming...", "ustaga 100 ming...")
    if (HONORIFICS.includes(cleanWord)) {
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    }

    // Check if current word ends with an honorific (e.g. "Akmalaka", "Nodiraopa")
    for (const h of HONORIFICS) {
      if (cleanWord.endsWith(h) && cleanWord.length > h.length + 2) {
        const baseName = cleanWord.slice(0, -h.length);
        if (!STOP_WORDS.has(baseName)) {
          const capBase = baseName.charAt(0).toUpperCase() + baseName.slice(1);
          return `${capBase} ${h}`;
        }
      }
    }

    // Check if it's a standalone capitalized name (e.g. "Sardor 85 ming olib ketdi")
    if (
      /^[A-ZА-ЯЁ][a-zа-яё']+$/.test(rawWord) &&
      !STOP_WORDS.has(cleanWord) &&
      !COMMON_GROCERIES.includes(cleanWord)
    ) {
      return rawWord.replace(/[,.?!]/g, '');
    }
  }

  // Fallback: check first non-stop word
  for (const w of originalWords) {
    const c = normalizeWord(stripGrammarSuffixes(w.toLowerCase().replace(/[ʻʼ`´]/g, "'")));
    if (!STOP_WORDS.has(c) && !/^\d+$/.test(c) && c.length >= 2 && !COMMON_GROCERIES.includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }

  return 'Mijoz';
}

// ── 5. EXTRACT ITEMS & UNITS ──────────────────────────────────

export function extractItems(rawText: string): NasiyaItem[] {
  const text = cleanUzbekText(rawText);
  const items: NasiyaItem[] = [];

  // Pattern 1: [quantity] [unit] [item_name]
  // e.g. "2 ta non", "1 kg go'sht", "1 qop un", "5 litr yog'"
  const itemPattern = /(\d+(?:\.\d+)?|\b(?:bir|ikki|uch|to'rt|tort|besh|olti|yetti|etti|sakkiz|to'qqiz|toqqiz|o'n|on|yarim)\b)\s*(ta|dona|kg|kilo|kilogramm|gr|gramm|qop|blok|litr|l|pochka|karobka|balka)?\s*([a-z'ʻʼ`]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(text)) !== null) {
    const rawQty = match[1];
    const rawUnit = match[2]?.toLowerCase();
    const rawName = match[3]?.toLowerCase();
    const normName = normalizeWord(rawName);

    const isKnownGrocery = COMMON_GROCERIES.some((g) => normName.includes(g) || g.includes(normName));
    if (!isKnownGrocery && !rawUnit) {
      continue;
    }

    if (STOP_WORDS.has(normName) && !COMMON_GROCERIES.includes(normName)) {
      continue;
    }

    const qty = extractUzbekNumber(rawQty) || 1;
    const unit = rawUnit ? UNITS_MAP[rawUnit] || rawUnit : 'ta';

    items.push({
      name: normName,
      quantity: qty,
      unit,
    });
  }

  // Pattern 2: [amount] minglik/mingli [item] e.g. "50 mingli go'sh", "20 minglik non"
  if (items.length === 0) {
    const priceItemPattern = /(?:minglik|mingli|minli|minlik|ming|min)\s+([a-z'ʻʼ`]+)/i;
    const piMatch = text.match(priceItemPattern);
    if (piMatch) {
      const candidate = normalizeWord(piMatch[1]);
      if (COMMON_GROCERIES.some((g) => candidate.includes(g) || g.includes(candidate))) {
        items.push({
          name: candidate,
          quantity: 1,
          unit: 'ta',
        });
      }
    }
  }

  // Pattern 3: Standalone grocery mentions if none found
  if (items.length === 0) {
    for (const g of COMMON_GROCERIES) {
      const normG = normalizeWord(g);
      if (text.includes(normG) && !items.some((it) => it.name === normG)) {
        items.push({
          name: normG,
          quantity: 1,
          unit: 'ta',
        });
      }
    }
  }

  return items;
}

// ── 6. DETECT ACTION TYPE & PAYMENT STATUS ────────────────────

export function detectAction(text: string): {
  action: NasiyaActionType;
  is_partial_payment: boolean;
  confidence: number;
} {
  const t = cleanUzbekText(text);

  // 1. Balans so'rash
  const balanceKeywords = [
    "qancha bo'ldi", 'qancha boldi', 'qarzi qancha', 'qancha qoldi',
    'hisobi qancha', 'nasiyasi qancha', 'nasiyalar qancha', 'qancha nasiya',
    'necha pul bo', 'qancha boʻldi'
  ];
  if (balanceKeywords.some((kw) => t.includes(kw))) {
    return { action: 'balans_sorash', is_partial_payment: false, confidence: 0.98 };
  }

  // 2. Nasiya to'lash
  const paymentKeywords = [
    'tashlab ketdi', 'tashab ketti', 'tashab ketdi', 'berib ketdi',
    "to'ladi", 'toladi', 'uzdi', 'qarzini berdi', 'yopdi', 'daftari yopildi',
    'hisob-kitob qildi', 'qaytardi', 'olib keldi berdi', 'olib kelib berdi',
    'olib keldi', 'qarzidan'
  ];
  if (paymentKeywords.some((kw) => t.includes(kw))) {
    const isFullSettlement = t.includes('yopildi') || t.includes('toʻliq') || t.includes("to'liq") || t.includes('butkul');
    const isPartial = t.includes('qarzidan') || t.includes('qismini') || !isFullSettlement;

    return {
      action: 'nasiya_tolash',
      is_partial_payment: isPartial,
      confidence: 0.95,
    };
  }

  // 3. Nasiya berish
  const debtGivenKeywords = [
    'nasiya', 'nasiyaga', 'daftariga yoz', "yozib qo'y", 'yozib qoy',
    'yozvordim', 'yozib yubordim', 'oldi', 'olib ketdi', 'olib ketti',
    'keyin beradi', 'ertaga beradi', 'oyligida beradi', 'beraman dedi',
    'bervor', 'bervordim', 'narsa oldi', 'yozib qoying', "yozib qo'ying"
  ];
  if (debtGivenKeywords.some((kw) => t.includes(kw))) {
    return { action: 'nasiya_berish', is_partial_payment: false, confidence: 0.96 };
  }

  // Default fallback if amounts/items exist
  return { action: 'nasiya_berish', is_partial_payment: false, confidence: 0.8 };
}

// ── 7. DUE DATE & CONDITION EXTRACTION ────────────────────────

export function extractDueCondition(
  text: string,
  refDate = new Date()
): { due_date: string | null; due_condition: string | null } {
  const t = cleanUzbekText(text);

  // 1. Tomorrow ("ertaga")
  if (t.includes('ertaga') || t.includes('ertagacha')) {
    const tomorrow = new Date(refDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      due_date: getTashkentDateString(tomorrow),
      due_condition: 'ertaga',
    };
  }

  // 2. Tonight ("kechga", "kechqurun")
  if (t.includes('kechga') || t.includes('kechqurun')) {
    return {
      due_date: getTashkentDateString(refDate),
      due_condition: 'kechga',
    };
  }

  // 3. "oyligida" or "oylikda"
  if (t.includes('oyligida') || t.includes('oylik chiqqanda') || t.includes('oylikda')) {
    return {
      due_date: null,
      due_condition: 'oyligida',
    };
  }

  // 4. "pensiyada"
  if (t.includes('pensiyada') || t.includes('pensiya olganda')) {
    return {
      due_date: null,
      due_condition: 'pensiyada',
    };
  }

  // 5. "hafta oxirida"
  if (t.includes('hafta oxirida') || t.includes('yakshanbagacha') || t.includes('shanbagacha')) {
    const sunday = new Date(refDate);
    const day = sunday.getDay();
    const diff = (7 - day) % 7 || 7;
    sunday.setDate(sunday.getDate() + diff);
    return {
      due_date: getTashkentDateString(sunday),
      due_condition: 'hafta oxirida',
    };
  }

  // 6. "N kunda" e.g. "10 kunda"
  const daysMatch = t.match(/(\d+)\s*kunda/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const future = new Date(refDate);
    future.setDate(future.getDate() + days);
    return {
      due_date: getTashkentDateString(future),
      due_condition: `${days} kunda`,
    };
  }

  return { due_date: null, due_condition: null };
}

// ── 8. MAIN ENTRY: PARSE TURBO NASIYA TEXT (<1ms) ─────────────

export function parseTurboNasiyaText(
  rawText: string,
  options?: { referenceDate?: Date }
): TurboNasiyaResult {
  const startTime = performance.now();
  const refDate = options?.referenceDate || new Date();
  const todayStr = getTashkentDateString(refDate);

  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      action: 'umumiy_savol',
      transactions: [],
      overall_confidence: 0,
      raw_text: rawText,
    };
  }

  // 1. Detect Action
  const { action, is_partial_payment, confidence: actionConfidence } = detectAction(rawText);

  // 2. Extract Customer Name
  const customerName = extractCustomerName(rawText);

  // 3. Extract Items
  const items = action === 'balans_sorash' ? [] : extractItems(rawText);

  // 4. Resolve Compound Amount
  const { amount, currency } = resolveCompoundNumbers(rawText);

  // 5. Extract Due Date and Conditions
  const { due_date: extractedDueDate, due_condition: extractedCondition } = extractDueCondition(rawText, refDate);
  // If timing is not specified, default to that day, that moment
  const due_date = extractedDueDate || todayStr;
  const due_condition = extractedCondition || 'Bugun, shu vaqtda';

  // Confidence Calculation
  let confidence = actionConfidence;
  if (customerName === 'Mijoz') confidence -= 0.15;
  if (action !== 'balans_sorash' && amount === 0) confidence -= 0.2;
  confidence = Math.max(0.2, Math.min(1.0, confidence));

  const transaction: NasiyaTransaction = {
    action,
    customer_name: customerName,
    customer_phone: null,
    amount,
    currency,
    items,
    due_date,
    due_condition,
    date: todayStr,
    note: rawText.trim(),
    confidence,
    is_partial_payment: action === 'nasiya_tolash' ? is_partial_payment : undefined,
  };

  const elapsed = performance.now() - startTime;
  // Execution is strictly <1ms in typical runtime!

  return {
    success: true,
    action,
    transactions: [transaction],
    overall_confidence: confidence,
    raw_text: rawText,
    execution_ms: Math.round(elapsed * 100) / 100,
  };
}
