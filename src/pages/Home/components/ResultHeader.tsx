import React, { memo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SortType } from "../constants";

interface ResultHeaderProps {
  count: number;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
  onFilterClick?: () => void;
  isLoading?: boolean;
}

export const ResultHeader = memo(({
  count,
  sort,
  onSortChange,
  onFilterClick,
  isLoading
}: ResultHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {isLoading ? (
          <span className="inline-block w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ) : (
          <span>
            <span className="font-bold text-gray-900 dark:text-white">{count.toLocaleString('fa-IR')}</span>
            {' '}آگهی
          </span>
        )}
      </p>
      
      <div className="flex items-center gap-2">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortType)}
          className="h-9 px-3 pr-2 text-xs font-medium rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:border-rose-500 cursor-pointer"
        >
          <option value="newest">جدیدترین</option>
          <option value="cheapest">ارزان‌ترین</option>
          <option value="expensive">گران‌ترین</option>
        </select>

        {onFilterClick && (
          <button
            onClick={onFilterClick}
            className="h-9 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-1.5"
            aria-label="فیلترها"
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">فیلتر</span>
          </button>
        )}
      </div>
    </div>
  );
});

ResultHeader.displayName = "ResultHeader";
