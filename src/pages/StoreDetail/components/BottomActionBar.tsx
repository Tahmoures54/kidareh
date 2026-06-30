import React, { memo } from "react";
import { Navigation, MessageSquare, PhoneCall } from "lucide-react";

interface Props {
  storeId: number;
  phone: string;
  onNavigate: () => void;
  onMessageClick: () => void;
  onPhoneClick: (e: React.MouseEvent) => void;
}

export const BottomActionBar = memo(({ phone, onNavigate, onMessageClick, onPhoneClick }: Props) => {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 p-4 pb-[max(16px,env(safe-area-inset-bottom))] z-50">
      <div className="max-w-md mx-auto flex gap-3">
        <button onClick={onNavigate} className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[20px] flex items-center justify-center shrink-0 active:scale-95 transition-transform border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <Navigation className="w-6 h-6" />
        </button>
        
        <button onClick={onMessageClick} className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[20px] flex items-center justify-center shrink-0 active:scale-95 transition-transform border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
          <MessageSquare className="w-6 h-6" />
        </button>

        <a href={phone ? `tel:${phone}` : undefined} onClick={onPhoneClick} className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-[20px] font-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <PhoneCall className="w-5 h-5" /> تماس با فروشگاه
        </a>
      </div>
    </div>
  );
});