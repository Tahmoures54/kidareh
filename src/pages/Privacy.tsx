export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-3xl font-black text-gray-900 mb-6">حریم خصوصی</h1>

        <div className="space-y-6 text-gray-700 leading-relaxed text-sm">
          <p>
            ما در «کی‌دارم» متعهد هستیم که اطلاعات شخصی کاربران را محافظت کنیم. این
            سیاست حریم خصوصی توضیح می‌دهد که چه اطلاعاتی را جمع‌آوری می‌کنیم و چگونه
            از آن استفاده می‌کنیم.
          </p>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">اطلاعاتی که جمع‌آوری می‌کنیم</h3>
            <ul className="list-disc pr-5 space-y-1">
              <li>اطلاعات ثبت‌نام (نام، شماره تلفن، ایمیل)</li>
              <li>موقعیت جغرافیایی (شهر و استان)</li>
              <li>اطلاعات مربوط به آگهی‌ها و تعاملات شما</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">نحوه استفاده از اطلاعات</h3>
            <p>
              اطلاعات شما صرفاً برای ارائه خدمات بهتر، نمایش آگهی‌های مرتبط و
              ارتباط با شما استفاده می‌شود.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">امنیت اطلاعات</h3>
            <p>
              ما از روش‌های امنیتی استاندارد برای محافظت از اطلاعات شما استفاده
              می‌کنیم و اطلاعات شما را بدون رضایت‌تان با شخص ثالث به اشتراک
              نمی‌گذاریم.
            </p>
          </div>

          <p className="text-xs text-gray-500 pt-4 border-t">
            آخرین به‌روزرسانی: خرداد ۱۴۰۳
          </p>
        </div>
      </div>
    </div>
  );
}