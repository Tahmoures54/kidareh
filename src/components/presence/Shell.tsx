import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { listTripIds, onTripChange } from "../../presence/tripBasket";
import { listLocalHolds } from "../../presence/holds";
import { NEIGHBORHOODS } from "../../presence/catalog";
import CommandPalette from "./CommandPalette";
import InstallPrompt from "../InstallPrompt";
import { cn } from "../../utils";

const TABS = [
  { to: "/", label: "محله", icon: Compass, end: true },
  { to: "/explore", label: "نقشه", icon: MapIcon },
  { to: "/radar", label: "رادار", icon: Radio },
  { to: "/trip", label: "مسیر", icon: Route },
  { to: "/holds", label: "رزرو", icon: QrCode },
] as const;

export default function PresenceShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSeller, isAdmin } = useAuth();
  const { origin, setNeighborhood, useGps, gpsError } = usePresenceOrigin();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const holdCount = listLocalHolds().filter((h) => !["cancelled", "expired", "completed"].includes(h.status)).length;

  useEffect(() => {
    setTripCount(listTripIds().length);
    return onTripChange(() => setTripCount(listTripIds().length));
  }, []);

  useEffect(() => setMenu(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        setPalette(true);
      }
      if (e.key === "Escape") setPalette(false);
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
        <Link to="/" className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#14161c] text-sm font-black text-[#f3efe6]">
          کی
        </Link>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={"end" in tab ? tab.end : false}
            className={({ isActive }) =>
              cn(
                "relative flex h-12 w-12 flex-col items-center justify-center rounded-2xl text-[#6b7168] transition",
                isActive && "bg-white text-[#0e6f63] shadow-sm"
              )
            }
            aria-label={tab.label}
          >
            <tab.icon className="h-5 w-5" />
            {tab.to === "/trip" && tripCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#14161c] px-1 text-[9px] font-black text-white">
                {tripCount}
              </span>
            )}
            {tab.to === "/holds" && holdCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0e6f63] px-1 text-[9px] font-black text-white">
                {holdCount}
              </span>
            )}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-2">
          <Link to="/messages" className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#6b7168]" aria-label="پیام‌ها">
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link to="/ai" className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#6b7168]" aria-label="دستیار">
            <Sparkles className="h-5 w-5" />
          </Link>
        </div>
      </nav>
    ),
    [holdCount, tripCount]
  );

  return (
    <div className="presence-root" dir="rtl">
      <InstallPrompt />
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px]">
        <aside className="sticky top-0 hidden h-[100dvh] w-[84px] shrink-0 border-l border-[var(--line)] lg:block">
          {rail}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#f3efe6]/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <Link to="/" className="lg:hidden flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14161c] text-xs font-black text-white">
                کی
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black tracking-[0.18em] text-[#0e6f63]">KIDAREH PRESENCE</p>
                <div className="flex items-center gap-2">
                  <select
                    value={origin.neighborhoodId ?? ""}
                    onChange={(e) => setNeighborhood(e.target.value as (typeof NEIGHBORHOODS)[number]["id"])}
                    className="max-w-[160px] truncate bg-transparent text-sm font-black outline-none"
                    aria-label="انتخاب محله"
                  >
                    <option value="">موقعیت فعلی</option>
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} · {n.district}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={useGps} className="text-[11px] font-black text-[#0e6f63]">
                    GPS
                  </button>
                </div>
                {gpsError && <p className="text-[10px] font-bold text-[#b42318]">{gpsError}</p>}
              </div>
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="hidden h-11 min-w-[220px] items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/80 px-3 text-xs font-bold text-[#6b7168] md:flex"
              >
                <Search className="h-4 w-4" />
                جستجو در محله
                <span className="mr-auto rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] font-black">⌘K</span>
              </button>
              <Link to="/stores" className="hidden h-11 items-center gap-1 rounded-2xl px-3 text-xs font-black text-[#3d433c] sm:inline-flex">
                <Store className="h-4 w-4" /> فروشگاه‌ها
              </Link>
              <button
                type="button"
                onClick={() => (user ? setMenu(true) : navigate("/login"))}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#14161c] shadow-sm"
                aria-label={user ? "حساب" : "ورود"}
              >
                <User className="h-4 w-4" />
              </button>
            </div>
          </header>
          <main className="flex-1 pb-24 lg:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[#f3efe6]/90 backdrop-blur-xl lg:hidden" aria-label="تب‌ها">
        <div className="mx-auto flex max-w-lg items-center px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={"end" in tab ? tab.end : false}
              className={({ isActive }) =>
                cn("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-black", isActive ? "text-[#0e6f63]" : "text-[#8a9086]")
              }
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
              {tab.to === "/trip" && tripCount > 0 && (
                <span className="absolute top-1 left-1/2 h-1.5 w-1.5 rounded-full bg-[#14161c]" />
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {menu && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/35" aria-label="بستن منو" onClick={() => setMenu(false)} />
          <div className="presence-card absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-[32px] p-5 pb-8">
            <p className="text-sm font-black">{user?.name || "حساب کاربری"}</p>
            <p className="text-xs font-bold text-[#6b7168]">{user?.phone}</p>
            <div className="mt-4 grid gap-2">
              <Link to="/profile" className="rounded-2xl bg-[#f3efe6] px-4 py-3 text-sm font-black">پروفایل</Link>
              <Link to="/saved" className="rounded-2xl bg-[#f3efe6] px-4 py-3 text-sm font-black">ذخیره‌شده‌ها</Link>
              <Link to="/messages" className="rounded-2xl bg-[#f3efe6] px-4 py-3 text-sm font-black">پیام‌ها</Link>
              {isSeller && <Link to="/seller" className="rounded-2xl bg-[#f3efe6] px-4 py-3 text-sm font-black">پنل فروشنده</Link>}
              {isAdmin && (
                <Link to="/admin" className="inline-flex items-center gap-2 rounded-2xl bg-[#f3efe6] px-4 py-3 text-sm font-black">
                  <ShieldCheck className="h-4 w-4" /> ادمین
                </Link>
              )}
              <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
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
