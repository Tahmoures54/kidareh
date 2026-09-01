import React, { memo, useCallback } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { SortType, SORT_OPTIONS } from "../constants";

interface ResultHeaderProps {
  count: number;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
  onFilterClick?: () => void;
  isLoading?: boolean;
}

const pluralizeAd = (count: number) => {
  if (count === 0) return "آگهی";
  if (count === 1) return "یک آگهی";
  return `${count.toLocaleString("fa-IR")} آگهی`;
};

export const ResultHeader = memo(
  ({ count, sort, onSortChange, onFilterClick, isLoading }: ResultHeaderProps) => {
    const handleSortChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSortChange(e.target.value as SortType);
      },
      [onSortChange]
    );

    const handleFilterClick = useCallback(() => {
      onFilterClick?.();
    }, [onFilterClick]);

    return (
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-sm text-gray-600 dark:text-gray-400"
          aria-live="polite"
          aria-atomic="true"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <span>آگهی</span>
            </span>
          ) : (
            <span className="font-bold text-gray-900 dark:text-white">
              {pluralizeAd(count)}
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          {/* Select wrapper for custom arrow */}
          <div className="relative">
            <select
              value={sort}
              onChange={handleSortChange}
              aria-label="مرتب‌سازی"
              className="h-9 pl-8 pr-3 text-xs font-medium rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500 cursor-pointer appearance-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {onFilterClick && (
            <button
              onClick={handleFilterClick}
              className="h-9 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-1.5"
              aria-label="فیلترها"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                فیلتر
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

ResultHeader.displayName = "ResultHeader";
