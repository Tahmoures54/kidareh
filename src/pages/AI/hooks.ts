import { useState, useRef, useEffect, useCallback } from "react";
import { apiRequest } from "../../utils/api";
import { Msg } from "./types";
import { WELCOME } from "./constants";

export interface ShoppingProduct {
  id: number;
  name: string;
  price: number | string;
  status: string;
  store_name: string;
  store_phone?: string | null;
  distance?: number | null;
  city?: string | null;
  province?: string | null;
  rating?: number | null;
}

interface ShoppingResponse {
  reply: string;
  suggestedQuery?: string;
  matched?: boolean;
  products?: ShoppingProduct[];
}

export function useAIChat() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResults, setLastResults] = useState<ShoppingProduct[]>([]);
  const [lastQuery, setLastQuery] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, lastResults]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    if (navigator.vibrate) navigator.vibrate(40);

    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: q }]);
    setInput("");
    setLastResults([]);
    setLastQuery("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === "ai" ? "assistant" as const : "user" as const,
        text: m.text,
      })).slice(-10);

      let lat: number | undefined;
      let lng: number | undefined;
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 2500,
            maximumAge: 5 * 60 * 1000,
          }));
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      } catch { /* Location is optional. */ }

      const data = await apiRequest<ShoppingResponse>("/api/ai/chat", {
        method: "POST",
        auth: false,
        body: { message: q, history, lat, lng },
      });

      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      setLastResults(data.products || []);
      setLastQuery(data.suggestedQuery || q);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: data.reply || "نتیجه‌ای دریافت نکردم. عبارت جستجو را کمی تغییر دهید.",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "دستیار خرید موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید.",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [input, loading, messages]);

  return {
    state: { messages, input, loading, lastResults, lastQuery },
    refs: { endRef, textareaRef },
    actions: { handleInput, send },
  };
}
