import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, X } from "lucide-react";
import type { StoryFrame, StoryItem } from "./FeedStories";
import { markStorySeen } from "../../lib/marketStories";
import { trackStoryClick, trackStoryView } from "../../hooks/useMarketStories";

const FRAME_MS = 5000;

function framesOf(item: StoryItem): StoryFrame[] {
  if (item.frames && item.frames.length) return item.frames;
  if (item.image) {
    return [{ id: `${item.id}-cover`, image: item.image, title: item.name, href: item.href }];
  }
  return [];
}

interface Props {
  items: StoryItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export default function StoryViewer({ items, index, onIndexChange, onClose }: Props) {
  const navigate = useNavigate();
  const item = items[index];
  const frames = item ? framesOf(item) : [];
  const [frameIndex, setFrameIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const holdRef = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const frame = frames[frameIndex];

  useEffect(() => {
    setFrameIndex(0);
    setPaused(false);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    markStorySeen(item.id);
    trackStoryView(item.id);
  }, [item?.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goClose = useCallback(() => onClose(), [onClose]);

  const goNext = useCallback(() => {
    if (frameIndex < frames.length - 1) {
      setFrameIndex((i) => i + 1);
      return;
    }
    if (index < items.length - 1) {
      onIndexChange(index + 1);
      return;
    }
    goClose();
  }, [frameIndex, frames.length, goClose, index, items.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (frameIndex > 0) {
      setFrameIndex((i) => i - 1);
      return;
    }
    if (index > 0) onIndexChange(index - 1);
  }, [frameIndex, index, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") goClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goClose, goNext, goPrev]);

  const clearHold = () => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    holdRef.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdRef.current = true;
      setPaused(true);
    }, 180);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    clearHold();
    const start = pointerStart.current;
    pointerStart.current = null;
    const wasHold = holdRef.current;
    holdRef.current = false;
    if (wasHold) {
      setPaused(false);
      return;
    }
    if (start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dy) > 72 && Math.abs(dy) > Math.abs(dx) && dy > 0) {
        goClose();
        return;
      }
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext();
        else goPrev();
        return;
      }
    }
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - bounds.left;
    if (x < bounds.width * 0.32) goPrev();
    else goNext();
  };

  const openShop = () => {
    if (!item) return;
    trackStoryClick(item.id);
    const target = frame?.href || item.href;
    goClose();
    navigate(target);
  };

  if (!item || !frame || typeof document === "undefined") return null;

  return createPortal(
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`استوری ${item.name}`} dir="rtl">
      <div className="story-viewer-stage" dir="ltr">
        <div className="story-progress" aria-hidden>
          {frames.map((entry, i) => (
            <span key={`${item.id}-${entry.id}`} className="story-progress-track">
              <span
                className={
                  i < frameIndex
                    ? "story-progress-fill is-done"
                    : i === frameIndex
                      ? `story-progress-fill is-running${paused ? " is-paused" : ""}`
                      : "story-progress-fill"
                }
                style={i === frameIndex ? { animationDuration: `${FRAME_MS}ms` } : undefined}
                onAnimationEnd={i === frameIndex ? () => goNext() : undefined}
              />
            </span>
          ))}
        </div>

        <header className="story-viewer-head" dir="rtl">
          <button type="button" className="story-viewer-avatar" onClick={openShop} aria-label={item.name}>
            {item.image ? <img src={item.image} alt="" /> : <span>{item.name.slice(0, 1)}</span>}
          </button>
          <div className="min-w-0 flex-1 text-right">
            <p className="flex items-center justify-end gap-1 truncate text-sm font-black text-white">
              {item.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-300" />}
              {item.name}
            </p>
            <p className="text-[11px] font-bold text-white/70">
              {item.isAd !== false ? "آگهی · استوری بازار" : "استوری"}
            </p>
          </div>
          <button type="button" className="story-viewer-icon" onClick={goClose} aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          className="story-viewer-media"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            clearHold();
            holdRef.current = false;
            setPaused(false);
          }}
        >
          <img src={frame.image} alt={frame.title || item.name} draggable={false} />
        </div>

        {(frame.title || frame.caption) && (
          <div className="story-viewer-caption" dir="rtl">
            {frame.title && <p className="text-sm font-black leading-6">{frame.title}</p>}
            {frame.caption && <p className="mt-1 text-xs font-bold text-white/80">{frame.caption}</p>}
          </div>
        )}

        <button type="button" className="story-viewer-cta" onClick={openShop}>
          رفتن به مغازه
        </button>
      </div>
    </div>,
    document.body
  );
}
