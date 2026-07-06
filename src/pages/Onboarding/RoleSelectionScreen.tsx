import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Store, Megaphone, ArrowRight, CheckCircle2 } from "lucide-react";

/* ====================== TYPES ====================== */

export type UserRole = "buyer" | "seller" | "marketer";

interface RoleOption {
  role: UserRole;
  label: string;
  desc: string;
  icon: React.ComponentType<any>;
}

interface RoleSelectionScreenProps {
  selectedRole: UserRole;
  onRoleSelect: (role: UserRole) => void;
  onNext: () => void;
}

/* ====================== COMPONENT ====================== */

const ROLES: RoleOption[] = [
  {
    role: "buyer",
    label: "خریدار هستم",
    desc: "جستجو و خرید از فروشگاه‌های اطراف",
    icon: ShoppingBag,
  },
  {
    role: "seller",
    label: "فروشگاه دارم",
    desc: "ثبت رایگان کالا و فروش سریع‌تر",
    icon: Store,
  },
  {
    role: "marketer",
    label: "بازاریاب",
    desc: "کسب درآمد از معرفی فروشندگان",
    icon: Megaphone,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

export default function RoleSelectionScreen({
  selectedRole,
  onRoleSelect,
  onNext,
}: RoleSelectionScreenProps) {
  const isSellerSelected = useMemo(() => selectedRole === "seller", [selectedRole]);

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-[#0B0F19] flex flex-col relative overflow-hidden font-sans" dir="rtl">
      {/* Background Halos */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 dark:bg-cyan-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 dark:bg-violet-500/15 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 z-10">
        <h1 className="text-lg font-black text-gray-900 dark:text-white">نقش خود را انتخاب کنید</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          این انتخاب بعداً قابل تغییر است
        </p>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-5 w-full z-10 py-10">
        <motion.div
          className="grid grid-cols-1 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {ROLES.map((roleOption) => {
            const Icon = roleOption.icon;
            const isSelected = selectedRole === roleOption.role;

            return (
              <motion.button
                key={roleOption.role}
                variants={itemVariants}
                onClick={() => onRoleSelect(roleOption.role)}
                whileTap={{ scale: 0.98 }}
                className={`relative group p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-cyan-300 dark:hover:border-cyan-700"
                }`}
              >
                {/* Background gradient on hover/select */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 transition-opacity duration-300 ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                  }`}
                />

                {/* Content */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isSelected
                        ? "bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30"
                        : "bg-gray-100 dark:bg-slate-700 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isSelected ? "text-white" : "text-gray-600 dark:text-gray-400"
                      }`}
                    />
                  </div>

                  <div className="flex-1 text-right">
                    <h3 className="font-black text-base text-gray-900 dark:text-white mb-1">
                      {roleOption.label}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {roleOption.desc}
                    </p>
                  </div>

                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Additional info for sellers */}
        {isSellerSelected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50"
          >
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
              به عنوان فروشگاه‌دار، شما میتوانید کالاهای خود را ثبت کنید و مشتریان را جذب کنید.
            </p>
          </motion.div>
        )}

        {/* Next Button */}
        <motion.button
          onClick={onNext}
          whileTap={{ scale: 0.97 }}
          className="w-full h-16 bg-gradient-to-r from-cyan-500 via-teal-400 to-violet-500 text-white rounded-[22px] font-black text-base shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-3 group"
        >
          <motion.div className="flex items-center gap-3">
            ادامه
            <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </motion.div>
        </motion.button>
      </main>
    </div>
  );
}
