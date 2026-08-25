import React from "react";
import { Users, TrendingUp, CreditCard, Clock, Shield, Crown, Gem } from "lucide-react";

interface Props {
  totalEarned: number;
  totalWithdrawn: number;
  referredUsers: number;
  pendingCommissions: number;
}

// تعریف رتبه‌ها و آستانه‌ها
const TIERS = [
  { name: "سنگ خام", min: 0, max: 4, icon: Shield, color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700", barColor: "bg-gray-400 dark:bg-gray-500", glow: "" },
  { name: "برنزی", min: 5, max: 14, icon: Shield, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20", barColor: "bg-amber-500", glow: "" },
  { name: "نقره‌ای", min: 15, max: 29, icon: Shield, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-500/10", border: "border-slate-200 dark:border-slate-500/20", barColor: "bg-slate-400", glow: "" },
  { name: "طلایی", min: 30, max: 49, icon: Crown, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10", border: "border-yellow-200 dark:border-yellow-500/20", barColor: "bg-yellow-400", glow: "shadow-md shadow-yellow-500/20" },
  { name: "الماس", min: 50, max: Infinity, icon: Gem, color: "text-cyan-500 dark:text-cyan-300", bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/20", barColor: "bg-cyan-400", glow: "shadow-lg shadow-cyan-500/30" },
];

function getUserTier(referredUsers: number) {
  // پیدا کردن رتبه فعلی
  const currentTier = TIERS.find(t => referredUsers >= t.min && referredUsers <= t.max) || TIERS[0];
  const currentTierIndex = TIERS.indexOf(currentTier);
  const nextTier = TIERS[currentTierIndex + 1] || null;

  // محاسبه درصد پیشرفت
  let progressPercent = 100;
  let remaining = 0;

  if (nextTier) {
    const range = currentTier.max - currentTier.min + 1;
    const current = referredUsers - currentTier.min;
    progressPercent = Math.min(Math.floor((current / range) * 100), 100);
    remaining = nextTier.min - referredUsers;
  }

  return { currentTier, nextTier, progressPercent, remaining };
}

export default function StatsGrid({
  totalEarned,
  totalWithdrawn,
  referredUsers,
  pendingCommissions,
}: Props) {
  
  const { currentTier, nextTier, progressPercent, remaining } = getUserTier(referredUsers);
  const TierIcon = currentTier.icon;

  const financialStats = [
    {
      label: "کل درآمد",
      value: `${totalEarned.toLocaleString("fa-IR")} تومان`,
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "برداشت شده",
      value: `${totalWithdrawn.toLocaleString("fa-IR")} تومان`,
      icon: CreditCard,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "درآمد در انتظار",
      value: `${pendingCommissions.toLocaleString("fa-IR")} تومان`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-3">
      {/* کارت مسیر قهرمانی و رتبه‌بندی */}
      <div className={`col-span-2 rounded-3xl p-4 border shadow-sm ${currentTier.bg} ${currentTier.border} ${currentTier.glow} transition-all duration-500`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-white/50 dark:bg-black/20 ${currentTier.color}`}>
              <TierIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-500 dark:text-gray-400">رتبه فعلی شما</div>
              <div className={`text-sm font-black ${currentTier.color} flex items-center gap-1.5`}>
                {currentTier.name}
              </div>
            </div>
          </div>
          
          <div className="text-left">
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
              <Users className="w-3 h-3" /> دعوت موفق
            </div>
            <div className="text-lg font-black text-gray-900 dark:text-white">
              {referredUsers.toLocaleString("fa-IR")}
            </div>
          </div>
        </div>

        {/* نوار پیشرفت */}
        <div className="w-full bg-white/30 dark:bg-black/20 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`${currentTier.barColor} h-full rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-2 text-center">
          {nextTier ? (
            <p className="text-[10px] font-black text-gray-600 dark:text-gray-300">
              فقط <span className="text-indigo-600 dark:text-indigo-400">{remaining}</span> نفر تا رتبه <span className={`${nextTier.color}`}>{nextTier.name}</span> فاصله داری!
            </p>
          ) : (
            <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-300">
              🎉 به بالاترین رتبه رسیدی! سلطان معرفی‌ها
            </p>
          )}
        </div>
      </div>

      {/* کارت‌های مالی */}
      <div className="grid grid-cols-3 gap-2">
        {financialStats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm text-center"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2 ${item.bg} ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-[9px] font-black mb-1">
                {item.label}
              </div>
              <div className="font-black text-[11px] text-gray-900 dark:text-gray-100 leading-tight">
                {item.value}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}