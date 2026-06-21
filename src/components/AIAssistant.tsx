import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, X, Send, Mic, MicOff,
  Brain, Search, ShieldAlert, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  simulated?: boolean;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

// چک کردن امن برای پشتیبانی از تشخیص صدا
const SpeechRecognition = typeof window !== "undefined" 
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
  : null;

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const navigate = useNavigate();
  
  // پیام خوش‌آمدگویی (فقط برای نمایش، به سرور ارسال نمی‌شود)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "سلام! من دستیار هوشمند خرید در «کی داره؟» هستم. ✨ \nدنبال چه کالایی می‌گردی؟ برام تایپ کن یا با میکروفون بگو تا تو مغازه‌های نزدیک پیداش کنم!"
    }
  ]);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // اسکرول خودکار به پایین با هر پیام جدید
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // تنظیمات تشخیص صدا (در صورت پشتیبانی مرورگر)
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = false; // بعد از یک جمله متوقف شود
      recognition.interimResults = true; // نمایش نتایج همزمان با صحبت

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        // اگر ارور Not Allowed بود یعنی کاربر دسترسی میکروفون نداده است
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    
    // وقتی کامپوننت بسته می‌شود همه چیز را پاک کن
    return () => {
      recognitionRef.current?.abort();
      abortControllerRef.current?.abort();
    };
  }, []);

  const toggleListening = () => {
    if (!SpeechRecognition) {
      alert('متاسفانه مرورگر شما از قابلیت تشخیص صدا پشتیبانی نمی‌کند. (در کروم اندروید یا ویندوز تست کنید)');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput(''); 
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch(e) {
        console.error("Mic start failed", e);
      }
    }
  };

  const handleSend = async (textToSend: string = input) => {
    if (!textToSend.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    // اگر ریکوئست قبلی در جریان است، کنسلش کن
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // فیلتر کردن پیام اولیه (welcome) تا تاریخچه چت بیهوده سنگین نشود
      const historyToSend = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.sender === "user" ? "user" : "model",
          text: m.text
        }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyToSend
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error("Network Error");
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.reply,
          simulated: data.simulated
        }]);
      } else {
        throw new Error("API logical error");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // اگر لغو شده بود، ارور نده
      
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "ارتباط با سرور هوش مصنوعی برقرار نشد. لطفاً از اتصال اینترنت خود اطمینان حاصل کنین."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "گوشی آیفون ۱۳ رضا کجاست؟",
    "یخچال خوب زیر ۹۰ میلیون",
    "کجا کتاب فروشی فرهنگ هست؟",
    "آدرس دقیق بازار ستارخان"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" dir="rtl">
          {/* برای بسته شدن با کلیک روی فضای خالی بک‌گراند */}
          <div className="absolute inset-0" onClick={onClose}></div>
          
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full sm:max-w-md h-[92vh] sm:h-[85vh] bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative z-10"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-teal-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 relative">
                  <Brain className="w-5 h-5 text-white animate-pulse" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-indigo-600 rounded-full"></span>
                </div>
                <div>
                  <h2 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                    دستیار هوش مصنوعی
                    <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
                  </h2>
                  <p className="text-[10px] text-teal-100 font-medium mt-0.5">سریع، هوشمند و همیشه بیدار</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated AI Notice */}
            <div className="bg-gradient-to-l from-indigo-50 to-teal-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between text-[10px] text-indigo-700 shrink-0">
              <span className="flex items-center gap-1 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                متصل به جمنای و دیتابیس «کی داره؟»
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full font-bold border border-indigo-100 shadow-sm text-indigo-600">v2.0 زنده</span>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-start" : "justify-end"} items-start gap-2.5`}>
                  {msg.sender === "ai" && (
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200 mt-1">
                      <Brain className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className={`px-4 py-3 rounded-2xl shadow-sm border text-[13px] font-medium leading-relaxed ${
                      msg.sender === "user" 
                        ? "bg-indigo-600 text-white rounded-tr-none border-indigo-500 shadow-indigo-100" 
                        : "bg-white text-gray-800 rounded-tl-none border-gray-100"
                    }`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      
                      {msg.simulated && (
                        <span className="block mt-2 pt-2 border-t border-gray-100 text-[9px] text-amber-500 font-bold text-left">
                          ⚠️ خطای ارتباط جمنای (پاسخ آفلاین)
                        </span>
                      )}
                    </div>
                    
                    {/* استخراج کلیدواژه و دکمه جستجو */}
                    {msg.sender === "ai" && !isLoading && msg.id !== "welcome" && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <button 
                          onClick={() => {
                            const cleanText = msg.text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "");
                            const words = cleanText.split(/\s+/).filter(w => w.length > 2);
                            const q = words[0] || "";
                            if (q) {
                              onClose();
                              navigate(`/search?q=${encodeURIComponent(q)}`);
                            }
                          }}
                          className="text-[10px] font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-100 flex items-center gap-1.5 transition-colors"
                        >
                          <Search className="w-3.5 h-3.5" />
                          جستجو در اپلیکیشن
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.sender === "user" && (
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md mt-1">
                      <span className="text-xs font-bold">من</span>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-end items-start gap-2">
                  <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                  </div>
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200 mt-1">
                    <Brain className="w-4 h-4" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Area */}
            <div className="px-4 py-2.5 bg-white border-t border-gray-100 shrink-0">
              <p className="text-[10px] text-gray-400 font-bold mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                تست دستیار صوتی یا سوالات پیش‌فرض:
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar scroll-smooth snap-x">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 bg-gray-50 hover:bg-teal-50 text-gray-600 hover:text-teal-700 text-[11px] font-semibold px-3.5 py-2 rounded-xl border border-gray-200 snap-center transition-all shadow-sm disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0 mb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center gap-2 relative">
                {isListening && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10, scale: 0.9 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     className="absolute -top-14 right-0 left-0 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg"
                   >
                     <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                     در حال شنیدن صدای شما...
                   </motion.div>
                )}

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isListening ? 'bg-red-50 text-red-500 border-red-200 shadow-md animate-pulse' : 'bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100'}`}
                  title="جستجوی صوتی"
                >
                   {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <div className={`flex-1 flex items-center border rounded-xl px-2 py-1 transition-all shadow-inner ${isListening ? 'bg-white border-teal-400 ring-2 ring-teal-100' : 'bg-gray-50 border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white'}`}>
                  <input
                    type="text"
                    placeholder="پیام خود را بنویسید..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none outline-none text-xs text-gray-800 placeholder-gray-400 py-2.5 px-2"
                  />
                  <button
                    disabled={isLoading || !input.trim()}
                    onClick={() => handleSend()}
                    className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none shadow-md shadow-indigo-100"
                  >
                    <Send className="w-4 h-4 transform rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}