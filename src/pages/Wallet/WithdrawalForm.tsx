// src/components/WithdrawalForm.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  AlertCircle,
  Landmark,
  CheckCircle,
  Info,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Copy,
  CheckCheck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

// ============================================================================
// Types
// ============================================================================

export interface WithdrawalRequest {
  amount: number;
  iban: string;
  accountHolder: string;
  bankName?: string;
  description?: string;
}

interface WithdrawalFormProps {
  /** موجودی فعلی */
  balance: number;
  /** آیا می‌تواند برداشت کند */
  canWithdraw: boolean;
  /** آیا در حال ارسال درخواست است */
  isWithdrawing: boolean;
  /** حداقل مبلغ برداشت */
  minAmount: number;
  /** تابع ارسال درخواست */
  onSubmit: (data: WithdrawalRequest) => Promise<void>;
  /** لیست بانک‌های معتبر */
  banks?: string[];
  /** مبلغ دلخواه برای برداشت (اختیاری) */
  customAmount?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const IBAN_LENGTH = 24;
const ACCOUNT_HOLDER_MIN_LENGTH = 3;
const ACCOUNT_HOLDER_MAX_LENGTH = 50;

const PERSIAN_PATTERN = /^[\u0600-\u06FF\s]+$/;
const NUMBER_PATTERN = /^\d+$/;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * فرمت کردن شماره شبا
 */
function formatIban(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, IBAN_LENGTH);
  return cleaned.replace(/(\d{4})/g, "$1 ").trim();
}

/**
 * اعتبارسنجی شماره شبا
 */
function validateIban(value: string): boolean {
  const cleaned = value.replace(/\s/g, "");
  if (cleaned.length !== IBAN_LENGTH) return false;
  if (!NUMBER_PATTERN.test(cleaned)) return false;

  // محاسبه checksum (Iranian IBAN validation)
  let sum = "";
  for (let i = 0; i < cleaned.length; i++) {
    sum += cleaned[i];
  }
  const intSum = parseInt(sum.slice(0, 2)) * 2 + parseInt(sum.slice(2));
  return intSum % 97 === 1;
}

/**
 * اعتبارسنجی نام صاحب حساب
 */
function validateAccountHolder(name: string): string | null {
  if (!name.trim()) return "نام صاحب حساب الزامی است";
  if (name.trim().length < ACCOUNT_HOLDER_MIN_LENGTH)
    return `نام باید حداقل ${ACCOUNT_HOLDER_MIN_LENGTH} حرف باشد`;
  if (name.trim().length > ACCOUNT_HOLDER_MAX_LENGTH)
    return `نام باید حداکثر ${ACCOUNT_HOLDER_MAX_LENGTH} حرف باشد`;
  if (!PERSIAN_PATTERN.test(name.trim()))
    return "لطفاً نام را به فارسی وارد کنید";
  return null;
}

/**
 * تشخیص بانک از روی شماره شبا
 */
function detectBank(iban: string): string | null {
  const cleaned = iban.replace(/\s/g, "");
  if (cleaned.length < 3) return null;

  const prefix = cleaned.substring(0, 3);
  const bankCodes: Record<string, string> = {
    "010": "بانک مرکزی",
    "011": "بانک صنعت و معدن",
    "012": "بانک ملت",
    "013": "بانک رفاه",
    "014": "بانک مسکن",
    "015": "بانک سپه",
    "016": "بانک کشاورزی",
    "017": "بانک ملی",
    "018": "بانک تجارت",
    "019": "بانک صادرات",
    "020": "بانک توسعه صادرات",
    "021": "بانک پست بانک",
    "022": "بانک توسعه تعاون",
    "023": "بانک قرض الحسنه مهر ایران",
    "024": "بانک اقتصاد نوین",
    "025": "بانک پارسیان",
    "026": "بانک پاسارگاد",
    "027": "بانک کارآفرین",
    "028": "بانک سامان",
    "029": "بانک سینا",
    "030": "بانک خاورمیانه",
    "031": "بانک دی",
    "032": "بانک گردشگری",
    "033": "بانک ایران زمین",
    "034": "بانک سرمایه",
    "035": "بانک شهر",
  };

  return bankCodes[prefix] || null;
}

// ============================================================================
// کامپوننت‌های کمکی
// ============================================================================

/**
 * فیلد ورودی با لیبل و validation
 */
interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  placeholder: string;
  error?: string;
  touched?: boolean;
  icon?: React.ReactNode;
  dir?: "ltr" | "rtl";
  maxLength?: number;
  prefix?: string;
  suffix?: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched,
  icon,
  dir = "rtl",
  maxLength,
  prefix,
  suffix,
}) => (
  <div className="space-y-1.5">
    <label
      htmlFor={id}
      className="block text-[11px] font-bold text-gray-600"
    >
      {label}
    </label>

    <div className="relative">
      {/* آیکون سمت راست */}
      {icon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
          {icon}
        </div>
      )}

      {/* پیشوند */}
      {prefix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
          <span className="text-sm font-black text-gray-400">{prefix}</span>
          <div className="w-px h-4 bg-gray-200 mr-8" />
        </div>
      )}

      {/* فیلد */}
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        dir={dir}
        className={`w-full rounded-2xl border bg-white/80 py-3.5 px-4 text-sm font-bold outline-none transition-all backdrop-blur-sm ${
          icon || prefix ? "pr-12" : "pr-4"
        } ${
          suffix ? "pl-12" : "pl-4"
        } ${
          touched && error
            ? "border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-200"
            : "border-gray-200/60 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        }`}
        aria-invalid={touched && !!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      {/* پسوند */}
      {suffix && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          {suffix}
        </div>
      )}
    </div>

    {/* خطا */}
    <AnimatePresence>
      {touched && error && (
        <motion.p
          id={`${id}-error`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="flex items-center gap-1 text-[10px] font-bold text-red-500"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

/**
 * هشدار حداقل موجودی
 */
interface BalanceAlertProps {
  balance: number;
  minAmount: number;
}

const BalanceAlert: React.FC<BalanceAlertProps> = ({ balance, minAmount }) => (
  <motion.div
    initial={{ opacity: 0, y: -5, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 backdrop-blur-sm p-4 border border-amber-200/60 shadow-sm"
  >
    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
      <Info className="w-4 h-4 text-amber-600" />
    </div>
    <div className="flex-1">
      <p className="text-xs font-bold text-amber-900 mb-1">موجودی ناکافی</p>
      <p className="text-[11px] text-amber-800 leading-relaxed">
        حداقل موجودی برای برداشت{" "}
        <span className="font-black">{minAmount.toLocaleString("fa-IR")}</span>{" "}
        تومان است.{" "}
        <span className="font-black">
          {(minAmount - balance).toLocaleString("fa-IR")}
        </span>{" "}
        تومان دیگر نیاز دارید.
      </p>
    </div>
  </motion.div>
);

/**
 * شناسایی بانک
 */
interface BankDetectorProps {
  iban: string;
}

const BankDetector: React.FC<BankDetectorProps> = ({ iban }) => {
  const bankName = useMemo(() => detectBank(iban), [iban]);

  if (!bankName) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700"
    >
      <ShieldCheck className="w-4 h-4 text-emerald-500" />
      بانک شناسایی شده: {bankName}
    </motion.div>
  );
};

/**
 * دکمه ارسال
 */
interface SubmitButtonProps {
  isFormValid: boolean;
  isWithdrawing: boolean;
  canWithdraw: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isFormValid,
  isWithdrawing,
  canWithdraw,
}) => (
  <motion.button
    type="submit"
    disabled={!isFormValid || !canWithdraw}
    whileTap={isFormValid && canWithdraw ? { scale: 0.98 } : {}}
    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black transition-all shadow-lg ${
      isFormValid && canWithdraw
        ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-black hover:to-gray-900 shadow-gray-200/50 hover:shadow-xl"
        : "cursor-not-allowed bg-gray-100 text-gray-400 shadow-none"
    }`}
    aria-busy={isWithdrawing}
  >
    {isWithdrawing ? (
      <>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
          <Loader2 className="w-5 h-5" />
        </motion.div>
        در حال ارسال...
      </>
    ) : (
      <>
        <CreditCard className="w-5 h-5" />
        ثبت درخواست واریز
      </>
    )}
  </motion.button>
);

// ============================================================================
// کامپوننت اصلی
// ============================================================================

/**
 * فرم تسویه حساب بانکی
 */
export default function WithdrawalForm({
  balance,
  canWithdraw,
  isWithdrawing,
  minAmount,
  onSubmit,
  customAmount = false,
}: WithdrawalFormProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * تغییر شماره شبا
   */
  const handleIbanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatIban(e.target.value);
      setIban(formatted);

      if (touched.iban) {
        const cleaned = formatted.replace(/\s/g, "");
        if (!cleaned) {
          setErrors((prev) => ({ ...prev, iban: "شماره شبا الزامی است" }));
        } else if (cleaned.length !== IBAN_LENGTH) {
          setErrors((prev) => ({
            ...prev,
            iban: `شماره شبا باید ${IBAN_LENGTH} رقم باشد`,
          }));
        } else if (!validateIban(cleaned)) {
          setErrors((prev) => ({
            ...prev,
            iban: "شماره شبا نامعتبر است (checksum اشتباه)",
          }));
        } else {
          setErrors((prev) => {
            const { iban, ...rest } = prev;
            return rest;
          });
        }
      }
    },
    [touched.iban]
  );

  /**
   * تغییر نام صاحب حساب
   */
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setAccountHolder(value);

      if (touched.accountHolder) {
        const error = validateAccountHolder(value);
        if (error) {
          setErrors((prev) => ({ ...prev, accountHolder: error }));
        } else {
          setErrors((prev) => {
            const { accountHolder, ...rest } = prev;
            return rest;
          });
        }
      }
    },
    [touched.accountHolder]
  );

  /**
   * ارسال فرم
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // علامت‌گذاری همه فیلدها به عنوان touched
      setTouched({ iban: true, accountHolder: true });

      const newErrors: Record<string, string> = {};
      const cleanedIban = iban.replace(/\s/g, "");

      // اعتبارسنجی شبا
      if (!cleanedIban) {
        newErrors.iban = "شماره شبا الزامی است";
      } else if (cleanedIban.length !== IBAN_LENGTH) {
        newErrors.iban = `شماره شبا باید ${IBAN_LENGTH} رقم باشد`;
      } else if (!validateIban(cleanedIban)) {
        newErrors.iban = "شماره شبا نامعتبر است";
      }

      // اعتبارسنجی نام
      const nameError = validateAccountHolder(accountHolder);
      if (nameError) {
        newErrors.accountHolder = nameError;
      }

      setErrors(newErrors);

      // اگر خطایی وجود ندارد، ارسال
      if (Object.keys(newErrors).length === 0) {
        setIsSubmitted(true);
        try {
          await onSubmit({
            amount: balance,
            iban: `IR${cleanedIban}`,
            accountHolder: accountHolder.trim(),
            bankName: detectBank(cleanedIban) || undefined,
          });

          // بعد از موفقیت، فرم را ریست کن
          setIban("");
          setAccountHolder("");
          setTouched({});
        } catch {
          setIsSubmitted(false);
        }
      }
    },
    [iban, accountHolder, balance, onSubmit]
  );

  /**
   * پاک کردن فرم
   */
  const handleReset = useCallback(() => {
    setIban("");
    setAccountHolder("");
    setErrors({});
    setTouched({});
    setIsSubmitted(false);
    formRef.current?.reset();
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const cleanedIban = useMemo(() => iban.replace(/\s/g, ""), [iban]);

  const isFormValid = useMemo(
    () =>
      cleanedIban.length === IBAN_LENGTH &&
      validateIban(cleanedIban) &&
      accountHolder.trim().length >= ACCOUNT_HOLDER_MIN_LENGTH &&
      canWithdraw &&
      !isWithdrawing,
    [cleanedIban, accountHolder, canWithdraw, isWithdrawing]
  );

  const ibanProgress = useMemo(
    () => Math.min((cleanedIban.length / IBAN_LENGTH) * 100, 100),
    [cleanedIban.length]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
      className="rounded-3xl border border-gray-200/60 bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/20 backdrop-blur-xl p-6 shadow-xl shadow-gray-200/50 relative overflow-hidden"
    >
      {/* پس‌زمینه تزئینی */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-200/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* ============================================================
            هدر
            ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2.5 text-sm font-black text-gray-900">
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-200/60"
              >
                <Landmark className="w-5 h-5 text-indigo-600" />
              </motion.div>
              تسویه حساب بانکی
            </h3>

            <Link
              to="/terms?tab=financial"
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              قوانین مالی
            </Link>
          </div>

          {/* زیرنویس */}
          <p className="text-[10px] text-gray-500 mt-2">
            اطلاعات زیر را با دقت وارد کنید. خطا در اطلاعات به معنی عدم واریز است.
          </p>
        </motion.div>

        {/* ============================================================
            فرم
            ============================================================ */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* فیلد شماره شبا */}
          <div className="space-y-2">
            <FormField
              id="iban"
              label="شماره شبا (بدون IR)"
              value={iban}
              onChange={handleIbanChange}
              onBlur={() => setTouched((prev) => ({ ...prev, iban: true }))}
              placeholder="0000 0000 0000 0000 0000 00"
              error={errors.iban}
              touched={touched.iban}
              maxLength={29}
              dir="ltr"
              prefix="IR"
              suffix={
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    cleanedIban.length === IBAN_LENGTH
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-gray-300"
                  }`}
                >
                  {cleanedIban.length === IBAN_LENGTH && (
                    <CheckCheck className="w-2.5 h-2.5 text-white" />
                  )}
                </motion.div>
              }
            />

            {/* پیشرفت شبا */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ibanProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className={`h-full rounded-full transition-all ${
                      cleanedIban.length === IBAN_LENGTH
                        ? "bg-emerald-500"
                        : "bg-indigo-500"
                    }`}
                  />
                </div>
              </div>
              <span
                className={`text-[10px] font-bold ${
                  cleanedIban.length === IBAN_LENGTH
                    ? "text-emerald-600"
                    : "text-gray-500"
                }`}
              >
                {cleanedIban.length}/{IBAN_LENGTH}
              </span>
            </div>

            {/* شناسایی بانک */}
            <AnimatePresence>
              {cleanedIban.length >= 3 && <BankDetector iban={cleanedIban} />}
            </AnimatePresence>
          </div>

          {/* فیلد نام صاحب حساب */}
          <FormField
            id="accountHolder"
            label="نام صاحب حساب (طبق کارت بانکی)"
            value={accountHolder}
            onChange={handleNameChange}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, accountHolder: true }))
            }
            placeholder="مثال: علی محمدی"
            error={errors.accountHolder}
            touched={touched.accountHolder}
            maxLength={ACCOUNT_HOLDER_MAX_LENGTH}
          />

          {/* هشدار حداقل موجودی */}
          <AnimatePresence>
            {balance < minAmount && (
              <BalanceAlert balance={balance} minAmount={minAmount} />
            )}
          </AnimatePresence>

          {/* دکمه ارسال */}
          <div className="space-y-3">
            <SubmitButton
              isFormValid={isFormValid}
              isWithdrawing={isWithdrawing}
              canWithdraw={canWithdraw}
            />

            {/* وضعیت فرم */}
            <AnimatePresence>
              {isFormValid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50/80 rounded-xl py-2.5 border border-emerald-200/60"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  فرم آماده ارسال است
                </motion.div>
              )}
            </AnimatePresence>

            {/* دکمه پاک کردن */}
            {(iban || accountHolder) && (
              <motion.button
                type="button"
                onClick={handleReset}
                whileTap={{ scale: 0.95 }}
                className="w-full py-2 text-[10px] font-bold text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                پاک کردن اطلاعات
              </motion.button>
            )}
          </div>
        </form>

        {/* ============================================================
            راهنما
            ============================================================ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200/60"
        >
          <h4 className="text-[10px] font-black text-gray-600 mb-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            نکات مهم:
          </h4>
          <ul className="text-[10px] text-gray-600 space-y-1 list-disc list-inside">
            <li>اطلاعات باید دقیقاً مطابق کارت بانکی باشد</li>
            <li>حداقل مبلغ برداشت {minAmount.toLocaleString("fa-IR")} تومان است</li>
            <li>مدت زمان واریز 24 تا 48 ساعت کاری است</li>
            <li>در صورت اشتباه در اطلاعات، مبلغ به حساب شما بازگردانده می‌شود</li>
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
}