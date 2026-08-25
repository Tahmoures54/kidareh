import React from "react";
import { Clock, ChevronLeft } from "lucide-react";
import {
  TX_TYPE,
  TX_STATUS,
  DEFAULT_TX_TYPE,
  normalizeTxStatus,
  formatFaDate,
} from "../constants";

type Tx = {
  id?: string | number;
  type?: string; // commission | withdrawal | bonus | refund | ...
  title?: string | null;
  description?: string | null;
  amount: number;
  status?: string; // approved | pending | ...
  date?: string;
  created_at?: string;
};

interface Props {
  transactions: Tx[];
  loading: boolean;
}

export default function TransactionSection({ transactions, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden">
        <div className="p-4 animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="text-center py-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
        <Clock className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-black text-gray-600 dark:text-gray-300">
          تراکنشی یافت نشد
        </p>
        <p className="text-[11px] font-bold text-gray-400 mt-1">
          بعد از اولین پورسانت یا برداشت، اینجا نمایش داده می‌شود
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {transactions.map((tx, idx) => {
          const id = tx.id ?? idx;
          const rawType = String(tx.type || "").toLowerCase();

          const meta =
            (TX_TYPE as any)[rawType] ?? (DEFAULT_TX_TYPE as typeof DEFAULT_TX_TYPE);

          const Icon = meta.icon;

          const normalizedStatus = normalizeTxStatus(tx.status);
          const statusMeta = TX_STATUS[normalizedStatus];

          const date = formatFaDate(tx.date || tx.created_at);

          const sign = meta.sign || "";
          const amountText = `${sign}${Number(tx.amount || 0).toLocaleString(
            "fa-IR"
          )}`;

          const title =
            tx.title ||
            tx.description ||
            meta.label ||
            "تراکنش";

          return (
            <div
              key={id}
              className="p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={[
                    "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0",
                    meta.bg,
                    meta.color,
                  ].join(" ")}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">
                      {title}
                    </p>
                    <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-gray-700 flex-shrink-0" />
                  </div>

                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {date || "—"}
                  </p>
                </div>
              </div>

              <div className="text-left flex-shrink-0">
                <p className={`text-sm font-black ${meta.color}`}>{amountText}</p>

                <span
                  className={[
                    "mt-1 inline-flex items-center justify-center",
                    "text-[10px] font-black px-2.5 py-1 rounded-xl border",
                    statusMeta.className,
                  ].join(" ")}
                >
                  {statusMeta.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}