import React, { memo } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = memo(({ value, onChange, placeholder = "دنبال چی می‌گردی؟" }: SearchBarProps) => {
  return (
    <div className="px-4 pt-3 pb-2">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pl-4 pr-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="پاک کردن جستجو"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
});

SearchBar.displayName = "SearchBar";
