import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Info, Sparkles } from "lucide-react";

import { Tab } from "./types";
import { TABS } from "./constants";
import SegmentedControl from "./components/SegmentedControl";
import TermsTab from "./components/TermsTab";
import PrivacyTab from "./components/PrivacyTab";
import GuideTab from "./components/GuideTab";

export default function TermsAndGuide() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "terms");

  useEffect(() => { 
    window.scrollTo(0, 0); 
    document.title = "قوانین و راهنما | کی‌داره"; 
  }, []);

  const changeTab = useCallback((t: Tab) => {
    setTab(t);
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  }, [params, setParams]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 pb-28 text-gray-900 dark:text-white transition-colors duration-300" dir="rtl">
      
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-200/60 dark:border-gray-800/60 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shadow-sm shadow-gray-900/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-100/80 dark:bg-gray-900 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm"
          >
            <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              پشتیبانی و قوانین
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
              مرکز پاسخگویی و مقررات کی‌داره
            </p>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="px-4 py-6 relative">
        <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="bg-indigo-600 dark:bg-indigo-900 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black mb-1.5 drop-shadow-sm">با خیال راحت استفاده کنید</h2>
              <p className="text-xs text-indigo-100 font-medium leading-relaxed">
                استفاده از خدمات کی‌داره به منزله پذیرش شرایط و قوانین است. ما اینجا هستیم تا تجربه امن و راحتی داشته باشید.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <SegmentedControl tabs={TABS} activeTab={tab} onChange={changeTab} />

      {/* ── Main Content Area ── */}
      <main className="px-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {tab === "terms" && <TermsTab key="terms" />}
          {tab === "privacy" && <PrivacyTab key="privacy" />}
          {tab === "guide" && <GuideTab key="guide" />}
        </AnimatePresence>
      </main>
    </div>
  );
}