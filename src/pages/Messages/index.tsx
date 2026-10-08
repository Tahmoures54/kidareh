import React, { useState, useMemo, useCallback } from "react";
import { Search, Wifi, WifiOff, X, RefreshCw, AlertCircle, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useAuth } from "../../context/AuthContext";
import { useConversations } from "./hooks";
import ConvItem from "./components/ConvItem";
import GuestView from "./components/GuestView";
import Skeleton from "./components/Skeleton";
import { friendlyError } from "../../utils/friendlyError";

export default function Messages() {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");

  const { convs, setConvs, loading, error, online, fetchConvs } = useConversations(user, logout);

  const filtered = useMemo(() => {
    if (!query.trim()) return convs;
    const q = query.toLowerCase();
    return convs.filter(
      (c) => c.storeName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  }, [convs, query]);

  const unreadTotal = useMemo(() => convs.reduce((s, c) => s + c.unread, 0), [convs]);

  const handleOpen = useCallback(
    (sid: string) => {
      setConvs((prev) => prev.map((c) => (c.storeId === sid ? { ...c, unread: 0 } : c)));
    },
    [setConvs]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setConvs((prev) => prev.filter((c) => c.id !== id));
    },
    [setConvs]
  );

  if (!user) return <GuestView />;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-28 text-slate-900 transition-colors" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2.5 text-xl font-black text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/25">
                <MessageCircle className="h-4.5 w-4.5" />
              </span>
              پیام‌ها
              {unreadTotal > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="rounded-full bg-gradient-to-l from-cyan-600 to-teal-500 px-2 py-0.5 text-xs font-black text-white shadow-sm"
                >
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </motion.span>
              )}
            </h1>

            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                online
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {online ? (
                <>
                  <Wifi className="h-3.5 w-3.5" /> متصل
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" /> داره وصل می‌شه…
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو بین پیام‌ها…"
              className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pr-10 pl-10 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-400/50 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                aria-label="پاک کردن"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="mb-2 font-bold text-slate-900">پیام‌ها نیومد</h3>
            <p className="mb-6 text-sm text-slate-500">
              {friendlyError(error, "اینترنت رو چک کن و دوباره بزن.")}
            </p>
            <button
              type="button"
              onClick={fetchConvs}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-600 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-transform active:scale-95"
            >
              <RefreshCw className="h-4 w-4" /> دوباره تلاش کن
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-xl">
              <MessageCircle className="h-12 w-12 text-cyan-300" />
            </div>
            <h3 className="mb-2 text-lg font-black text-slate-900">
              {query ? "چیزی پیدا نشد" : "هنوز پیامی نداری"}
            </h3>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              {query
                ? "با این کلمه چیزی پیدا نشد. یه چیز دیگه امتحان کن."
                : "وقتی با فروشنده‌ای حرف بزنی، اینجا نشون داده می‌شه."}
            </p>
          </motion.div>
        ) : (
          <motion.div layout className="relative">
            <AnimatePresence mode="popLayout">
              {filtered.map((c, i) => (
                <ConvItem key={c.id} conv={c} index={i} onOpen={handleOpen} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
