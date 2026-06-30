import React from "react";
import { Link } from "react-router-dom";
import { Trash2, CheckCheck } from "lucide-react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "motion/react";
import { Conversation } from "../types";
import { AVATAR } from "../utils";

interface ConvItemProps {
  conv: Conversation;
  index: number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const ConvItem: React.FC<ConvItemProps> = ({ conv, index, onOpen, onDelete }) => {
  const url = `/chat/${conv.storeId}${conv.lastProductId ? `?product=${conv.lastProductId}` : ""}`;
  const controls = useAnimation();
  const isUnread = conv.unread > 0;

  // Swipe-to-delete logic
  const handleDragEnd = async (event: any, info: PanInfo) => {
    const threshold = -80; // RTL: dragging left means negative X
    if (info.offset.x < threshold) {
      if (navigator.vibrate) navigator.vibrate(50);
      await controls.start({ x: -window.innerWidth, opacity: 0, transition: { duration: 0.2 } });
      onDelete(conv.id);
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 25 } });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ delay: Math.min(index * 0.03, 0.15), layout: { type: "spring", bounce: 0.2, duration: 0.6 } }}
      className="relative rounded-[1.5rem] overflow-hidden bg-rose-500 mb-3 shadow-sm group"
    >
      {/* Background for Swipe (Trash Icon) */}
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end px-6 z-0">
        <Trash2 className="w-6 h-6 text-white drop-shadow-md" />
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.2, right: 0.05 }} // RTL adjustments
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 w-full bg-white dark:bg-gray-900 border ${
          isUnread 
            ? "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/10 shadow-md shadow-indigo-100 dark:shadow-none" 
            : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
        } p-4 flex items-center gap-4 transition-colors rounded-[1.5rem] cursor-pointer`}
        onClick={(e) => {
          // Prevent navigation if user is dragging
          const target = e.target as HTMLElement;
          if (target.closest('.react-draggable')) return;
        }}
      >
        <Link 
          to={url} 
          onClick={() => onOpen(conv.storeId)} 
          className="absolute inset-0 z-0" 
          aria-label={`گفتگو با ${conv.storeName}`} 
        />
        
        {/* Avatar */}
        <div className="relative flex-shrink-0 z-10 pointer-events-none">
          <div className={`w-14 h-14 rounded-full p-0.5 ${isUnread ? 'bg-gradient-to-tr from-indigo-500 to-purple-500' : 'bg-transparent'}`}>
            <img
              src={conv.avatar || AVATAR}
              alt={conv.storeName}
              loading="lazy"
              onError={e => ((e.currentTarget as HTMLImageElement).src = AVATAR)}
              className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-900"
            />
          </div>
          {conv.online && (
            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full z-10">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 z-10 pointer-events-none">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className={`text-base truncate tracking-tight ${isUnread ? "font-black text-gray-900 dark:text-white" : "font-bold text-gray-800 dark:text-gray-200"}`}>
              {conv.storeName}
            </h3>
            <span className={`text-[10px] font-bold flex-shrink-0 flex items-center gap-1 ${
              isUnread ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
            }`}>
              {conv.time}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm truncate flex-1 leading-relaxed ${
              isUnread ? "font-bold text-gray-800 dark:text-gray-200" : "font-medium text-gray-500 dark:text-gray-400"
            }`}>
              {conv.lastMessage || "بدون پیام"}
            </p>

            <AnimatePresence mode="popLayout">
              {isUnread ? (
                <motion.span 
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="min-w-[22px] h-5.5 px-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-sm shadow-indigo-500/30"
                >
                  {conv.unread > 99 ? "99+" : conv.unread}
                </motion.span>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <CheckCheck className="w-4 h-4 text-blue-400 dark:text-blue-500 flex-shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default React.memo(ConvItem);