import { useState } from "react";
import { Sparkles, Send } from "lucide-react";

export default function AI() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "سلام! من دستیار هوشمند کی‌دارم هستم. چطور می‌تونم کمکت کنم؟" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");

    // پاسخ ساده موقتی
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "متوجه شدم! این قابلیت به زودی با هوش مصنوعی کامل فعال می‌شه.",
        },
      ]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-6 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">دستیار هوشمند</h1>
            <p className="text-sm text-gray-500">با هوش مصنوعی</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 h-[420px] overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="سوال خود را بنویسید..."
            className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
          <button
            onClick={handleSend}
            className="bg-violet-600 hover:bg-violet-700 transition-colors text-white px-5 rounded-2xl flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}