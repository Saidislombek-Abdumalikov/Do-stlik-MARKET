# DO'STLIK MARKET — SHOP DEBT OWNER ADMIN PANEL

Ushbu loyiha **"Do‘stlik MARKET"** do‘koni egasi uchun maxsus yaratilgan mustaqil, soddalashtirilgan va xavfsiz veb boshqaruv panelidir.

---

## 🚀 Texnologiyalar
* **Frontend**: React 18, Vite 6, TypeScript 5
* **Dizayn & Uslub**: Tailwind CSS (Professional, toza va jiddiy biznes mavzusi)
* **Telefon Kiritish**: O‘zbekiston formati bo‘yicha avtomatik `+998` prefiksi va bo‘shliqlar
* **Ma’lumotlar & Kesh**: TanStack React Query v5
* **Grafiklar & Vizualizatsiya**: Recharts (Qarzlar dinamikasi va nisbati)
* **Ikonkalar**: Lucide React
* **Ma’lumotlar bazasi**: Supabase (PostgreSQL, Row Level Security, Realtime, Tranzaksiyaviy RPC) + Offline `localStorage` to‘liq rejim

---

## ⚡ Qanday ishga tushiriladi?

### 1. Dasturni ishga tushirish:
```bash
cd shop-debt-owner-admin
npm run dev
```
Dastur `http://localhost:3000` manzilida ochiladi.

### 2. Standart kirish (Faqat telefon va parol, email yo‘q!):
* **Telefon raqami:** `+998 90 123 45 67` (yoki shunchaki `90 123 45 67`)
* **Parol:** `dostlik2026`

---

## 📱 Soddalashtirilgan Telefon Raqami va Emaillarsiz Tizim
* **Barcha murakkab emaillar olib tashlandi**: Ishchi qo‘shishda ham, tizimga kirishda ham hech qanday email so‘ralmaydi.
* **Avtomatik `+998` prefiksi**: 
  * Kirish sahifasida
  * Yangi ishchi qo‘shishda
  * Yangi qarz kiritishda
  * Qarzni tahrirlashda
  Foydalanuvchi faqat 9 ta raqamni kiritadi (masalan: `90 123 45 67`), tizim esa uni avtomatik tarzda `+998 90 123 45 67` formatida to‘g‘rilab saqlaydi.

---

## 🛡️ Supabase Jonli Bazaga Ulanish (Keyinchalik)
Kelgusida ushbu chatda Supabase ma’lumotlaringizni bergach:
1. Biz faqat `.env` fayliga siz bergan URL va Anon kalitni qo‘yamiz.
2. Dastur kodlariga hech qanday o‘zgartirish kiritilmaydi.
3. Dastur avtomatik `localStorage` dan jonli Supabase bazasiga o‘tib ishlayveradi.
