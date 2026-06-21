import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useSupport } from "../context/SupportContext";
import {
  Users,
  ShoppingBag,
  AlertTriangle,
  ShieldCheck,
  LogOut,
  Settings as SettingsIcon,
  Save,
  Headset,
  MessageSquare,
  CheckCircle2,
  UserPlus,
  Trash2,
  Ban,
  Eye,
  CheckCircle,
  XCircle,
  Store,
  Loader2,
  Search,
  ArrowLeft,
  Crown,
  Zap,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  Send,
} from "lucide-react";
import { cn } from "../utils";

type TabKey = "support" | "users" | "products" | "reports" | "settings";

type PendingProduct = {
  id: number | string;
  name: string;
  image_url?: string | null;
  store_id: number | string;
  price?: number | null;
};

type ReportItem = {
  id: number;
  product_id: number;
  reason: string;
  status: "pending" | "resolved" | string;
  created_at: string;
};

type UserItem = {
  id: number;
  name?: string | null;
  phone: string;
  role: "seller" | "buyer" | string;
  is_banned: number;
  has_business_license: number;
  store_name?: string | null;
};

type Stats = {
  users: number;
  stores: number;
  reports: number;
};

type BadgeConfig = { price: number; duration: number };
type BadgeConfigsMap = Record<string, BadgeConfig>;

export default function AdminPanel() {
  const { user, logout, supportAgents, addSupportAgent, removeSupportAgent } = useAuth();
  const navigate = useNavigate();
  const { referralPercentage, badgeConfigs, updateReferralPercentage, updateBadgeConfig } =
    useSettings();
  const { tickets, replyTicket } = useSupport();

  const [activeTab, setActiveTab] = useState<TabKey>("support");

  const [localRefPercent, setLocalRefPercent] = useState<number>(referralPercentage);
  const [localBadgeConfigs, setLocalBadgeConfigs] = useState<BadgeConfigsMap>(
    badgeConfigs as BadgeConfigsMap
  );
  const [paypingToken, setPaypingToken] = useState("");

  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [newAgentPhone, setNewAgentPhone] = useState("");

  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [stats, setStats] = useState<Stats>({ users: 0, stores: 0, reports: 0 });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalRefPercent(referralPercentage);
  }, [referralPercentage]);

  useEffect(() => {
    setLocalBadgeConfigs(badgeConfigs as BadgeConfigsMap);
  }, [badgeConfigs]);

  const fetchStats = useCallback(() => {
    setStats({
      users: usersList.length > 0 ? usersList.length : 1245,
      stores: 342,
      reports: reports.length,
    });
  }, [usersList.length, reports.length]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.PAYPING_TOKEN) setPaypingToken(String(data.PAYPING_TOKEN));
    } catch {
      // intentionally silent
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setUsersList(data as UserItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports((data as ReportItem[]).filter((r) => r.status === "pending"));
      }
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const fetchPendingProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/pending");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setPendingProducts(data as PendingProduct[]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "products") fetchPendingProducts();
    else if (activeTab === "reports") fetchReports();
    else if (activeTab === "users") fetchUsers();
    else if (activeTab === "settings") fetchSettings();

    fetchStats();
  }, [activeTab, fetchPendingProducts, fetchReports, fetchUsers, fetchSettings, fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleToggleVerification = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? false : true;
      const res = await fetch(`/api/admin/users/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verify: newStatus }),
      });
      if (!res.ok) throw new Error("verify failed");
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, has_business_license: newStatus ? 1 : 0 } : u
        )
      );
    } catch {
      alert("خطا در ارتباط با سرور");
    }
  };

  const handleToggleBan = async (id: number, currentStatus: number) => {
    if (
      !window.confirm(
        currentStatus
          ? "آیا از رفع مسدودی این کاربر مطمئن هستید؟"
          : "آیا از مسدود کردن این کاربر مطمئن هستید؟"
      )
    )
      return;
    try {
      const newStatus = currentStatus === 1 ? false : true;
      const res = await fetch(`/api/admin/users/${id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ban: newStatus }),
      });
      if (!res.ok) throw new Error("ban failed");
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, is_banned: newStatus ? 1 : 0 } : u
        )
      );
    } catch {
      alert("خطا در ارتباط با سرور");
    }
  };

  const handleResolveReport = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/${id}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error("resolve failed");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("خطا در بررسی گزارش.");
    }
  };

  const handleDeleteProductFromReport = async (productId: number, reportId: number) => {
    if (
      !window.confirm(
        "آیا مطمئن هستید که می‌خواهید این محصول را به دلیل تخلف کاملاً پاک کنید؟"
      )
    )
      return;
    try {
      const delRes = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!delRes.ok) throw new Error("delete product failed");
      const resolveRes = await fetch(`/api/reports/${reportId}/resolve`, { method: "POST" });
      if (!resolveRes.ok) throw new Error("resolve report failed");

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      alert("محصول متخلف با موفقیت حذف شد.");
    } catch {
      alert("خطا در حذف محصول.");
    }
  };

  const handleApproveProduct = async (id: string | number) => {
    try {
      const res = await fetch(`/api/admin/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("approve failed");
      setPendingProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("خطا در تایید محصول.");
    }
  };

  const handleRejectProduct = async (id: string | number) => {
    try {
      const res = await fetch(`/api/admin/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("reject failed");
      setPendingProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("خطا در رد محصول.");
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      updateReferralPercentage(localRefPercent);

      Object.entries(localBadgeConfigs).forEach(([badge, config]) => {
        updateBadgeConfig(badge, config);
      });

      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "PAYPING_TOKEN", value: paypingToken }),
      });

      alert("تنظیمات با موفقیت ذخیره شد.");
    } catch {
      alert("خطا در ذخیره تنظیمات.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReply = (ticketId: string) => {
    if (replyText[ticketId]?.trim()) {
      replyTicket(ticketId, replyText[ticketId]);
      setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
    }
  };

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAgentPhone.length === 11 && newAgentPhone.startsWith("09")) {
      addSupportAgent(newAgentPhone);
      setNewAgentPhone("");
    } else {
      alert("شماره موبایل نامعتبر است.");
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "support")) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-red-50/90 backdrop-blur-sm text-red-700 p-8 rounded-3xl border border-red-200 shadow-2xl max-w-sm w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </motion.div>
          <h2 className="text-2xl font-black mb-2 text-center">دسترسی غیرمجاز</h2>
          <p className="text-sm font-medium text-red-600/80 text-center mb-6">
            شما دسترسی لازم برای مشاهده پنل مدیریت را ندارید.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/")}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3.5 rounded-2xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all shadow-md"
          >
            بازگشت به خانه
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/20 pb-20 relative overflow-hidden"
      dir="rtl"
    >
      {/* نورهای تزئینی */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-200/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl" />
      </div>

      {/* هدر */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white pt-[max(1.5rem,env(safe-area-inset-top))] px-6 pb-8 shadow-2xl shadow-gray-900/20 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-teal-500 rounded-full blur-3xl opacity-20" />
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-cyan-500 rounded-full blur-3xl opacity-10" />

        <div className="flex justify-between items-center mb-8 relative z-10">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Crown className="w-8 h-8 text-amber-400" />
              </motion.div>
              پنل مدیریت
            </h1>
            <p className="text-gray-300 text-xs font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              مدیر: {user.phone}
            </p>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.08, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="w-12 h-12 bg-red-500/20 border border-red-400/30 rounded-xl flex items-center justify-center hover:bg-red-500 hover:border-red-500 transition-all text-red-300 hover:text-white group"
            title="خروج از سیستم"
          >
            <LogOut className="w-6 h-6 group-hover:rotate-180 transition-transform duration-300" />
          </motion.button>
        </div>

        {/* کارت‌های آمار */}
        <motion.div
          className="grid grid-cols-3 gap-3 relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {[
            {
              label: "کاربران",
              value: stats.users,
              icon: Users,
              color: "from-teal-400 to-cyan-400",
              bgColor: "bg-teal-500/20",
            },
            {
              label: "فروشگاه‌ها",
              value: stats.stores,
              icon: Store,
              color: "from-emerald-400 to-green-400",
              bgColor: "bg-emerald-500/20",
            },
            {
              label: "گزارشات",
              value: stats.reports,
              icon: AlertTriangle,
              color: "from-red-400 to-rose-400",
              bgColor: "bg-red-500/20",
              hasAlert: stats.reports > 0,
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                whileHover={{ y: -4, boxShadow: "0 20px 30px rgba(0,0,0,0.2)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className={`${stat.bgColor} backdrop-blur-md rounded-2xl p-4 border border-white/10 relative overflow-hidden`}
              >
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br" />
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {stat.hasAlert && (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2.5 h-2.5 bg-red-400 rounded-full"
                    />
                  )}
                </div>
                <div className="text-3xl font-black mb-1 relative z-10">
                  {stat.value.toLocaleString("fa-IR")}
                </div>
                <div className="text-xs font-bold text-gray-200 relative z-10">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.header>

      {/* تب‌ها */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex px-4 py-6 gap-2 overflow-x-auto hide-scrollbar snap-x relative z-20 -mt-4"
      >
        {[
          { key: "support" as TabKey, label: "پشتیبانی", icon: Headset },
          ...(user.role === "admin"
            ? [
                { key: "products" as TabKey, label: "محصولات", icon: ShoppingBag },
                { key: "reports" as TabKey, label: "گزارشات", icon: AlertTriangle },
                { key: "users" as TabKey, label: "کاربران", icon: Users },
                { key: "settings" as TabKey, label: "تنظیمات", icon: SettingsIcon },
              ]
            : []),
        ].map((tab, idx) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const badgeCount =
            tab.key === "reports" ? reports.length : tab.key === "products" ? pendingProducts.length : 0;

          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveTab(tab.key)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className={cn(
                "snap-center shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-sm border relative",
                isActive
                  ? "bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white border-teal-600 shadow-lg shadow-teal-500/30"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {badgeCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={cn(
                    "w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-black",
                    tab.key === "reports"
                      ? "bg-red-500 text-white"
                      : "bg-amber-500 text-white"
                  )}
                >
                  {badgeCount}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* محتوای تب‌ها */}
      <div className="px-4 relative z-10 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* ===================== TAB: SUPPORT ===================== */}
          {activeTab === "support" && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              className="space-y-6"
            >
              {user.role === "admin" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-gray-100"
                >
                  <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-teal-600" />
                    </div>
                    افزودن پشتیبان جدید
                  </h3>
                  <form onSubmit={handleAddAgent} className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="tel"
                        value={newAgentPhone}
                        onChange={(e) => setNewAgentPhone(e.target.value)}
                        placeholder="09xxxxxxxxx"
                        className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-left focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm font-mono hover:border-gray-300 transition-colors"
                        dir="ltr"
                        maxLength={11}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                      >
                        افزودن
                      </motion.button>
                    </div>
                  </form>

                  {/* لیست پشتیبانان */}
                  <div className="mt-5 pt-5 border-t border-gray-200">
                    {supportAgents.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        هنوز پشتیبانی اضافه نشده است
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {supportAgents.map((agent) => (
                          <motion.div
                            key={agent}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl border border-gray-200 hover:border-teal-300 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-sm">
                                <Headset className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-sm font-bold text-gray-800 font-mono">{agent}</span>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeSupportAgent(agent)}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="حذف پشتیبان"
                            >
                              <Trash2 className="w-5 h-5" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* تیکت‌های پشتیبانی */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-indigo-600" />
                  </div>
                  تیکت‌های باز
                  {tickets.length > 0 && (
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black"
                    >
                      {tickets.length} تیکت
                    </motion.span>
                  )}
                </h3>

                {tickets.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-gray-400 py-12 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300"
                  >
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-bold">تیکتی برای پاسخ وجود ندارد</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket, idx) => (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-gray-900 mb-2">
                              {ticket.subject}
                            </h4>
                            <p className="text-xs text-gray-500 font-bold flex items-center gap-2 flex-wrap">
                              <span className="bg-gray-100 px-2.5 py-1 rounded-md">
                                {ticket.userName}
                              </span>
                              <span className="bg-gray-100 px-2.5 py-1 rounded-md font-mono">
                                {ticket.userPhone}
                              </span>
                              <span className="flex items-center gap-1 text-gray-400">
                                <Clock className="w-3.5 h-3.5" />
                                {ticket.createdAt}
                              </span>
                            </p>
                          </div>
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap ${
                              ticket.status === "closed"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {ticket.status === "closed" ? "✓ پاسخ داده شده" : "◎ نیاز به پاسخ"}
                          </motion.span>
                        </div>

                        {/* پیام کاربر */}
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
                          <p className="text-xs text-gray-700 leading-relaxed font-medium">
                            {ticket.message}
                          </p>
                        </div>

                        {/* پاسخ یا فرم پاسخ */}
                        {ticket.status === "open" ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-3"
                          >
                            <textarea
                              value={replyText[ticket.id] || ""}
                              onChange={(e) =>
                                setReplyText((prev) => ({
                                  ...prev,
                                  [ticket.id]: e.target.value,
                                }))
                              }
                              placeholder="پاسخ خود را اینجا وارد کنید..."
                              className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none resize-none hover:border-gray-300 transition-colors"
                              rows={3}
                            />
                            <motion.button
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleReply(ticket.id)}
                              className="w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              ارسال پاسخ
                            </motion.button>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-green-50 border border-green-200 rounded-2xl p-4"
                          >
                            <p className="text-xs font-black text-green-800 mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" /> پاسخ پشتیبانی
                            </p>
                            <p className="text-xs text-green-900 leading-relaxed font-medium">
                              {ticket.reply}
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ===================== TAB: SETTINGS ===================== */}
          {activeTab === "settings" && user.role === "admin" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              className="space-y-6"
            >
              {/* بخش پورسانت */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-gray-100"
              >
                <h3 className="font-black text-lg text-gray-900 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-teal-600" />
                  </div>
                  پورسانت شبکه‌ای (بازاریابی)
                </h3>
                <div className="flex items-center gap-4 bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-2xl border border-gray-200">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600 mb-2 block">
                      درصد سود معرف
                    </label>
                    <input
                      type="number"
                      value={localRefPercent}
                      onChange={(e) => setLocalRefPercent(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center font-black text-lg text-teal-600 focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none hover:border-gray-300 transition-colors"
                      min="0"
                      max="100"
                      dir="ltr"
                    />
                  </div>
                  <span className="text-3xl font-black text-gray-300">%</span>
                </div>
              </motion.div>

              {/* بخش برچسب‌ها */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-gray-100"
              >
                <h3 className="font-black text-lg text-gray-900 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-600" />
                  </div>
                  تعرفه برچسب‌های ویژه (VIP)
                </h3>
                <div className="space-y-4">
                  {Object.entries(localBadgeConfigs).map(([badge, config], idx) => (
                    <motion.div
                      key={badge}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + idx * 0.05 }}
                      className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 hover:border-amber-300 transition-colors"
                    >
                      <h4 className="text-sm font-black text-gray-900 mb-4">{badge}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-2 block">
                            قیمت (تومان)
                          </label>
                          <input
                            type="number"
                            value={config.price}
                            onChange={(e) =>
                              setLocalBadgeConfigs((prev) => ({
                                ...prev,
                                [badge]: {
                                  ...prev[badge],
                                  price: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-left font-bold text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none hover:border-gray-300 transition-colors"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-2 block">
                            مدت اعتبار (روز)
                          </label>
                          <input
                            type="number"
                            value={config.duration}
                            onChange={(e) =>
                              setLocalBadgeConfigs((prev) => ({
                                ...prev,
                                [badge]: {
                                  ...prev[badge],
                                  duration: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-left font-bold text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none hover:border-gray-300 transition-colors"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* دکمه ذخیره */}
              <motion.button
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSaveSettings}
                disabled={isSaving}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-gray-900/20 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
              >
                {isSaving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    در حال ذخیره...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    ذخیره تمامی تنظیمات
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* ===================== TAB: USERS ===================== */}
          {activeTab === "users" && user.role === "admin" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              className="space-y-4"
            >
              {loadingUsers ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-3 border-teal-200 border-t-teal-500 rounded-full"
                  />
                </div>
              ) : usersList.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-400 py-12 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300"
                >
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold">کاربری برای نمایش وجود ندارد</p>
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {usersList.map((userItem, idx) => (
                    <motion.div
                      key={userItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                          <span className="text-white font-black text-lg">
                            {(userItem.name || "ک")[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-gray-900 text-sm flex items-center gap-2 flex-wrap mb-1">
                            {userItem.name || "کاربر جدید"}
                            {userItem.is_banned ? (
                              <span className="bg-red-100 text-red-600 text-[9px] px-2 py-0.5 rounded-md font-bold">
                                🚫 مسدود
                              </span>
                            ) : null}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono font-bold truncate">
                            {userItem.phone}
                          </p>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold inline-block mt-2">
                            {userItem.role === "seller" ? "🏪 فروشنده" : "🛍️ خریدار"}
                          </span>
                          {userItem.store_name && (
                            <p className="text-xs font-bold text-teal-600 mt-2 flex items-center gap-1">
                              <Store className="w-3 h-3" />
                              {userItem.store_name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* دکمه‌های اقدام */}
                      <div className="flex gap-2 pt-4 border-t border-gray-200">
                        {userItem.store_name && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              handleToggleVerification(userItem.id, userItem.has_business_license)
                            }
                            className={`flex-1 text-[11px] py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                              userItem.has_business_license
                                ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {userItem.has_business_license ? "تایید شد" : "تایید"}
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleToggleBan(userItem.id, userItem.is_banned)}
                          className={`flex-1 text-[11px] py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all border ${
                            userItem.is_banned
                              ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                              : "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                          }`}
                        >
                          <Ban className="w-4 h-4" />
                          {userItem.is_banned ? "رفع مسدودی" : "مسدود کردن"}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ===================== TAB: PRODUCTS ===================== */}
          {activeTab === "products" && user.role === "admin" && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              className="space-y-4"
            >
              {loadingProducts ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-3 border-amber-200 border-t-amber-500 rounded-full"
                  />
                </div>
              ) : pendingProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-400 py-12 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300"
                >
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold">محصولی برای بررسی وجود ندارد</p>
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {pendingProducts.map((product, idx) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-200 transition-all"
                    >
                      <div className="flex gap-3 mb-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-sm">
                          <img
                            src={
                              product.image_url ||
                              `https://picsum.photos/seed/${product.id}/200/200`
                            }
                            className="w-full h-full object-cover"
                            alt="محصول"
                          />
                        </div>
                        <div className="flex-1 py-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-black text-sm text-gray-900 line-clamp-2">
                              {product.name}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-1.5 font-bold bg-gray-100 inline-block px-2 py-0.5 rounded-md">
                              فروشگاه: {product.store_id}
                            </p>
                          </div>
                          <span className="text-sm font-black text-teal-600">
                            {typeof product.price === "number"
                              ? `${product.price.toLocaleString("fa-IR")} تومان`
                              : "توافقی"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/product/${product.id}`}
                          className="w-10 flex items-center justify-center bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                          title="مشاهده محصول"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleApproveProduct(product.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all"
                        >
                          <CheckCircle className="w-4 h-4" /> تایید
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleRejectProduct(product.id)}
                          className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 hover:bg-red-100 transition-all"
                        >
                          <XCircle className="w-4 h-4" /> رد
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ===================== TAB: REPORTS ===================== */}
          {activeTab === "reports" && user.role === "admin" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              className="space-y-4"
            >
              {loadingReports ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-3 border-red-200 border-t-red-500 rounded-full"
                  />
                </div>
              ) : reports.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-400 py-12 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300"
                >
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold">گزارشی برای بررسی وجود ندارد</p>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {reports.map((report, idx) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-red-50/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border-2 border-red-200 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-red-500 to-rose-500" />
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-[10px] font-black text-red-700 bg-red-100 px-3 py-1 rounded-md border border-red-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> تخلف ثبت شده
                        </span>
                        <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(report.created_at).toLocaleDateString("fa-IR")}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-gray-900 mb-2">
                        محصول ID: {report.product_id}
                      </h4>
                      <p className="text-xs text-gray-700 mb-4 bg-white p-4 rounded-xl border border-red-100 leading-relaxed font-medium">
                        💬 "{report.reason}"
                      </p>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <Link
                            to={`/product/${report.product_id}`}
                            className="flex-1 bg-white text-gray-700 border-2 border-gray-200 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:border-teal-300 hover:bg-teal-50 transition-all"
                          >
                            <Eye className="w-4 h-4" /> مشاهده
                          </Link>
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleResolveReport(report.id)}
                            className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-800 transition-all shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" /> رد گزارش
                          </motion.button>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleDeleteProductFromReport(report.product_id, report.id)}
                          className="w-full bg-gradient-to-r from-red-500 to-rose-500 text-white py-3 rounded-lg text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> حذف محصول (تخلف)
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}