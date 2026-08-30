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
    return convs.filter(c => c.storeName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }, [convs, query]);

  const unreadTotal = useMemo(() => convs.reduce((s, c) => s + c.unread, 0), [convs]);

  const handleOpen = useCallback((sid: string) => {
    setConvs(prev => prev.map(c => c.storeId === sid ? { ...c, unread: 0 } : c));
  }, [setConvs]);

  const handleDelete = useCallback((id: string) => {
    setConvs(prev => prev.filter(c => c.id !== id));
    // حذف محلی؛ در نسخه‌های بعدی API حذف هم اضافه می‌شود
  }, [setConvs]);

  if (!user) return <GuestView />;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors pb-28" dir="rtl">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black flex items-center gap-2">
              پیام‌ها
              {unreadTotal > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full"
                >
                  {unreadTotal}
                </motion.span>
              )}
            </h1>

            <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
              online ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
            }`}>
              {online ? (
                <><Wifi className="w-3.5 h-3.5" /> متصل</>
              ) : (
                <><WifiOff className="w-3.5 h-3.5" /> داره وصل می‌شه…</>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو بین پیام‌ها…"
              className="w-full bg-gray-100 dark:bg-gray-800/50 border-none rounded-xl py-2.5 pr-10 pl-10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2" aria-label="پاک کردن">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-4 text-rose-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">پیام‌ها نیومد</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{friendlyError(error, "اینترنت رو چک کن و دوباره بزن.")}</p>
            <button
              type="button"
              onClick={fetchConvs}
              className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
            >
              <RefreshCw className="w-4 h-4" /> دوباره تلاش کن
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5">
              <MessageCircle className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
              {query ? "چیزی پیدا نشد" : "هنوز پیامی نداری"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
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
