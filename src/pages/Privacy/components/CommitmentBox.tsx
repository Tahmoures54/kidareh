import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { COMMITMENTS } from "../constants";

const CommitmentBox = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5, type: "spring" }}
    className="relative overflow-hidden rounded-[2rem] bg-emerald-950 border border-emerald-900/50 p-5 mt-4 shadow-xl"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
    
    <h3 className="relative z-10 text-sm font-black text-emerald-400 mb-4 flex items-center gap-2">
      <Sparkles className="w-4 h-4" />
      خلاصه تعهدات کلیدی
    </h3>
    
    <div className="relative z-10 space-y-3">
      {COMMITMENTS.map((text, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
          </div>
          <p className="text-xs text-emerald-50/80 font-medium leading-relaxed">
            {text}
          </p>
        </div>
      ))}
    </div>
  </motion.div>
);

export default CommitmentBox;