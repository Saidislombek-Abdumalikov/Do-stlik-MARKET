// Google Gemini AI Service for Store Nasiya Engine

export interface GeminiNasiyaParsed {
  customer_name: string;
  amount: number;
  items: string;
  due_condition: string;
  phone: string | null;
}

export const getGeminiApiKey = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_GEMINI_API_KEY) {
    return String(import.meta.env.VITE_GEMINI_API_KEY).trim();
  }
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('dostlik_VITE_GEMINI_API_KEY');
    if (stored) return stored.trim();
  }
  return '';
};

export async function parseNasiyaWithGemini(
  userText: string,
  knownCustomerNames?: string[]
): Promise<GeminiNasiyaParsed | null> {
  const text = userText.trim();
  if (!text) return null;

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY topilmadi. Turbo lokal NLP dvijogi ishlatiladi.');
    return null;
  }

  const customersContext =
    knownCustomerNames && knownCustomerNames.length > 0
      ? `\nDO'KONDAGI MAVJUD MIJOZLAR RO'YXATI (Agar aytilgan ism yoki ovoz xatosi shulardan biriga yaqin bo'lsa, mosini tanla):\n[${knownCustomerNames.slice(0, 30).join(', ')}]`
      : '';

  const prompt = `Sen O'zbekiston do'konlari uchun sof o'zbek tilida ishlaydigan "Nasiya Daftari" AI tahlilchisisan.
Sening vazifang: Sotuvchi yoki kassir aytgan gapni (ovozdan olingan matnni) diqqat bilan eshitish, chuqur tahlil qilish, mantiqan guruhlash va to'g'ri JSON formatida chiqarish.
${customersContext}

TAHLIL VA GURUHLASH QOIDALARI:
1. MIJOZ ISMI / KASBI / LAQABI:
   - Ovozli kiritish (Speech-to-Text) xatolarini to'g'rilash:
     - "sherzod akfa", "sherzod akfashik", "sherzod akfachi" -> "Sherzod akfachi" (Akfa ustalari / romchilar)
     - "Farhod oka", "Farxod oka", "Farhod okaga", "Farxod okaga", "farxod o'quv", "farhod oquv" -> "Farhod aka"
     - "Abu qossop", "Qossopga", "Qassob", "Abu qassob" -> "Abu qassob" yoki "Qassob"
     - "Akmal akamga", "Akmal oka" -> "Akmal aka"
     - "Ustam", "Ustaga", "Sardor usta" -> "Sardor usta"
   - Agar sotuvchi mijoz ismini aytmagan bo'lsa (masalan: "30 000 so'm non" yoki "50 ming") -> customer_name: "Noma'lum mijoz"
   - Agar biror hurmat so'zi yoki kasb (oka, aka, opa, tog'a, usta, akfachi, qassob) bo'lsa, to'g'ri normallashtir.

2. SUMMA (PUL) VA OVOZ BUZILISHLARI:
   - Xalq tilidagi barcha summalar aniq so'mda son qilib hisoblansin:
   - Ovoz yozishda raqamlar buzilib "30224 030", "30 224 030", "30224", "30 030" kabi g'alati sonlar chiqsa, bular "30 ming" (30 000 so'm) deb aytilgan! Do'konda hech qachon 30224 so'm qarz bo'lmaydi. Buni darhol to'g'ri 30000 deb hisobla.
   - "30 000", "30.000", "30,000", "30 ming", "o'ttiz ming", "30 ming berishi kerak", "30224 030 berish kerak" -> 30000 (HECH QACHON 3000 yoki 30224030 emas!)
   - "50 ming", "ellik ming", "50.000" -> 50000
   - "145 ming", "145.000" -> 145000
   - "1 yarim million", "1.5 mln" -> 1500000
   - "30 berish kerak", "Farhod aka 30" -> 30000

3. MAHSULOTLAR (ITEMS):
   - Masalan: "2 ta non, 1 kg go'sht", "yog', shakar", "50 mingli go'sh" -> items: "2 ta non, 1 kg go'sht"

4. MUDDAT (DUE_CONDITION):
   - "ertaga", "bugun kechga", "3 kunda", "hafta oxirida", "oylikda", "pensiyada" kabi shartlarni ajratib ol.
   - "berishi kerak", "berish kerak", "beradi" so'zlari qarz olinganini bildiradi (nasiya).

FAQAT va FAQAT quyidagi JSON formatida javob ber:
{
  "customer_name": "Farhod aka",
  "amount": 30000,
  "items": "olingan tovarlar",
  "due_condition": "Bugun",
  "phone": null
}

Sotuvchining gapi: "${text.replace(/"/g, '\\"')}"`;

  try {
    // Official working Gemini models with high throughput and active quota
    const models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
    let response: Response | null = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        });
        if (res.ok) {
          response = res;
          break;
        } else {
          console.warn(`Gemini model ${model} returned ${res.status}, trying fallback model...`);
        }
      } catch (e) {
        console.warn(`Gemini fetch error on ${model}:`, e);
      }
    }

    if (!response || !response.ok) {
      console.warn('Gemini API so‘rovi muvaffaqiyatsiz bo‘ldi, lokal Turbo NLP ishlatiladi.');
      return null;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText) as GeminiNasiyaParsed;
    return {
      customer_name: parsed.customer_name || 'Noma‘lum mijoz',
      amount: Number(parsed.amount) || 0,
      items: parsed.items || '',
      due_condition: parsed.due_condition || 'Bugun',
      phone: parsed.phone || null,
    };
  } catch (err) {
    console.error('Gemini parsing error:', err);
    return null;
  }
}
