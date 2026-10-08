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

  const handleDragEnd = async (_event: any, info: PanInfo) => {
    const threshold = -80;
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
      transition={{
        delay: Math.min(index * 0.03, 0.15),
        layout: { type: "spring", bounce: 0.2, duration: 0.6 },
      }}
      className="group relative mb-3 overflow-hidden rounded-2xl bg-rose-500 shadow-sm"
    >
      <div className="absolute inset-y-0 right-0 z-0 flex w-24 items-center justify-end px-6">
        <Trash2 className="h-6 w-6 text-white drop-shadow-md" />
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.2, right: 0.05 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 flex w-full cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors ${
          isUnread
            ? "border-cyan-200 bg-cyan-50/50 shadow-md shadow-cyan-100"
            : "border-slate-100 bg-white hover:border-cyan-100 hover:shadow-sm"
        }`}
      >
        <Link
          to={url}
          onClick={() => onOpen(conv.storeId)}
          className="absolute inset-0 z-0"
          aria-label={`گفتگو با ${conv.storeName}`}
        />

        <div className="pointer-events-none relative z-10 flex-shrink-0">
          <div
            className={`h-14 w-14 rounded-full p-0.5 ${
              isUnread
                ? "bg-gradient-to-tr from-cyan-500 to-teal-600"
                : "bg-transparent"
            }`}
          >
            <img
              src={conv.avatar || AVATAR}
              alt={conv.storeName}
              loading="lazy"
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = AVATAR)}
              className="h-full w-full rounded-full border-2 border-white object-cover"
            />
          </div>
          {conv.online && (
            <span className="absolute bottom-0.5 right-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-50" />
            </span>
          )}
        </div>

        <div className="pointer-events-none z-10 min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <h3
              className={`truncate text-base tracking-tight ${
                isUnread ? "font-black text-slate-900" : "font-bold text-slate-800"
              }`}
            >
              {conv.storeName}
            </h3>
            <span
              className={`flex flex-shrink-0 items-center gap-1 text-[10px] font-bold ${
                isUnread ? "text-cyan-700" : "text-slate-400"
              }`}
            >
              {conv.time}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p
              className={`flex-1 truncate text-sm leading-relaxed ${
                isUnread ? "font-bold text-slate-800" : "font-medium text-slate-500"
              }`}
            >
              {conv.lastMessage || "بدون پیام"}
            </p>

            <AnimatePresence mode="popLayout">
              {isUnread ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex h-5.5 min-w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-cyan-600 to-teal-500 px-1.5 text-[10px] font-black text-white shadow-sm shadow-cyan-500/30"
                >
                  {conv.unread > 99 ? "99+" : conv.unread}
                </motion.span>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <CheckCheck className="h-4 w-4 flex-shrink-0 text-cyan-400" />
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
