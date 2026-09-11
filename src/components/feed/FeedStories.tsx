import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "../../utils";
import { isStorySeen } from "../../lib/marketStories";
import StoryViewer from "./StoryViewer";

export interface StoryFrame {
  id: string;
  image: string;
  title?: string;
  caption?: string;
  href?: string;
  productId?: number;
}

export interface StoryItem {
  id: string;
  name: string;
  href: string;
  image?: string | null;
  live?: boolean;
  isAd?: boolean;
  verified?: boolean;
  storeId?: string | number;
  frames?: StoryFrame[];
}

export interface StoryComposer {
  label: string;
  href: string;
}

export function FeedStories({
  items,
  composer,
}: {
  items: StoryItem[];
  composer?: StoryComposer | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [seenTick, setSeenTick] = useState(0);

  useEffect(() => {
    const bump = () => setSeenTick((n) => n + 1);
    window.addEventListener("kidareh-story-seen", bump);
    return () => window.removeEventListener("kidareh-story-seen", bump);
  }, []);

  const ready = useMemo(
    () => items.filter((item) => (item.frames && item.frames.length > 0) || Boolean(item.image)),
    [items]
  );

  if (!ready.length && !composer) return null;

  return (
    <>
      <div
        className="feed-stories flex gap-3 overflow-x-auto presence-hide-scroll px-3 py-3 snap-x snap-mandatory"
        data-testid="feed-stories"
        role="list"
        aria-label="استوری بازار"
      >
        {composer && (
          <Link
            to={composer.href}
            className="feed-story-item snap-start"
            role="listitem"
            data-testid="story-composer"
          >
            <span className="feed-story-ring is-composer">
              <span className="feed-story-avatar">
                <Plus className="h-6 w-6 text-[var(--brand-primary)]" />
              </span>
            </span>
            <span className="feed-story-name">{composer.label}</span>
          </Link>
        )}
        {ready.map((item, index) => {
          const seen = seenTick >= 0 && isStorySeen(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              onClick={() => setOpenIndex(index)}
              className="feed-story-item snap-start"
            >
              <span
                className={cn(
                  "feed-story-ring",
                  seen ? "is-seen" : item.live ? "is-live" : "is-new"
                )}
              >
                <span className="feed-story-avatar">
                  {item.image ? (
                    <img src={item.image} alt="" />
                  ) : (
                    <span className="text-sm font-black text-[var(--brand-primary)]">
                      {item.name.slice(0, 1)}
                    </span>
                  )}
                </span>
                {item.isAd !== false && <span className="feed-story-ad">آگهی</span>}
              </span>
              <span className="feed-story-name">{item.name}</span>
            </button>
          );
        })}
      </div>

      {openIndex != null && ready[openIndex] && (
        <StoryViewer
          items={ready}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
