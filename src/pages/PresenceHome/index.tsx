import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpLeft,
  Clock3,
  LocateFixed,
  Loader2,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { useAppLocation } from "../../hooks/useAppLocation";
import { categoriesData, getCategoryGroupBySlug, getCategoryGroupInfo } from "../../data/processed/categories";
import { searchListings, toFa } from "../../presence/engine";
import type { ListingCategory, PresenceQuery } from "../../presence/types";
import PresenceMap from "../../components/presence/PresenceMap";
import PresenceEmpty from "../../components/presence/EmptyState";
import { FeedColumn, FeedStack } from "../../components/feed/FeedColumn";
import { FeedPost } from "../../components/feed/FeedPost";
import { FeedStories, type StoryItem } from "../../components/feed/FeedStories";
import { listingToFeedPost, productToFeedPost, type FeedPostData } from "../../lib/feedMappers";
import { mergeMarketStories } from "../../lib/marketStories";
import { presenceMarketStories } from "../../presence/stories";
import { useMarketStories } from "../../hooks/useMarketStories";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";

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
  { km: 1.5, label: "۱٫۵ کیلومتر" },
  { km: 3, label: "۳ کیلومتر" },
  { km: 8, label: "کل شهر" },
];

export default function PresenceHome() {
  const { origin } = usePresenceOrigin();
  const { location: cityLocation, isTehran } = useAppLocation();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [marketCategory, setMarketCategory] = useState("all");
  const [radiusKm, setRadiusKm] = useState(3);
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState<PresenceQuery["sort"]>("nearest");
  const [shopPosts, setShopPosts] = useState<FeedPostData[]>([]);
  const [shopPostsLoading, setShopPostsLoading] = useState(true);
  const { items: paidStories } = useMarketStories(cityLocation.city);

  const loadShopPosts = useCallback(async (signal?: AbortSignal) => {
    setShopPostsLoading(true);
    try {
      const response = await apiRequest<{ products?: Record<string, unknown>[] }>(
        `/api/products/search?limit=12&sort=newest&scope=city&city=${encodeURIComponent(cityLocation.city)}${marketCategory !== "all" ? `&category=${encodeURIComponent(marketCategory)}` : ""}`,
        { signal },
      );
      if (signal?.aborted) return;
      const rows = Array.isArray(response?.products) ? response.products : [];
      setShopPosts(rows.map((row) => productToFeedPost(row)));
    } catch {
      if (!signal?.aborted) setShopPosts([]);
    } finally {
      if (!signal?.aborted) setShopPostsLoading(false);
    }
  }, [cityLocation.city, marketCategory]);

  useEffect(() => {
    const controller = new AbortController();
    void loadShopPosts(controller.signal);
    return () => controller.abort();
  }, [loadShopPosts]);

  const refreshHome = useCallback(() => loadShopPosts(), [loadShopPosts]);
  const { pullDistance, refreshing, handlers: pullHandlers } = usePullToRefresh({ onRefresh: refreshHome });


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

  const listingPosts = useMemo(() => listings.map(listingToFeedPost), [listings]);

  const posts = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const shops = qn
      ? shopPosts.filter((post) =>
          `${post.title} ${post.storeName} ${post.caption ?? ""}`.toLowerCase().includes(qn)
        )
      : shopPosts;
    const seen = new Set<string>();
    const mixed = listingPosts.length ? [...listingPosts.slice(0, 2), ...shops, ...listingPosts.slice(2)] : shops;
    return mixed.filter((post) => {
      if (seen.has(post.key)) return false;
      seen.add(post.key);
      return true;
    });
  }, [listingPosts, q, shopPosts]);

  const stories = useMemo<StoryItem[]>(
    () => mergeMarketStories(paidStories, isTehran ? presenceMarketStories() : [], 18),
    [isTehran, paidStories]
  );

  const categoryLabel =
    marketCategory === "all"
      ? "همه کالاها"
      : categoriesData.find((g) => g.slug === marketCategory)?.short || "کالاها";

  return (
    <div className="min-h-full bg-[#f6f8f7] text-[var(--ink)]" {...pullHandlers}>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center transition-opacity" style={{ transform: `translateY(${Math.max(0, Math.min(pullDistance, 54))}px)`, opacity: pullDistance > 0 || refreshing ? 1 : 0 }}>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/95 px-4 py-2 text-xs font-black text-teal-700 shadow-lg backdrop-blur dark:border-teal-900 dark:bg-slate-900/95 dark:text-teal-300">
          <Loader2 className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "در حال تازه‌سازی" : pullDistance >= 76 ? "رها کن تا تازه شود" : "برای تازه‌سازی پایین بکش"}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1320px] px-3 pb-28 pt-3 sm:px-5 lg:px-7 lg:pb-16 lg:pt-5">
        <section className="relative overflow-hidden rounded-[30px] bg-[var(--ink)] shadow-[0_20px_60px_rgba(15,42,40,0.14)]">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)]/25 blur-3xl" />
          <div className="absolute -bottom-32 right-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative grid lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="p-6 sm:p-9 lg:p-12">
              <div className="flex items-center gap-2 text-xs font-black text-white/65">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white">کی</span>
                خرید حضوری، ساده و نزدیک
              </div>

              <h1 className="mt-6 max-w-3xl text-3xl font-black leading-[1.35] tracking-tight text-white sm:text-4xl lg:text-5xl">
                قبل از راه افتادن،
                <span className="block text-[var(--accent)]">ببین کی داره.</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-white/70 sm:text-base">
                کالای موردنظرت را پیدا کن، فروشگاه نزدیک را ببین و بعد برای خرید حضوری راه بیفت.
                بدون پیچیدگی و بدون گشتن بین چندین فروشگاه.
              </p>

              <form
                className="mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.assign(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
              >
                <div className="flex min-h-14 flex-1 items-center gap-3 rounded-xl px-3">
                  <Search className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="چه چیزی می‌خواهی؟ مثلاً روغن موتور، کفش یا شارژر"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--ink)] outline-none placeholder:text-slate-400"
                    aria-label="جستجوی کالا"
                  />
                </div>
                <button className="min-h-14 rounded-xl bg-[var(--accent)] px-7 text-sm font-black text-white transition hover:brightness-95">
                  جستجوی کالا
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {["روغن موتور", "کفش ورزشی", "شارژر آیفون", "لوازم خودرو"].map((item) => (
                  <Link
                    key={item}
                    to={`/search?q=${encodeURIComponent(item)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-black text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden border-r border-white/10 bg-white/[0.035] p-6 lg:block">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-xs font-black text-white/50">موقعیت شما</p>
                  <div className="mt-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[var(--accent)]" />
                    <span className="text-lg font-black text-white">{cityLocation.city}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold leading-6 text-white/55">
                    کالاهای اطراف را ببین و نزدیک‌ترین گزینه را برای خرید حضوری انتخاب کن.
                  </p>
                </div>
                <Link
                  to="/explore"
                  className="mt-8 flex min-h-12 items-center justify-between rounded-xl bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15"
                >
                  <span className="flex items-center gap-2"><Navigation className="h-4 w-4 text-[var(--accent)]" /> دیدن اطراف من</span>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-xs font-black text-[var(--muted)]">دسته‌بندی‌ها</p>
              <h2 className="mt-1 text-base font-black">از کجا شروع کنیم؟</h2>
            </div>
            <Link to="/categories" className="text-xs font-black text-[var(--accent)]">همه دسته‌ها</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 presence-hide-scroll">
            <button
              type="button"
              onClick={() => setMarketCategory("all")}
              className={`flex min-w-[88px] flex-col items-center gap-2 rounded-2xl px-3 py-3 text-[11px] font-black transition ${marketCategory === "all" ? "bg-[var(--accent)] text-white shadow-sm" : "bg-[#f5f7f6] text-[var(--ink)] hover:bg-[var(--accent)]/10"}`}
            >
              <span className="text-xl">همه</span>
              همه کالاها
            </button>
            {categoriesData.slice(0, 9).map((group) => (
              <button
                key={group.slug}
                type="button"
                onClick={() => setMarketCategory(group.slug)}
                className={`flex min-w-[88px] flex-col items-center gap-2 rounded-2xl px-3 py-3 text-[11px] font-black transition ${marketCategory === group.slug ? "bg-[var(--accent)] text-white shadow-sm" : "bg-[#f5f7f6] text-[var(--ink)] hover:bg-[var(--accent)]/10"}`}
              >
                <span className="text-xl">{group.icon}</span>
                {group.short}
              </button>
            ))}
          </div>
        </section>

        {stories.length > 0 && (
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <p className="text-xs font-black text-[var(--muted)]">تازه و نزدیک</p>
                <h2 className="mt-1 text-xl font-black">پیشنهادهای امروز</h2>
              </div>
              <span className="text-xs font-bold text-[var(--muted)]">{cityLocation.city}</span>
            </div>
            <FeedStories items={stories} />
          </section>
        )}

        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black text-[var(--muted)]">ویترین محلی</p>
              <h2 className="mt-1 text-xl font-black">{q.trim() ? `نتایج «${q.trim()}»` : categoryLabel}</h2>
            </div>
            {isTehran && (
              <div className="flex flex-wrap items-center gap-2">
                {RADII.map((r) => (
                  <button
                    key={r.km}
                    type="button"
                    onClick={() => setRadiusKm(r.km)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-black ${radiusKm === r.km ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"}`}
                  >
                    {r.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOpenNow((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black ${openNow ? "bg-emerald-600 text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"}`}
                >
                  <Clock3 className="h-3 w-3" /> باز
                </button>
              </div>
            )}
          </div>

          {shopPostsLoading && posts.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="در حال بارگذاری کالاها" aria-busy="true">
              {[0, 1, 2].map((item) => (
                <div key={item} className="overflow-hidden rounded-[24px] border border-slate-100 bg-white p-3 shadow-sm animate-pulse">
                  <div className="aspect-[16/10] rounded-2xl bg-slate-100" />
                  <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-100" />
                  <div className="mt-3 h-3 w-1/2 rounded-full bg-slate-100" />
                  <div className="mt-5 h-8 w-1/3 rounded-xl bg-teal-50" />
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <FeedColumn>
              <FeedStack>
                {posts.slice(0, 8).map((post) => <FeedPost key={post.key} post={post} />)}
              </FeedStack>
              {posts.length > 8 && (
                <div className="mt-3 text-center">
                  <Link to="/search" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-5 py-3 text-xs font-black text-[var(--ink)]">
                    دیدن همه کالاها <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </FeedColumn>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white p-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <PresenceEmpty
                title={marketCategory !== "all" ? "در این دسته هنوز کالایی پیدا نشد" : `هنوز کالایی در ${cityLocation.city} نمایش داده نشده`}
                hint="جستجو را امتحان کن یا فروشگاه‌های نزدیک را ببین."
                actionLabel="رفتن به فروشگاه‌ها"
                actionTo="/stores"
              />
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="overflow-hidden rounded-[26px] border border-[var(--line)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-xs font-black text-[var(--muted)]">خرید نزدیک‌تر</p>
                <h2 className="mt-1 text-lg font-black">فروشگاه‌های اطراف را ببین</h2>
              </div>
              <MapPin className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="p-3">
              <PresenceMap className="h-[270px] w-full rounded-2xl" listings={listings.slice(0, 40)} origin={origin} />
            </div>
            <div className="px-4 pb-4">
              <Link to="/explore" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] text-xs font-black text-white">
                باز کردن نقشه و اطراف من <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between overflow-hidden rounded-[26px] bg-[var(--accent)] p-6 text-white shadow-sm">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Store className="h-6 w-6" />
              </div>
              <p className="mt-7 text-xs font-black text-white/65">صاحب فروشگاه هستی؟</p>
              <h2 className="mt-2 text-2xl font-black leading-9">فروشگاهت را رایگان معرفی کن.</h2>
              <p className="mt-3 text-sm font-bold leading-7 text-white/80">
                کالاها، قیمت و موقعیت فروشگاهت را ثبت کن تا مشتری‌های اطرافت راحت‌تر پیدایت کنند.
              </p>
            </div>
            <Link
              to={user ? "/become-seller" : "/onboarding?role=seller"}
              className="mt-8 flex min-h-12 items-center justify-between rounded-xl bg-white px-4 text-sm font-black text-[var(--accent)]"
            >
              ثبت فروشگاه
              <ArrowUpLeft className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["۱", "جستجو کن", "اسم کالا را بنویس."],
            ["۲", "نزدیک‌ترین را ببین", "فروشگاه و موقعیت را مقایسه کن."],
            ["۳", "حضوری بخر", "وقتی مطمئن شدی راه بیفت."],
          ].map(([n, title, text]) => (
            <div key={n} className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-sm font-black text-[var(--accent)]">{n}</span>
              <h3 className="mt-4 text-sm font-black">{title}</h3>
              <p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">{text}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 text-center text-[11px] font-bold text-[var(--muted)]">
          برای پیدا کردن کالا لازم نیست اول ثبت‌نام کنی.
        </p>
      </div>
    </div>
  );
}
