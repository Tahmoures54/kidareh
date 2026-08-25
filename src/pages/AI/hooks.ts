import { useState, useRef, useEffect, useCallback } from "react";
import { apiRequest } from "../../utils/api";
import { Msg } from "./types";
import { WELCOME } from "./constants";

export function useAIChat() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle Input Height
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  /* ── Send Message Logic ── */
  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    if (navigator.vibrate) navigator.vibrate(40);

    const userMsg: Msg = { id: Date.now().toString(), role: "user", text: q };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === "ai" ? "assistant" : "user",
        text: m.text,
      })).slice(-10); // Keep last 10 messages for context

      const data = await apiRequest<{ reply: string }>("/api/ai/chat", {
        method: "POST", auth: false, body: { message: q, history },
      });

      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "ai", 
        text: data.reply || "متاسفم، پاسخی دریافت نکردم. لطفاً دوباره بپرسید." 
      }]);
    } catch {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "ai", 
        text: "ارتباط با سرور هوش مصنوعی ناموفق بود. لطفاً اینترنت خود را بررسی کنید." 
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [input, loading, messages]);

  return {
    state: { messages, input, loading },
    refs: { endRef, textareaRef },
    actions: { handleInput, send }
  };
}