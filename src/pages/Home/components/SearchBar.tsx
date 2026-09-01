import React, { memo, useCallback } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export const SearchBar = memo(
  ({
    value,
    onChange,
    placeholder = "دنبال چی می‌گردی؟",
    ariaLabel = "جستجو",
  }: SearchBarProps) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange]
    );

    const handleClear = useCallback(() => {
      onChange("");
    }, [onChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape" && value) {
          e.preventDefault();
          onChange("");
        }
      },
      [value, onChange]
    );

    return (
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            autoComplete="off"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className="
              w-full h-12 pl-4 pr-12 rounded-2xl
              bg-[var(--bg-secondary)]
              border border-[var(--border-light)]
              text-sm text-[var(--text-primary)]
              placeholder:text-gray-400
              focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20
              transition-all
              [&::-webkit-search-cancel-button]:hidden
              [&::-webkit-search-decoration]:hidden
            "
          />
          {value && (
            <button
              onClick={handleClear}
              aria-label="پاک کردن جستجو"
              title="پاک کردن"
              className="
                absolute left-3 top-1/2 -translate-y-1/2
                p-1.5 rounded-full
                hover:bg-gray-100 dark:hover:bg-gray-800
                focus:outline-none focus:ring-2 focus:ring-rose-500/40
                transition-colors
              "
            >
              <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";
