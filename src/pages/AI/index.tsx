import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Bot, Cpu, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PROMPTS } from "./constants";
import { useAIChat } from "./hooks";
import MessageBubble from "./components/MessageBubble";
import TypingIndicator from "./components/TypingIndicator";

export default function AI() {
  const navigate = useNavigate();
  const { state, refs, actions } = useAIChat();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 flex flex-col relative overflow-hidden transition-colors" dir="rtl">
      
      {/* ── Background Glow ── */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-violet-500/10 dark:from-violet-500/5 to-transparent pointer-events-none" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/50 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shadow-sm shadow-gray-900/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-100/80 dark:bg-gray-900 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-3">
            {/* AI Avatar */}
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-indigo-500 blur-[6px] opacity-70"
              />
              <div className="relative w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center border border-white/20 shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div>
              <h1 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                دستیار هوشمند کی‌داره
                <Cpu className="w-3.5 h-3.5 text-violet-500" />
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">همیشه آنلاین و آماده پاسخگویی</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Chat Area ── */}
      <main className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar relative z-10">
        <AnimatePresence initial={false}>
          {state.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {state.loading && <TypingIndicator />}
        </AnimatePresence>

        <div ref={refs.endRef} className="h-4" />
      </main>

      {/* ── Input Area ── */}
      <div className="relative z-20 bg-gradient-to-t from-white via-white dark:from-gray-950 dark:via-gray-950 to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
        
        {/* Quick Prompts (Only show if chat is empty/new) */}
        <AnimatePresence>
          {state.messages.length <= 1 && !state.loading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10, height: 0 }}
              className="flex gap-2 overflow-x-auto hide-scrollbar pb-4"
            >
              {PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => actions.send(p.label)}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-2.5 rounded-2xl text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 transition-all shadow-sm active:scale-95"
                >
                  <p.icon className="w-3.5 h-3.5 text-violet-500" />
                  {p.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Box */}
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 rounded-[1.5rem] transition-all shadow-sm overflow-hidden flex items-end">
            <textarea
              ref={refs.textareaRef}
              value={state.input}
              onChange={actions.handleInput}
              onKeyDown={e => { 
                if (e.key === "Enter" && !e.shiftKey) { 
                  e.preventDefault(); 
                  actions.send(); 
                } 
              }}
              placeholder="از هوش مصنوعی بپرسید..."
              disabled={state.loading}
              rows={1}
              className="w-full bg-transparent px-4 py-3.5 text-[14px] outline-none resize-none min-h-[52px] max-h-[120px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 custom-scrollbar disabled:opacity-50"
            />
          </div>

          <button
            onClick={() => actions.send()}
            disabled={state.loading || !state.input.trim()}
            className={`w-[52px] h-[52px] rounded-[1.5rem] flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
              state.input.trim() && !state.loading
                ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            }`}
          >
            {state.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className={`w-5 h-5 ${state.input.trim() ? "mr-1" : ""}`} />}
          </button>
        </div>

        <p className="text-center text-[9px] font-bold text-gray-400 dark:text-gray-600 mt-3">
          هوش مصنوعی ممکن است اشتباه کند. لطفاً اطلاعات مهم را بررسی کنید.
        </p>
      </div>

    </div>
  );
}