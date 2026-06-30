import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CONFIG, toEn } from "./utils";

export function useLoginLogic() {
  const { login, verifyOtp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // مدیریت ریدایرکت نقش‌ها
  useEffect(() => {
    if (!user) return;
    const state = location.state as any;
    const returnUrl = state?.returnUrl || state?.from;
    
    if (!user.is_profile_complete) navigate("/complete-profile");
    else if (returnUrl) navigate(returnUrl);
    else if (user.role === "seller") navigate("/seller");
    else if (user.role === "admin" || user.role === "support") navigate("/admin");
    else if (user.role === "marketer") navigate("/referral"); // جایگزین wallet شد
    else navigate("/");
  }, [user, navigate, location.state]);

  // منطق تایمر
  useEffect(() => {
    if (timer <= 0 || step !== "otp") return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, step]);

  const onPhoneSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(toEn(phone));
      if (isMounted.current) {
        setStep("otp");
        setTimer(CONFIG.TIMER_DURATION);
      }
    } catch (err: any) {
      if (isMounted.current) setError(err?.message || "خطایی رخ داد، لطفاً دوباره تلاش کنید");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await verifyOtp(phone, otp);
    } catch (err: any) {
      if (isMounted.current) setError(err?.message || "کد وارد شده صحیح نیست یا منقضی شده است");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // توابع کنترل اینپوت‌های کد تایید
  const onOtpChange = (i: number, v: string, refs: React.MutableRefObject<HTMLInputElement[]>) => {
    const val = toEn(v).replace(/\D/g, "").slice(0, 1);
    const newOtp = otp.split("");
    newOtp[i] = val;
    setOtp(newOtp.join(""));
    if (val && i < CONFIG.OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const onOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>, refs: React.MutableRefObject<HTMLInputElement[]>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>, refs: React.MutableRefObject<HTMLInputElement[]>) => {
    e.preventDefault();
    const paste = toEn(e.clipboardData.getData("text")).replace(/\D/g, "").slice(0, CONFIG.OTP_LENGTH);
    setOtp(paste);
    refs.current[Math.min(paste.length, CONFIG.OTP_LENGTH - 1)]?.focus();
  };

  return {
    state: { step, phone, otp, error, loading, timer, authLoading },
    setters: { setStep, setPhone, setOtp, setError },
    actions: { onPhoneSubmit, onOtpSubmit, onOtpChange, onOtpKey, onOtpPaste }
  };
}