export const CONFIG = {
  OTP_LENGTH: 5,
  TIMER_DURATION: 120,
};

export const toEn = (v: string) => 
  v.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
   .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

export const validatePhone = (p: string) => /^09\d{9}$/.test(toEn(p).replace(/\D/g, ""));