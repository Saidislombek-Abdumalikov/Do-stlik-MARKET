// Google Gemini AI Service for Store Nasiya Engine

export interface GeminiNasiyaParsed {
  customer_name: string;
  amount: number;
  items: string;
  due_condition: string;
  phone: string | null;
}

export async function parseNasiyaWithGemini(userText: string): Promise<GeminiNasiyaParsed | null> {
  const text = userText.trim();
  if (!text) return null;

  const apiKey =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_GEMINI_API_KEY
      ? String(import.meta.env.VITE_GEMINI_API_KEY).trim()
      : '';

  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY topilmadi. Turbo lokal NLP dvijogi ishlatiladi.');
    return null;
  }

  const prompt = `Sen O'zbekiston do'konlari uchun sof o'zbek tilida ishlaydigan "Nasiya Daftari" AI tahlilchisisan.
Sening vazifang: Sotuvchi yoki kassir aytgan gapni diqqat bilan eshitish, chuqur tahlil qilish, mantiqan guruhlash va to'g'ri JSON formatida chiqarish.

TAHLIL VA GURUHLASH BOSQICHLARI:
1. MIJOZ ISMI / LAQABI:
   - "Farhod oka", "Farxod oka", "Farhod okaga", "Farxod okaga" -> "Farhod aka"
   - "Abu qossop", "Qossopga", "Qassob" -> "Qassob" yoki agar ism bo'lsa "Abu qassob"
   - "Akmal akamga", "Akmal oka" -> "Akmal aka"
   - "Ustam", "Ustaga", "Sardor usta" -> "Sardor usta"
   - "Qo'shni", "Nodira opa", "Olim aka" kabi hurmat so'zlarini to'g'ri normallashtir.

2. SUMMA (PUL):
   - Xalq tilidagi barcha summalar aniq so'mda son qilib hisoblansin:
   - "30 000" yoki "o'ttiz ming" -> 30000 (hech qachon 3000 emas!)
   - "50 ming", "ellik ming" -> 50000
   - "145 ming" -> 145000
   - "1 yarim million", "1.5 mln" -> 1500000
   - "Farhod aka 30" (do'konda 10-999 oralig'ida birliksiz aytilsa minglik deb tushun) -> 30000

3. MAHSULOTLAR (ITEMS):
   - Masalan: "2 ta non, 1 kg go'sht", "yog', shakar", "50 mingli go'sh" -> items: "go'sht"

4. MUDDAT (DUE_CONDITION):
   - "ertaga", "bugun kechga", "3 kunda", "hafta oxirida", "oylikda", "pensiyada" kabi shartlarni ajratib ol.

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
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let response: Response | null = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
      }
    }

    if (!response || !response.ok) {
      console.warn('Gemini API so‘rovi muvaffaqiyatsiz bo‘ldi, lokal NLP ishlatiladi.');
      return null;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText) as GeminiNasiyaParsed;
    return {
      customer_name: parsed.customer_name || 'Mijoz',
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
