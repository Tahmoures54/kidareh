import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { CategoryGroup } from "../types";
import { GROUP_CONFIG, DEFAULT_CONFIG } from "../utils";

interface GroupCardProps {
  group: CategoryGroup;
  index: number;
  isSearchActive: boolean;
}

const GroupCard = React.memo(({ group, index, isSearchActive }: GroupCardProps) => {
  const [open, setOpen] = useState(isSearchActive || index < 2);
  
  useEffect(() => {
    if (isSearchActive) setOpen(true);
  }, [isSearchActive]);

  const cfg = GROUP_CONFIG[group.group] || DEFAULT_CONFIG;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 24 }}
      className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 p-4 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors focus:outline-none"
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${cfg.gradient} shadow-inner`}>
          <Icon className="w-6 h-6 text-white drop-shadow-sm" />
        </div>

        <div className="flex-1 text-right">
          <motion.h2 layout="position" className="text-base font-black text-gray-900 dark:text-white mb-0.5">
            {group.group}
          </motion.h2>
          <motion.p layout="position" className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {group.types.length} زیردسته
          </motion.p>
        </div>

        <AnimatePresence>
          {!open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`text-[11px] font-black ${cfg.lightBg} ${cfg.darkBg} ${cfg.iconColor} px-2.5 py-1 rounded-full`}
            >
              +{group.types.length}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"
        >
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="h-px w-full bg-gray-100 dark:bg-gray-800 mb-3" />
              <div className="grid grid-cols-2 gap-2.5">
                {group.types.map((type, i) => (
                  <motion.div
                    key={type.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Link
                      to={`/search?category=${encodeURIComponent(type.value)}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-2xl active:scale-95 transition-all group"
                    >
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white truncate">
                        {type.text}
                      </span>
                      <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default GroupCard;