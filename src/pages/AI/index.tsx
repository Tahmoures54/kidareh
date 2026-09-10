import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Bot, Cpu, Send, Loader2, Search, MapPin, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PROMPTS } from "./constants";
import { useAIChat } from "./hooks";
import MessageBubble from "./components/MessageBubble";
import ProductResultCard from "./components/ProductResultCard";
import TypingIndicator from "./components/TypingIndicator";

export default function AI() {
  const navigate = useNavigate();
  const { state, refs, actions } = useAIChat();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 flex flex-col relative overflow-hidden transition-colors" dir="rtl">
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-violet-500/10 dark:from-violet-500/5 to-transparent pointer-events-none" />

      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/50 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shadow-sm shadow-gray-900/5">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label="بازگشت" className="w-10 h-10 bg-gray-100/80 dark:bg-gray-900 rounded-full flex items-center justify-center active:scale-90 transition-transform"><ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-indigo-500 blur-[6px] opacity-70" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center border border-white/20 shadow-sm"><Bot className="w-5 h-5 text-white" /></div>
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">دستیار خرید کی‌داره <Cpu className="w-3.5 h-3.5 text-violet-500" /></h1>
              <div className="flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">جستجو در موجودی ثبت‌شده فروشگاه‌ها</span></div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar relative z-10">
        <div className="max-w-3xl mx-auto">
          {state.messages.length <= 1 && !state.loading && (
            <div className="mb-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-3"><Search className="w-4 h-4 text-violet-500 mb-2" /><p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">پیدا کردن کالا</p><p className="text-[9px] text-gray-500 mt-1">از موجودی واقعی</p></div>
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-3"><MapPin className="w-4 h-4 text-violet-500 mb-2" /><p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">نزدیک‌ترها</p><p className="text-[9px] text-gray-500 mt-1">با اجازه موقعیت</p></div>
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-3"><ShieldCheck className="w-4 h-4 text-violet-500 mb-2" /><p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">نتیجه مستند</p><p className="text-[9px] text-gray-500 mt-1">بدون حدس‌سازی</p></div>
            </div>
          )}

          <AnimatePresence initial={false}>{state.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}</AnimatePresence>
          <AnimatePresence>{state.loading && <TypingIndicator />}</AnimatePresence>

          {state.lastResults.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-2 mb-4 space-y-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <div><p className="text-xs font-black text-gray-900 dark:text-white">نتایج پیشنهادی</p><p className="text-[9px] text-gray-500 mt-0.5">جستجو: {state.lastQuery}</p></div>
                <button onClick={() => navigate(`/search?q=${encodeURIComponent(state.lastQuery)}`)} className="text-[10px] font-black text-violet-600 dark:text-violet-400 inline-flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5" /> نتایج بیشتر</button>
              </div>
              {state.lastResults.map(product => <ProductResultCard key={product.id} product={product} />)}
            </motion.section>
          )}
          <div ref={refs.endRef} className="h-4" />
        </div>
      </main>

      <div className="relative z-20 bg-gradient-to-t from-white via-white dark:from-gray-950 dark:via-gray-950 to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence>{state.messages.length <= 1 && !state.loading && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10, height: 0 }} className="flex gap-2 overflow-x-auto hide-scrollbar pb-4">{PROMPTS.map(p => <button key={p.label} onClick={() => actions.send(p.label)} className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-2.5 rounded-2xl text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 transition-all shadow-sm active:scale-95"><p.icon className="w-3.5 h-3.5 text-violet-500" />{p.label}</button>)}</motion.div>}</AnimatePresence>
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 rounded-[1.5rem] transition-all shadow-sm overflow-hidden flex items-end">
              <textarea ref={refs.textareaRef} value={state.input} onChange={actions.handleInput} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); actions.send(); } }} placeholder="مثلاً: لپ‌تاپ گیمینگ تا ۶۰ میلیون نزدیک من" disabled={state.loading} rows={1} className="w-full bg-transparent px-4 py-3.5 text-[14px] outline-none resize-none min-h-[52px] max-h-[120px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 custom-scrollbar disabled:opacity-50" />
            </div>
            <button onClick={() => actions.send()} disabled={state.loading || !state.input.trim()} aria-label="ارسال" className={`w-[52px] h-[52px] rounded-[1.5rem] flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${state.input.trim() && !state.loading ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"}`}>{state.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className={`w-5 h-5 ${state.input.trim() ? "mr-1" : ""}`} />}</button>
          </div>
          <p className="text-center text-[9px] font-bold text-gray-400 dark:text-gray-600 mt-3">نتایج بر اساس اطلاعات ثبت‌شده فروشگاه‌هاست؛ قبل از مراجعه موجودی را تأیید کنید.</p>
        </div>
      </div>
    </div>
  );
}
