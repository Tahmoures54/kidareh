import React, { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Send,
  Phone,
  ArrowDown,
  Loader2,
  MoreVertical,
  Store,
  ShieldCheck,
  Paperclip,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useChatRoom } from "./components/hooks";
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
      <div className="flex h-[100dvh] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-100" dir="rtl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230e7490' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/90 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors active:bg-slate-100"
          >
            <ArrowRight className="h-6 w-6 text-slate-700" />
          </button>

          <div className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50 text-lg font-black text-cyan-700 shadow-inner">
                {state.storeName.charAt(0)}
              </div>
              <div
                className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  state.connected ? "bg-emerald-500" : "bg-amber-400"
                }`}
              >
                {state.connected && (
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-50" />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 truncate text-base font-black text-slate-900">
                {state.storeName}
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
              </h2>
              <p
                className={`mt-0.5 text-[11px] font-bold ${
                  state.connected ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {state.connected ? "آنلاین" : "در حال اتصال..."}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-0.5">
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-cyan-700 transition-colors active:bg-cyan-50">
              <Phone className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors active:bg-slate-100">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main
        ref={refs.containerRef}
        onScroll={actions.handleScroll}
        className="custom-scrollbar relative z-10 flex-1 overflow-y-auto px-4 py-5"
      >
        {state.histLoad ? (
          <div className="flex justify-center py-10">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
              <span className="text-xs font-bold text-slate-600">در حال دریافت پیام‌ها...</span>
            </div>
          </div>
        ) : (
          <div className="pb-2">
            {(state.messages.length === 0 || productId) && (
              <div className="mb-8 flex flex-col items-center space-y-3">
                <div className="max-w-[85%] rounded-2xl border border-amber-200/50 bg-amber-50 px-4 py-2 text-center shadow-sm">
                  <p className="text-[11px] font-bold leading-relaxed text-amber-800">
                    🔒 پیام‌های شما با رمزنگاری محافظت می‌شوند. لطفاً از پرداخت خارج از سیستم کی‌داره
                    خودداری کنید.
                  </p>
                </div>

                {productId && (
                  <div className="flex items-center gap-2 rounded-2xl border border-cyan-200/50 bg-cyan-50 px-4 py-2.5 text-center shadow-sm">
                    <Store className="h-4 w-4 text-cyan-700" />
                    <p className="text-[11px] font-black text-cyan-900">
                      شما از صفحه یک کالا وارد شده‌اید.
                    </p>
                  </div>
                )}
              </div>
            )}

            <AnimatePresence initial={false}>
              {state.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMe={m.senderId === String(user.phone ?? user.id)}
                  onRetry={actions.retry}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>{state.typing && <TypingIndicator />}</AnimatePresence>

            <div ref={refs.endRef} className="h-2" />
          </div>
        )}
      </main>

      {/* Scroll FAB */}
      <AnimatePresence>
        {state.showScroll && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => refs.endRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-20 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-cyan-700 shadow-lg backdrop-blur-md transition-transform active:scale-90"
          >
            <ArrowDown className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <footer className="z-30 border-t border-slate-200/60 bg-white/90 px-3 pt-3 pb-[max(1rem,env(safe-area-bottom))] backdrop-blur-xl">
        <form onSubmit={actions.sendMsg} className="mx-auto flex max-w-4xl items-end gap-2">
          <button
            type="button"
            className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 active:scale-90"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="flex-1 rounded-3xl border border-transparent bg-slate-100 shadow-inner transition-all focus-within:border-cyan-300 focus-within:bg-white">
            <textarea
              ref={refs.textareaRef}
              value={state.input}
              onChange={actions.handleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  actions.sendMsg();
                }
              }}
              placeholder="پیام خود را بنویسید..."
              rows={1}
              className="custom-scrollbar max-h-[120px] min-h-[46px] w-full resize-none bg-transparent px-4 py-3 text-[14px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={!state.input.trim() || !state.connected}
            className={`mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
              state.input.trim() && state.connected
                ? "bg-gradient-to-br from-cyan-600 to-teal-500 text-white shadow-lg shadow-cyan-500/30"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            <Send className={`h-5 w-5 ${state.input.trim() && state.connected ? "mr-0.5" : ""}`} />
          </button>
        </form>

        <AnimatePresence>
          {!state.connected && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] font-bold text-amber-500"
            >
              <Loader2 className="h-3 w-3 animate-spin" /> اتصال به سرور قطع شده است...
            </motion.p>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}
