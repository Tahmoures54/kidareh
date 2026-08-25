import React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { Msg } from "../types";

const MessageBubble = React.memo(({ msg }: { msg: Msg }) => {
  const isAI = msg.role === "ai";
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`flex mb-4 ${isAI ? "justify-start" : "justify-end"}`}
    >
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 ml-2 mt-auto shadow-sm shadow-violet-500/20 border border-white dark:border-gray-900">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
          !isAI
            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm shadow-md shadow-indigo-500/20"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700"
        }`}
      >
        {msg.text}
      </div>
    </motion.div>
  );
});

export default MessageBubble;