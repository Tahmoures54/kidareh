import React, { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Send, Phone, ArrowDown, 
  Loader2, MoreVertical, Store, ShieldCheck, Paperclip
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useChatRoom } from "./hooks";
import MessageBubble from "./components/MessageBubble";
import TypingIndicator from "./components/TypingIndicator";

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const productId = params.get("product");
  const navigate = useNavigate();
  const { user, loading: authLoad } = useAuth() as any;

  const { refs, state, actions } = useChatRoom(id, productId, user);

  useEffect(() => {
    if (!authLoad && !user) navigate("/login", { state: { returnUrl: `/chat/${id}` } });
  }, [user, authLoad, navigate, id]);

  if (authLoad || !user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f0f2f5] dark:bg-gray-950 relative overflow-hidden" dir="rtl">
      
      {/* ── Background Pattern ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-sm shadow-gray-900/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-transparent rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-gray-800 transition-colors flex-shrink-0">
            <ArrowRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-full border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg shadow-inner">
                {state.storeName.charAt(0)}
              </div>
              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-950 ${state.connected ? "bg-emerald-500" : "bg-amber-400"}`}>
                {state.connected && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />}
              </div>
            </div>
            
            <div className="min-w-0">
              <h2 className="text-base font-black text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                {state.storeName}
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              </h2>
              <p className={`text-[11px] font-bold mt-0.5 ${state.connected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500"}`}>
                {state.connected ? "آنلاین" : "در حال اتصال..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 active:bg-indigo-50 dark:active:bg-indigo-500/10 transition-colors">
              <Phone className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Message Area ── */}
      <main ref={refs.containerRef} onScroll={actions.handleScroll} className="flex-1 overflow-y-auto px-4 py-5 z-10 custom-scrollbar relative">
        {state.histLoad ? (
          <div className="flex justify-center py-10">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">در حال دریافت پیام‌ها...</span>
            </div>
          </div>
        ) : (
          <div className="pb-2">
            {(state.messages.length === 0 || productId) && (
              <div className="flex flex-col items-center mb-8 space-y-3">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 px-4 py-2 rounded-2xl shadow-sm text-center max-w-[85%]">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed">
                    🔒 پیام‌های شما با رمزنگاری محافظت می‌شوند. لطفاً از پرداخت خارج از سیستم کی‌داره خودداری کنید.
                  </p>
                </div>
                
                {productId && (
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 px-4 py-2.5 rounded-2xl text-center flex items-center gap-2 shadow-sm">
                    <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-[11px] font-black text-indigo-800 dark:text-indigo-300">
                      شما از صفحه یک کالا وارد شده‌اید.
                    </p>
                  </div>
                )}
              </div>
            )}

            <AnimatePresence initial={false}>
              {state.messages.map((m) => (
                <MessageBubble key={m.id} msg={m} isMe={m.senderId === String(user.phone ?? user.id)} onRetry={actions.retry} />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {state.typing && <TypingIndicator />}
            </AnimatePresence>

            <div ref={refs.endRef} className="h-2" />
          </div>
        )}
      </main>

      {/* ── Scroll to Bottom FAB ── */}
      <AnimatePresence>
        {state.showScroll && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => refs.endRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-20 right-4 z-20 w-11 h-11 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-lg text-indigo-600 dark:text-indigo-400 active:scale-90 transition-transform"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Input Area ── */}
      <footer className="z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-800/50 px-3 pt-3 pb-[max(1rem,env(safe-area-bottom))]">
        <form onSubmit={actions.sendMsg} className="flex items-end gap-2 max-w-4xl mx-auto">
          <button type="button" className="w-11 h-11 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 active:scale-90 transition-colors mb-0.5">
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-gray-100 dark:bg-gray-900 border border-transparent focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-3xl transition-all shadow-inner">
            <textarea
              ref={refs.textareaRef} value={state.input} onChange={actions.handleInput}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); actions.sendMsg(); } }}
              placeholder="پیام خود را بنویسید..." rows={1}
              className="w-full bg-transparent px-4 py-3 text-[14px] outline-none resize-none min-h-[46px] max-h-[120px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 custom-scrollbar"
            />
          </div>

          <button
            type="submit" disabled={!state.input.trim() || !state.connected}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 transition-all active:scale-90 ${
              state.input.trim() && state.connected
                ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/20 translate-y-0"
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            }`}
          >
            <Send className={`w-5 h-5 ${state.input.trim() && state.connected ? "mr-1" : ""}`} />
          </button>
        </form>

        <AnimatePresence>
          {!state.connected && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-center text-[10px] text-amber-500 font-bold mt-2 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> اتصال به سرور قطع شده است...
            </motion.p>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}