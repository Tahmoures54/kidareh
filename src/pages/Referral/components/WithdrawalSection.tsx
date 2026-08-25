import React, { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Info } from "lucide-react";

interface Props {
  balance: number;
  minAmount: number;
  onSubmit: (data: { amount: number; iban: string }) => void;
  submitting: boolean;
}

export default function WithdrawalSection({
  balance,
  minAmount,
  onSubmit,
  submitting,
}: Props) {
  const [amount, setAmount] = useState(""); // فقط عدد
  const [iban, setIban] = useState(""); // 24 رقم بدون IR

  const amountNum = useMemo(() => {
    const n = Number((amount || "").replace(/[^0-9]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const ibanClean = useMemo(
    () => (iban || "").replace(/[^0-9]/g, "").slice(0, 24),
    [iban]
  );

  const canSubmit =
    !submitting &&
    amountNum >= minAmount &&
    amountNum <= balance &&
    ibanClean.length === 24;

  const amountHint =
    amountNum === 0
      ? `حداقل ${minAmount.toLocaleString("fa-IR")} تومان`
      : `مبلغ وارد شده: ${amountNum.toLocaleString("fa-IR")} تومان`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ amount: amountNum, iban: `IR${ibanClean}` });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-2">
          مبلغ برداشت (تومان)
        </label>

        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))
          }
          placeholder={`مثلاً ${minAmount.toLocaleString("fa-IR")}`}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />

        <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
          <Info className="w-4 h-4" />
          <span>{amountHint}</span>
          <span className="mr-auto">
            موجودی: {balance.toLocaleString("fa-IR")}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-2">
          شماره شبا (بدون IR)
        </label>

        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={ibanClean}
            onChange={(e) => setIban(e.target.value)}
            placeholder="24 رقم"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 pl-12 py-3 text-left font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            dir="ltr"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black font-mono">
            IR
          </span>
        </div>

        <p className="mt-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
          طول شبا باید دقیقاً ۲۴ رقم باشد.
        </p>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.99]"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            در حال ثبت...
          </>
        ) : (
          <>
            ثبت درخواست
            <ArrowLeft className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}