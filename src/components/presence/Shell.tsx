import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  Map as MapIcon,
  Radio,
  Route,
  QrCode,
  User,
  MessageCircle,
  Sparkles,
  Store,
  Search,
  LogOut,
  ShieldCheck,
  LocateFixed,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { listTripIds, onTripChange } from "../../presence/tripBasket";
import { listLocalHolds, onHoldsChange } from "../../presence/holds";
import { NEIGHBORHOODS } from "../../presence/catalog";
import CommandPalette from "./CommandPalette";
import InstallPrompt from "../InstallPrompt";
import { cn } from "../../utils";

const TABS = [
  { to: "/", label: "محله", icon: Compass, end: true },
  { to: "/explore", label: "نقشه", icon: MapIcon },
  { to: "/radar", label: "قیمت", icon: Radio },
  { to: "/trip", label: "مسیر", icon: Route },
  { to: "/holds", label: "رزرو", icon: QrCode },
] as const;

function isPresencePath(pathname: string) {
  return (
    pathname === "/" ||
    ["/explore", "/radar", "/trip", "/holds", "/reservations"].includes(pathname) ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/product/")
  );
}

function liveHoldCount() {
  return listLocalHolds().filter((h) => !["cancelled", "expired", "completed"].includes(h.status)).length;
}

export default function PresenceShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSeller, isAdmin, isMarketer } = useAuth();
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
      if (e.key === "Escape") {
        setPalette(false);
        setMenu(false);
        return;
      }
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setMenu(false);
    navigate("/");
  }, [logout, navigate]);

  const rail = useMemo(
    () => (
      <nav className="flex h-full flex-col items-center gap-2 py-4" aria-label="ناوبری اصلی">
        <Link
          to="/"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-black text-white shadow-md shadow-[var(--accent)]/25"
        >
          کی
        </Link>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={"end" in tab ? tab.end : false}
            className={({ isActive }) =>
              cn(
                "relative flex h-14 w-14 flex-col items-center justify-center rounded-2xl text-[var(--muted)] transition",
                isActive && "bg-white text-[var(--accent)] shadow-sm"
              )
            }
            aria-label={tab.label}
          >
            <tab.icon className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-black">{tab.label}</span>
            {tab.to === "/trip" && tripCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-black text-white">
                {tripCount}
              </span>
            )}
            {tab.to === "/holds" && holdCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[9px] font-black text-[var(--ink)]">
                {holdCount}
              </span>
            )}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-2">
          <Link to="/messages" className="flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--muted)]" aria-label="پیام‌ها">
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link to="/ai" className="flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--muted)]" aria-label="دستیار">
            <Sparkles className="h-5 w-5" />
          </Link>
        </div>
      </nav>
    ),
    [holdCount, tripCount]
  );

  return (
    <div className="presence-root" dir="rtl">
      <a href="#presence-main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:right-3 focus:z-[80] focus:rounded-xl focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-xs focus:font-black focus:text-white">
        پرش به محتوا
      </a>
      <InstallPrompt />
      <div className="relative z-0 mx-auto flex min-h-[100dvh] max-w-[1440px] isolate">
        <aside className="sticky top-0 z-50 hidden h-[100dvh] w-[88px] shrink-0 border-l border-[var(--line)] bg-white/70 backdrop-blur-xl lg:block">
          {rail}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-[70] border-b border-[var(--line)] bg-white/90 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <Link
                to="/"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-xs font-black text-white shadow-md shadow-[var(--accent)]/25 lg:hidden"
              >
                کی
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-[var(--accent)]">کی‌داره · خرید حضوری</p>
                <div className="flex items-center gap-2">
                  <select
                    value={origin.neighborhoodId ?? ""}
                    onChange={(e) => setNeighborhood(e.target.value as (typeof NEIGHBORHOODS)[number]["id"])}
                    className="max-w-[200px] truncate rounded-xl bg-transparent py-1 text-sm font-black outline-none"
                    aria-label="انتخاب محله"
                  >
                    <option value="">موقعیت فعلی</option>
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} · {n.district}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={useGps}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-[12px] font-black text-[var(--accent)]"
                  >
                    <LocateFixed className="h-3.5 w-3.5" />
                    اینجا
                  </button>
                </div>
                {gpsError && <p className="text-[10px] font-bold text-[var(--danger)]">{gpsError}</p>}
              </div>
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[var(--muted)] md:hidden"
                aria-label="جستجو"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="hidden h-12 min-w-[220px] items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-3 text-sm font-bold text-[var(--muted)] md:flex"
              >
                <Search className="h-4 w-4" />
                جستجو در محله
              </button>
              <Link to="/stores" className="hidden h-12 items-center gap-1 rounded-2xl px-3 text-sm font-black text-[var(--ink-soft)] sm:inline-flex">
                <Store className="h-4 w-4" /> فروشگاه‌ها
              </Link>
              <button
                type="button"
                onClick={() => (user ? setMenu(true) : navigate("/login"))}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--ink)] shadow-sm"
                aria-label={user ? "حساب" : "ورود"}
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </header>
          <main id="presence-main" className={cn("relative z-0 w-full flex-1 pb-32 lg:pb-6", !chrome && "presence-legacy mx-auto w-full max-w-[430px]")}>
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        className="presence-tabs fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--line)] bg-white lg:hidden"
        aria-label="تب‌ها"
      >
        <div className="mx-auto flex max-w-lg items-stretch px-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={"end" in tab ? tab.end : false}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[12px] font-black",
                  isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"
                )
              }
            >
              <tab.icon className="h-6 w-6" />
              {tab.label}
              {tab.to === "/trip" && tripCount > 0 && (
                <span className="absolute top-1.5 left-1/2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              )}
              {tab.to === "/holds" && holdCount > 0 && (
                <span className="absolute top-1.5 left-[calc(50%+12px)] h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {menu && (
        <div className="fixed inset-0 z-[60]">
          <button type="button" className="absolute inset-0 bg-black/35" aria-label="بستن منو" onClick={() => setMenu(false)} />
          <div className="presence-card absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-[32px] p-5 pb-8">
            <p className="text-base font-black">{user?.store_name || user?.name || "حساب کاربری"}</p>
            <p className="text-sm font-bold text-[var(--muted)]">{user?.phone}</p>
            <div className="mt-4 grid gap-2">
              <Link to="/profile" className="min-h-12 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm font-black">
                پروفایل
              </Link>
              <Link to="/saved" className="min-h-12 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm font-black">
                ذخیره‌شده‌ها
              </Link>
              <Link to="/following" className="min-h-12 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm font-black">
                فروشگاه‌های دنبال‌شده
              </Link>
              <Link to="/messages" className="min-h-12 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm font-black">
                پیام‌ها
              </Link>
              {isSeller && (
                <Link to="/seller" className="min-h-12 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-white">
                  مغازه‌ام
                </Link>
              )}
              {(isMarketer || isSeller) && (
                <Link to="/referral" className="min-h-12 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm font-black">
                  {isMarketer ? "پنل بازاریاب" : "دعوت دوستان"}
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm font-black">
                  <ShieldCheck className="h-4 w-4" /> ادمین
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"
              >
                <LogOut className="h-4 w-4" /> خروج
              </button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette open={palette} onClose={() => setPalette(false)} origin={origin} />
    </div>
  );
}
