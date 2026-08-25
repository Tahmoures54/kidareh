// src/components/AIAssistant.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Brain,
  Search,
  AlertCircle,
  Zap,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../utils/api";
import { useGeolocation } from "../hooks/useGeolocation";

/* ====================== TYPES ====================== */

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  simulated?: boolean;
  copied?: boolean;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ====================== CONSTANTS ====================== */

const QUICK_PROMPTS = [
  "📱 گوشی آیفون ۱۳ کجاست؟",
  "❄️ یخچال خوب زیر ۹۰ میلیون",
  "📚 کتاب فروشی فرهنگ کجا؟",
  "🏪 آدرس بازار ستارخان",
];

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    : null;

/* ====================== HELPER FUNCTIONS ====================== */

/**
 * استخراج کلمات کلیدی از متن
 */
function extractKeywords(text: string): string {
  return text
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .join(" ");
}

/**
 * فرمت‌کردن زمان
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ====================== MESSAGE BUBBLE ====================== */

/**
 * Bubble پیام
 */
const MessageBubble = React.memo(
  ({
    message,
    onCopy,
  }: {
    message: Message;
    onCopy: (id: string) => void;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${
        message.sender === "user" ? "justify-start" : "justify-end"
      } items-start gap-2.5`}
    >
      {message.sender === "ai" && (
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200 mt-1 shadow-sm">
          <Brain className="w-4 h-4" />
        </div>
      )}

      <div className="flex flex-col gap-1 max-w-[85%]">
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm border text-[13px] font-medium leading-relaxed transition-all ${
            message.sender === "user"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none border-indigo-500 shadow-indigo-200"
              : "bg-white text-gray-800 rounded-tl-none border-gray-100 hover:bg-gray-50"
          }`}
        >
          <p className="whitespace-pre-line break-words">{message.text}</p>

          {message.simulated && (
            <div className="mt-2 pt-2 border-t border-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-[9px] text-amber-600 font-bold">
                خطای ارتباط (پاسخ آفلاین)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 text-[10px] text-gray-400">
          <span>{formatTime(message.timestamp)}</span>

          {message.sender === "ai" && (
            <>
              <button
                onClick={() => onCopy(message.id)}
                className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                title="کپی کردن"
              >
                {message.copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => {
                  const keywords = extractKeywords(message.text);
                  if (keywords) {
                    window.location.href = `/search?q=${encodeURIComponent(
                      keywords
                    )}`;
                  }
                }}
                className="p-1 hover:bg-teal-50 rounded-md text-teal-600 hover:text-teal-700 transition-colors font-bold"
                title="جستجو"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {message.sender === "user" && (
        <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md mt-1 font-bold text-xs">
          من
        </div>
      )}
    </motion.div>
  )
);

MessageBubble.displayName = "MessageBubble";

/* ====================== LOADING ANIMATION ====================== */

/**
 * انیمیشن تایپ کردن
 */
const TypingAnimation = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex justify-end items-start gap-2"
  >
    <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 mt-1">
      {[0, 0.2, 0.4].map((delay) => (
        <motion.span
          key={delay}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay }}
          className="w-2 h-2 bg-indigo-500 rounded-full"
        />
      ))}
    </div>
    <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200 mt-1">
      <Brain className="w-4 h-4 animate-pulse" />
    </div>
  </motion.div>
);

/* ====================== MAIN COMPONENT ====================== */

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const navigate = useNavigate();
  const { city: userCity } = useGeolocation("تهران");

  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "سلام! 👋 من دستیار هوشمند خرید کی‌داره هستم.\nمی‌تونم کمک کنم شما رو به بهترین محصولات و فروشگاه‌های نزدیک راهنمایی کنم.\n\nچی می‌خواستی پیدا کنی؟",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* ── Speech Recognition Setup ── */
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "fa-IR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => recognitionRef.current?.abort();
  }, []);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /* ── Toggle Microphone ── */
  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) {
      alert("متأسفانه مرورگر شما از قابلیت تشخیص صدا پشتیبانی نمی‌کند.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput("");
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Mic error:", err);
      }
    }
  }, [isListening]);

  /* ── Copy Message ── */
  const handleCopyMessage = useCallback((id: string) => {
    const message = messages.find((m) => m.id === id);
    if (message) {
      navigator.clipboard.writeText(message.text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, copied: true } : m
        )
      );
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, copied: false } : m
          )
        );
      }, 2000);
    }
  }, [messages]);

  /* ── Send Message ── */
  const handleSend = useCallback(
    async (textToSend: string = input) => {
      if (!textToSend.trim() || isLoading) return;

      // Stop voice
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }

      // Cancel previous request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Add user message
      const userMsg: Message = {
        id: Date.now().toString(),
        sender: "user",
        text: textToSend,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        // Prepare history (skip welcome)
        const history = messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          }));

        const response = await apiRequest<{
          success: boolean;
          reply: string;
          simulated?: boolean;
        }>("/api/ai/chat", {
          method: "POST",
          body: {
            message: textToSend,
            history,
            city: userCity,
          },
          auth: false,
        });

        if (response?.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              sender: "ai",
              text: response.reply,
              timestamp: new Date(),
              simulated: response.simulated,
            },
          ]);
        } else {
          throw new Error("پاسخی دریافت نشد");
        }
      } catch (err: any) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        console.error("AI error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: "❌ ارتباط ناموفق. لطفاً اتصال اینترنت را بررسی کنید.",
            timestamp: new Date(),
            simulated: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, isListening, messages, userCity]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md h-[92vh] sm:h-[85vh] bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between shadow-lg shrink-0">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30"
                >
                  <Brain className="w-5 h-5 text-white" />
                </motion.div>

                <div>
                  <h2 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                    دستیار هوشمند
                    <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
                  </h2>
                  <p className="text-[10px] text-indigo-100 font-medium mt-0.5">
                    آنلاین و دائماً آماده
                  </p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Status Bar */}
            <div className="bg-gradient-to-l from-indigo-50 to-purple-50 px-4 py-2.5 border-b border-indigo-100 flex items-center gap-2 text-[10px] text-indigo-700 shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-bold flex-1">
                متصل به دیتابیس کی‌داره
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full font-black border border-indigo-100">
                v2.1
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white hide-scrollbar">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCopy={handleCopyMessage}
                />
              ))}

              {isLoading && <TypingAnimation />}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {!isLoading && messages.length <= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-3 bg-white border-t border-gray-100 shrink-0"
              >
                <p className="text-[10px] text-gray-500 font-bold mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  تست سریع:
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar snap-x">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isLoading || isListening}
                      onClick={() => handleSend(prompt)}
                      className="shrink-0 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 text-[11px] font-bold px-3 py-2 rounded-xl border border-gray-200 snap-center transition-all disabled:opacity-50"
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                  >
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    در حال شنیدن...
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleListening}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isListening
                      ? "bg-red-50 text-red-500 border border-red-200 shadow-md"
                      : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </motion.button>

                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                  <input
                    type="text"
                    placeholder="پیام بنویسید..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none outline-none text-xs py-3 placeholder-gray-400"
                  />

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    disabled={!input.trim() || isLoading}
                    onClick={() => handleSend()}
                    className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 rotate-180" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}