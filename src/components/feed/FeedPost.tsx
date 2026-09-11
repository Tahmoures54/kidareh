import React, { memo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Radio,
  Send,
} from "lucide-react";
import { useFeedPost } from "../../hooks/useFeedPost";
import type { FeedPostData } from "../../lib/feedMappers";
import { cn } from "../../utils";

function FeedMedia({
  sources,
  title,
  storeName,
}: {
  sources: string[];
  title: string;
  storeName: string;
}) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  if (!src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[#0b5f58] px-8 text-white">
        <p className="text-xs font-black tracking-wide text-white/70">{storeName}</p>
        <p className="mt-3 text-center text-2xl font-black leading-snug">{title}</p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      className="h-full w-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

interface Props {
  post: FeedPostData;
  onRemoved?: (post: FeedPostData) => void;
}

export const FeedPost = memo(function FeedPost({ post, onRemoved }: Props) {
  const navigate = useNavigate();
  const { liked, saved, busy, flash, like, save, share, openComments, openMessage } = useFeedPost(post);
  const [burst, setBurst] = useState(0);
  const [menu, setMenu] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const lastTap = useRef(0);
  const photos = [post.image, ...(post.images || []), post.storeAvatar || ""]
    .filter((src, index, arr): src is string => Boolean(src) && arr.indexOf(src) === index);

  const onMediaClick = (event: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      event.preventDefault();
      if (!liked) like();
      setBurst((n) => n + 1);
    } else if (photos.length > 1) {
      setPhotoIndex((i) => (i + 1) % photos.length);
    }
    lastTap.current = now;
  };

  const handleSave = async () => {
    const wasSaved = saved;
    await save();
    if (wasSaved && onRemoved) onRemoved(post);
  };

  return (
    <article className="feed-post" data-testid="feed-post" data-feed-key={post.key}>
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link
          to={post.storeHref || post.href}
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--paper-2)] ring-1 ring-[var(--line)]"
          aria-label={post.storeName}
        >
          {post.storeAvatar ? (
            <img src={post.storeAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-black text-[var(--brand-primary)]">
              {post.storeName.slice(0, 1)}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={post.storeHref || post.href} className="flex items-center gap-1">
            <span className="truncate text-sm font-black">{post.storeName}</span>
            {post.storeVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />}
          </Link>
          {post.meta && (
            <p className="truncate text-[11px] font-bold text-[var(--muted)]">{post.meta}</p>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)]"
            aria-label="گزینه‌های بیشتر"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menu && (
            <div className="absolute top-11 left-0 z-30 w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-xl">
              <button
                type="button"
                className="block w-full px-3 py-2.5 text-right text-xs font-bold"
                onClick={() => {
                  setMenu(false);
                  void share();
                }}
              >
                اشتراک‌گذاری
              </button>
              {post.sku && (
                <button
                  type="button"
                  className="flex w-full items-center justify-end gap-1 px-3 py-2.5 text-xs font-bold"
                  onClick={() => {
                    setMenu(false);
                    navigate(`/radar?sku=${post.sku}`);
                  }}
                >
                  رادار قیمت
                  <Radio className="h-3.5 w-3.5" />
                </button>
              )}
              <Link
                to={post.href}
                className="block px-3 py-2.5 text-right text-xs font-bold"
                onClick={() => setMenu(false)}
              >
                دیدن کالا
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="relative bg-black">
        <button
          type="button"
          className="feed-post-media block w-full"
          onClick={onMediaClick}
          aria-label={post.title}
        >
          <FeedMedia
            key={`${post.key}-${photoIndex}`}
            sources={photos.slice(photoIndex)}
            title={post.title}
            storeName={post.storeName}
          />
        </button>
        {burst > 0 && (
          <Heart
            key={burst}
            className="feed-heart-burst pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 fill-white text-white drop-shadow-lg"
          />
        )}
        {post.badge && (
          <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black text-white">
            {post.badge}
          </span>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {photos.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i === photoIndex ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center px-1 pt-1">
        <button
          type="button"
          onClick={like}
          className="flex h-12 w-12 items-center justify-center"
          aria-label={liked ? "برداشتن پسند" : "پسندیدن"}
          aria-pressed={liked}
        >
          <Heart className={cn("h-7 w-7", liked ? "fill-rose-500 text-rose-500" : "text-[var(--ink)]")} />
        </button>
        <button
          type="button"
          onClick={openComments}
          className="flex h-12 w-12 items-center justify-center"
          aria-label="دیدگاه و جزئیات"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="flex h-12 w-12 items-center justify-center"
          aria-label="اشتراک‌گذاری"
        >
          <Send className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          className="ms-auto flex h-12 w-12 items-center justify-center"
          aria-label={saved ? "برداشتن از ذخیره‌ها" : "ذخیره کالا"}
          aria-pressed={saved}
        >
          <Bookmark className={cn("h-7 w-7", saved ? "fill-[var(--ink)] text-[var(--ink)]" : "text-[var(--ink)]")} />
        </button>
      </div>

      <div className="space-y-1 px-3 pb-4">
        <p className="text-sm font-black leading-6">
          <Link to={post.href}>{post.title}</Link>
        </p>
        <div className="flex items-end justify-between gap-3">
          <p className="text-base font-black text-[var(--brand-primary)]">{post.priceLabel}</p>
          {post.oldPriceLabel && (
            <p className="text-xs font-bold text-[var(--muted)] line-through">{post.oldPriceLabel}</p>
          )}
        </div>
        {post.caption && (
          <p className="line-clamp-2 text-[13px] font-bold leading-6 text-[var(--ink-soft)]">
            <span className="font-black text-[var(--ink)]">{post.storeName} </span>
            {post.caption}
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={openMessage} className="text-[12px] font-black text-[var(--brand-primary)]">
            پیام به فروشنده
          </button>
          <Link to={post.href} className="text-[12px] font-black text-[var(--muted)]">
            دیدن کالا
          </Link>
        </div>
        {flash && (
          <p className="text-[12px] font-bold text-[var(--brand-primary)]" role="status">
            {flash}
          </p>
        )}
      </div>
    </article>
  );
});
