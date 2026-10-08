import React from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, AlertCircle, X } from "lucide-react";
import { Msg, MsgStatus } from "../types";

const StatusIcon = React.memo(({ status }: { status: MsgStatus }) => {
  if (status === "sending")
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      >
        <Clock className="h-3 w-3 text-white/70" />
      </motion.div>
    );
  if (status === "sent") return <Check className="h-3.5 w-3.5 text-white/90" />;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-white drop-shadow-sm" />;
  if (status === "error") return <AlertCircle className="h-3.5 w-3.5 text-rose-300" />;
  return null;
});

interface Props {
  msg: Msg;
  isMe: boolean;
  onRetry: (m: Msg) => void;
}

const MessageBubble = React.memo(({ msg, isMe, onRetry }: Props) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`group relative max-w-[85%] px-4 py-2.5 shadow-sm ${
          isMe
            ? "rounded-2xl rounded-tl-sm bg-gradient-to-br from-cyan-600 to-teal-500 text-white shadow-cyan-500/15"
            : "rounded-2xl rounded-tr-sm border border-slate-100 bg-white text-slate-800"
        }`}
      >
        <p className="break-words text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        <div
          className={`mt-1 flex select-none items-center justify-end gap-1.5 ${
            isMe ? "text-cyan-100" : "text-slate-400"
          }`}
        >
          <span className="text-[10px] font-medium tracking-wide">{msg.timestamp}</span>
          {isMe && <StatusIcon status={msg.status} />}
          {isMe && msg.status === "error" && (
            <button
              onClick={() => onRetry(msg)}
              className="ml-1 rounded-full bg-rose-500/20 p-0.5 text-rose-200 transition-transform active:scale-90"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageBubble;
