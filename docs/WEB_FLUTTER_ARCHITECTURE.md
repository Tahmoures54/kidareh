# Kidareh Web + Flutter API

این مخزن دو خروجی اصلی دارد:

1. **وب‌سایت کی‌داره** در `src/` — رابط کاربری React/Vite برای استفاده در کامپیوتر و موبایل‌وب.
2. **Backend/API** در `server/` — Express + SQLite که هم وب‌سایت و هم اپ Flutter از همان API استفاده می‌کنند.

## معماری

```text
                    ┌──────────────────────┐
                    │   Kidareh Backend    │
                    │   Express / SQLite   │
                    │       /api/*         │
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
      HttpOnly Cookie                    Bearer Access Token
              │                                 │
      ┌───────▼────────┐                ┌───────▼────────┐
      │ Desktop Web    │                │ Flutter App    │
      │ React + Vite   │                │ kidareh-flutter│
      └────────────────┘                └────────────────┘
```

### احراز هویت

- **Web:** نشست JWT داخل Cookie امن و HttpOnly باقی می‌ماند.
- **Flutter:** درخواست‌های احراز هویت‌شده با `Authorization: Bearer <accessToken>` پذیرفته می‌شوند.
- اپ Flutter در زمان ورود هدر `X-Kidareh-Client: mobile` می‌فرستد تا `accessToken` را از پاسخ OTP دریافت کند.
- توکن موبایل باید فقط در secure storage خود سیستم‌عامل نگهداری شود؛ در LocalStorage ذخیره نشود.
- `/api/auth/refresh` برای کلاینت موبایل نیز access token جدید برمی‌گرداند.

### APIهای اصلی

- `/api/auth`
- `/api/products`
- `/api/stores`
- `/api/messages`
- `/api/referral`
- `/api/payment`
- `/api/reservations`
- `/api/presence`
- `/api/ai`
- `/api/support`
- `/api/promotions`

بنابراین منطق کسب‌وکار، احراز هویت، کمیسیون معرفی، کیف پول و داده‌های اصلی در Backend باقی می‌ماند و Flutter فقط کلاینت آن است.

## Web

در production، ابتدا رابط React ساخته می‌شود:

```bash
npm run build:client
```

خروجی در `dist/public` قرار می‌گیرد و Express آن را همراه API سرو می‌کند.

برای توسعه:

```bash
npm run dev
```

Vite روی پورت 5173 و API روی پورت 3000 اجرا می‌شوند و درخواست‌های `/api` توسط Vite به Backend پروکسی می‌شوند.

## Flutter

مخزن جداگانه اپ:

`Tahmoures54/kidareh-flutter`

آدرس API production اپ باید به ریشه API تنظیم شود، مانند:

```text
https://YOUR-DOMAIN/api
```

درخواست‌های موبایل باید هدر زیر را نیز ارسال کنند:

```text
X-Kidareh-Client: mobile
```

پس از ورود، `accessToken` در secure storage ذخیره و برای درخواست‌های بعدی با Bearer ارسال می‌شود.

## Socket.IO

وب همچنان می‌تواند از Cookie برای Socket.IO استفاده کند. کلاینت موبایل می‌تواند توکن را در handshake زیر بفرستد:

```text
auth: { token: accessToken }
```

Backend هر دو روش را پشتیبانی می‌کند.

## اصل مهم

**Flutter منبع منطق کسب‌وکار نیست.** محاسبه کمیسیون، موجودی کیف پول، دسترسی‌ها، پرداخت، فروشگاه و داده‌های اصلی باید در Backend انجام شود تا وب و اپ دقیقاً رفتار یکسانی داشته باشند.
