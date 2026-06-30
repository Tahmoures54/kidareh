import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, ApiError } from "../../utils/api";
import { Status, VerifyRes } from "./types";
import { MAX_RETRY, getSafeError } from "./utils";

export function usePaymentVerification() {
  const [params] = useSearchParams();

  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [copyDone, setCopyDone] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const mounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const refId = useMemo(() => params.get("refid") || params.get("refId") || "", [params]);
  const txId = useMemo(() => localStorage.getItem("pendingTransactionId") || "", []);

  const clearCache = useCallback(() => {
    localStorage.removeItem("pendingTransactionId");
    localStorage.removeItem("pendingPaymentAmount");
  }, []);

  const verify = useCallback(async () => {
    if (!mounted.current) return;
    setStatus("loading");

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!refId) {
      if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setStatus("error"); 
      setErrMsg("پرداخت لغو شده یا اطلاعات درگاه نامعتبر است.");
      return;
    }

    const txNum = parseInt(txId, 10);
    if (!txId || !Number.isFinite(txNum) || txNum <= 0) {
      if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setStatus("error");
      setErrMsg("شناسه تراکنش یافت نشد. اگر وجهی کسر شده است، معمولاً تا ۷۲ ساعت آینده به حساب شما بازمی‌گردد.");
      setTrackCode(refId);
      return;
    }

    try {
      const res = await apiRequest<VerifyRes>("/api/payment/verify", {
        method: "POST", auth: true, body: { refId, transactionId: txNum }, signal: ctrl.signal, timeoutMs: 20000,
      });

      if (!mounted.current) return;

      if (res.success) {
        if(navigator.vibrate) navigator.vibrate(50); 
        setStatus("success"); setTrackCode(refId); clearCache();
      } else {
        throw new Error(res.error || res.message || "تأیید پرداخت با مشکل مواجه شد.");
      }
    } catch (err: any) {
      if (!mounted.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;

      if(navigator.vibrate) navigator.vibrate([50, 50, 50]); 

      if (err instanceof ApiError && err.status === 401) {
        setStatus("error"); setErrMsg("نشست شما منقضی شده است. لطفاً دوباره وارد حساب کاربری شوید."); return;
      }
      setStatus("error"); setErrMsg(getSafeError(err?.message)); setTrackCode(refId || "");
    }
  }, [refId, txId, clearCache]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRY) return;
    setRetryCount(c => c + 1);
    setTimeout(verify, 600);
  }, [retryCount, verify]);

  const handleCopy = useCallback(async () => {
    if (!trackCode) return;
    try {
      await navigator.clipboard.writeText(trackCode);
      if(navigator.vibrate) navigator.vibrate(20);
      setCopyDone(true);
      setTimeout(() => { if (mounted.current) setCopyDone(false); }, 1500);
    } catch {}
  }, [trackCode]);

  useEffect(() => {
    mounted.current = true;
    verify();
    return () => { mounted.current = false; abortRef.current?.abort(); };
  }, [verify]);

  return {
    state: { status, errMsg, trackCode, copyDone, retryCount },
    actions: { handleRetry, handleCopy }
  };
}