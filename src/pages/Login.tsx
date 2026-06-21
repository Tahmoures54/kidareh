import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Phone,
  ShieldAlert,
  ArrowRight,
  Store,
  Lock,
  RefreshCw,
  Clock,
  CheckCircle2,
  Smartphone,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Step = "phone" | "otp";

const toEnglishDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

export default function Login() {
  const { login, verifyOtp, user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showOtpInputs, setShowOtpInputs] = useState(false);

  const otpInputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (!user) return;

    const returnUrl =
      (location.state as { returnUrl?: string; from?: string } | null)?.returnUrl ||
      (location.state as { returnUrl?: string; from?: string } | null)?.from;

    if (!user.is_profile_complete) {
      navigate("/complete-profile");
      return;
    }

    if (returnUrl) {
      navigate(returnUrl);
      return;
    }

    if (user.role === "seller") navigate("/seller");
    else if (user.role === "admin" || user.role === "support") navigate("/admin");
    else if (user.role === "marketer") navigate("/wallet");
    else navigate("/");
  }, [user, navigate, location.state]);

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (timer <= 0 || step !== "otp") return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, step]);

  const generateCaptcha = () => {
    setCaptcha({
      num1: Math.floor(Math.random() * 10) + 1,
      num2: Math.floor(Math.random() * 10) + 1,
    });
    setCaptchaInput("");
  };

  const requestOtp = async (normalizedPhone: string) => {
    await login(normalizedPhone);
    setPhone(normalizedPhone);
    setStep("otp");
    setShowOtpInputs(true);
    setTimer(120);
    setError("");
    setTimeout(() => otpInputRefs.current[0]?.focus(), 500);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const englishPhone = toEnglishDigits(phone).replace(/\D/g, "");
    const englishCaptcha = toEnglishDigits(captchaInput).replace(/\D/g, "");

    if (!englishPhone.startsWith("09") || englishPhone.length !== 11) {
      setError("شماره موبایل نامعتبر است (مثال: 09123456789)");
      return;
    }

    if (parseInt(englishCaptcha || "0", 10) !== captcha.num1 + captcha.num2) {
      setError("پاسخ امنیتی (جمع اعداد) اشتباه است");
      generateCaptcha();
      return;
    }

    setIsLoading(true);
    try {
      await requestOtp(englishPhone);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خطا در ارسال کد. لطفا چند دقیقه دیگر تلاش کنید.";
      setError(message);
      generateCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!phone || timer > 0 || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      await requestOtp(phone);
      setOtp("");
      otpInputRefs.current.forEach((inp) => inp && (inp.value = ""));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ارسال مجدد ناموفق بود.";
      setError(message);
      generateCaptcha();
      setStep("phone");
      setTimer(0);
      setShowOtpInputs(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const newVal = toEnglishDigits(value).replace(/\D/g, "");
    if (newVal.length > 1) {
      const fullCode = newVal.slice(0, 5);
      setOtp(fullCode);
      for (let i = 0; i < 5; i++) {
        if (otpInputRefs.current[i]) {
          otpInputRefs.current[i]!.value = fullCode[i] || "";
        }
      }
      otpInputRefs.current[Math.min(fullCode.length, 4)]?.focus();
      return;
    }

    const updatedOtp = otp.split("");
    updatedOtp[index] = newVal || "";
    const newOtp = updatedOtp.join("").padEnd(5, "").substring(0, 5);
    setOtp(newOtp);

    if (newVal && index < 4) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const updated = otp.split("");
      if (updated[index]) {
        updated[index] = "";
      } else if (index > 0) {
        updated[index - 1] = "";
        otpInputRefs.current[index - 1]?.focus();
      }
      setOtp(updated.join(""));
      otpInputRefs.current[index]!.value = "";
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 4) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = toEnglishDigits(e.clipboardData.getData("text")).replace(/\D/g, "").slice(0, 5);
    setOtp(pasted);
    for (let i = 0; i < 5; i++) {
      if (otpInputRefs.current[i]) {
        otpInputRefs.current[i]!.value = pasted[i] || "";
      }
    }
    otpInputRefs.current[Math.min(pasted.length, 4)]?.focus();
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const englishOtp = otp.replace(/\D/g, "").slice(0, 5);
    if (englishOtp.length !== 5) {
      setError("کد تایید باید ۵ رقم باشد");
      setIsLoading(false);
      return;
    }

    try {
      const loggedInUser = await verifyOtp(phone, englishOtp);
      const returnUrl =
        (location.state as { returnUrl?: string; from?: string } | null)?.returnUrl ||
        (location.state as { returnUrl?: string; from?: string } | null)?.from;

      if (!loggedInUser.is_profile_complete) {
        navigate("/complete-profile");
      } else if (returnUrl) {
        navigate(returnUrl);
      } else if (loggedInUser.role === "seller") {
        navigate("/seller");
      } else if (loggedInUser.role === "admin" || loggedInUser.role === "support") {
        navigate("/admin");
      } else if (loggedInUser.role === "marketer") {
        navigate("/wallet");
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "کد وارد شده اشتباه یا منقضی شده است";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full"
        />
        <p className="mt-4 text-gray-600 text-sm font-bold tracking-tight">
          در حال بررسی اطلاعات امنیتی...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-gradient-to-b from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center py-10 px-4 font-sans relative overflow-hidden"
      dir="rtl"
    >
      {/* پس‌زمینه گرادینت */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-b from-teal-50/50 via-cyan-50/30 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-100/20 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-teal-500/10 border border-white/60 p-8 relative z-10"
      >
        {/* لوگو */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <Link to="/" className="cursor-pointer">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 6 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30 border border-white/20"
            >
              <Store className="w-8 h-8" />
            </motion.div>
          </Link>
        </motion.div>

        {/* عنوان */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-8"
        >
          <Link to="/" className="cursor-pointer block">
            <h1 className="text-3xl font-black text-gray-900 mb-2 hover:text-teal-600 transition-colors">
              کی داره؟
            </h1>
          </Link>
          <p className="text-gray-500 text-xs font-bold">
            پلتفرم جستجوی لحظه‌ای کالا در محله شما
          </p>
        </motion.div>

        {/* مرحله‌نما */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <motion.div
            animate={{
              boxShadow: step === "phone" ? "0 0 20px rgba(20, 184, 166, 0.3)" : "none",
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
              step === "phone"
                ? "bg-teal-500 text-white border-teal-500"
                : "bg-green-100 text-green-600 border-green-300"
            }`}
          >
            {step === "otp" ? <CheckCircle2 className="w-5 h-5" /> : "1"}
          </motion.div>

          <motion.div
            animate={{
              scaleX: step === "otp" ? 1 : 0,
              opacity: step === "otp" ? 1 : 0.3,
            }}
            className="w-10 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full origin-right"
          />

          <motion.div
            animate={{
              boxShadow: step === "otp" ? "0 0 20px rgba(20, 184, 166, 0.3)" : "none",
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
              step === "otp"
                ? "bg-teal-500 text-white border-teal-500"
                : "bg-gray-100 text-gray-400 border-gray-200"
            }`}
          >
            2
          </motion.div>
        </motion.div>

        {/* ارور */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="bg-red-50/80 text-red-700 p-4 rounded-2xl text-xs font-bold mb-6 flex items-start gap-3 border border-red-200/50 shadow-sm backdrop-blur-sm"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.form
              key="phone-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              onSubmit={handlePhoneSubmit}
              className="space-y-5"
            >
              {/* شماره موبایل */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-xs font-bold text-gray-700 mb-2 ml-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  شماره موبایل
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(toEnglishDigits(e.target.value))}
                    placeholder="0912 345 6789"
                    className="w-full pl-4 pr-11 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 transition-all text-left font-bold tracking-widest text-gray-800 shadow-sm outline-none group-hover:border-gray-300"
                    dir="ltr"
                    maxLength={11}
                  />
                  <Phone className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                </div>
              </motion.div>

              {/* کپچا */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <label className="block text-xs font-bold text-gray-700 mb-2 ml-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-teal-600" />
                    تایید امنیتی
                  </span>
                  <motion.button
                    whileHover={{ rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={generateCaptcha}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1 p-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    عوض کن
                  </motion.button>
                </label>
                <div className="flex gap-2.5">
                  <div
                    className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl flex items-center justify-center font-black text-xl tracking-widest text-gray-800 select-none shadow-inner"
                    dir="ltr"
                  >
                    {captcha.num1} + {captcha.num2}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(toEnglishDigits(e.target.value))}
                    placeholder="="
                    className="w-20 px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 transition-all text-center font-bold text-lg outline-none shadow-sm hover:border-gray-300"
                    dir="ltr"
                    maxLength={2}
                  />
                </div>
              </motion.div>

              {/* دکمه ارسال */}
              <motion.button
                type="submit"
                disabled={isLoading || !phone || !captchaInput}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white py-3.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-teal-500/30 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    دریافت کد تایید
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </motion.button>

              {/* قوانین */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-start gap-3 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 rounded-xl border border-gray-200/50"
              >
                <input
                  id="terms"
                  type="checkbox"
                  defaultChecked
                  required
                  className="w-5 h-5 text-teal-500 bg-white border-gray-300 rounded-lg focus:ring-teal-500 cursor-pointer accent-teal-500 mt-0.5 flex-shrink-0"
                />
                <label htmlFor="terms" className="text-[10px] text-gray-600 font-medium leading-relaxed cursor-pointer flex-1">
                  ثبت‌نام و ورود منزلهٔ پذیرش{" "}
                  <Link to="/terms" className="text-teal-600 font-bold hover:underline">
                    قوانین و مقررات
                  </Link>
                  {" "}و سیاست{" "}
                  <Link to="/terms" className="text-teal-600 font-bold hover:underline">
                    حریم خصوصی
                  </Link>
                  {" "}است.
                </label>
              </motion.div>
            </motion.form>
          ) : (
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              onSubmit={handleOtpSubmit}
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-xs font-bold text-gray-700 mb-2 ml-1 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-teal-600" />
                  کد تایید پیامک شده
                </label>
                <p className="text-[10px] text-gray-500 font-medium mb-4 ml-1 leading-relaxed">
                  کد ۵ رقمی ارسالی به شماره{" "}
                  <span className="font-bold text-gray-800 text-xs" dir="ltr">
                    {phone}
                  </span>{" "}
                  را وارد کنید.
                </p>

                {/* OTP Input Grid */}
                <motion.div
                  className="flex justify-center gap-2.5"
                  dir="ltr"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <motion.input
                      key={idx}
                      ref={(el) => {
                        if (el) otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete="one-time-code"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="w-14 h-14 bg-white border-2 border-gray-200 rounded-xl text-center text-2xl font-black text-gray-900 shadow-sm focus:border-teal-500 focus:ring-3 focus:ring-teal-200 outline-none transition-all hover:border-gray-300"
                      value={otp[idx] || ""}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      autoFocus={idx === 0}
                    />
                  ))}
                </motion.div>
              </motion.div>

              {/* دکمه تایید */}
              <motion.button
                type="submit"
                disabled={isLoading || otp.replace(/\D/g, "").length < 5}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white py-3.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-teal-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    تایید و ورود
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </motion.button>

              {/* ارسال مجدد و ویرایش */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-col items-center gap-4 pt-6 border-t border-gray-100"
              >
                <AnimatePresence mode="wait">
                  {timer > 0 ? (
                    <motion.span
                      key="timer"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-xs font-bold text-gray-500 flex items-center gap-1.5 bg-gradient-to-r from-gray-50 to-gray-100/50 px-4 py-2 rounded-lg border border-gray-200"
                    >
                      <Clock className="w-4 h-4 text-teal-600" />
                      ارسال مجدد تا {formatTime(timer)} دیگر
                    </motion.span>
                  ) : (
                    <motion.button
                      key="resend"
                      type="button"
                      onClick={handleResendCode}
                      disabled={isLoading}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 px-3 py-2 hover:bg-teal-50 rounded-lg disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      ارسال مجدد کد تایید
                    </motion.button>
                  )}
                </AnimatePresence>

                <motion.button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                    generateCaptcha();
                    setTimer(0);
                    setShowOtpInputs(false);
                    otpInputRefs.current.forEach((inp) => inp && (inp.value = ""));
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-gray-400 text-xs font-bold hover:text-gray-600 transition-colors mt-2"
                >
                  ویرایش شماره موبایل
                </motion.button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}