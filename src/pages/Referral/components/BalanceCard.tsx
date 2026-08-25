import React from "react";
import { Wallet } from "lucide-react";

interface Props {
  balance: number;
  minWithdrawal: number;
  canWithdraw: boolean;
}

export default function BalanceCard({ balance, minWithdrawal, canWithdraw }: Props) {
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] p-6 text-white shadow-lg shadow-indigo-500/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Wallet className="w-32 h-32" />
      </div>
      
      <div className="relative z-10">
        <h2 className="text-indigo-100 text-sm font-medium mb-1">موجودی قابل برداشت</h2>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-4xl font-black">{balance.toLocaleString('fa-IR')}</span>
          <span className="text-indigo-200 text-sm">تومان</span>
        </div>
        
        {!canWithdraw && (
          <div className="mt-4 inline-block bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-medium">
            حداقل مبلغ برداشت: {minWithdrawal.toLocaleString('fa-IR')} تومان
          </div>
        )}
      </div>
    </div>
  );
}