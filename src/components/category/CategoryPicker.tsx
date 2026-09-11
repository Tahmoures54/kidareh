import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, Layers, Search, X } from "lucide-react";
import {
  CATEGORY_GROUP_COUNT,
  CATEGORY_TYPE_COUNT,
  categoriesData,
  getPopularCategories,
  searchCategoryHits,
  type CategoryGroup,
  type SubCategory,
} from "../../data/processed/categories";
import { cn } from "../../utils";

interface Props {
  open: boolean;
  selected?: string;
  onClose: () => void;
  onSelect: (value: string, label: string) => void;
  allowGroupSelect?: boolean;
}

export default function CategoryPicker({
  open,
  selected,
  onClose,
  onSelect,
  allowGroupSelect = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [groupSlug, setGroupSlug] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popular = useMemo(() => getPopularCategories(), []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setGroupSlug(null);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchCategoryHits(query, 60) : []), [query, searching]);
  const activeGroup = useMemo(
    () => (groupSlug ? categoriesData.find((group) => group.slug === groupSlug) ?? null : null),
    [groupSlug]
  );

  const pick = (value: string, label: string) => {
    onSelect(value, label);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center md:items-center"
      style={{ zIndex: 400 }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="انتخاب دسته‌بندی"
    >
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="بستن" onClick={onClose} />
      <div className="relative flex h-[96dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-white shadow-2xl md:h-[85vh] md:rounded-[28px]">
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <div>
            <p className="text-[11px] font-black text-[var(--brand-primary)]">
              {CATEGORY_GROUP_COUNT.toLocaleString("fa-IR")} گروه · {CATEGORY_TYPE_COUNT.toLocaleString("fa-IR")} زیردسته
            </p>
            <h2 className="text-lg font-black">{activeGroup ? activeGroup.group : "انتخاب دسته"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper)]" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <label className="flex h-12 items-center gap-2 rounded-2xl bg-[var(--paper)] px-3">
            <Search className="h-4 w-4 text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setGroupSlug(null);
              }}
              placeholder="جستجوی دسته؛ مثلاً موبایل، سیمان، مسکن"
              aria-label="جستجوی دسته"
              className="h-full flex-1 bg-transparent text-sm font-bold outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-[var(--muted)]" aria-label="پاک کردن">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          {searching ? (
            results.length === 0 ? (
              <p className="py-16 text-center text-sm font-bold text-[var(--muted)]">دسته‌ای با این نام پیدا نشد</p>
            ) : (
              <ul className="space-y-1">
                {results.map((item) => (
                  <li key={`${item.groupSlug}-${item.value}`}>
                    <ResultRow
                      title={item.text}
                      subtitle={item.group}
                      icon={item.groupIcon}
                      selected={selected === item.value}
                      onClick={() => pick(item.value, item.text)}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : activeGroup ? (
            <GroupTypes
              group={activeGroup}
              selected={selected}
              allowGroupSelect={allowGroupSelect}
              onBack={() => setGroupSlug(null)}
              onPick={pick}
            />
          ) : (
            <>
              <p className="mb-2 text-[11px] font-black text-[var(--muted)]">پربازدید</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {popular.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => pick(item.value, item.text)}
                    className={cn(
                      "rounded-full px-3 py-2 text-xs font-black",
                      selected === item.value ? "bg-[var(--accent)] text-white" : "bg-[var(--paper)] text-[var(--ink)]"
                    )}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-[11px] font-black text-[var(--muted)]">همه گروه‌ها</p>
              <ul className="space-y-1">
                {categoriesData.map((group) => (
                  <li key={group.slug}>
                    <button
                      type="button"
                      onClick={() => setGroupSlug(group.slug)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-right active:bg-[var(--paper)]"
                    >
                      <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl", group.gradient)}>
                        {group.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{group.group}</span>
                        <span className="block text-[11px] font-bold text-[var(--muted)]">
                          {group.types.length.toLocaleString("fa-IR")} زیردسته
                        </span>
                      </span>
                      <ChevronLeft className="h-4 w-4 text-[var(--muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ResultRow({
  title,
  subtitle,
  icon,
  selected,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-right",
        selected ? "bg-[var(--accent)]/10" : "active:bg-[var(--paper)]"
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--paper)] text-lg">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{title}</span>
        <span className="block text-[11px] font-bold text-[var(--muted)]">{subtitle}</span>
      </span>
      {selected ? <Check className="h-4 w-4 text-[var(--accent)]" /> : <ChevronLeft className="h-4 w-4 text-[var(--muted)]" />}
    </button>
  );
}

function GroupTypes({
  group,
  selected,
  allowGroupSelect,
  onBack,
  onPick,
}: {
  group: CategoryGroup;
  selected?: string;
  allowGroupSelect: boolean;
  onBack: () => void;
  onPick: (value: string, label: string) => void;
}) {
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-xs font-black text-[var(--accent)]">
        بازگشت به گروه‌ها
      </button>
      {allowGroupSelect && (
        <button
          type="button"
          onClick={() => onPick(group.slug, group.group)}
          className={cn(
            "mb-3 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-right",
            selected === group.slug ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--line)]"
          )}
        >
          <Layers className="h-4 w-4 text-[var(--accent)]" />
          <span className="flex-1 text-sm font-black">همهٔ {group.short}</span>
          {selected === group.slug && <Check className="h-4 w-4 text-[var(--accent)]" />}
        </button>
      )}
      <ul className="space-y-1">
        {group.types.map((type: SubCategory) => (
          <li key={type.value}>
            <ResultRow
              title={type.text}
              subtitle={group.group}
              icon={group.icon}
              selected={selected === type.value}
              onClick={() => onPick(type.value, type.text)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
