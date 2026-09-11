import React, { useState } from "react";
import { ChevronLeft, Layers } from "lucide-react";
import { getCategoryDisplayName } from "../../data/processed/categories";
import CategoryPicker from "./CategoryPicker";
import { cn } from "../../utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowGroupSelect?: boolean;
}

export default function CategoryField({
  value,
  onChange,
  label = "دسته‌بندی",
  placeholder = "انتخاب دسته…",
  required,
  className,
  allowGroupSelect = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const display = getCategoryDisplayName(value);

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-xs font-bold text-slate-500">
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-800",
          display ? "text-slate-900 dark:text-white" : "text-slate-400"
        )}
      >
        <Layers className="h-4 w-4 shrink-0 text-[var(--accent)]" />
        <span className="min-w-0 flex-1 truncate">{display || placeholder}</span>
        <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      <CategoryPicker
        open={open}
        selected={value}
        allowGroupSelect={allowGroupSelect}
        onClose={() => setOpen(false)}
        onSelect={(next) => onChange(next)}
      />
    </div>
  );
}
