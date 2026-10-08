import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bookmark, ChevronDown, Home, Map as MapIcon, MapPin, User, MessageCircle, Sparkles, Store, Search, LogOut, ShieldCheck, LocateFixed } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppLocation } from "../../hooks/useAppLocation";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { listTripIds, onTripChange } from "../../presence/tripBasket";
import { listLocalHolds, onHoldsChange } from "../../presence/holds";
import { NEIGHBORHOODS } from "../../presence/catalog";
import CommandPalette from "./CommandPalette";
import CityPicker from "../location/CityPicker";
import InstallPrompt from "../InstallPrompt";
import { cn } from "../../utils";

const TABS = [
  { to: "/", label: "خانه", icon: Home, end: true },
  { to: "/search", label: "جستجو", icon: Search },
  { to: "/explore", label: "اطراف من", icon: MapIcon },
  { to: "/saved", label: "نشان‌ها", icon: Bookmark },
  { to: "/profile", label: "من", icon: User },
] as const;


function isPresencePath(pathname: string) {
  return pathname === "/" || ["/explore", "/radar", "/trip", "/holds", "/reservations", "/search", "/saved", "/following", "/categories"].includes(pathname) || pathname.startsWith("/p/") || pathname.startsWith("/product/") || pathname.startsWith("/categories/");
}

function liveHoldCount() {
  return listLocalHolds().filter((h) => !["cancelled", "expired", "completed"].includes(h.status)).length;
}

export default function PresenceShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSeller, isAdmin, isMarketer } = useAuth();
  const { location: cityLocation, pickerOpen, setPickerOpen, selectCity, useGps: useCityGps, gpsError: cityGpsError, gpsLoading, isTehran } = useAppLocation();
  const { origin, setNeighborhood, useGps, gpsError } = usePresenceOrigin();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const [holdCount, setHoldCount] = useState(0);
  const chrome = isPresencePath(location.pathname);

  useEffect(() => {
    setTripCount(listTripIds().length);
    return onTripChange(() => setTripCount(listTripIds().length));
  }, []);

  useEffect(() => {
    const refresh = () => setHoldCount(liveHoldCount());
    refresh();
    return onHoldsChange(refresh);
  }, []);

  useEffect(() => setMenu(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "Escape") { setPalette(false); setMenu(false); return; }
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); }
      if (e.key === "/") { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setMenu(false);
    navigate("/");
  }, [logout, navigate]);

  const rail = useMemo(() => (
    <nav className="flex items-center gap-1" aria-label="ناوبری اصلی">
      {TABS.slice(0, 4).map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={"end" in tab ? tab.end : false} className={({ isActive }) => cn(
          "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition",
          isActive ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
        )}>
          <tab.icon className="h-4 w-4" /><span>{tab.label}</span>
        </NavLink>
      ))}
      <NavLink to="/stores" className={({ isActive }) => cn(
        "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition",
        isActive ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
      )}>
        <Store className="h-4 w-4" /><span>فروشگاه‌ها</span>
      </NavLink>
    </nav>
  ), []);

  return (
    <div className="presence-root" dir="rtl">
      <a href="#presence-main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:right-3 focus:z-[80] focus:rounded-xl focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-xs focus:font-black focus:text-white">پرش به محتوا</a>
      <InstallPrompt />
      <div className="relative z-0 mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col isolate">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className={cn("sticky top-0 border-b border-[var(--line)] bg-white/90 backdrop-blur-xl", pickerOpen ? "z-10" : "z-[70]")}>
            <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
              <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-xs font-black text-white shadow-sm lg:hidden">کی</Link>
              <div className="min-w-0 flex-1">
                <p className="hidden text-[11px] font-black text-[var(--accent)] sm:block">کی‌داره · خرید حضوری</p>
                <div className="flex min-w-0 items-center gap-1">
                  <button type="button" onClick={() => setPickerOpen(true)} className="inline-flex min-h-10 max-w-full items-center gap-1 rounded-xl px-1 text-sm font-black" aria-label="انتخاب شهر" title={cityLocation.display}>
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--accent)]" /><span className="truncate">{cityLocation.city}</span><ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                  </button>
                  {isTehran && <select value={origin.neighborhoodId ?? ""} onChange={(e) => setNeighborhood(e.target.value as (typeof NEIGHBORHOODS)[number]["id"])} className="hidden max-w-[150px] truncate rounded-xl bg-transparent py-1 text-[11px] font-black outline-none sm:block" aria-label="انتخاب محله تهران">
                    <option value="">محله تهران</option>{NEIGHBORHOODS.map((n) => <option key={n.id} value={n.id}>{n.name} · {n.district}</option>)}
                  </select>}
                  {isTehran && <button type="button" onClick={useGps} className="hidden min-h-10 items-center gap-1 rounded-xl px-2 text-[11px] font-black text-[var(--accent)] sm:inline-flex"><LocateFixed className="h-3.5 w-3.5" />اینجا</button>}
                </div>
                {(gpsError || cityGpsError) && <p className="text-[10px] font-bold text-[var(--danger)]">{gpsError || cityGpsError}</p>}
              </div>
              <button type="button" onClick={() => setPalette(true)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--muted)] md:hidden" aria-label="جستجو"><Search className="h-5 w-5" /></button>
              <button type="button" onClick={() => setPalette(true)} className="hidden h-11 min-w-[220px] items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--muted)] md:flex"><Search className="h-4 w-4" />جستجو در {cityLocation.city}</button>
              <div className="hidden items-center lg:flex">{rail}</div>
              <button type="button" onClick={() => (user ? setMenu(true) : navigate("/login"))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[var(--ink)] shadow-sm" aria-label={user ? "حساب" : "ورود"}><User className="h-5 w-5" /></button>
            </div>
          </header>
          <main id="presence-main" className={cn("relative z-0 w-full flex-1 pb-32 lg:pb-6", !chrome && "presence-legacy mx-auto w-full max-w-[430px]")}><Outlet /></main>
        </div>
      </div>

      <nav className={cn("presence-tabs fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-white/95 backdrop-blur-xl shadow-[0_-6px_24px_rgba(10,61,58,0.08)]", pickerOpen ? "z-10" : "z-[80]")} aria-label="ناوبری پایین">
        <div className="mx-auto flex w-full max-w-2xl items-stretch px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1 lg:pb-2 lg:pt-2">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={"end" in tab ? tab.end : false} className={({ isActive }) => cn("relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-black transition lg:min-h-12 lg:flex-row lg:gap-1.5 lg:text-xs", isActive ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--paper)]")}>
              <tab.icon className="h-6 w-6" />{tab.label}
              {tab.to === "/saved" && <span className="sr-only">ذخیره‌شده‌ها</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {menu && (
        <div className="fixed inset-0 z-[60]">
          <button type="button" className="absolute inset-0 bg-black/35" aria-label="بستن منو" onClick={() => setMenu(false)} />
          <div className="presence-card absolute bottom-0 left-0 right-0 mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-[28px] p-5 pb-8">
            <div className="mb-4 flex items-center gap-3 border-b border-[var(--line)] pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><User className="h-5 w-5" /></div>
              <div className="min-w-0"><p className="truncate text-base font-black">{user?.store_name || user?.name || "حساب کاربری"}</p><p className="truncate text-xs font-bold text-[var(--muted)]">{user?.phone}</p></div>
            </div>
            <div className="grid gap-2">
              <Link to="/profile" className="min-h-12 rounded-xl bg-[var(--paper)] px-4 py-3 text-sm font-black">پروفایل</Link>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/saved" className="min-h-12 rounded-xl bg-[var(--paper)] px-4 py-3 text-sm font-black">نشان‌ها</Link>
                <Link to="/messages" className="min-h-12 rounded-xl bg-[var(--paper)] px-4 py-3 text-sm font-black">پیام‌ها</Link>
              </div>
              <div className="mt-2 border-t border-[var(--line)] pt-3">
                <p className="mb-2 px-1 text-[11px] font-black text-[var(--muted)]">خرید و کشف</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/search" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">جستجوی کالا</Link>
                  <Link to="/explore" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">اطراف من</Link>
                  <Link to="/stores" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">فروشگاه‌ها</Link>
                  <Link to="/categories" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">دسته‌بندی‌ها</Link>
                </div>
              </div>
              <div className="mt-2 border-t border-[var(--line)] pt-3">
                <p className="mb-2 px-1 text-[11px] font-black text-[var(--muted)]">ابزارها</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/radar" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">رادار قیمت</Link>
                  <Link to="/trip" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">مسیر خرید{tripCount > 0 ? ` · ${tripCount}` : ""}</Link>
                  <Link to="/holds" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">رزروها{holdCount > 0 ? ` · ${holdCount}` : ""}</Link>
                  <Link to="/ai" className="min-h-11 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-xs font-black">دستیار</Link>
                </div>
              </div>
              {isSeller && <Link to="/seller" className="mt-2 min-h-12 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-white">مغازه من</Link>}
              {(isMarketer || isSeller) && <Link to="/referral" className="min-h-11 rounded-xl bg-[var(--paper)] px-4 py-2.5 text-xs font-black">{isMarketer ? "پنل بازاریاب" : "دعوت دوستان"}</Link>}
              {isAdmin && <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--paper)] px-4 py-2.5 text-xs font-black"><ShieldCheck className="h-4 w-4" /> ادمین</Link>}
              <button type="button" onClick={handleLogout} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700"><LogOut className="h-4 w-4" />خروج</button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette open={palette} onClose={() => setPalette(false)} origin={origin} />
      <CityPicker open={pickerOpen} selectedCity={cityLocation.city} selectedProvince={cityLocation.province} gpsLoading={gpsLoading} gpsError={cityGpsError} onClose={() => setPickerOpen(false)} onSelect={(city) => selectCity(city)} onGps={useCityGps} />
    </div>
  );
}