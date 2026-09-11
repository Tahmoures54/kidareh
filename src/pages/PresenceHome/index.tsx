import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Footprints, Radio, Sparkles } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { useAppLocation } from "../../hooks/useAppLocation";
import { categoriesData, getCategoryGroupBySlug, getCategoryGroupInfo } from "../../data/processed/categories";
import { compareCopy, pulseStats, searchListings, toFa } from "../../presence/engine";
import type { ListingCategory, PresenceQuery } from "../../presence/types";
import PresenceMap from "../../components/presence/PresenceMap";
import PresenceEmpty from "../../components/presence/EmptyState";
import { useMinWidth } from "../../hooks/useMinWidth";
import { FeedColumn, FeedStack } from "../../components/feed/FeedColumn";
import { FeedPost } from "../../components/feed/FeedPost";
import { FeedStories, type StoryItem } from "../../components/feed/FeedStories";
import { listingToFeedPost, productToFeedPost, type FeedPostData } from "../../lib/feedMappers";
import { apiRequest } from "../../utils/api";

const PRESENCE_GROUP_TO_LISTING: Record<string, ListingCategory[]> = {
  digital: ["digital", "audio", "gaming"],
  appliances: ["home"],
  home: ["home"],
  fashion: ["fashion"],
  beauty: ["beauty"],
  culture: ["sport", "books"],
  "mother-child": ["kids"],
  others: ["tools"],
  industrial: ["tools"],
  construction: ["tools"],
  office: ["tools"],
};

function listingCatsFor(token: string): ListingCategory[] | null {
  const slug = getCategoryGroupBySlug(token)?.slug || getCategoryGroupInfo(token).slug;
  return PRESENCE_GROUP_TO_LISTING[slug] ?? null;
}

const RADII = [
  { km: 0.8, label: "۸۰۰ م" },
  { km: 1.5, label: "۱٫۵ ک‌م" },
  { km: 3, label: "۳ ک‌م" },
  { km: 8, label: "کل شهر" },
];

export default function PresenceHome() {
  const { origin } = usePresenceOrigin();
  const { location: cityLocation, isTehran } = useAppLocation();
  const [q, setQ] = useState("");
  const [marketCategory, setMarketCategory] = useState("all");
  const [radiusKm, setRadiusKm] = useState(3);
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState<PresenceQuery["sort"]>("nearest");
  const [shopPosts, setShopPosts] = useState<FeedPostData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const desktop = useMinWidth(1024);

  const pulse = useMemo(() => (isTehran ? pulseStats(origin) : { inWalk15: 0 }), [isTehran, origin]);
  const listingCats = useMemo(
    () => (marketCategory === "all" ? ("all" as const) : listingCatsFor(marketCategory)),
    [marketCategory]
  );
  const listings = useMemo(() => {
    if (!isTehran) return [];
    const raw = searchListings(origin, {
      q,
      category: "all",
      radiusKm,
      openNow,
      sort,
      inStock: true,
      verifiedOnly: false,
    });
    if (listingCats === "all") return raw;
    if (!listingCats) return [];
    return raw.filter((item) => listingCats.includes(item.category));
  }, [isTehran, origin, q, listingCats, radiusKm, openNow, sort]);
  const compare = compareCopy();

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ products?: Record<string, unknown>[] }>(
      `/api/products/search?limit=12&sort=newest&scope=city&city=${encodeURIComponent(cityLocation.city)}${
        marketCategory !== "all" ? `&category=${encodeURIComponent(marketCategory)}` : ""
      }`
    )
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.products) ? res.products : [];
        setShopPosts(rows.map((row) => productToFeedPost(row)));
      })
      .catch(() => {
        if (!cancelled) setShopPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cityLocation.city, marketCategory]);

  const listingPosts = useMemo(() => listings.map(listingToFeedPost), [listings]);
  const posts = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const shops = qn
      ? shopPosts.filter((post) =>
          `${post.title} ${post.storeName} ${post.caption ?? ""}`.toLowerCase().includes(qn)
        )
      : shopPosts;
    const seen = new Set<string>();
    const mixed = listingPosts.length
      ? [...listingPosts.slice(0, 1), ...shops, ...listingPosts.slice(1)]
      : shops;
    return mixed.filter((post) => {
      if (seen.has(post.key)) return false;
      seen.add(post.key);
      return true;
    });
  }, [listingPosts, q, shopPosts]);

  const stories = useMemo<StoryItem[]>(() => {
    const items: StoryItem[] = [];
    const seen = new Set<string>();
    for (const listing of listings) {
      if (seen.has(listing.store.id)) continue;
      seen.add(listing.store.id);
      items.push({
        id: listing.store.id,
        name: listing.store.name,
        href: `/p/${listing.id}`,
        image: listing.store.cover,
        live: listing.openNow,
      });
      if (items.length >= 12) break;
    }
    if (items.length === 0) {
      for (const post of shopPosts) {
        if (!post.storeId || seen.has(String(post.storeId))) continue;
        seen.add(String(post.storeId));
        items.push({
          id: String(post.storeId),
          name: post.storeName,
          href: `/store/${post.storeId}`,
          image: post.storeAvatar || post.image,
          live: false,
        });
        if (items.length >= 12) break;
      }
    }
    return items;
  }, [listings, shopPosts]);

  return (
    <div className="grid bg-white lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">
        <FeedColumn>
          <label className="mx-3 mt-3 flex h-11 items-center gap-3 rounded-2xl bg-[var(--paper)] px-3">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در پست‌ها…"
              className="h-full flex-1 bg-transparent text-sm font-bold outline-none"
            />
          </label>

          <FeedStories items={stories} />

          <div className="flex items-center gap-2 overflow-x-auto presence-hide-scroll px-3 pb-2">
            <button
              type="button"
              onClick={() => setMarketCategory("all")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black ${marketCategory === "all" ? "bg-[var(--accent)] text-white" : "presence-chip"}`}
            >
              همه
            </button>
            {categoriesData.map((group) => (
              <button
                key={group.slug}
                type="button"
                onClick={() => setMarketCategory(group.slug)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black ${marketCategory === group.slug ? "bg-[var(--accent)] text-white" : "presence-chip"}`}
              >
                {group.icon} {group.short}
              </button>
            ))}
            <Link
              to="/categories"
              className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black presence-chip"
            >
              همه دسته‌ها
            </Link>
            {isTehran && (
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black ${showFilters ? "bg-[var(--accent)] text-white" : "presence-chip"}`}
            >
              فیلتر
            </button>
            )}
          </div>

          {showFilters && isTehran && (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            {RADII.map((r) => (
              <button
                key={r.km}
                type="button"
                onClick={() => setRadiusKm(r.km)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black ${radiusKm === r.km ? "bg-[var(--accent)] text-white" : "presence-chip"}`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpenNow((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black ${openNow ? "bg-[var(--ok)] text-white" : "presence-chip"}`}
            >
              <Clock3 className="h-3 w-3" /> فقط باز
            </button>
            {(
              [
                ["nearest", "نزدیک‌ترین"],
                ["cheapest", "ارزان‌ترین"],
                ["trust", "معتبرترین"],
                ["newest", "تازه‌ترین"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black ${sort === key ? "bg-[var(--accent)] text-white" : "presence-chip"}`}
              >
                {label}
              </button>
            ))}
            <span className="text-[11px] font-black text-[var(--muted)]">{toFa(pulse.inWalk15)} تا ۱۵ دقیقه</span>
          </div>
          )}
        </FeedColumn>

        <FeedColumn>
          {posts.length === 0 ? (
            <div className="px-3 py-6">
              <PresenceEmpty
                title={isTehran ? "در این شعاع کالایی نیست" : `هنوز آگهی در ${cityLocation.city} نیست`}
                hint={
                  isTehran
                    ? "فیلتر «فقط باز» را خاموش کن یا شعاع را بزرگ‌تر بگیر."
                    : "فروشگاه‌های همین شهر را ببین یا از هدر شهر دیگری انتخاب کن."
                }
                actionLabel={isTehran ? "نمایش کل شهر" : "فروشگاه‌های این شهر"}
                actionTo={isTehran ? undefined : "/stores"}
                onAction={
                  isTehran
                    ? () => {
                        setOpenNow(false);
                        setRadiusKm(8);
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <FeedStack>
              {posts.map((post) => (
                <FeedPost key={post.key} post={post} />
              ))}
            </FeedStack>
          )}
        </FeedColumn>

        <FeedColumn>
          <section className="mx-3 my-6 overflow-hidden rounded-[24px] border border-[var(--line)]">
            <div className="bg-[var(--accent)] px-5 py-4 text-white">
              <p className="text-sm font-black text-white/90">چرا کی‌داره؟</p>
              <h2 className="mt-1 text-lg font-black">ببین، بعد بخر — از مغازه همین محله</h2>
            </div>
            <div className="grid sm:grid-cols-2">
              {compare.map((row) => (
                <div key={row.axis} className="border-t border-[var(--line)] bg-white p-4">
                  <p className="text-sm font-black text-[var(--ink)]">{row.axis}</p>
                  <p className="mt-2 text-xs font-bold text-[var(--muted)]">دیجی‌کالا: {row.digikala}</p>
                  <p className="text-xs font-bold text-[var(--muted)]">دیوار: {row.divar}</p>
                  <p className="mt-1 text-sm font-black text-[var(--accent)]">کی‌داره: {row.kidareh}</p>
                </div>
              ))}
            </div>
          </section>
        </FeedColumn>
      </div>

      {desktop && (
      <aside className="sticky top-[73px] z-0 h-[calc(100dvh-73px)] border-r border-[var(--line)]">
        <div className="relative h-full">
          <PresenceMap origin={origin} listings={listings} />
          <div className="absolute bottom-4 right-4 left-4 z-10 presence-card rounded-2xl p-3">
            <p className="inline-flex items-center gap-1 text-xs font-black">
              <Footprints className="h-3.5 w-3.5 text-[var(--accent)]" />
              {toFa(listings.length)} کالا روی نقشهٔ {isTehran ? origin.label : cityLocation.city}
            </p>
            <div className="mt-2 flex gap-2">
              <Link to="/explore" className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-center text-sm font-black text-white">
                نقشه تمام‌صفحه
              </Link>
              <Link to="/radar" className="flex items-center justify-center gap-1 rounded-xl bg-[var(--accent)] px-3 text-[11px] font-black text-white">
                <Radio className="h-3.5 w-3.5" /> رادار
              </Link>
            </div>
          </div>
        </div>
      </aside>
      )}
    </div>
  );
}
