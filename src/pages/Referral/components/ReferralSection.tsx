import React from "react";
import { Copy, Share2, Check } from "lucide-react";

interface Props {
  code: string;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  percentage: number;
}

export default function ReferralSection({ code, copied, onCopy, onShare, percentage }: Props) {
  return (
    <div className="bg-teal-50 dark:bg-teal-500/5 border border-teal-100 dark:border-teal-500/20 rounded-[1.5rem] p-5">
      <h3 className="font-black text-sm text-teal-950 dark:text-teal-300 mb-2">کد معرف شما</h3>
      <p className="text-xs text-teal-800 dark:text-teal-400 mb-4 leading-relaxed">
        با دعوت دوستان خود، {percentage}٪ از سود خریدهای آن‌ها را دریافت کنید.
      </p>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white dark:bg-gray-900 border border-dashed border-teal-300 dark:border-teal-700 rounded-xl px-4 py-3 flex justify-center items-center font-mono font-bold text-lg tracking-widest text-teal-700 dark:text-teal-400">
          {code}
        </div>
        <button 
          onClick={onCopy}
          className="bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-800 text-teal-700 w-12 h-[52px] rounded-xl flex items-center justify-center transition-all active:scale-95"
        >
          {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
        </button>
        <button 
          onClick={onShare}
          className="bg-teal-700 text-white w-12 h-[52px] rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-md shadow-teal-700/20"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}