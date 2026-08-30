import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { friendlyError } from "../../utils/friendlyError";
import { CONFIG, toEn } from "./utils";

export function useLoginLogic() {
  const { sendOtp, verifyOtp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !isSuccess) return;

    const redirectTimeout = setTimeout(() => {
      const state = location.state as { returnUrl?: string; from?: string } | null;
      const returnUrl = state?.returnUrl || state?.from;

      if (!user.is_profile_complete) {
        navigate("/complete-profile");
      } else if (returnUrl && typeof returnUrl === "string" && returnUrl.startsWith("/")) {
        navigate(returnUrl);
      } else if (user.role === "seller") {
        navigate("/seller");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "support") {
        navigate("/support");
      } else if (user.role === "marketer") {
        navigate("/referral");
      } else {
        navigate("/");
      }
    }, 1200);

    return () => clearTimeout(redirectTimeout);
  }, [user, navigate, location.state, isSuccess]);

  useEffect(() => {
    if (timer <= 0 || step !== "otp") return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, step]);

  const onPhoneSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await sendOtp(toEn(phone));
      if (isMounted.current) {
        setStep("otp");
        setTimer(CONFIG.TIMER_DURATION);
      }
    } catch (err: unknown) {
      if (isMounted.current) setError(friendlyError(err, "الان کد ارسال نشد. کمی بعد دوباره بزن."));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    if (loading || isSuccess) return;
    setLoading(true);
    setError("");
    try {
      await verifyOtp(toEn(phone), toEn(otp));
      if (isMounted.current) setIsSuccess(true);
    } catch (err: unknown) {
      if (isMounted.current) {
        setError(friendlyError(err, "کد درست نیست. دوباره چک کن یا کد جدید بگیر."));
        setLoading(false);
      }
    }
  };

  const onOtpChange = (i: number, v: string, refs: React.MutableRefObject<HTMLInputElement[]>) => {
    if (isSuccess) return;
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
    if (isSuccess) return;
    e.preventDefault();
    const paste = toEn(e.clipboardData.getData("text")).replace(/\D/g, "").slice(0, CONFIG.OTP_LENGTH);
    setOtp(paste);
    refs.current[Math.min(paste.length, CONFIG.OTP_LENGTH - 1)]?.focus();
  };

  return {
    state: { step, phone, otp, error, loading, timer, authLoading, isSuccess },
    setters: { setStep, setPhone, setOtp, setError },
    actions: { onPhoneSubmit, onOtpSubmit, onOtpChange, onOtpKey, onOtpPaste },
  };
}

export const CONFIG = {
  OTP_LENGTH: 5,
  TIMER_DURATION: 120,
};

export const toEn = (v: string) =>
  v
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

export const validatePhone = (p: string) => /^09\d{9}$/.test(toEn(p).replace(/\D/g, ""));
