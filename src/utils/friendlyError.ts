/**
 * تبدیل پیام‌های فنی به زبان ساده برای کاربر غیرحرفه‌ای
 */

const MAP: Array<{ test: RegExp; message: string }> = [
  { test: /timeout|تایم.?اوت|408/i, message: "اینترنت یک لحظه قطع شد. دوباره امتحان کن." },
  { test: /network|ارتباط|اینترنت|Failed to fetch|NetworkError/i, message: "به اینترنت وصل نیستی یا وصلی‌ات ضعیف است." },
  { test: /401|نشست|منقضی|Unauthorized|ورود/i, message: "لطفاً دوباره وارد شو." },
  { test: /403|دسترسی|Forbidden/i, message: "به این بخش دسترسی نداری." },
  { test: /429|بیش از حد|صبر کنید/i, message: "خیلی سریع درخواست دادی. کمی صبر کن و دوباره بزن." },
  { test: /502|پیامک|سامانه پیامکی|Kavenegar/i, message: "الان پیامک نرسید. چند دقیقه بعد دوباره امتحان کن." },
  { test: /کد تأیید اشتباه|منقضی شده|otp/i, message: "کد درست نیست یا وقتش تمام شده. دوباره کد بگیر." },
  { test: /شماره موبایل نامعتبر|invalid.*phone/i, message: "شماره رو با ۰۹ شروع کن و ۱۱ رقم بنویس." },
  { test: /فروشگاه.*ثبت|complete-profile|پروفایل/i, message: "اول فروشگاهت رو کامل کن، بعد کالا بگذار." },
  { test: /تصویر|image|upload|عکس/i, message: "با عکس مشکل پیش اومد. یه عکس دیگه امتحان کن." },
  { test: /500|سرور|internal|Internal Server/i, message: "الان یه مشکل موقتی هست. کمی بعد دوباره امتحان کن." },
  { test: /not found|404|پیدا نشد/i, message: "این مورد پیدا نشد. شاید حذف شده باشه." },
  { test: /validation|اعتبار|نامعتبر|invalid/i, message: "اطلاعات رو دوباره چک کن و درست پر کن." },
  { test: /payment|پرداخت|زرین‌پال|zarinpal/i, message: "با پرداخت مشکل پیش اومد. اگر پول کم شد به پشتیبانی بگو." },
];

export function friendlyError(raw: unknown, fallback = "یه مشکلی پیش اومد. دوباره امتحان کن."): string {
  const text =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && "message" in (raw as object)
        ? String((raw as { message?: string }).message || "")
        : "";

  if (!text.trim()) return fallback;

  for (const { test, message } of MAP) {
    if (test.test(text)) return message;
  }

  // پیام‌های کوتاه فارسی سرور را همان‌طور نگه می‌داریم
  if (/[\u0600-\u06FF]/.test(text) && text.length < 120) return text;

  return fallback;
}
