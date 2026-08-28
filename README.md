# 📱 کی‌داره | سوپراپلیکیشن خرید حضوری

<div align="center">

**ببین کی داره؟ حضوری بگیر**

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/Tahmoures54/kidareh)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18.3-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-3178c6.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/vite-6.2-646cff.svg)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-ready-purple.svg)](#-pwa)

سوپراپلیکیشن سریع و هوشمند برای پیدا کردن کالا در فروشگاه‌های اطراف و خرید حضوری

[نمایش زنده](https://kidareh.com) · [Liara](https://kidareh.liara.run) · [گزارش مشکل](https://github.com/Tahmoures54/kidareh/issues)

</div>

---

## 📋 فهرست مطالب

- [درباره پروژه](#-درباره-پروژه)
- [ویژگی‌های کلیدی](#-ویژگی‌های-کلیدی)
- [اسکرین‌شات‌ها](#-اسکرین‌شات‌ها)
- [تکنولوژی‌ها](#️-تکنولوژی‌ها)
- [معماری](#️-معماری)
- [پیش‌نیازها](#-پیش‌نیازها)
- [نصب و راه‌اندازی](#-نصب-و-راه‌اندازی)
- [ساختار پروژه](#-ساختار-پروژه)
- [متغیرهای محیطی](#-متغیرهای-محیطی)
- [اسکریپت‌ها](#-اسکریپت‌ها)
- [API](#-api)
- [PWA](#-pwa)
- [Deploy](#-deploy)
- [امنیت](#-امنیت)
- [تست و کیفیت](#-تست-و-کیفیت)
- [نقشه راه](#-نقشه-راه)
- [مشارکت](#-مشارکت)
- [مجوز و پشتیبانی](#-مجوز-و-پشتیبانی)

---

## 🎯 درباره پروژه

**کی‌داره** پلتفرمی برای ارتباط مستقیم خریدار و فروشندهٔ حضوری است. هدف: شفافیت موجودی و قیمت در فروشگاه‌های اطراف، چت فوری با فروشنده، و رفتن حضوری برای خرید — بدون انتظار ارسال آنلاین.

### چرا کی‌داره؟

| مشکل رایج | راه‌حل کی‌داره |
|-----------|----------------|
| نمی‌دانم فروشگاه اطراف چه دارد | جستجوی لحظه‌ای + نقشه تعاملی |
| باید زنگ بزنم بپرسم موجود است یا نه | چت آنلاین با فروشنده (Socket.IO) |
| قیمت‌ها نامشخص است | قیمت شفاف و به‌روز روی کارت کالا |
| نمی‌دانم فروشگاه معتبر است یا نه | تایید فروشگاه، نشان‌ها، گزارش تخلف |
| باید حضوری بروم ببینم | عکس، توضیح، مسیر روی نقشه |

### تمایزها

- 🧠 دستیار هوشمند با **Google Gemini** (چت و تولید توضیح کالا)
- 📍 جستجوی نقشه‌محور با **Leaflet** و فیلتر شهر / فاصله
- 💬 پیام‌رسانی Real-time با احراز هویت مبتنی بر Cookie
- 📱 **PWA** قابل نصب بدون استور
- 💰 سیستم معرفی (Referral) و کیف پول
- 🔒 Hardening تولیدی: کوکی `__Host-`، Origin check، rate limit، Helmet

---

## ⭐ ویژگی‌های کلیدی

### برای خریداران

| قابلیت | توضیح |
|--------|--------|
| 🗺️ نقشه و جستجو | فروشگاه/کالای اطراف، فیلتر دسته و محدوده |
| 🤖 دستیار AI | پرسش فارسی، پیشنهاد جستجو، grounding از دیتابیس |
| 💬 چت | اتاق گفتگو، تایپینگ، خوانده‌شدن پیام |
| 🔖 ذخیره‌شده‌ها | علاقه‌مندی، فیلتر کاهش قیمت، حذف گروهی |
| 🎁 معرفی دوستان | لینک معرفی، موجودی، برداشت |

### برای فروشندگان

| قابلیت | توضیح |
|--------|--------|
| 📊 پنل فروشنده | کالا، موجودی، آمار بازدید |
| 🏪 پروفایل فروشگاه | آدرس، نقشه، دسته‌بندی، تصویر |
| 🎯 پروموشن | بنر و پکیج‌های دیده شدن |
| 💳 پرداخت | درگاه پی‌پینگ، callback امن |

### برای ادمین و پشتیبانی

- داشبورد آمار کاربران، فروشگاه‌ها، کالاها و تراکنش‌ها
- تایید / رد کالا (moderation)
- مدیریت گزارش‌ها و تیکت پشتیبانی
- پیوست خصوصی تیکت با بررسی امضای فایل

---

## 📸 اسکرین‌شات‌ها

<div align="center">

<img src="public/screenshots/mobile-2.png" width="240" alt="صفحه اصلی موبایل">
<img src="public/screenshots/m2.png" width="240" alt="جستجو">

</div>

> اسکرین‌شات‌های بیشتر در پوشه `public/screenshots/`

---

## 🛠️ تکنولوژی‌ها

نسخه‌ها بر اساس `package.json` فعلی (v1.2.0):

### Frontend

| تکنولوژی | نسخه | نقش |
|----------|------|-----|
| React | 18.3 | UI |
| TypeScript | ~5.8 | Type safety |
| Vite | 6.2 | Build / dev server |
| Tailwind CSS | 4.1 | استایل |
| Framer Motion / Motion | 12.x | انیمیشن |
| TanStack React Query | 5.x | داده سمت کلاینت |
| React Router | 6.28 | مسیریابی |
| Leaflet + react-leaflet | 1.9 / 4.2 | نقشه |
| Socket.IO Client | 4.8 | Real-time |
| Zod + React Hook Form | 3.x / 7.x | اعتبارسنجی فرم |
| vite-plugin-pwa | 0.21 | PWA |

### Backend

| تکنولوژی | نسخه | نقش |
|----------|------|-----|
| Node.js | ≥20 | Runtime |
| Express | 4.21 | HTTP API |
| better-sqlite3 | 12.x | دیتابیس |
| Socket.IO | 4.8 | WebSocket |
| JWT + cookie-parser | 9.x | نشست |
| Helmet + rate-limit | 8.x / 8.x | امنیت |
| Winston + Morgan | 3.x / 1.x | لاگ |
| ioredis | 5.x | کش (اختیاری) |
| Google Generative AI | 0.21 | Gemini |
| Kavenegar / Melipayamak | — | OTP/SMS |
| PayPing | — | پرداخت |

### کیفیت و عملیات

- Vitest · ESLint 9 · Prettier · Husky · lint-staged
- Docker · docker-compose · Liara · Vercel config
- اسکریپت‌های `release:verify`، بکاپ و migrate

---

## 🏗️ معماری

```text
┌─────────────────────┐
│  Browser / PWA      │
│  React + Vite       │
└──────────┬──────────┘
           │ HTTP + WebSocket
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  Express (Node 20)  │────▶│  SQLite          │
│  REST + Socket.IO   │     │  better-sqlite3  │
└──────────┬──────────┘     └──────────────────┘
           │
           ├─▶ Redis (اختیاری، کش جستجو/OTP)
           ├─▶ Gemini AI
           ├─▶ SMS (Kavenegar)
           ├─▶ PayPing
           └─▶ آپلود محلی / S3
```

- **فرانت و بک در یک ریپو (monolith)**؛ در production فایل استاتیک از `dist/public` سرو می‌شود.
- احراز هویت مرورگر: **فقط Cookie** (HttpOnly؛ در production با پیشوند `__Host-`).
- چت: همان کوکی نشست برای Socket.IO.

---

## 📦 پیش‌نیازها

- **Node.js** ≥ 20 و **npm** ≥ 10
- (اختیاری) Docker و Docker Compose
- (اختیاری) Redis برای کش production
- کلیدهای: `JWT_SECRET`، `COOKIE_SECRET`، SMS، Gemini، PayPing

---

## 🚀 نصب و راه‌اندازی

### ۱) کلون و نصب

```bash
git clone https://github.com/Tahmoures54/kidareh.git
cd kidareh
npm install
```

### ۲) متغیرهای محیطی

```bash
cp .env.example .env
# مقادیر JWT_SECRET و COOKIE_SECRET را با رشته تصادفی بلند پر کنید
```

حداقل برای توسعه محلی:

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
JWT_SECRET=dev-secret-at-least-32-characters-long!!
COOKIE_SECRET=dev-cookie-secret-at-least-32-chars!!
DATABASE_URL=./app.db
VITE_API_URL=http://localhost:3000
SHOW_OTP_IN_DEV=true
```

### ۳) اجرای توسعه (فرانت + بک همزمان)

```bash
npm run dev
```

- کلاینت: معمولاً `http://localhost:5173`
- API و Socket: `http://localhost:3000`

### ۴) Build و اجرای production محلی

```bash
npm run build
npm run start:prod
```

### ۵) Docker

```bash
docker compose up --build
```

جزئیات بیشتر: [`DOCKER_GUIDE.md`](./DOCKER_GUIDE.md) · [`QUICK_START.md`](./QUICK_START.md)

---

## 📁 ساختار پروژه

```text
kidareh/
├── src/                    # Frontend (React + TS)
│   ├── components/         # UI مشترک، Map، کارت کالا
│   ├── pages/              # صفحات (Home, Search, Saved, Chat, ...)
│   ├── context/            # Auth، Settings، Support
│   ├── hooks/              # hooks سفارشی
│   ├── services/           # کلاینت API
│   ├── utils/              # امنیت، پرفورمنس، analytics
│   └── data/               # شهرها و دسته‌بندی‌ها
├── server/                 # Backend (Express + TS)
│   ├── routes/             # auth, products, stores, messages, ai, ...
│   ├── services/           # جستجو، کش، پروموشن، storage
│   ├── middleware/         # auth
│   ├── db.ts               # SQLite schema و helpers
│   └── server.ts           # bootstrap سرور
├── public/                 # استاتیک، manifest، service worker، screenshots
├── tests/                  # Vitest (frontend + backend)
├── scripts/                # migrate، backup، release-verify، start-prod
├── docker-compose.yml
├── Dockerfile
├── liara.json
└── package.json
```

---

## 🔐 متغیرهای محیطی

فایل مرجع: [`.env.example`](./.env.example)

| گروه | متغیرهای مهم |
|------|----------------|
| اپ | `NODE_ENV`, `PORT`, `HOST`, `APP_URL` |
| امنیت | `JWT_SECRET`, `COOKIE_SECRET`, `ADMIN_SYSTEM_TOKEN` |
| ادمین | `ADMIN_PHONE` |
| دیتابیس | `DATABASE_URL` / `DB_PATH`, بکاپ خودکار |
| SMS | `KAVENEGAR_API_KEY`, `KAVENEGAR_TEMPLATE`, `SHOW_OTP_IN_DEV` |
| AI | `GEMINI_API_KEY` یا `GOOGLE_GEMINI_API_KEY` |
| پرداخت | `PAYPING_TOKEN` |
| Referral | `REFERRAL_PERCENTAGE`, `MIN_WITHDRAWAL` |
| Redis | `REDIS_URL`, `REDIS_ENABLED`, TTLها |
| S3 | `S3_ENDPOINT`, `S3_ACCESS_KEY`, ... |
| فرانت | `VITE_API_URL`, `ALLOWED_ORIGINS` |

> در production طول `JWT_SECRET` و `COOKIE_SECRET` باید حداقل ۳۲ کاراکتر باشد و `SHOW_OTP_IN_DEV` خاموش بماند.

---

## 📜 اسکریپت‌ها

| دستور | کار |
|--------|-----|
| `npm run dev` | توسعه همزمان کلاینت و سرور |
| `npm run build` | build کلاینت + باندل سرور |
| `npm run start` / `start:prod` | اجرای production |
| `npm run typecheck` | بررسی TypeScript |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run test` | Vitest |
| `npm run validate` | typecheck + lint + test |
| `npm run release:verify` | دروازه انتشار |
| `npm run health` | health محلی |
| `npm run migrate` / `backup` | دیتابیس |

---

## 📡 API

پایه: `/api`

| مسیر | توضیح |
|------|--------|
| `GET /api/health` | سلامت سرویس |
| `GET /api/ready` | آمادگی (اتصال DB) |
| `/api/auth/*` | OTP، نشست، پروفایل |
| `/api/products/*` | لیست، جزئیات، ذخیره، moderation |
| `/api/stores/*` | فروشگاه، دنبال‌کردن |
| `/api/messages/*` | اتاق‌ها و پیام‌ها |
| `/api/ai/*` | chat، ask، generate-description |
| `/api/payment/*` | پرداخت و callback |
| `/api/referral/*` | معرفی و کیف پول |
| `/api/support/*` | تیکت و پیوست امن |
| `/api/admin/*` | پنل ادمین |
| `/api/promotions/*` | بنر و آمار فروشنده |
| `/api/reports/*` | گزارش تخلف |

WebSocket (Socket.IO): رویدادهایی مانند `join_room`, `send_message`, `typing`, `message_read` با احراز هویت کوکی نشست.

---

## 📱 PWA

- `public/manifest.json` + آیکون‌ها و shortcuts
- Service Worker (`public/sw.js` / ساخت با vite-plugin-pwa)
- قابلیت نصب روی موبایل و دسکتاپ
- حالت آفلاین محدود برای دارایی‌های کش‌شده

---

## 🚢 Deploy

### Liara

پیکربندی نمونه در `liara.json`. پس از تنظیم envها:

```bash
npm run build
# دیپلوی طبق مستندات Liara با Dockerfile یا buildpack
```

Health check پیشنهادی: `GET /api/health` و readiness: `GET /api/ready`

### Docker

```bash
docker build -t kidareh .
docker run --env-file .env -p 3000:3000 kidareh
```

### چک‌لیست قبل از انتشار

1. `npm ci`
2. `npm run release:verify`
3. تنظیم secrets در محیط production
4. تست OTP، پرداخت و callback در staging
5. اطمینان از پاسخ سالم `/api/health` و `/api/ready`

مستندات مرتبط: [`LAUNCH.md`](./LAUNCH.md) · [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) · [`FINAL_RELEASE_STATUS.md`](./FINAL_RELEASE_STATUS.md)

---

## 🔒 امنیت

- کوکی نشست HttpOnly؛ در production: `__Host-` + Secure + SameSite
- عدم پذیرش Bearer از localStorage برای نشست مرورگر
- بررسی Origin برای درخواست‌های تغییر‌دهندهٔ وضعیت
- Rate limit عمومی API و محدودیت سخت‌گیرانه روی ارسال OTP
- Helmet، compression، timeout، مخفی‌کردن `x-powered-by`
- اعتبارسنجی ورودی با Zod
- آپلود پشتیبانی با بررسی امضای فایل و دانلود فقط برای مالک/staff
- لاگ ساختاریافته با request-id

جزئیات hardening نسخه ۱.۲: [`CHANGELOG_PRODUCTION_HARDENING.md`](./CHANGELOG_PRODUCTION_HARDENING.md)

---

## 🧪 تست و کیفیت

```bash
npm run test
npm run test:coverage
npm run typecheck
npm run lint
```

- Unit/Integration با **Vitest** در `tests/frontend` و `tests/backend`
- Pre-commit با Husky + lint-staged
- راهنما: [`TESTING_GUIDE.md`](./TESTING_GUIDE.md)

---

## 🗺️ نقشه راه

| افق | هدف |
|-----|------|
| کوتاه‌مدت | پوشش تست بالاتر، پاکسازی type errorهای فرانت، ارتقای multer |
| میان‌مدت | جداسازی سرویس‌ها در صورت نیاز، مانیتورینگ (مثلاً Sentry) |
| بلندمدت | مهاجرت تدریجی از SQLite به PostgreSQL در ترافیک بالا |

---

## 🤝 مشارکت

1. Fork و branch از `main`
2. تغییرات با TypeScript strict و lint تمیز
3. `npm run validate` قبل از PR
4. توضیح واضح در PR

ایده‌ها و باگ‌ها: [Issues](https://github.com/Tahmoures54/kidareh/issues)

---

## 📄 مجوز و پشتیبانی

- **مجوز:** Apache-2.0
- **نسخه فعلی:** 1.2.0
- **تیم:** Kidareh Team — `info@kidareh.com`
- **مستندات بیشتر:**
  - [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md)
  - [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md)
  - [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md)

---

<div align="center">

ساخته‌شده با تمرکز روی تجربه خرید حضوری در ایران 🇮🇷

**کی‌داره — ببین کی داره، حضوری بگیر**

</div>
