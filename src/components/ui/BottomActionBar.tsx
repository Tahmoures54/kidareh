import React, { memo } from "react";
import { motion } from "framer-motion";
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
    <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-secondary)]/85 backdrop-blur-2xl border-t border-[var(--border-light)] p-4 pb-[max(16px,env(safe-area-inset-bottom))] z-50">
      <div className="max-w-md mx-auto flex gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onNavigate} className="w-14 h-14 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--border-light)]">
          <Navigation className="w-6 h-6" />
        </motion.button>
        
        <motion.button whileTap={{ scale: 0.9 }} onClick={onMessageClick} className="w-14 h-14 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--brand-primary)]/20">
          <MessageSquare className="w-6 h-6" />
        </motion.button>

        <a href={phone ? `tel:${phone}` : undefined} onClick={onPhoneClick} className="flex-1 h-14 bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white rounded-2xl font-black shadow-lg shadow-[var(--brand-glow)] flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <PhoneCall className="w-5 h-5" /> تماس با فروشگاه
        </a>
      </div>
    </div>
  );
});