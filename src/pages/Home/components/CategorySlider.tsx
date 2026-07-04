import React from "react";
import { motion } from "framer-motion";
import { categoriesData } from "@data/processed/categories";
import { HOME_CONFIG } from "../constants";

interface CategorySliderProps {
  activeCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export const CategorySlider = ({ activeCategory, onSelectCategory }: CategorySliderProps) => {
  const items = [
    { slug: null, name: "همه" },
    ...categoriesData.slice(0, HOME_CONFIG.CATEGORIES_DISPLAY_COUNT).map(cat => ({
      slug: cat.slug,
      name: cat.name,
    })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
      {items.map(item => {
        const isActive = activeCategory === item.slug;
        return (
          <button
            key={item.slug ?? "all"}
            onClick={() => onSelectCategory(item.slug)}
            className={`relative shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors duration-200 ${
              isActive 
                ? "text-white dark:text-gray-900" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategoryPill"
                className="absolute inset-0 bg-gray-900 dark:bg-white rounded-xl"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
};