import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  ArrowRight,
  Scale,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  Gavel,
  Store,
  Wallet,
  Users,
  Smartphone,
  Info,
  Search,
  Lock,
  Eye,
  BellRing,
  Navigation,
  BadgeCheck,
  ReceiptText,
  PhoneCall,
  UserCheck,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ==================== TYPES ====================

type TabType = "terms" | "privacy" | "guide";

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface GuideItem {
  icon: React.ElementType;
  title: string;
  desc: string;
  keywords: string[];
}

interface TermsSection {
  icon: React.ElementType;
  title: string;
  items: string[];
}

interface PrivacyItem {
  icon: React.ElementType;
  title: string;
  text: string;
  color: string;
  bg: string;
}

interface PageState {
  activeTab: TabType;
  guideQuery: string;
}

// ==================== CONSTANTS ====================

const VALID_TABS: TabType[] = ["terms", "privacy", "guide"];
const TOAST_DURATION = 2000;
const SEARCH_DEBOUNCE = 300;

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const TAB_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ==================== COMPONENTS ====================

/**
 * Header Section
 */
interface HeaderProps {
  onBack: () => void;
}

function Header({ onBack }: HeaderProps): JSX.Element {
  return (
    <header className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 text-white px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-16 rounded-b-[2.5rem] relative overflow-hidden shadow-lg">
      {/* Decorative backgrounds */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          delay: 1,
        }}
        className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4"
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95 shadow-sm"
            aria-label="بازگشت"
          >
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>

          <h1 className="text-lg font-black tracking-tight">
            قوانین و راهنما
          </h1>

          <div className="w-10 h-10" />
        </div>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-[13px] font-medium leading-relaxed text-indigo-50 shadow-inner flex items-start gap-3"
        >
          <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" strokeWidth={2.5} />
          <span>
            با استفاده از خدمات کی‌داره، شما شرایط استفاده
            و حریم خصوصی را می‌پذیرید.
          </span>
        </motion.div>
      </motion.div>
    </header>
  );
}

/**
 * Tab Navigation
 */
interface TabNavProps {
  tabs: TabConfig[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabNav({ tabs, activeTab, onTabChange }: TabNavProps): JSX.Element {
  return (
    <section className="px-4 -mt-8 relative z-20">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-lg shadow-gray-200/50 border border-white relative"
        role="tablist"
      >
        {/* Active tab indicator */}
        <motion.div
          layout
          className="absolute inset-y-1.5 bg-indigo-50 rounded-xl shadow-sm border border-indigo-100/50"
          style={{
            width: `calc(33.3333% - 4px)`,
            right:
              activeTab === "terms"
                ? "4px"
                : activeTab === "privacy"
                ? "calc(33.3333% + 2px)"
                : "calc(66.6666% - 0px)",
          }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 25,
          }}
        />

        {/* Tab buttons */}
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl z-10 transition-colors duration-300 group ${
              activeTab === tab.id
                ? "text-indigo-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title={tab.description}
          >
            <motion.div
              animate={{
                scale: activeTab === tab.id ? 1.1 : 1,
              }}
              transition={{ type: "spring" }}
            >
              <tab.icon className="w-4 h-4" aria-hidden="true" strokeWidth={2} />
            </motion.div>
            <span className="text-[11px] font-black mt-1">
              {tab.label}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}

/**
 * Disclaimer Section
 */
function DisclaimerSection(): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-to-br from-rose-50 to-red-50 border-l-4 border-red-500 border-r border-t border-b border-red-100 rounded-3xl p-5 shadow-sm relative overflow-hidden"
    >
      {/* Top accent */}
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-red-400 to-transparent" />

      {/* Icon with animation */}
      <h3 className="font-black text-red-700 text-sm mb-3 flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <AlertTriangle className="w-5 h-5" strokeWidth={2} />
        </motion.div>
        سلب مسئولیت (مهم)
      </h3>

      {/* Content */}
      <p className="text-[13px] text-red-900/80 leading-loose text-justify font-medium">
        کی‌داره صرفاً بستر معرفی کالا/فروشگاه و تسهیل ارتباط کاربر با
        فروشنده است. مسئولیت اصالت، کیفیت، قیمت، شرایط تحویل، گارانتی، و
        هرگونه معامله نهایی تماماً بر عهده فروشنده و خریدار است.
      </p>
    </motion.div>
  );
}

/**
 * Terms Section Card
 */
interface TermsSectionProps {
  section: TermsSection;
  index: number;
}

function TermsSectionCard({
  section,
  index,
}: TermsSectionProps): JSX.Element {
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all"
    >
      <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
        <Icon className="w-5 h-5 text-indigo-500 shrink-0" strokeWidth={2} />
        {section.title}
      </h3>

      <ul className="space-y-3 text-[13px] font-medium text-gray-600 leading-relaxed">
        {section.items.map((item, idx) => (
          <motion.li
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-3"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: idx * 0.1,
              }}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-500 mt-2 shrink-0 shadow-sm"
            />
            <span>{item}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/**
 * Info Card Grid
 */
interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  text: string;
}

function InfoCard({ icon: Icon, title, text }: InfoCardProps): JSX.Element {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-indigo-100 transition-all"
    >
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
        className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3"
      >
        <Icon className="w-5 h-5 text-indigo-600" strokeWidth={2} />
      </motion.div>

      <p className="text-[13px] font-black text-gray-800 mb-2">{title}</p>
      <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
        {text}
      </p>
    </motion.div>
  );
}

/**
 * Privacy Feature Card
 */
interface PrivacyCardProps extends PrivacyItem {
  index: number;
}

function PrivacyCard({
  icon: Icon,
  title,
  text,
  color,
  bg,
  index,
}: PrivacyCardProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all"
    >
      <div className="flex items-start gap-3.5">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </motion.div>

        <div className="flex-1">
          <h4 className="text-[13px] font-black text-gray-800">{title}</h4>
          <p className="text-[12px] text-gray-500 font-medium leading-relaxed mt-1.5">
            {text}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Guide Search Bar
 */
interface GuideSearchProps {
  query: string;
  onChange: (query: string) => void;
}

function GuideSearch({ query, onChange }: GuideSearchProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 sticky top-[80px] z-10"
    >
      <div className="relative">
        <Search className="w-5 h-5 text-indigo-400 absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none" />
        <motion.input
          whileFocus={{ scale: 1.01 }}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="دنبال چه راهنمایی هستید؟..."
          className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20 text-[13px] font-medium placeholder-gray-400 outline-none transition-all"
        />
      </div>
    </motion.div>
  );
}

/**
 * Guide Item Card
 */
interface GuideItemCardProps {
  guide: GuideItem;
  index: number;
}

function GuideItemCard({
  guide,
  index,
}: GuideItemCardProps): JSX.Element {
  const Icon = guide.icon;

  return (
    <motion.div
      variants={ITEM_VARIANTS}
      className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all"
    >
      <div className="flex items-start gap-3.5">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 10 }}
          className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </motion.div>

        <div className="flex-1">
          <h4 className="text-[13px] font-black text-gray-800">
            {guide.title}
          </h4>

          <p className="text-[12px] font-medium text-gray-600 leading-relaxed mt-1.5">
            {guide.desc}
          </p>

          {/* Keywords */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mt-3"
          >
            {guide.keywords.map((keyword) => (
              <motion.span
                key={keyword}
                whileHover={{ scale: 1.05 }}
                className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg border border-gray-100 cursor-default hover:border-indigo-200 hover:text-indigo-600 transition-all"
              >
                #{keyword}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Empty State
 */
function EmptyGuideState(): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-gray-200"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
      >
        <Search className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
      </motion.div>

      <p className="text-[13px] font-bold text-gray-500">
        موردی با این عبارت پیدا نشد.
      </p>
      <p className="text-[11px] text-gray-400 mt-1 font-medium">
        لطفاً واژه دیگری امتحان کنید.
      </p>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function TermsPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackEvent } = useAnalytics();

  // ===== State =====
  const initialTabRaw =
    (searchParams.get("tab") as TabType | null) || "terms";
  const initialTab: TabType = VALID_TABS.includes(
    initialTabRaw
  )
    ? initialTabRaw
    : "terms";

  const [state, setState] = useState<PageState>({
    activeTab: initialTab,
    guideQuery: searchParams.get("q") || "",
  });

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // ===== Tab configs =====
  const tabs: TabConfig[] = [
    {
      id: "terms",
      label: "شرایط استفاده",
      icon: Scale,
      description: "قوانین و شرایط استفاده از پلتفرم کی‌داره",
    },
    {
      id: "privacy",
      label: "حریم خصوصی",
      icon: ShieldCheck,
      description: "سیاست حریم خصوصی و رویکرد ما به داده‌های شما",
    },
    {
      id: "guide",
      label: "راهنما",
      icon: HelpCircle,
      description: "راهنمای کامل استفاده از خدمات کی‌داره",
    },
  ];

  // ===== Terms sections =====
  const termsSections: TermsSection[] = [
    {
      icon: Gavel,
      title: "تعهدات و شرایط استفاده",
      items: [
        "کاربر متعهد است اطلاعات صحیح و قانونی ثبت کند.",
        "درج محتوای مجرمانه، گمراه‌کننده، توهین‌آمیز یا ناقض حقوق دیگران اکیداً ممنوع است.",
        "انتشار کالا ممکن است مشروط به بررسی و تأیید سامانه باشد.",
        "کی‌داره مجاز است محتوای خلاف قوانین را حذف یا حساب متخلف را محدود کند.",
      ],
    },
  ];

  const privacyItems: PrivacyItem[] = [
    {
      icon: Lock,
      title: "امنیت اطلاعات",
      text: "اطلاعات با روش‌های روز رمزنگاری محافظت می‌شود، اما امنیت مطلق در اینترنت قابل تضمین نیست.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Eye,
      title: "نمایش عمومی",
      text: "فقط بخشی از اطلاعات فروشگاه/کالا جهت نمایش عمومی منتشر می‌شود. داده‌های حساس محفوظند.",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: BellRing,
      title: "اعلان‌ها و ارتباط",
      text: "ممکن است برای اطلاع‌رسانی امکانات جدید یا موارد امنیتی، پیام‌های سیستمی ارسال شود.",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Smartphone,
      title: "مجوزهای دسترسی",
      text: "مجوزهایی مانند GPS فقط برای امکانات مرتبط (جستجوی نزدیک/مسیریابی) استفاده می‌شود.",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  // ===== Guide items =====
  const guides: GuideItem[] = useMemo(
    () => [
      {
        icon: Search,
        title: "چطور در اطرافم کالا پیدا کنم؟",
        desc: "در صفحه اصلی نام کالا را جستجو کنید. اگر دسترسی موقعیت فعال باشد، نتایج نزدیک‌تر در اولویت نمایش داده می‌شوند.",
        keywords: ["جستجو", "موقعیت", "نقشه", "نزدیک"],
      },
      {
        icon: Store,
        title: "چگونه فروشگاه خود را ثبت کنم؟",
        desc: "با ورود به حساب فروشنده، از پنل فروشندگی فروشگاه خود را تکمیل کنید و سپس کالاها را ثبت و منتشر کنید.",
        keywords: ["فروشنده", "ثبت", "فروشگاه", "پنل"],
      },
      {
        icon: BadgeCheck,
        title: "وضعیت تأیید و انتشار کالا یعنی چه؟",
        desc: "کالا پس از ثبت ممکن است نیاز به بررسی داشته باشد. فقط کالاهای تأییدشده و قابل‌نمایش در جستجو دیده می‌شوند.",
        keywords: ["تأیید", "انتشار", "کالا", "وضعیت"],
      },
      {
        icon: Wallet,
        title: "پرداخت‌ها و کیف پول چگونه کار می‌کند؟",
        desc: "برای سرویس‌های پولی، پرداخت از درگاه انجام می‌شود. تاریخچه و وضعیت پرداخت از بخش کیف پول قابل پیگیری است.",
        keywords: ["پرداخت", "کیف پول", "تراکنش"],
      },
      {
        icon: PhoneCall,
        title: "تماس و پیام با فروشنده از کجا انجام می‌شود؟",
        desc: "در صفحه جزئیات فروشگاه/کالا می‌توانید با فروشنده تماس بگیرید یا از بخش پیام‌ها گفتگو را شروع کنید.",
        keywords: ["تماس", "پیام", "چت", "فروشنده"],
      },
      {
        icon: Navigation,
        title: "مسیریابی فروشگاه چطور انجام می‌شود؟",
        desc: "در صفحه فروشگاه گزینه مسیریابی را بزنید تا مسیر در Google Maps باز شود (بر اساس آدرس/مختصات فروشگاه).",
        keywords: ["مسیریابی", "نقشه", "Google Maps"],
      },
      {
        icon: ReceiptText,
        title: "چطور مشکل یا تخلف را گزارش کنم؟",
        desc: "از بخش گزارش‌ها یا پشتیبانی می‌توانید گزارش ثبت کنید. تیم بررسی پس از ارزیابی اقدام لازم را انجام می‌دهد.",
        keywords: ["گزارش", "تخلف", "پشتیبانی"],
      },
      {
        icon: UserCheck,
        title: "اگر فروشگاهی پیدا نشد یا اطلاعات ناقص بود؟",
        desc: "ممکن است فروشگاه غیرفعال شده باشد یا اطلاعاتش کامل نباشد. می‌توانید از پشتیبانی موضوع را پیگیری کنید.",
        keywords: ["فروشگاه", "ناقص", "پشتیبانی"],
      },
    ],
    []
  );

  // ===== Filter guides =====
  const filteredGuides = useMemo(() => {
    const q = state.guideQuery.trim().toLowerCase();
    if (!q) return guides;

    return guides.filter((g) => {
      const searchText =
        `${g.title} ${g.desc} ${g.keywords.join(" ")}`.toLowerCase();
      return searchText.includes(q);
    });
  }, [state.guideQuery, guides]);

  // ===== Event handlers =====
  const handleTabChange = useCallback((tab: TabType) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
    trackEvent?.("terms_tab_view", { tab });
  }, [trackEvent]);

  const handleGuideSearch = useCallback((query: string) => {
    setState((prev) => ({ ...prev, guideQuery: query }));

    // Debounce tracking
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        trackEvent?.("guide_search", { query: query.trim() });
      }
    }, SEARCH_DEBOUNCE);
  }, [trackEvent]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // ===== Update URL =====
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", state.activeTab);

    if (state.activeTab === "guide" && state.guideQuery.trim()) {
      next.set("q", state.guideQuery.trim());
    } else {
      next.delete("q");
    }

    setSearchParams(next, { replace: true });
  }, [state, searchParams, setSearchParams]);

  // ===== Cleanup =====
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>قوانین، حریم خصوصی و راهنما | کی‌داره</title>
        <meta
          name="description"
          content="مطالعه شرایط استفاده از کی‌داره، سیاست حریم خصوصی و راهنمای کامل کار با پلتفرم."
        />
        <meta
          name="keywords"
          content="شرایط استفاده, حریم خصوصی, راهنما, کی‌داره"
        />
        <link
          rel="canonical"
          href={`https://kidareh.com/terms?tab=${state.activeTab}`}
        />
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-50 pb-24"
        dir="rtl"
      >
        {/* Header */}
        <Header onBack={handleBack} />

        {/* Tab Navigation */}
        <TabNav
          tabs={tabs}
          activeTab={state.activeTab}
          onTabChange={handleTabChange}
        />

        {/* Content */}
        <section className="p-4 mt-2">
          <AnimatePresence mode="wait">
            {/* ===== TERMS TAB ===== */}
            {state.activeTab === "terms" && (
              <motion.div
                key="terms"
                variants={TAB_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                {/* Disclaimer */}
                <DisclaimerSection />

                {/* Terms sections */}
                {termsSections.map((section, idx) => (
                  <TermsSectionCard
                    key={idx}
                    section={section}
                    index={idx}
                  />
                ))}

                {/* Info cards */}
                <motion.div
                  variants={CONTAINER_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 gap-4 mt-6"
                >
                  <InfoCard
                    icon={Store}
                    title="فروشندگان"
                    text="ثبت صحیح مشخصات، قیمت و وضعیت کالا الزامی است."
                  />
                  <InfoCard
                    icon={Users}
                    title="کاربران"
                    text="استفاده مسئولانه و قانونی از خدمات پلتفرم الزامی است."
                  />
                </motion.div>
              </motion.div>
            )}

            {/* ===== PRIVACY TAB ===== */}
            {state.activeTab === "privacy" && (
              <motion.div
                key="privacy"
                variants={TAB_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                {/* Intro card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white to-indigo-50/30 rounded-3xl p-5 shadow-sm border border-gray-100"
                >
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" strokeWidth={2} />
                    رویکرد ما به حریم خصوصی
                  </h3>
                  <p className="text-[13px] text-gray-600 font-medium leading-loose text-justify">
                    ما فقط داده‌های لازم برای ارائه سرویس (مثل
                    اطلاعات حساب، تنظیمات، گزارشات و داده‌های فنی
                    ضروری) را پردازش می‌کنیم. دسترسی‌ها فقط در چارچوب
                    نیاز عملکردی برنامه استفاده می‌شوند.
                  </p>
                </motion.div>

                {/* Privacy items */}
                <motion.div
                  variants={CONTAINER_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {privacyItems.map((item, idx) => (
                    <PrivacyCard
                      key={idx}
                      {...item}
                      index={idx}
                    />
                  ))}
                </motion.div>

                {/* Footer note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-100/80 rounded-2xl p-4 text-[11px] font-bold text-gray-500 text-center flex items-center justify-center gap-2 border border-gray-200"
                >
                  <Info className="w-4 h-4 text-gray-400" strokeWidth={2} />
                  استفاده مستمر از سرویس به معنی پذیرش آخرین نسخه
                  سیاست‌هاست.
                </motion.div>
              </motion.div>
            )}

            {/* ===== GUIDE TAB ===== */}
            {state.activeTab === "guide" && (
              <motion.div
                key="guide"
                variants={TAB_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                {/* Search bar */}
                <GuideSearch
                  query={state.guideQuery}
                  onChange={handleGuideSearch}
                />

                {/* Guide items or empty state */}
                {filteredGuides.length === 0 ? (
                  <EmptyGuideState />
                ) : (
                  <motion.div
                    variants={CONTAINER_VARIANTS}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {filteredGuides.map((guide, idx) => (
                      <GuideItemCard
                        key={idx}
                        guide={guide}
                        index={idx}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </motion.div>
    </>
  );
}