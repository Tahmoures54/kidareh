import React, { memo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { categoriesData } from "@data/processed/categories";

interface CategorySliderProps {
  activeCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export const CategorySlider = memo(
  ({ activeCategory, onSelectCategory }: CategorySliderProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const items = [
      { slug: null, name: "همه", icon: "🏪" },
      ...categoriesData.map((cat) => ({
        slug: cat.slug,
        name: cat.group,
        icon: cat.icon || "📦",
      })),
    ];

    // اسکرول خودکار به دسته فعال
    useEffect(() => {
      if (activeCategory && scrollRef.current) {
        const activeElement = scrollRef.current.querySelector(
          `[data-category="${activeCategory}"]`
        ) as HTMLElement | null;
        if (activeElement) {
          const container = scrollRef.current;
          const elementLeft = activeElement.offsetLeft;
          const elementWidth = activeElement.offsetWidth;
          const containerWidth = container.clientWidth;
          const targetScroll = elementLeft - (containerWidth - elementWidth) / 2;
          container.scrollTo({
            left: targetScroll,
            behavior: "smooth",
          });
        }
      }
    }, [activeCategory]);

    const handleSelect = useCallback(
      (slug: string | null) => {
        onSelectCategory(slug);
      },
      [onSelectCategory]
    );

    return (
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          role="tablist"
          aria-label="دسته‌بندی‌ها"
        >
          {items.map((item) => {
            const isActive = activeCategory === item.slug;
            return (
              <button
                key={item.slug ?? "all"}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={item.name}
                data-category={item.slug}
                onClick={() => handleSelect(item.slug)}
                className={`relative shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? "text-white dark:text-gray-900 shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700 rounded-xl"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-base leading-none">
                  {item.icon}
                </span>
                <span className="relative z-10">{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* گرادیانت‌های محو برای نشان دادن اسکرول */}
        <div
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>
    );
  }
);

CategorySlider.displayName = "CategorySlider";
