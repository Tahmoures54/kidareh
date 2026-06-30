import React, { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Share2, Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  saved: boolean;
  saveLoading: boolean;
  onShare: () => void;
  onSave: () => void;
}

export const FloatingHeader = memo(({ saved, saveLoading, onShare, onSave }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 inset-x-0 z-50 px-4 pt-[max(16px,env(safe-area-inset-top))] flex justify-between pointer-events-none">
      <motion.button 
        whileTap={{ scale: 0.9 }} 
        onClick={() => navigate(-1)} 
        className="pointer-events-auto w-12 h-12 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-[20px] shadow-sm flex items-center justify-center text-slate-800 dark:text-slate-200"
      >
        <ArrowRight className="w-6 h-6" />
      </motion.button>
      <div className="flex gap-2 pointer-events-auto">
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={onShare} 
          className="w-12 h-12 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-[20px] shadow-sm flex items-center justify-center text-slate-800 dark:text-slate-200"
        >
          <Share2 className="w-5 h-5" />
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={onSave} 
          disabled={saveLoading} 
          className="w-12 h-12 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-[20px] shadow-sm flex items-center justify-center"
        >
          {saveLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          ) : (
            <Heart className={`w-5 h-5 transition-colors ${saved ? "fill-rose-500 text-rose-500 drop-shadow-md" : "text-slate-800 dark:text-slate-200"}`} />
          )}
        </motion.button>
      </div>
    </div>
  );
});