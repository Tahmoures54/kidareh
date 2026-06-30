import React from "react";
import { motion } from "framer-motion"; // مطمئن شوید با motion/react یکی است
import { Tab, TabConfig } from "../types";

interface Props {
  tabs: TabConfig[];
  activeTab: Tab;
  onChange: (t: Tab) => void;
}

const SegmentedControl = ({ tabs, activeTab, onChange }: Props) => (
  <div className="relative flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-[1.25rem] shadow-inner mb-6 mx-4 z-10">
    {tabs.map((t) => {
      const Icon = t.icon;
      const isActive = activeTab === t.id;
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => { onChange(t.id); if(navigator.vibrate) navigator.vibrate(30); }}
          className={`flex-1 relative z-10 py-3 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 ${
            isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Icon className="w-4 h-4" />
          {t.label}
          {isActive && (
            <motion.div
              layoutId="tab-pill"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute inset-0 -z-10 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50"
            />
          )}
        </button>
      );
    })}
  </div>
);

export default SegmentedControl;