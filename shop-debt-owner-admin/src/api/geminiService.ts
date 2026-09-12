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

  const prompt = `Sen O'zbek do'konlari uchun "Nasiya Daftari" aqlli AI yordamchisisan.
Sotuvchi yoki kassir do'konda o'zbek tilida, xalqona lahja va shevalarda gapiradi.
Masalan:
- "Farhod oka 30 000" yoki "Farxod okaga 30 000" -> customer_name: "Farhod aka", amount: 30000
- "Qossobga 50 ming go'sh" -> customer_name: "Sardor qassob", amount: 50000, items: "go'sht"
- "Akmal akamga 120 000" -> customer_name: "Akmal aka", amount: 120000
- "Olim aka 25 ming" -> customer_name: "Olim aka", amount: 25000

QOIDALAR:
1. "oka", "okam", "okaga", "akamga" so'zlari hurmat yuzasidan "aka" deb yozilsin.
2. "Farxod" -> "Farhod".
3. Summa doim so'mda son qilib (masalan 30000) chiqarilsin. 30 000 yoki o'ttiz ming 30000 bo'ladi (3000 emas!).
4. Javobni FAQAT quyidagi JSON formatida qaytar:
{
  "customer_name": "Farhod aka",
  "amount": 30000,
  "items": "olingan tovarlar",
  "due_condition": "ertaga",
  "phone": null
}

Foydalanuvchi aytgan gap: "${text.replace(/"/g, '\\"')}"`;

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
