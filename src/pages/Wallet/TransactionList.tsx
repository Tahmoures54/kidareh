// src/pages/Wallet/TransactionList.tsx
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Gift,
  AlertCircle,
  Filter,
  Calendar,
  Search,
  X,
  Loader2,
  PackageOpen,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type TransactionType = "commission" | "withdrawal" | "bonus" | "refund";
export type TransactionStatus = "success" | "pending" | "failed" | "cancelled";

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  title: string;
  description?: string;
  amount: number;
  date: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
  groupByDate?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TRANSACTION_STYLES = {
  commission: {
    icon: ArrowDownLeft,
    bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50",
    borderColor: "border-emerald-200/60",
    textColor: "text-emerald-600",
    amountColor: "text-emerald-700",
    amountBg: "bg-emerald-100/50",
    iconBg: "bg-emerald-100",
    label: "پورسانت",
    emoji: "💰",
  },
  withdrawal: {
    icon: CreditCard,
    bgColor: "bg-gradient-to-br from-rose-50 to-pink-50",
    borderColor: "border-rose-200/60",
    textColor: "text-rose-600",
    amountColor: "text-rose-700",
    amountBg: "bg-rose-100/50",
    iconBg: "bg-rose-100",
    label: "تسویه",
    emoji: "💳",
  },
  bonus: {
    icon: Gift,
    bgColor: "bg-gradient-to-br from-purple-50 to-violet-50",
    borderColor: "border-purple-200/60",
    textColor: "text-purple-600",
    amountColor: "text-purple-700",
    amountBg: "bg-purple-100/50",
    iconBg: "bg-purple-100",
    label: "جایزه",
    emoji: "🎁",
  },
  refund: {
    icon: ArrowUpRight,
    bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50",
    borderColor: "border-blue-200/60",
    textColor: "text-blue-600",
    amountColor: "text-blue-700",
    amountBg: "bg-blue-100/50",
    iconBg: "bg-blue-100",
    label: "بازگشت",
    emoji: "↩️",
  },
} as const;

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    label: "موفق",
    bgColor: "bg-emerald-100/80",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
  },
  pending: {
    icon: Clock,
    label: "در حال بررسی",
    bgColor: "bg-amber-100/80",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  failed: {
    icon: XCircle,
    label: "ناموفق",
    bgColor: "bg-red-100/80",
    textColor: "text-red-700",
    borderColor: "border-red-200",
  },
  cancelled: {
    icon: X,
    label: "لغو شده",
    bgColor: "bg-gray-100/80",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
  },
} as const;

// ============================================================================
// Helper Components
// ============================================================================

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl animate-pulse" />
      <div className="h-4 w-40 bg-gray-200 rounded-lg animate-pulse" />
    </div>

    {[...Array(4)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 bg-gray-300 rounded-lg animate-pulse" />
            <div className="h-2 w-1/2 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-4 w-24 bg-gray-300 rounded-lg animate-pulse" />
        </div>
      </motion.div>
    ))}
  </div>
);

interface StatusBadgeProps {
  status: TransactionStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[9px] font-black border ${config.bgColor} ${config.textColor} ${config.borderColor} shadow-sm`}
    >
      <IconComponent className="w-3 h-3" />
      {config.label}
    </motion.div>
  );
};

const EmptyState: React.FC<{ hasSearch: boolean }> = ({ hasSearch }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-12 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 rounded-3xl border-2 border-dashed border-gray-300/50 relative overflow-hidden"
  >
    <div className="absolute -top-12 -left-12 w-24 h-24 bg-gray-200/10 rounded-full blur-2xl pointer-events-none" />

    <div className="relative z-10">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
      >
        <PackageOpen className="w-8 h-8 text-gray-500" />
      </motion.div>
      <p className="text-base font-black text-gray-700 mb-2">تراکنشی یافت نشد</p>
      <p className="text-sm text-gray-500">
        {hasSearch
          ? "🔍 با عبارت جستجو شده تراکنشی موجود نیست."
          : "📊 هنوز تراکنشی ثبت‌نام نشده است."}
      </p>
    </div>
  </motion.div>
);

interface TransactionCardProps {
  transaction: Transaction;
  index: number;
  onClick?: () => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, index, onClick }) => {
  const style = TRANSACTION_STYLES[transaction.type];
  const statusConfig = STATUS_CONFIG[transaction.status];
  const IconComponent = style.icon;

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400 }}
      onClick={onClick}
      className={`w-full text-right rounded-2xl border ${style.borderColor} ${style.bgColor} p-4 shadow-sm hover:shadow-lg transition-all active:scale-[0.98] backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0 border border-white/60`}
        >
          <IconComponent className={`w-6 h-6 ${style.textColor}`} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-black text-gray-900 truncate flex items-center gap-1.5">
              <span>{style.emoji}</span>
              {transaction.title}
            </h4>
            <StatusBadge status={transaction.status} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-600 truncate">
              {transaction.description || "بدون توضیح"}
            </p>
            <span
              className={`text-sm font-black ${style.amountColor} ${style.amountBg} px-3 py-1 rounded-lg whitespace-nowrap`}
            >
              {transaction.amount > 0 ? "+" : ""}
              {transaction.amount.toLocaleString("fa-IR")}
              <span className="text-[10px] text-gray-600 mr-1">تومان</span>
            </span>
          </div>

          {transaction.referenceId && (
            <p className="text-[9px] text-gray-500 mt-1.5 select-all">
              ID: {transaction.referenceId}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
};

interface DateHeaderProps {
  date: string;
  count: number;
  isSticky?: boolean;
}

const DateHeader: React.FC<DateHeaderProps> = ({ date, count, isSticky = false }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className={`flex items-center gap-3 px-2 py-3 ${
      isSticky ? "bg-white/80 backdrop-blur-lg z-20 rounded-lg mb-2" : "bg-transparent"
    }`}
  >
    <motion.div
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      className="text-lg"
    >
      📅
    </motion.div>
    <span className="text-xs font-black text-gray-700">{date}</span>
    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-300" />
    <span className="text-[10px] font-bold text-gray-500 px-2 py-1 rounded-lg bg-gray-100/60">
      {count} تراکنش
    </span>
  </motion.div>
);

// ============================================================================
// Main Component
// ============================================================================

export default function TransactionList({
  transactions,
  loading = false,
  onTransactionClick,
  groupByDate = true,
}: TransactionListProps) {
  const [filter, setFilter] = useState<"all" | TransactionType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filteredTransactions = useMemo(() => {
    let result = [...(transactions || [])];

    if (filter !== "all") {
      result = result.filter((tx) => tx.type === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.title.toLowerCase().includes(query) ||
          (tx.description || "").toLowerCase().includes(query) ||
          (tx.referenceId || "").toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [transactions, filter, searchQuery, sortOrder]);

  const groupedTransactions = useMemo(() => {
    if (!groupByDate) {
      return { all: filteredTransactions };
    }

    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const dateKey = tx.date.split(" ")[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });

    return groups;
  }, [filteredTransactions, groupByDate]);

  const statistics = useMemo(() => {
    const stats = {
      totalAmount: 0,
      successCount: 0,
      pendingCount: 0,
      failedCount: 0,
    };

    filteredTransactions.forEach((tx) => {
      stats.totalAmount += Math.abs(tx.amount);
      if (tx.status === "success") stats.successCount++;
      if (tx.status === "pending") stats.pendingCount++;
      if (tx.status === "failed") stats.failedCount++;
    });

    return stats;
  }, [filteredTransactions]);

  const handleFilterChange = useCallback((newFilter: typeof filter) => {
    setFilter(newFilter);
    setSearchQuery("");
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  if (loading && !transactions.length) {
    return <LoadingSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 relative"
    >
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm border border-indigo-200/50">
              <History className="w-5 h-5 text-indigo-600" />
            </div>
            تاریخچه تراکنش‌ها
            {filteredTransactions.length > 0 && (
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                {filteredTransactions.length}
              </span>
            )}
          </h3>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
              showFilters
                ? "bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-5 h-5" />
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pb-4 bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                <div>
                  <p className="text-[10px] font-black text-gray-600 mb-2.5 flex items-center gap-1.5">
                    <span>🏷️</span> نوع تراکنش
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                      { key: "all" as const, label: "همه", emoji: "📋" },
                      { key: "commission" as const, label: "پورسانت", emoji: "💰" },
                      { key: "withdrawal" as const, label: "تسویه", emoji: "💳" },
                      { key: "bonus" as const, label: "جایزه", emoji: "🎁" },
                      { key: "refund" as const, label: "بازگشت", emoji: "↩️" },
                    ].map((item) => (
                      <motion.button
                        key={item.key}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleFilterChange(item.key)}
                        className={`shrink-0 px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all border-2 flex items-center gap-1.5 ${
                          filter === item.key
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-200"
                            : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300"
                        }`}
                      >
                        <span>{item.emoji}</span>
                        {item.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-600 mb-2.5 flex items-center gap-1.5">
                    <span>📊</span> مرتب‌سازی
                  </p>
                  <div className="flex gap-2">
                    {[
                      { key: "newest" as const, label: "جدیدترین", icon: "⬇️" },
                      { key: "oldest" as const, label: "قدیمی‌ترین", icon: "⬆️" },
                    ].map((item) => (
                      <motion.button
                        key={item.key}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSortOrder(item.key)}
                        className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all border-2 ${
                          sortOrder === item.key
                            ? "bg-indigo-600 text-white border-indigo-700"
                            : "bg-white text-gray-600 border-gray-300"
                        }`}
                      >
                        {item.icon} {item.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-600 mb-2.5 flex items-center gap-1.5">
                    <span>🔍</span> جستجو
                  </p>
                  <div className="relative">
                    <Search className="absolute inset-y-0 right-3 w-4 h-4 text-gray-400 flex items-center pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="نام یا توضیح را جستجو کنید..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    />
                    <AnimatePresence>
                      {searchQuery && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          onClick={handleClearSearch}
                          className="absolute inset-y-0 left-3 text-gray-400 hover:text-red-500 transition-colors flex items-center"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {filteredTransactions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-300"
                  >
                    <div className="p-2 rounded-lg bg-emerald-50 text-center">
                      <p className="text-[9px] font-bold text-emerald-700">موفق</p>
                      <p className="text-sm font-black text-emerald-900">
                        {statistics.successCount}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 text-center">
                      <p className="text-[9px] font-bold text-amber-700">در حال بررسی</p>
                      <p className="text-sm font-black text-amber-900">
                        {statistics.pendingCount}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filteredTransactions.length === 0 ? (
        <EmptyState hasSearch={searchQuery.length > 0 || filter !== "all"} />
      ) : (
        <AnimatePresence mode="popLayout">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2.5"
            >
              <DateHeader date={date} count={txs.length} isSticky={groupByDate} />

              <AnimatePresence mode="popLayout">
                {txs.map((transaction, index) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    index={index}
                    onClick={() => onTransactionClick?.(transaction)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

export type { Transaction, TransactionListProps };