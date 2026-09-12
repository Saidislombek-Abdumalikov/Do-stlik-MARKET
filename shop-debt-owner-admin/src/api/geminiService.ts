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

  const prompt = `Sen O'zbek do'konlari uchun "Nasiya Daftari" AI yordamchisisan.
Foydalanuvchi do'konda o'zbek tilida, xalqona lahjalarda (masalan "qossob", "akfachi", "rosil", "50 mingli go'sh", "ertaga beradi") gapirishi mumkin.
Matnni tahlil qilib, faqat quyidagi JSON formatida qaytar:
{
  "customer_name": "Mijozning to'g'ri ismi yoki unvoni (masalan: Abu qassob, Rasul akfa, Olimjon aka)",
  "amount": 50000,
  "items": "olingan tovarlar (masalan: 1 kg go'sht, 2 ta non)",
  "due_condition": "ertaga",
  "phone": "agar telefon raqami aytilgan bo'lsa raqam, aks holda null"
}

Foydalanuvchi aytgan gap: "${text.replace(/"/g, '\\"')}"`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
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

    if (!response.ok) {
      console.warn('Gemini API request failed with status:', response.status);
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
