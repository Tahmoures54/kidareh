import { useState, useMemo, useCallback } from "react";
import { WHATSAPP_NUMBER, buildWhatsAppUrl } from "../utils";

export function useSupportLogic(user: any) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ text, type }); 
    setTimeout(() => setToast(null), 2500);
  }, []);

  const defaultMessage = useMemo(() => {
    const name = user?.name ? `نام: ${user.name}\n` : "";
    const phone = user?.phone ? `شماره: ${user.phone}\n` : "";
    return `${name}${phone}موضوع: ${subject || "پشتیبانی"}\n\n${message || "سلام، برای دریافت پشتیبانی پیام می‌دهم."}`;
  }, [user, subject, message]);

  const openWhatsApp = useCallback(() => {
    window.open(buildWhatsAppUrl(defaultMessage.trim()), "_blank", "noopener,noreferrer");
  }, [defaultMessage]);

  const copyNumber = useCallback(async () => {
    try { 
      await navigator.clipboard.writeText(WHATSAPP_NUMBER); 
      showToast("شماره پشتیبانی کپی شد"); 
    } catch { 
      showToast("کپی شماره ناموفق بود", "error"); 
    }
  }, [showToast]);

  const callSupport = useCallback(() => { 
    window.location.href = `tel:${WHATSAPP_NUMBER}`; 
  }, []);

  return {
    state: { subject, message, toast },
    setters: { setSubject, setMessage },
    actions: { openWhatsApp, copyNumber, callSupport }
  };
}