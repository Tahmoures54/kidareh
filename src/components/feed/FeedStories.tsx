import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils";

export interface StoryItem {
  id: string;
  name: string;
  href: string;
  image?: string | null;
  live?: boolean;
}

export function FeedStories({ items }: { items: StoryItem[] }) {
  if (!items.length) return null;

  return (
    <div className="feed-stories flex gap-3 overflow-x-auto presence-hide-scroll px-3 py-3" data-testid="feed-stories">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.href}
          className="flex w-[74px] shrink-0 flex-col items-center gap-1.5"
        >
          <span
            className={cn(
              "flex h-[68px] w-[68px] items-center justify-center rounded-full p-[2.5px]",
              item.live
                ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-[var(--brand-primary)]"
                : "bg-[var(--line)]"
            )}
          >
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white p-[2px]">
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-sm font-black text-[var(--brand-primary)]">
                  {item.name.slice(0, 1)}
                </span>
              )}
            </span>
          </span>
          <span className="w-full truncate text-center text-[11px] font-bold text-[var(--ink)]">
            {item.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
