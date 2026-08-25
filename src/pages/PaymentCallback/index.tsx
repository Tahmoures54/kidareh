import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

import { usePaymentVerification } from "./hooks";
import LoadingView from "./components/LoadingView";
import SuccessView from "./components/SuccessView";
import ErrorView from "./components/ErrorView";

export default function PaymentCallback() {
  const navigate = useNavigate();
  const { state, actions } = usePaymentVerification();

  // Dynamic Background Glow based on state
  const bgGlow = 
    state.status === "success" ? "from-emerald-500/20 to-teal-500/20" : 
    state.status === "error" ? "from-rose-500/20 to-red-500/20" : 
    "from-indigo-500/20 to-violet-500/20";

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-gray-950 relative overflow-hidden transition-colors duration-500" dir="rtl">
      
      {/* Dynamic Mesh Gradient Background */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} 
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[600px] max-h-[600px] rounded-full blur-[100px] pointer-events-none bg-gradient-to-br ${bgGlow}`}
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.02] mix-blend-overlay pointer-events-none" />

      {/* View Switcher */}
      <AnimatePresence mode="wait">
        {state.status === "loading" && (
          <LoadingView key="loading" />
        )}
        
        {state.status === "success" && (
          <SuccessView 
            key="success" 
            code={state.trackCode} 
            copyDone={state.copyDone} 
            onCopy={actions.handleCopy} 
            onHome={() => navigate("/")} 
            onSeller={() => navigate("/seller")} 
          />
        )}
        
        {state.status === "error" && (
          <ErrorView 
            key="error" 
            msg={state.errMsg} 
            code={state.trackCode} 
            retryCount={state.retryCount} 
            retry={actions.handleRetry} 
            onSupport={() => navigate("/support")} 
          />
        )}
      </AnimatePresence>
      
    </div>
  );
}