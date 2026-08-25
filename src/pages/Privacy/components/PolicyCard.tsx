import React from "react";
import { motion } from "framer-motion";
import { ANIMATION_VARIANTS } from "../constants";

interface Props {
  item: {
    icon: React.ComponentType<any>;
    gradient: string;
    darkGradient: string;
    title: string;
    text: string;
  };
}

const PolicyCard = ({ item }: Props) => {
  const Icon = item.icon;

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.item}
      className="group bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${item.gradient} ${item.darkGradient} shadow-inner group-hover:scale-105 transition-transform duration-300`}>
        <Icon className="w-5 h-5 text-white drop-shadow-sm" />
      </div>
      
      <div className="flex-1 mt-0.5">
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1.5 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {item.title}
        </h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
          {item.text}
        </p>
      </div>
    </motion.div>
  );
};

export default PolicyCard;