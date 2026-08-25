import React from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, AlertCircle, X } from "lucide-react";
import { Msg, MsgStatus } from "../types";

const StatusIcon = React.memo(({ status }: { status: MsgStatus }) => {
  if (status === "sending") return (
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
      <Clock className="w-3 h-3 text-white/70" />
    </motion.div>
  );
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-white/90" />;
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-white drop-shadow-sm" />;
  if (status === "error") return <AlertCircle className="w-3.5 h-3.5 text-rose-300" />;
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
      className={`flex mb-3 ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className={`relative max-w-[85%] px-4 py-2.5 shadow-sm group ${
        isMe
          ? "bg-gradient-to-br from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-600 text-white rounded-2xl rounded-tl-sm"
          : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tr-sm"
      }`}>
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
          {msg.text}
        </p>
        <div className={`flex items-center justify-end gap-1.5 mt-1 select-none ${isMe ? "text-indigo-100" : "text-gray-400 dark:text-gray-500"}`}>
          <span className="text-[10px] font-medium tracking-wide">
            {msg.timestamp}
          </span>
          {isMe && <StatusIcon status={msg.status} />}
          {isMe && msg.status === "error" && (
            <button
              onClick={() => onRetry(msg)}
              className="ml-1 text-rose-200 active:scale-90 transition-transform bg-rose-500/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageBubble;