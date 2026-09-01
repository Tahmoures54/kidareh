import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  MessageCircle,
  Store,
  Sparkles,
  Gift,
  Search,
  ChevronLeft,
  UserPlus,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

/* ---------- Types ---------- */
type CardTone = "teal" | "violet" | "rose" | "amber" | "sky" | "emerald";

interface ValueCard {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: React.ReactNode;
  tone: CardTone;
  badge?: string;
  audience: "buyer" | "seller" | "both";
}

/* ---------- Constants ---------- */
const TONE_STYLES: Record<
  CardTone,
  { gradient: string; ring: string; iconBg: string; soft: string }
> = {
  teal: {
    gradient: "from-teal-500 via-cyan-500 to-emerald-500",
    ring: "ring-teal-400/40",
    iconBg: "bg-white/20",
    soft: "from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/40",
  },
  violet: {
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    ring: "ring-violet-400/40",
    iconBg: "bg-white/20",
    soft: "from-violet-50 to-fuchsia-50 dark:from-violet-950/50 dark:to-fuchsia-950/40",
  },
  rose: {
    gradient: "from-rose-500 via-pink-500 to-orange-400",
    ring: "ring-rose-400/40",
    iconBg: "bg-white/20",
    soft: "from-rose-50 to-orange-50 dark:from-rose-950/50 dark:to-orange-950/40",
  },
  amber: {
    gradient: "from-amber-500 via-orange-500 to-yellow-400",
    ring: "ring-amber-400/40",
    iconBg: "bg-white/20",
    soft: "from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/40",
  },
  sky: {
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    ring: "ring-sky-400/40",
    iconBg: "bg-white/20",
    soft: "from-sky-50 to-indigo-50 dark:from-sky-950/50 dark:to-indigo-950/40",
  },
  emerald: {
    gradient: "from-emerald-500 via-green-500 to-teal-400",
    ring: "ring-emerald-400/40",
    iconBg: "bg-white/20",
    soft: "from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40",
  },
};

const CARDS: ValueCard[] = [
  {
    id: "nearby",
    title: "چی نزدیکته؟",
    description:
      "کالاهای موجود فروشگاه‌های محله‌ات را روی نقشه ببین و حضوری بگیر.",
    cta: "شروع جستجو",
    href: "/search",
    icon: <Search className="w-5 h-5" strokeWidth={2.4} />,
    tone: "teal",
    badge: "محلی",
    audience: "buyer",
  },
  {
    id: "chat",
    title: "چت مستقیم",
    description:
      "با فروشنده آنلاین حرف بزن، موجودی و قیمت را بپرس؛ بدون تماس تلفنی.",
    cta: "ورود و چت",
    href: "/login",
    icon: <MessageCircle className="w-5 h-5" strokeWidth={2.4} />,
    tone: "sky",
    badge: "زنده",
    audience: "buyer",
  },
  {
    id: "map",
    title: "مسیر روی نقشه",
    description:
      "آدرس دقیق فروشگاه، فاصله و مسیر — برو، ببین و بخر.",
    cta: "دیدن نقشه",
    href: "/stores",
    icon: <MapPin className="w-5 h-5" strokeWidth={2.4} />,
    tone: "rose",
    audience: "buyer",
  },
  {
    id: "seller",
    title: "فروشگاهت را باز کن",
    description:
      "کالاها را ثبت کن، موجودی را به‌روز نگه دار و مشتری حضوری جذب کن.",
    cta: "فروشنده شو",
    href: "/become-seller",
    icon: <Store className="w-5 h-5" strokeWidth={2.4} />,
    tone: "amber",
    badge: "کسب‌وکار",
    audience: "seller",
  },
  {
    id: "ai",
    title: "دستیار هوشمند",
    description:
      "از کی‌داره بپرس چی می‌خوای؛ پیشنهاد جستجو و توضیح کالا با AI.",
    cta: "از AI بپرس",
    href: "/ai",
    icon: <Sparkles className="w-5 h-5" strokeWidth={2.4} />,
    tone: "violet",
    badge: "AI",
    audience: "both",
  },
  {
    id: "referral",
    title: "دعوت کن، پاداش بگیر",
    description:
      "دوستانت را معرفی کن و از سیستم معرفی و کیف پول درآمد داشته باش.",
    cta: "لینک معرفی",
    href: "/referral",
    icon: <Gift className="w-5 h-5" strokeWidth={2.4} />,
    tone: "emerald",
    badge: "درآمد",
    audience: "both",
  },
];

/* ---------- Animation Variants ---------- */
const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      type: "spring",
      stiffness: 320,
      damping: 28,
    },
  }),
};

/* ---------- Helper Functions ---------- */
function resolveHref(
  href: string,
  isAuthenticated: boolean,
  isSeller: boolean
): string {
  if (href === "/login" && isAuthenticated) return "/messages";
  if (href === "/become-seller" && isSeller) return "/seller";
  if (href === "/become-seller" && !isAuthenticated) return "/login";
  if (href === "/referral" && !isAuthenticated) return "/login";
  return href;
}

/* ---------- Sub-components ---------- */
const ValueCardItem = memo(function ValueCardItem({
  card,
  index,
  onNavigate,
}: {
  card: ValueCard;
  index: number;
  onNavigate: (href: string) => void;
}) {
  const tone = TONE_STYLES[card.tone];
  return (
    <motion.article
      role="listitem"
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="snap-start shrink-0 w-[152px] sm:w-[168px]"
    >
      <button
        type="button"
        onClick={() => onNavigate(card.href)}
        aria-label={`${card.title} - ${card.cta}`}
        className={`relative w-full h-[210px] rounded-[22px] overflow-hidden text-right active:scale-[0.97] transition-transform duration-200 shadow-lg shadow-black/5 dark:shadow-black/30 ring-1 ${tone.ring} group`}
      >
        {/* Full gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tone.gradient}`} />

        {/* Soft mesh / glow overlays for depth */}
        <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-white/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-6 w-32 h-32 rounded-full bg-black/10 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div
              className={`w-10 h-10 rounded-2xl ${tone.iconBg} backdrop-blur-md flex items-center justify-center text-white shadow-inner ring-1 ring-white/30`}
            >
              {card.icon}
            </div>
            {card.badge && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white ring-1 ring-white/25">
                {card.badge}
              </span>
            )}
          </div>

          <div className="mt-auto space-y-1.5">
            <h3 className="text-[15px] font-black text-white leading-snug drop-shadow-sm">
              {card.title}
            </h3>
            <p className="text-[11px] leading-relaxed text-white/90 font-medium line-clamp-3">
              {card.description}
            </p>
            <div className="pt-1.5 flex items-center gap-1 text-[11px] font-bold text-white/95 group-hover:gap-2 transition-all">
              <span>{card.cta}</span>
              <ChevronLeft className="w-3.5 h-3.5 opacity-90" />
            </div>
          </div>
        </div>
      </button>
    </motion.article>
  );
});

const ClosingCard = memo(function ClosingCard({
  isAuthenticated,
  onNavigate,
  index,
}: {
  isAuthenticated: boolean;
  onNavigate: (href: string) => void;
  index: number;
}) {
  return (
    <motion.article
      role="listitem"
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="snap-start shrink-0 w-[152px] sm:w-[168px]"
    >
      <button
        type="button"
        onClick={() => onNavigate(isAuthenticated ? "/profile" : "/login")}
        aria-label={isAuthenticated ? "رفتن به پروفایل" : "ثبت‌نام سریع"}
        className="relative w-full h-[210px] rounded-[22px] overflow-hidden text-right active:scale-[0.97] transition-transform duration-200 border-2 border-dashed border-teal-300/80 dark:border-teal-700/60 bg-gradient-to-br from-white to-teal-50 dark:from-gray-900 dark:to-teal-950/40 shadow-sm group"
      >
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-xl shadow-teal-500/30 ring-4 ring-teal-100 dark:ring-teal-900/40 group-hover:scale-105 transition-transform">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 dark:text-white">
              {isAuthenticated ? "پروفایلت" : "همین الان عضو شو"}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {isAuthenticated
                ? "تنظیمات و فروشگاهت را مدیریت کن"
                : "رایگان · بدون پیچیدگی · برای خریدار و فروشنده"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-600 text-white text-[11px] font-bold shadow-md shadow-teal-600/25">
            {isAuthenticated ? "رفتن به پروفایل" : "ثبت‌نام سریع"}
            <ChevronLeft className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>
    </motion.article>
  );
});

/* ---------- Main Component ---------- */
export const ValuePropsBanner = memo(function ValuePropsBanner() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const { isAuthenticated, isSeller } = useAuth() as {
    isAuthenticated: boolean;
    isSeller: boolean;
  };

  const handleNavigate = useCallback(
    (href: string) => {
      navigate(resolveHref(href, isAuthenticated, isSeller));
    },
    [navigate, isAuthenticated, isSeller]
  );

  // Auto-scroll logic
  useEffect(() => {
    if (isPaused) return;

    const container = scrollRef.current;
    if (!container) return;

    const getCardWidth = () => {
      const firstCard = container.querySelector<HTMLElement>(
        '[role="listitem"]'
      );
      if (!firstCard) return 164; // fallback: mobile width + gap
      const style = window.getComputedStyle(container);
      const gap = parseFloat(style.columnGap || style.gap || "12");
      return firstCard.offsetWidth + gap;
    };

    const interval = setInterval(() => {
      const cardWidth = getCardWidth();
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (container.scrollLeft + container.clientWidth >= maxScroll - 5) {
        // Reached end -> scroll back to start
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section className="mb-5" aria-label="مزایای کی‌داره">
      {/* Header strip — Instagram-style highlight row title */}
      <div className="px-4 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25 shrink-0">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-gray-900 dark:text-white truncate">
              چرا کی‌داره؟
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
              ببین کی داره، حضوری بگیر
            </p>
          </div>
        </div>

        {!isAuthenticated && (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold active:scale-95 transition-transform shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5" />
            ثبت‌نام
          </button>
        )}
      </div>

      {/* Horizontal story-like cards with auto-scroll */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          role="list"
          aria-label="کارت‌های مزایا - اسکرول خودکار"
        >
          {CARDS.map((card, index) => (
            <ValueCardItem
              key={card.id}
              card={card}
              index={index}
              onNavigate={handleNavigate}
            />
          ))}

          <ClosingCard
            isAuthenticated={isAuthenticated}
            onNavigate={handleNavigate}
            index={CARDS.length}
          />
        </div>

        {/* Edge fades */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-1 w-6 bg-gradient-to-l from-[var(--bg-primary)] to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-r from-[var(--bg-primary)] to-transparent"
          aria-hidden
        />
      </div>
    </section>
  );
});

export default ValuePropsBanner;
