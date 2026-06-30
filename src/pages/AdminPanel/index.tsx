import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ShoppingBag, AlertTriangle, LogOut, Settings as SettingsIcon, Save,
  Headset, UserPlus, XCircle, Store, Crown, Send, BadgeCheck, ArrowRight,
  Zap, X, Loader2, CreditCard, Plus, Trash2, Key, CheckCircle, Clock, Ban,
  UserCog, Shield, Star
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useSupport } from "../../context/SupportContext";
import { formatPrice } from "../../utils";
import { Tab, BadgeConfigs } from "./types";

import {
  usePendingProducts, useReports, useUsers, useStores, useAdminSettings, useWithdrawals,
  useUpdateUserRole, useApproveProduct, useRejectProduct, useResolveReport, 
  useApproveWithdrawal, useRejectWithdrawal, useSaveSettings
} from "./hooks";

import { Toast, Loading, Empty, StatCard, FALLBACK_PRODUCT } from "./components";

const SPRING_TRANSITION = { type: "spring", bounce: 0.2, duration: 0.6 };

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { icon: any; color: string; bg: string; text: string }> = {
    pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10", text: "در انتظار" },
    approved: { icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-500/10", text: "تأیید شده" },
    rejected: { icon: Ban, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-500/10", text: "رد شده" },
    resolved: { icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-500/10", text: "حل شده" },
    open: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10", text: "باز" },
    closed: { icon: XCircle, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800", text: "بسته" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black ${c.bg} ${c.color}`}>
      <Icon className="w-3.5 h-3.5" /> {c.text}
    </span>
  );
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, logout, supportAgents, addSupportAgent, removeSupportAgent } = useAuth();
  const { referralPercentage, badgeConfigs, updateReferralPercentage, updateBadgeConfig } = useSettings();
  const { tickets, replyTicket } = useSupport();

  const [tab, setTab] = useState<Tab | "withdrawals">("support");
  const [toast, setToast] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [agentPhone, setAgentPhone] = useState("");
  
  const [refPct, setRefPct] = useState(referralPercentage);
  const [localBadges, setLocalBadges] = useState<BadgeConfigs>((badgeConfigs as BadgeConfigs) || {});
  const [payToken, setPayToken] = useState("");
  const [smsToken, setSmsToken] = useState("");
  const [newBadge, setNewBadge] = useState({ key: "", label: "", price: "", duration: "" });

  useEffect(() => { setRefPct(referralPercentage); }, [referralPercentage]);
  useEffect(() => { setLocalBadges((badgeConfigs as BadgeConfigs) || {}); }, [badgeConfigs]);

  const isAdmin = user?.role === "admin";
  
  const { data: withdrawals = [], isLoading: loadW } = useWithdrawals(isAdmin);
  const { data: products = [], isLoading: loadP } = usePendingProducts(isAdmin);
  const { data: reports = [], isLoading: loadR } = useReports(isAdmin);
  const { data: usersList = [], isLoading: loadU } = useUsers(isAdmin);
  const { data: storesList = [], isLoading: loadS } = useStores(isAdmin);
  const { data: settingsData } = useAdminSettings(isAdmin);

  useEffect(() => {
    if (settingsData) {
      if (settingsData.PAYPING_TOKEN) setPayToken(settingsData.PAYPING_TOKEN);
      if (settingsData.SMS_TOKEN) setSmsToken(settingsData.SMS_TOKEN);
    }
  }, [settingsData]);

  const updateUserRole = useUpdateUserRole(setToast);
  const approveProduct = useApproveProduct(setToast);
  const rejectProduct = useRejectProduct(setToast);
  const resolveReport = useResolveReport(setToast);
  const approveWithdrawal = useApproveWithdrawal(setToast);
  const rejectWithdrawal = useRejectWithdrawal(setToast);
  const saveSettingsMut = useSaveSettings(setToast);

  const handleLogout = async () => {
    try { await logout(); navigate("/login"); } catch { navigate("/login"); }
  };

  const handleSaveSettings = () => {
    updateReferralPercentage(refPct);
    if (localBadges) Object.entries(localBadges).forEach(([b, c]) => updateBadgeConfig(b, c));
    saveSettingsMut.mutate({ payToken, smsToken });
  };

  const handleAddBadge = () => {
    if (!newBadge.label) return setToast("❌ لطفاً نام نمایشی برچسب را وارد کنید");
    const finalKey = newBadge.key.trim() || `badge_${Math.random().toString(36).substring(2, 8)}`;
    const formattedKey = finalKey.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (localBadges[formattedKey]) return setToast("❌ این شناسه از قبل وجود دارد!");
    
    setLocalBadges(prev => ({ 
      ...prev, 
      [formattedKey]: { label: newBadge.label, price: Number(newBadge.price) || 0, duration_days: Number(newBadge.duration) || 0 } 
    }));
    setNewBadge({ key: "", label: "", price: "", duration: "" });
    setToast("✅ برچسب اضافه شد");
  };

  const handleRemoveBadge = (keyToRemove: string) => {
    if (confirm("آیا از حذف این برچسب مطمئن هستید؟")) {
      setLocalBadges(prev => { const copy = { ...prev }; delete copy[keyToRemove]; return copy; });
    }
  };

  const handleReply = (tid: string) => {
    if (replyText[tid]?.trim()) {
      replyTicket(tid, replyText[tid]);
      setReplyText(p => ({ ...p, [tid]: "" }));
    }
  };

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (agentPhone.length === 11 && agentPhone.startsWith("09")) { 
      addSupportAgent(agentPhone); setAgentPhone(""); 
    } else {
      setToast("❌ شماره همراه معتبر نیست");
    }
  };

  if (!user || (!isAdmin && user.role !== "support")) {
    return (
      <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-[30px] flex justify-center items-center mb-6 shadow-inner rotate-12">
          <AlertTriangle className="w-10 h-10 text-rose-500 -rotate-12" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">دسترسی غیرمجاز</h2>
        <button onClick={() => navigate("/")} className="bg-teal-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl mt-8">بازگشت</button>
      </div>
    );
  }

  const TABS: Array<{ key: Tab | "withdrawals"; label: string; icon: any; badge?: number; adminOnly?: boolean }> = [
    { key: "support", label: "تیکت‌ها", icon: Headset },
    { key: "withdrawals", label: "تسویه‌ها", icon: CreditCard, badge: withdrawals.filter(w => w.status === 'pending').length, adminOnly: true },
    { key: "products", label: "کالاها", icon: ShoppingBag, badge: products.length, adminOnly: true },
    { key: "reports", label: "گزارشات", icon: AlertTriangle, badge: reports.length, adminOnly: true },
    { key: "users", label: "کاربران", icon: Users, adminOnly: true },
    { key: "stores", label: "فروشگاه‌ها", icon: Store, adminOnly: true },
    { key: "settings", label: "تنظیمات", icon: SettingsIcon, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] font-sans overflow-x-hidden" dir="rtl">
      <AnimatePresence>{toast && <Toast msg={toast} onDismiss={() => setToast("")} />}</AnimatePresence>

      <div className="sticky top-0 z-50 bg-[#F8FAFC] dark:bg-[#0B0F19]">
        <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-5 pt-[max(20px,env(safe-area-inset-top))] pb-8 rounded-b-[40px] shadow-2xl shadow-black/20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-teal-400/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-cyan-400/10 rounded-full blur-[60px]" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20 hover:bg-white/20 transition"><ArrowRight className="w-5 h-5 text-white" /></button>
              <div>
                <h1 className="text-lg font-black flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> پنل مدیریت</h1>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">مدیریت و نظارت بر پلتفرم</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 backdrop-blur rounded-xl flex items-center justify-center hover:bg-rose-500/20 transition"><LogOut className="w-5 h-5 text-rose-400" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 relative z-10">
            <StatCard label="تسویه" value={withdrawals.length} icon={CreditCard} color="text-amber-400" alert={withdrawals.length > 0} />
            <StatCard label="محصولات" value={products.length} icon={ShoppingBag} color="text-teal-400" />
            <StatCard label="گزارش" value={reports.length} icon={AlertTriangle} color="text-rose-400" alert={reports.length > 0} />
          </div>
        </header>

        <div className="px-4 py-4 bg-white dark:bg-[#0B0F19] border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex gap-2 overflow-x-auto no-scrollbar p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/30">
            {TABS.filter(t => !t.adminOnly || isAdmin).map(t => {
              const isActive = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all z-10 whitespace-nowrap ${isActive ? "text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800 shadow-lg shadow-teal-500/10 border border-slate-200 dark:border-slate-700" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"}`}>
                  <t.icon className={`w-4 h-4 transition-colors ${isActive ? "text-teal-500" : "text-slate-400 dark:text-slate-500"}`} />
                  {t.label}
                  {!!t.badge && t.badge > 0 && (<span className="min-w-[18px] h-[18px] px-1.5 rounded-full text-[9px] font-black flex items-center justify-center bg-rose-500 text-white ml-1">{t.badge}</span>)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4" style={{ paddingBottom: `calc(160px + env(safe-area-inset-bottom, 0px))` }}>
        <AnimatePresence mode="wait">
          
          {tab === "support" && (
            <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_TRANSITION} className="space-y-5">
              {isAdmin && (
                <div className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-3 mb-5"><UserPlus className="w-5 h-5 text-teal-500" /><h3 className="text-sm font-black dark:text-white">افزودن پشتیبان</h3></div>
                  <form onSubmit={handleAddAgent} className="flex gap-2">
                    <input type="tel" placeholder="۰۹*********" value={agentPhone} onChange={e => setAgentPhone(e.target.value)} className="flex-1 h-12 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-500/20" />
                    <button type="submit" className="h-12 px-6 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-sm rounded-2xl hover:bg-teal-100 dark:hover:bg-teal-500/20 transition">افزودن</button>
                  </form>
                  {supportAgents?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {supportAgents.map((agent: string) => (
                        <span key={agent} className="inline-flex items-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-xl text-xs font-bold">
                          <Shield className="w-3.5 h-3.5" />{agent}
                          <button onClick={() => removeSupportAgent(agent)} className="text-rose-400 hover:text-rose-500 ml-1"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {tickets?.length === 0 ? <Empty message="هیچ تیکتی وجود ندارد" /> : tickets?.map((ticket: any) => (
                  <div key={ticket.id} className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur space-y-3">
                    <div className="flex justify-between items-start">
                      <div><p className="text-sm font-black dark:text-white">{ticket.subject}</p><p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{ticket.user_phone}</p></div>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">{ticket.message}</p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="پاسخ شما..." value={replyText[ticket.id] || ""} onChange={e => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))} className="flex-1 h-11 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-teal-100" />
                      <button onClick={() => handleReply(ticket.id)} className="h-11 px-5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl font-black text-sm"><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === "withdrawals" && isAdmin && (
            <motion.div key="withdrawals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_TRANSITION} className="space-y-3">
              {loadW ? <Loading /> : withdrawals.length === 0 ? <Empty message="درخواست تسویه‌ای وجود ندارد" /> : withdrawals.map((w: any) => (
                <div key={w.id} className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur space-y-3">
                  <div className="flex justify-between items-center">
                    <div><p className="text-sm font-black dark:text-white">{formatPrice(w.amount)} تومان</p><p className="text-[11px] text-slate-500 dark:text-slate-400">{w.user_phone}</p></div>
                    <StatusBadge status={w.status} />
                  </div>
                  {w.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => approveWithdrawal.mutate(w.id)} className="flex-1 h-11 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xs rounded-2xl hover:bg-teal-100 transition">تأیید</button>
                      <button onClick={() => rejectWithdrawal.mutate(w.id)} className="flex-1 h-11 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs rounded-2xl hover:bg-rose-100 transition">رد</button>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {tab === "products" && isAdmin && (
            <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_TRANSITION} className="space-y-3">
              {loadP ? <Loading /> : products.length === 0 ? <Empty message="محصول در انتظار تأیید وجود ندارد" /> : products.map((product: any) => (
                <div key={product.id} className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur space-y-4">
                  <div className="flex gap-4">
                    <img src={product.image || FALLBACK_PRODUCT} alt="" className="w-20 h-20 rounded-2xl object-cover border border-slate-100 dark:border-slate-700" />
                    <div className="flex-1">
                      <h3 className="text-sm font-black dark:text-white">{product.title || product.name}</h3>
                      <p className="text-teal-600 dark:text-teal-400 font-bold mt-1">{formatPrice(product.price)} تومان</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveProduct.mutate(product.id)} className="flex-1 h-11 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xs rounded-2xl hover:bg-teal-100 transition">تأیید</button>
                    <button onClick={() => rejectProduct.mutate(product.id)} className="flex-1 h-11 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs rounded-2xl hover:bg-rose-100 transition">رد</button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "reports" && isAdmin && (
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_TRANSITION} className="space-y-3">
              {loadR ? <Loading /> : reports.length === 0 ? <Empty message="گزارشی ثبت نشده" /> : reports.map((report: any) => (
                <div key={report.id} className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur space-y-3">
                  <div className="flex justify-between"><p className="text-sm font-black dark:text-white">{report.description || report.reason}</p><StatusBadge status={report.status} /></div>
                  {(report.status === "open" || report.status === "pending") && (
                    <button onClick={() => resolveReport.mutate(report.id)} className="w-full h-11 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xs rounded-2xl hover:bg-teal-100 transition">حل شد</button>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {tab === "users" && isAdmin && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_TRANSITION} className="space-y-3">
              {loadU ? <Loading /> : usersList.length === 0 ? <Empty message="کاربری یافت نشد" /> : usersList.map((usr: any) => (
                <div key={usr.id} className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur space-y-3">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-black dark:text-white">{usr.phone}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">{usr.name || "بدون نام"}</p></div>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"><UserCog className="w-3.5 h-3.5" /> {usr.role}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateUserRole.mutate({ userId: usr.id, role: "admin" })} className="flex-1 h-10 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-[11px] rounded-xl">ارتقا به ادمین</button>
                    <button onClick={() => updateUserRole.mutate({ userId: usr.id, role: "support" })} className="flex-1 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] rounded-xl">ارتقا به پشتیبان</button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "stores" && isAdmin && (
            <motion.div key="stores" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_TRANSITION} className="space-y-3">
              {loadS ? <Loading /> : storesList.length === 0 ? <Empty message="فروشگاهی ثبت نشده" /> : storesList.map((store: any) => (
                <div key={store.id} className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-50 dark:bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-500"><Store className="w-6 h-6" /></div>
                    <div><p className="text-sm font-black dark:text-white">{store.name}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">{store.phone || store.user_phone}</p></div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">{store.description}</p>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "settings" && isAdmin && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_TRANSITION} className="space-y-5">
              <div className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center"><Zap className="w-5 h-5 text-amber-500" /></div><h3 className="text-sm font-black dark:text-white">پورسانت بازاریابی (٪)</h3></div>
                <input type="number" value={refPct} onChange={e => setRefPct(Number(e.target.value))} className="w-full h-14 text-center font-black text-xl bg-slate-50 dark:bg-slate-900/50 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-500/20" />
              </div>

              <div className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center"><Crown className="w-5 h-5 text-blue-500" /></div><h3 className="text-sm font-black dark:text-white">مدیریت نشان‌ها</h3></div>
                <div className="bg-blue-50/60 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/40 mb-5">
                  <div className="flex items-center gap-2 mb-3"><BadgeCheck className="w-4 h-4 text-blue-500" /><span className="text-xs font-black text-blue-800 dark:text-blue-300">قیمت تیک آبی</span></div>
                  <input type="number" value={localBadges?.blue_tick?.price || 0} onChange={e => setLocalBadges(prev => ({ ...prev, blue_tick: { ...prev?.blue_tick, price: Number(e.target.value), label: "تیک آبی" } }))} className="w-full h-11 px-4 text-sm font-black bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-700/50 outline-none focus:border-blue-400 dark:focus:border-blue-500 transition" dir="ltr" />
                </div>
                <div className="space-y-3 mb-6">
                  {Object.entries(localBadges || {}).filter(([k]) => k !== "blue_tick").map(([key, config]) => (
                    <div key={key} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/50">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /><span className="text-xs font-black dark:text-slate-200">{config?.label || key}</span></div>
                        <button onClick={() => handleRemoveBadge(key)} className="text-rose-400 hover:text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex gap-2">
                        <input type="number" value={config?.price || 0} onChange={e => setLocalBadges(p => ({ ...p, [key]: { ...config, price: Number(e.target.value) } }))} placeholder="قیمت" className="flex-1 h-11 px-3 text-xs font-black bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 outline-none focus:border-teal-400 transition" dir="ltr" />
                        <input type="number" value={config?.duration_days || 0} onChange={e => setLocalBadges(p => ({ ...p, [key]: { ...config, duration_days: Number(e.target.value) } }))} placeholder="روز" className="w-24 h-11 text-center text-xs font-black bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 outline-none focus:border-teal-400 transition" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-700/50 pt-6">
                  <p className="text-xs font-black text-teal-600 dark:text-teal-400 mb-4 flex items-center gap-1.5"><Plus className="w-4 h-4" /> ساخت برچسب جدید</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input type="text" placeholder="نام (مثال: طلایی)" value={newBadge.label} onChange={e => setNewBadge(p => ({ ...p, label: e.target.value }))} className="h-11 px-3 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:border-teal-400 dark:text-white transition" />
                    <input type="text" placeholder="شناسه (اختیاری)" value={newBadge.key} onChange={e => setNewBadge(p => ({ ...p, key: e.target.value }))} className="h-11 px-3 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl font-mono outline-none focus:border-teal-400 dark:text-white transition" dir="ltr" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <input type="number" placeholder="قیمت" value={newBadge.price} onChange={e => setNewBadge(p => ({ ...p, price: e.target.value }))} className="h-11 px-3 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:border-teal-400 dark:text-white transition" />
                    <input type="number" placeholder="تعداد روز" value={newBadge.duration} onChange={e => setNewBadge(p => ({ ...p, duration: e.target.value }))} className="h-11 px-3 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:border-teal-400 dark:text-white transition" />
                  </div>
                  <button onClick={handleAddBadge} className="w-full h-12 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-sm rounded-2xl hover:bg-teal-100 dark:hover:bg-teal-500/20 transition active:scale-[0.98]">افزودن به لیست</button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center"><Key className="w-5 h-5 text-slate-500" /></div><h3 className="text-sm font-black dark:text-white">توکن‌های API</h3></div>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 dark:text-slate-500">PayPing</div>
                    <input type="text" value={payToken} onChange={e => setPayToken(e.target.value)} placeholder="توکن پی‌پینگ" className="w-full h-12 pl-4 pr-20 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-xs font-mono outline-none focus:border-teal-400 dark:text-white transition" dir="ltr" />
                  </div>
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 dark:text-slate-500">SMS</div>
                    <input type="text" value={smsToken} onChange={e => setSmsToken(e.target.value)} placeholder="توکن کاوه‌نگار" className="w-full h-12 pl-4 pr-20 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-xs font-mono outline-none focus:border-teal-400 dark:text-white transition" dir="ltr" />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 pb-2 bg-gradient-to-t from-[#F8FAFC] dark:from-[#0B0F19] via-transparent sticky bottom-0">
                <button onClick={handleSaveSettings} disabled={saveSettingsMut.isPending} className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-[24px] font-black text-sm shadow-xl shadow-teal-500/30 dark:shadow-none active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active-scale-100">
                  {saveSettingsMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> ذخیره تمام تغییرات</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}