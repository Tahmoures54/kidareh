import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  Search,
  CheckCheck,
  MessageCircle,
  UserPlus,
  ShoppingBag,
  X,
  Clock,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  Loader2,
  ArrowRight,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io, Socket } from "socket.io-client";
import { apiRequest, ApiError } from "../utils/api";

// ==================== TYPES ====================

interface Conversation {
  id: string;
  storeId: string;
  storeName: string;
  lastMessage: string;
  time: string;
  timestamp: number;
  unread: number;
  avatar: string;
  online: boolean;
  lastProductId?: string;
}

interface IncomingSocketMessage {
  senderId?: string;
  storeId?: string;
  storeName?: string;
  text?: string;
  timestamp?: number | string;
  productId?: string;
  avatar?: string;
  online?: boolean;
}

interface ConversationState {
  conversations: Conversation[];
  loading: boolean;
  errorText: string;
  searchQuery: string;
  isConnected: boolean;
}

// ==================== CONSTANTS ====================

const FALLBACK_AVATAR = "/icons/icon-192x192.png";
const RECONNECTION_DELAY = 1000;
const RECONNECTION_ATTEMPTS = Infinity;
const TIME_UPDATE_INTERVAL = 60000; // 1 minute
const SOCKET_CONNECTION_TIMEOUT = 10000;
const MIN_SEARCH_CHARS = 1;

// ==================== HELPERS ====================

/**
 * تبدیل timestamp به فرمت نسبی فارسی
 */
function formatRelativeFa(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return "—";

  const now = Date.now();
  const diff = now - timestamp;
  const oneDay = 24 * 60 * 60 * 1000;

  // کمتر از 1 روز
  if (diff < oneDay) {
    return new Date(timestamp).toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // 1 تا 2 روز
  if (diff < 2 * oneDay) return "دیروز";

  // بیش از 2 روز
  return new Date(timestamp).toLocaleDateString("fa-IR", {
    month: "short",
    day: "numeric",
  });
}

/**
 * اعتبارسنجی و نرمال‌سازی Conversation
 */
function normalizeConversation(
  data: any,
  index: number
): Conversation | null {
  const storeId = String(data?.storeId ?? "").trim();
  if (!storeId) return null;

  const tsRaw = data?.timestamp ?? Date.now();
  const ts =
    typeof tsRaw === "number"
      ? tsRaw
      : tsRaw
      ? new Date(tsRaw).getTime()
      : Date.now();
  const validTs = Number.isFinite(ts) ? ts : Date.now();

  return {
    id: String(data?.id ?? `conv-${index}-${validTs}`),
    storeId,
    storeName: String(data?.storeName ?? "فروشگاه"),
    lastMessage: String(data?.lastMessage ?? ""),
    time: formatRelativeFa(validTs),
    timestamp: validTs,
    unread: Math.max(0, Number(data?.unread ?? 0)),
    avatar: String(data?.avatar ?? FALLBACK_AVATAR),
    online: Boolean(data?.online),
    lastProductId: data?.lastProductId
      ? String(data.lastProductId)
      : undefined,
  };
}

/**
 * نرمال‌سازی لیست Conversations
 */
function normalizeConversations(data: any[]): Conversation[] {
  return (Array.isArray(data) ? data : [])
    .map((item, idx) => normalizeConversation(item, idx))
    .filter((item): item is Conversation => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Validate incoming socket message
 */
function validateSocketMessage(
  data: IncomingSocketMessage
): data is Required<Pick<IncomingSocketMessage, "storeId" | "text">> & IncomingSocketMessage {
  return !!(
    (data.storeId || data.senderId) &&
    data.text
  );
}

// ==================== SKELETON LOADER ====================

function ConversationSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 animate-pulse"
        >
          {/* Avatar skeleton */}
          <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-100 rounded-2xl shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 bg-gray-200 rounded-lg flex-1" />
              <div className="h-3 bg-gray-100 rounded-lg w-12 shrink-0" />
            </div>
            <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== ERROR STATE ====================

interface ErrorStateProps {
  errorText: string;
  onRetry: () => Promise<void>;
}

function ErrorState({ errorText, onRetry }: ErrorStateProps): JSX.Element {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border-2 border-red-100 rounded-2xl p-6 text-center mx-4"
    >
      <motion.div
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
      >
        <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
      </motion.div>

      <h3 className="font-black text-gray-900 text-lg mb-2">خطا در بارگذاری</h3>
      <p className="text-gray-600 text-sm mb-6 leading-relaxed">{errorText}</p>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-black hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-60 active:scale-95 shadow-md"
      >
        {isRetrying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {isRetrying ? "درحال تلاش..." : "تلاش مجدد"}
      </motion.button>
    </motion.div>
  );
}

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  hasSearch: boolean;
}

function EmptyState({ hasSearch }: EmptyStateProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-gray-100"
      >
        {hasSearch ? (
          <Search className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
        ) : (
          <MessageCircle className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
        )}
      </motion.div>

      <h3 className="text-gray-900 font-black text-lg mb-2">
        {hasSearch ? "نتیجه‌ای یافت نشد" : "هنوز گفتگویی ندارید!"}
      </h3>

      <p className="text-gray-600 text-sm font-medium mb-6 max-w-[280px] leading-relaxed">
        {hasSearch
          ? "فروشگاه یا پیامی با این مشخصات پیدا نشد."
          : "وقتی پیام واقعی دریافت کنید، اینجا نمایش داده می‌شود."}
      </p>

      {!hasSearch && (
        <Link
          to="/search"
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          شروع خرید
        </Link>
      )}
    </motion.div>
  );
}

// ==================== CONVERSATION ITEM ====================

interface ConversationItemProps {
  conversation: Conversation;
  index: number;
  onOpen: (storeId: string) => void;
}

function ConversationItem({
  conversation,
  index,
  onOpen,
}: ConversationItemProps): JSX.Element {
  const handleClick = () => {
    onOpen(conversation.storeId);
  };

  const chatUrl = `/chat/${conversation.storeId}${
    conversation.lastProductId
      ? `?product=${encodeURIComponent(conversation.lastProductId)}`
      : ""
  }`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50, scale: 0.9 }}
      transition={{
        delay: Math.min(index * 0.05, 0.2),
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      <Link
        to={chatUrl}
        onClick={handleClick}
        className="block"
      >
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={`bg-white rounded-2xl p-3.5 shadow-sm border transition-all active:scale-[0.98] ${
            conversation.unread > 0
              ? "border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white hover:from-indigo-50/80 hover:border-indigo-300"
              : "border-gray-100 hover:bg-indigo-50/40 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3.5">
            {/* Avatar section */}
            <div className="relative shrink-0">
              <img
                src={conversation.avatar || FALLBACK_AVATAR}
                alt={conversation.storeName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-100 shadow-sm"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_AVATAR;
                }}
              />

              {/* Online indicator */}
              {conversation.online && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 border-[2.5px] border-white rounded-full shadow-md"
                >
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-green-400 rounded-full"
                  />
                </motion.span>
              )}
            </div>

            {/* Content section */}
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-gray-900 text-sm truncate">
                  {conversation.storeName}
                </h3>

                <div
                  className={`text-[10px] font-bold flex items-center gap-0.5 shrink-0 ml-2 ${
                    conversation.unread > 0
                      ? "text-indigo-600"
                      : "text-gray-400"
                  }`}
                >
                  <Clock className="w-3 h-3" strokeWidth={2} />
                  {conversation.time}
                </div>
              </div>

              {/* Message row */}
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs truncate flex-1 line-clamp-1 ${
                    conversation.unread > 0
                      ? "text-gray-900 font-bold"
                      : "text-gray-500 font-medium"
                  }`}
                >
                  {conversation.lastMessage || "بدون پیام"}
                </p>

                {/* Unread badge or read indicator */}
                {conversation.unread > 0 ? (
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="min-w-5 h-5 px-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-md shadow-indigo-500/30"
                  >
                    {conversation.unread > 99
                      ? "99+"
                      : conversation.unread.toLocaleString("fa-IR")}
                  </motion.span>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <CheckCheck className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2.5} />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function Messages(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ===== State =====
  const [state, setState] = useState<ConversationState>({
    conversations: [],
    loading: true,
    errorText: "",
    searchQuery: "",
    isConnected: false,
  });

  const [socket, setSocket] = useState<Socket | null>(null);

  // ===== Refs =====
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== State helpers =====
  const updateState = useCallback(
    (updates: Partial<ConversationState>) => {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // ===== Cleanup =====
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    };
  }, []);

  // ===== Handle unauthorized =====
  const handleUnauthorized = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      if (mountedRef.current) {
        navigate("/login", {
          replace: true,
          state: { reason: "session_expired" },
        });
      }
    }
  }, [logout, navigate]);

  // ===== Fetch conversations =====
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    updateState({ loading: true, errorText: "" });

    try {
      const data = await apiRequest<any[]>(
        "/api/messages/conversations",
        { method: "GET", auth: true }
      );
      if (!mountedRef.current) return;
      updateState({
        conversations: normalizeConversations(data),
      });
    } catch (err: any) {
      if (!mountedRef.current) return;

      if (err instanceof ApiError && err.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (err instanceof ApiError && err.status === 404) {
        updateState({ conversations: [] });
        return;
      }

      console.error("Fetch conversations error:", err);
      updateState({
        conversations: [],
        errorText: "دریافت گفتگوها با مشکل مواجه شد. دوباره تلاش کنید.",
      });
    } finally {
      if (mountedRef.current) updateState({ loading: false });
    }
  }, [user, handleUnauthorized, updateState]);

  // ===== Effect: Fetch on mount =====
  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user, fetchConversations]);

  // ===== Socket.IO connection =====
  useEffect(() => {
    if (!user) return;

    const baseUrl =
      (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
      window.location.origin;

    const newSocket = io(baseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: 5000,
      timeout: SOCKET_CONNECTION_TIMEOUT,
    });

    setSocket(newSocket);

    // ===== Socket event handlers =====
    const handleConnect = () => {
      if (mountedRef.current) updateState({ isConnected: true });
    };

    const handleDisconnect = (reason: string) => {
      if (mountedRef.current) {
        updateState({ isConnected: false });
        console.warn("Socket disconnected:", reason);
      }
    };

    const handleReceiveMessage = (data: IncomingSocketMessage) => {
      if (!validateSocketMessage(data)) return;

      const incomingStoreId = String(
        data.storeId || data.senderId || ""
      ).trim();
      if (!incomingStoreId) return;

      const ts =
        typeof data.timestamp === "number"
          ? data.timestamp
          : data.timestamp
          ? new Date(data.timestamp).getTime()
          : Date.now();

      if (!mountedRef.current) return;

      setState((prev) => {
        const existingIndex = prev.conversations.findIndex(
          (c) => c.storeId === incomingStoreId
        );

        // اگر چت موجود نیست، نادیده بگیر
        if (existingIndex === -1) return prev;

        const existing = prev.conversations[existingIndex];
        const updated: Conversation = {
          ...existing,
          lastMessage: data.text?.trim() || existing.lastMessage,
          timestamp: Number.isFinite(ts) ? ts : Date.now(),
          time: "هم‌اکنون",
          unread: existing.unread + 1,
          lastProductId: data.productId || existing.lastProductId,
          avatar: data.avatar || existing.avatar,
          online:
            typeof data.online === "boolean"
              ? data.online
              : existing.online,
          storeName: data.storeName || existing.storeName,
        };

        // Move to top
        const newConversations = [...prev.conversations];
        newConversations.splice(existingIndex, 1);
        return {
          ...prev,
          conversations: [updated, ...newConversations],
        };
      });
    };

    const handleError = (error: any) => {
      console.error("Socket error:", error);
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("receive_message", handleReceiveMessage);
    newSocket.on("error", handleError);

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.off("receive_message", handleReceiveMessage);
      newSocket.off("error", handleError);
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user, updateState]);

  // ===== Time update interval =====
  useEffect(() => {
    if (!state.conversations.length) return;

    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    timeUpdateIntervalRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) => ({
          ...c,
          time: formatRelativeFa(c.timestamp),
        })),
      }));
    }, TIME_UPDATE_INTERVAL);

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [state.conversations.length]);

  // ===== Memoized values =====
  const filteredConversations = useMemo(() => {
    if (!state.searchQuery.trim()) return state.conversations;

    const query = state.searchQuery.trim().toLowerCase();
    if (query.length < MIN_SEARCH_CHARS) return state.conversations;

    return state.conversations.filter(
      (c) =>
        c.storeName.toLowerCase().includes(query) ||
        c.lastMessage.toLowerCase().includes(query)
    );
  }, [state.conversations, state.searchQuery]);

  const unreadTotal = useMemo(
    () =>
      state.conversations.reduce((sum, c) => sum + Math.max(0, c.unread), 0),
    [state.conversations]
  );

  // ===== Event handlers =====
  const handleOpenChat = useCallback((storeId: string) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c.storeId === storeId ? { ...c, unread: 0 } : c
      ),
    }));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    updateState({ searchQuery: query });
  }, [updateState]);

  const handleClearSearch = useCallback(() => {
    updateState({ searchQuery: "" });
  }, [updateState]);

  // ===== Render: Not logged in =====
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-[100dvh] p-6 text-center bg-gradient-to-br from-gray-50 via-white to-indigo-50"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-indigo-400 rounded-[2.5rem] blur-2xl"
          />

          <div className="relative w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-xl border-2 border-indigo-100">
            <MessageCircle className="w-16 h-16" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-black text-gray-900 mb-3"
        >
          پیام‌های من
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 mb-8 text-sm leading-relaxed max-w-sm font-medium"
        >
          برای گفتگو با فروشندگان و پیگیری سفارشات، لطفاً وارد حساب کاربری
          شوید.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-xs space-y-3"
        >
          <Link
            to="/login"
            className="w-full bg-gradient-to-r from-gray-900 to-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 hover:shadow-2xl hover:shadow-gray-900/30 transition-all shadow-xl active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            ورود یا ثبت‌نام
          </Link>

          <Link
            to="/"
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 hover:bg-gray-200 transition-all active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
            بازگشت به صفحه اول
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  // ===== Render: Main content =====
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[100dvh] bg-gray-50 pb-[env(safe-area-inset-bottom)]"
      dir="rtl"
    >
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 shadow-sm sticky top-0 z-20 rounded-b-3xl border-b border-gray-100/50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900">پیام‌ها</h1>

            {unreadTotal > 0 && (
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md shadow-red-500/30 animate-pulse"
              >
                {unreadTotal > 99
                  ? "99+"
                  : unreadTotal.toLocaleString("fa-IR")}{" "}
                جدید
              </motion.span>
            )}
          </div>

          {/* Connection status */}
          <motion.span
            animate={{
              opacity: state.isConnected ? 1 : 0.5,
            }}
            className={`text-[10px] font-black flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
              state.isConnected
                ? "bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-500/30"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {state.isConnected ? (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Wifi className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.span>
            ) : (
              <WifiOff className="w-3.5 h-3.5" strokeWidth={2.5} />
            )}
            <span>{state.isConnected ? "آنلاین" : "آفلاین"}</span>
          </motion.span>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={2.5} />
          </div>

          <input
            type="text"
            placeholder="جستجو در فروشگاه‌ها..."
            value={state.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-11 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium transition-all shadow-sm"
          />

          {/* Clear button */}
          <AnimatePresence>
            {state.searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleClearSearch}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 hover:text-red-500 transition-colors active:scale-90"
                aria-label="پاک کردن جستجو"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </header>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="space-y-3">
          {state.loading ? (
            <ConversationSkeleton />
          ) : state.errorText ? (
            <ErrorState
              errorText={state.errorText}
              onRetry={fetchConversations}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredConversations.length === 0 ? (
                <EmptyState hasSearch={!!state.searchQuery} />
              ) : (
                filteredConversations.map((conversation, idx) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    index={idx}
                    onOpen={handleOpenChat}
                  />
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}