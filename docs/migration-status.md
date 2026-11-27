# وضعیت مهاجرت معماری

| حوزه | وضعیت |
|---|---|
| اسکلت API v1 | ایجاد شده؛ هنوز ثبت نشده |
| اسکلت Web routes | ایجاد شده؛ هنوز ثبت نشده |
| اسکلت ماژول‌های دامنه | ایجاد شده؛ بخشی از Repositoryهای حساب، آگهی و فروشگاه با ORM فعال شده‌اند؛ Routeهای قدیمی هنوز مرجع HTTP هستند |
| SQLAlchemy 2.x Engine | فعال در Application Factory و مسیر اجرای تمام queryهای برنامه |
| SQLAlchemy DeclarativeBase / Session | پیاده‌سازی و فعال |
| نگاشت ORM | ۱۸ جدول دامنه پس از schema bootstrap نگاشت می‌شوند؛ FTS shadow tables مستثنا هستند |
| Repositoryهای ORM | حساب، آگهی، فروشگاه و Repository پایه پیاده‌سازی شده‌اند |
| SQLite قدیمی | فعال و حفظ شده؛ Routeها هنوز از آداپتور sqlite3 استفاده می‌کنند |
| Alembic | پیکربندی شده؛ baseline اولیه غیرمخرب اضافه شده؛ migrationهای تغییر schema بعدی باید با بازبینی ایجاد شوند |
| PostgreSQL | مسیر اجرایی اختیاری و صریح با `DATABASE_BACKEND=postgresql` و `DATABASE_URL`؛ CI آزمون PostgreSQL 16 را اجرا می‌کند؛ فعال‌سازی روی Production همچنان مشروط به عبور از دروازه مهاجرت است |
| Object Storage | Vercel Blob برای تصاویر جدید آگهی‌ها فعال؛ مسیر محلی برای توسعه و Liara حفظ شده |
| Redis / Queue | هنوز فعال نشده |
| قالب‌ها و static | در مسیر قدیمی و فعال باقی مانده‌اند |

**وضعیت این مرحله:** تمام Routeها و اسکریپت‌هایی که از `get_connection()` استفاده می‌کنند اکنون از Engine/Connection مدیریت‌شده توسط SQLAlchemy 2.x استفاده می‌کنند؛ وابستگی مستقیم Routeها به اتصال `sqlite3` حذف شده است. برای سازگاری کم‌ریسک، queryهای قدیمی فعلاً از `exec_driver_sql()` در یک adapter استفاده می‌کنند و ردیف‌ها همان رفتار `sqlite3.Row` را دارند. کد جدید باید از ORM Session و Repository استفاده کند. `sqlite3` در `core.py` فقط برای قفل بین‌پردازه‌ای مهاجرت طرح‌واره باقی مانده است. تبدیل تدریجی SQL متنی به ORM در سرویس‌های دامنه، مرحله بعدی بهینه‌سازی است؛ اما runtime دیگر برای queryهای Route به اتصال مستقیم sqlite3 وابسته نیست.

## به‌روزرسانی مرحله سخت‌سازی انتشار

- خواندن هویت کاربر جاری (`current_user`) به ORM و `select()` منتقل شد؛ Repository حساب متد `by_id` و سرویس حساب APIهای خواندن را ارائه می‌کنند.
- سرویس query آگهی برای استفاده غیر HTTP از Repository ORM ایجاد شد.
- تنظیمات Gunicorn به فایل مستقل منتقل شد و `Procfile` اکنون از آن استفاده می‌کند.
- وابستگی `python-dotenv` و `waitress` به نیازمندی‌های Runtime افزوده شد تا بارگذاری `.env` و اجرای ویندوز پوشش داده شود؛ `pytest` فقط در `requirements-dev.txt` نصب می‌شود.
- تنظیمات reverse proxy، Secure Cookie، حداقل طول کلید نشست و اندازه آپلود سخت‌گیرانه‌تر شدند.
- در محیط Liara، `KIDAREH_DATA_DIR` اجباری است و مسیر دیتابیس و تصاویر باید زیر دیسک پایدار قرار گیرند.
- اسکریپت `scripts/check_production.py` برای پیش‌بررسی تنظیمات و بررسی سلامت SQLite اضافه شد.
- تست‌های مستقل preflight/backup/restore در محیط فعلی ۲۰ مورد موفق شدند؛ بازتاب ORM روی ۱۸ جدول و SELECT روی جداول users/stores/listings نیز مستقلاً آزمایش شد.
- همه تست‌های پذیرش در `pytest.ini` فعال شده‌اند؛ با این حال اجرای کامل Flask و انتشار واقعی Liara در این محیط قابل تأیید نیست، زیرا Flask نصب نیست و دسترسی نصب وابستگی‌ها از اینترنت مسدود است. تأیید نهایی منوط به اجرای CI کامل و smoke test روی Liara واقعی است.


## وضعیت اتصال‌های Vercel (۱۴ نوامبر ۲۰۲۶)

- Neon به پروژه Vercel با نام `kidareh` متصل است و متغیرهای Integration در محیط پروژه موجودند؛ اما runtime هنوز SQLite است. `DATABASE_URL` عمداً فعال نشده است.
- Vercel Blob با نام `kidareh-listing-images` در منطقه `fra1` ایجاد و به پروژه متصل شده است.
- آپلود تصاویر جدید روی Vercel از طریق SDK رسمی `vercel-blob` به Blob انجام می‌شود؛ آدرس عمومی Blob در فیلد `image_path` ذخیره می‌شود.
- در توسعه محلی و Liara، در نبود `BLOB_READ_WRITE_TOKEN`، ذخیره‌سازی فایل‌سیستمی قبلی حفظ می‌شود.
- آگهی‌های قدیمی با مسیر `/static/uploads/` همچنان قابل نمایش و حذف هستند. هیچ تصویر قدیمی به‌صورت گروهی منتقل یا پاک نشده است.
- شکست آپلود Blob در Vercel با پاسخ 503 مدیریت می‌شود و برنامه به فایل‌سیستم موقت Vercel fallback نمی‌کند.

**گام باقیمانده دیتابیس:** مسیر PostgreSQL اکنون opt-in است و CI آن را با PostgreSQL 16 آزمایش می‌کند؛ این موضوع به معنی تأیید مهاجرت داده‌های Production نیست. سازگاری DDL هویت‌دار قدیمی (`INTEGER PRIMARY KEY AUTOINCREMENT`) در آداپتور پوشش داده شده است. همچنین revision `0004_double_precision_epoch_columns` ستون‌های REAL را به DOUBLE PRECISION تبدیل می‌کند تا دقت timestampهای Unix و محدودیت OTP حفظ شود. پیش از فعال‌سازی Neon روی Production، باید تمام schema initializerها و queryهای واقعی با یک دیتابیس آزمایشی هم‌نسخه اجرا شوند، SQLهای باقی‌مانده SQLite بررسی شوند، سپس مهاجرت با backup، تطبیق شمار رکوردها، آزمون بازیابی و rollback عملی انجام شود. تا پایان این دروازه، SQLite منبع فعال داده Production باقی بماند.
