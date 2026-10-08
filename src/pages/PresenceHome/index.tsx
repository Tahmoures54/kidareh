import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock3,
  Footprints,
  Map as MapIcon,
  Radio,
  Search,
  Sparkles,
  Store,
  Navigation,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
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
import { mergeMarketStories } from "../../lib/marketStories";
import { presenceMarketStories } from "../../presence/stories";
import { useMarketStories } from "../../hooks/useMarketStories";
import { useAuth } from "../../context/AuthContext";
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

const QUICK_ACTIONS = [
  { to: "/explore", label: "نقشه", icon: MapIcon, tone: "from-teal-500 to-cyan-500" },
  { to: "/radar", label: "رادار قیمت", icon: Radio, tone: "from-violet-500 to-fuchsia-500" },
  { to: "/ai", label: "دستیار هوشمند", icon: Sparkles, tone: "from-amber-500 to-orange-500" },
  { to: "/search", label: "جستجو", icon: Search, tone: "from-sky-500 to-blue-600" },
  { to: "/stores", label: "فروشگاه‌ها", icon: Store, tone: "from-emerald-500 to-teal-600" },
] as const;

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  if (h < 21) return "عصر بخیر";
  return "شب بخیر";
}

export default function PresenceHome() {
  const { origin } = usePresenceOrigin();
  const { location: cityLocation, isTehran } = useAppLocation();
  const { user, isSeller } = useAuth();
  const [q, setQ] = useState("");
  const [marketCategory, setMarketCategory] = useState("all");
  const [radiusKm, setRadiusKm] = useState(3);
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState<PresenceQuery["sort"]>("nearest");
  const [shopPosts, setShopPosts] = useState<FeedPostData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const desktop = useMinWidth(1024);
  const { items: paidStories } = useMarketStories(cityLocation.city);

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
    const extra = isTehran ? presenceMarketStories() : [];
    return mergeMarketStories(paidStories, extra, 24);
  }, [isTehran, paidStories]);

  const displayName = user?.name?.trim() || user?.store_name?.trim() || "";

  return (
    <div className="sv-home grid bg-[var(--paper)] lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">
        <section className="sv-hero">
          <div className="sv-hero-inner">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="sv-greeting">
                  {greetingByHour()}
                  {displayName ? `، ${displayName}` : ""}
                </p>
                <h1 className="sv-title">ببین کی داره؟ حضوری بگیر</h1>
                <p className="sv-subtitle">
                  در <span className="font-black text-[var(--accent)]">{cityLocation.city}</span> کالا و
                  فروشگاه اطراف را پیدا کن، چت کن، بعد حضوری بخر — بدون انتظار ارسال.
                </p>
              </div>
              <div className="sv-logo-mark" aria-hidden>
                کی
              </div>
            </div>

            <div className="sv-actions">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.to} to={a.to} className="sv-action">
                  <span className={`sv-action-icon bg-gradient-to-br ${a.tone}`}>
                    <a.icon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <span className="sv-action-label">{a.label}</span>
                </Link>
              ))}
            </div>

            {isTehran && pulse.inWalk15 > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="sv-pulse sv-pulse-accent">
                  <Footprints className="h-3.5 w-3.5" />
                  {toFa(pulse.inWalk15)} کالا تا ۱۵ دقیقه پیاده
                </span>
                <span className="sv-pulse sv-pulse-soft">
                  <Navigation className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {origin.label || cityLocation.city}
                </span>
              </div>
            )}
          </div>
        </section>

        <FeedColumn>
          <label className="sv-search">
            <Search className="h-4.5 w-4.5 shrink-0 text-[var(--accent)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="چی می‌خوای؟ جستجو در پست‌ها و کالاها…"
              aria-label="جستجو"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="rounded-lg px-2 py-1 text-[11px] font-black text-[var(--muted)] hover:text-[var(--ink)]"
              >
                پاک
              </button>
            )}
          </label>

          <FeedStories
            items={stories}
            composer={isSeller ? { label: "استوری من", href: "/buy-badge" } : undefined}
          />

          <div className="flex items-center gap-2 overflow-x-auto presence-hide-scroll px-3 pb-2 pt-1">
            <button
              type="button"
              onClick={() => setMarketCategory("all")}
              className={`sv-chip ${marketCategory === "all" ? "sv-chip-active" : "sv-chip-idle"}`}
            >
              همه
            </button>
            {categoriesData.map((group) => (
              <button
                key={group.slug}
                type="button"
                onClick={() => setMarketCategory(group.slug)}
                className={`sv-chip ${marketCategory === group.slug ? "sv-chip-active" : "sv-chip-idle"}`}
              >
                {group.icon} {group.short}
              </button>
            ))}
            <Link to="/categories" className="sv-chip sv-chip-idle">
              همه دسته‌ها
            </Link>
            {isTehran && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`sv-chip ${showFilters ? "sv-chip-active" : "sv-chip-idle"}`}
              >
                فیلتر
              </button>
            )}
          </div>

          {showFilters && isTehran && (
            <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] bg-white p-3">
              {RADII.map((r) => (
                <button
                  key={r.km}
                  type="button"
                  onClick={() => setRadiusKm(r.km)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                    radiusKm === r.km ? "bg-[var(--accent)] text-white" : "presence-chip"
                  }`}
                >
                  {r.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setOpenNow((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  openNow ? "bg-[var(--ok)] text-white" : "presence-chip"
                }`}
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
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                    sort === key ? "bg-[var(--accent)] text-white" : "presence-chip"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="text-[11px] font-black text-[var(--muted)]">
                {toFa(pulse.inWalk15)} تا ۱۵ دقیقه
              </span>
            </div>
          )}
        </FeedColumn>

        <div className="sv-section-head">
          <p className="sv-section-title">
            {q.trim()
              ? `نتایج «${q.trim()}»`
              : marketCategory !== "all"
                ? categoriesData.find((g) => g.slug === marketCategory)?.short || "دسته"
                : "تازه‌های اطراف"}
          </p>
          <span className="sv-section-meta">
            {posts.length > 0 ? `${toFa(posts.length)} مورد` : ""}
          </span>
        </div>

        <FeedColumn>
          {posts.length === 0 ? (
            <div className="px-3 py-6">
              <div className="rounded-[28px] border border-dashed border-[var(--line)] bg-white p-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <PresenceEmpty
                  title={
                    marketCategory !== "all"
                      ? "در این دسته کالایی نیست"
                      : isTehran
                        ? "در این شعاع کالایی نیست"
                        : `هنوز آگهی در ${cityLocation.city} نیست`
                  }
                  hint={
                    marketCategory !== "all"
                      ? "دسته دیگری را بزن یا از «همه دسته‌ها» زیردسته دقیق‌تر را باز کن."
                      : isTehran
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
          <section className="mx-3 mt-5 overflow-hidden rounded-[28px] border border-[var(--line)] bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="bg-[var(--accent)] p-5 text-white sm:p-7">
                <p className="text-xs font-black text-white/75">برای خریدار</p>
                <h2 className="mt-1 text-xl font-black leading-8 sm:text-2xl">قبل از راه افتادن، ببین کی داره.</h2>
                <p className="mt-2 text-xs font-bold leading-6 text-white/80">
                  کالا را پیدا کن، فروشگاه نزدیک را ببین، قیمت و موجودی را بررسی کن و اگر لازم بود مستقیم با فروشنده حرف بزن.
                </p>
                <Link to="/search" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[var(--accent)]">
                  همین حالا جستجو کن <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
              <div className="p-5 sm:p-7">
                <p className="text-xs font-black text-[var(--muted)]">برای فروشنده</p>
                <h2 className="mt-1 text-xl font-black leading-8 text-[var(--ink)] sm:text-2xl">فروشگاهت را رایگان معرفی کن.</h2>
                <p className="mt-2 text-xs font-bold leading-6 text-[var(--muted)]">
                  مشتری‌های اطرافت باید بتوانند کالا، قیمت و موقعیت فروشگاهت را ببینند. با یک ثبت‌نام ساده شروع کن.
                </p>
                <Link to={user ? "/become-seller" : "/onboarding?role=seller"} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-xs font-black text-white">
                  ثبت فروشگاه <Store className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </FeedColumn>

        <FeedColumn>
          <section className="sv-why">
            <div className="sv-why-banner">
              <p className="relative z-[1] text-sm font-black text-white/90">چرا کی‌داره؟</p>
              <h2 className="relative z-[1] mt-1 text-lg font-black leading-snug sm:text-xl">
                ببین، بعد بخر — از مغازه همین محله
              </h2>
              <p className="relative z-[1] mt-2 max-w-sm text-[13px] font-bold leading-6 text-white/85">
                شفافیت موجودی و قیمت، چت فوری با فروشنده، مسیر روی نقشه.
              </p>
            </div>
            <div className="grid sm:grid-cols-2">
              {compare.map((row) => (
                <div
                  key={row.axis}
                  className="border-t border-[var(--line)] bg-white p-4 transition hover:bg-[var(--paper)] sm:odd:border-l"
                >
                  <p className="text-sm font-black text-[var(--ink)]">{row.axis}</p>
                  <p className="mt-2 text-xs font-bold text-[var(--muted)]">دیجی‌کالا: {row.digikala}</p>
                  <p className="text-xs font-bold text-[var(--muted)]">دیوار: {row.divar}</p>
                  <p className="mt-1.5 text-sm font-black text-[var(--accent)]">کی‌داره: {row.kidareh}</p>
                </div>
              ))}
            </div>
          </section>
        </FeedColumn>
      </div>

      {desktop && (
        <aside className="sticky top-0 hidden h-[100dvh] border-r border-[var(--line)] bg-white/80 p-4 backdrop-blur-md lg:block">
          <div className="flex h-full flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm">
              <PresenceMap className="presence-map h-[280px] w-full" listings={listings.slice(0, 40)} origin={origin} />
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
              <p className="text-xs font-black text-[var(--muted)]">موقعیت فعال</p>
              <p className="mt-1 text-sm font-black text-[var(--ink)]">
                {origin.label || cityLocation.city}
              </p>
              <div className="mt-2 flex gap-2">
                <Link
                  to="/explore"
                  className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-center text-sm font-black text-white shadow-md shadow-[var(--accent)]/20"
                >
                  نقشه تمام‌صفحه
                </Link>
                <Link
                  to="/radar"
                  className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3 text-[11px] font-black text-white"
                >
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
