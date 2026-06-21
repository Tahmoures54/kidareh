import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Send,
  Phone,
  MoreVertical,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowDown,
  RefreshCw,
  Loader2,
  Smile,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

type MessageStatus = "sending" | "sent" | "read" | "error";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: MessageStatus;
}

type OutgoingMessage = Message & { roomId: string };

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("product");

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const roomId = useMemo(() => {
    if (!user?.id || !id) return "";
    return `chat_${user.id}_${id}`;
  }, [user?.id, id]);

  // محافظت از مسیر
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { returnUrl: `/chat/${id ?? ""}` } });
    }
  }, [user, authLoading, navigate, id]);

  // راه‌اندازی Socket.IO
  useEffect(() => {
    if (!user || !id) return;

    const APP_URL = import.meta.env.VITE_API_URL || window.location.origin;

    const newSocket = io(APP_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocket(newSocket);

    const onConnect = () => {
      setIsConnected(true);
      if (roomId) newSocket.emit("join_room", roomId);

      if (productId && roomId) {
        newSocket.emit("product_context", { roomId, productId });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onReceiveMessage = (data: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, { ...data, status: data.status || "sent" }];
      });
      setIsTyping(false);
    };

    const onMessageRead = (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "read" } : m))
      );
    };

    const onTyping = () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    };

    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("receive_message", onReceiveMessage);
    newSocket.on("message_read", onMessageRead);
    newSocket.on("typing", onTyping);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("receive_message", onReceiveMessage);
      newSocket.off("message_read", onMessageRead);
      newSocket.off("typing", onTyping);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [id, user, roomId, productId]);

  // اسکرول خودکار به پایین
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowScrollButton(true);
    }
  }, [messages, isNearBottom]);

  // تشخیص اسکرول
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ارسال پیام
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !id || !roomId) return;

    const messageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const timestamp = new Date().toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const payload: OutgoingMessage = {
      id: messageId,
      roomId,
      senderId: String(user.phone ?? user.id),
      text: newMessage.trim(),
      timestamp,
      status: "sending",
    };

    setMessages((prev) => [...prev, payload]);
    setNewMessage("");

    if (socket && isConnected) {
      socket.emit("send_message", payload, (ack?: { ok?: boolean }) => {
        if (ack?.ok === false) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, status: "error" } : m
            )
          );
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, status: "sent" } : m
          )
        );
      });
    } else {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, status: "error" } : m
          )
        );
      }, 1200);
    }
  };

  // ارسال مجدد پیام خطادار
  const retryMessage = (msg: Message) => {
    if (!socket || !isConnected || !roomId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, status: "sending" } : m))
    );
    socket.emit(
      "send_message",
      { ...msg, roomId, status: "sending" },
      (ack?: { ok?: boolean }) => {
        if (ack?.ok === false) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id ? { ...m, status: "error" } : m
            )
          );
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, status: "sent" } : m
          )
        );
      }
    );
  };

  const renderMessageStatus = (status: MessageStatus) => {
    switch (status) {
      case "sending":
        return (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Clock className="w-3.5 h-3.5 text-teal-200" />
          </motion.div>
        );
      case "sent":
        return <Check className="w-3.5 h-3.5 text-teal-100" />;
      case "read":
        return <CheckCheck className="w-3.5 h-3.5 text-green-300" />;
      case "error":
        return <AlertCircle className="w-3.5 h-3.5 text-red-300" />;
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-[100dvh] bg-gradient-to-b from-gray-50 via-white to-teal-50/20 relative overflow-hidden"
      dir="rtl"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-teal-200/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyan-200/10 rounded-full blur-3xl" />
      </div>

      {/* هدر */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shadow-sm sticky top-0 z-20 border-b border-gray-100"
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* قسمت چپ */}
          <div className="flex items-center gap-3 flex-1">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors shrink-0 border border-gray-100"
              title="بازگشت"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* آواتار */}
              <div className="relative shrink-0">
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src={`https://picsum.photos/seed/${id ?? "store"}/100/100`}
                  alt="Store"
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-md"
                  referrerPolicy="no-referrer"
                />
                <motion.span
                  animate={{
                    scale: isConnected ? [1, 1.2, 1] : 1,
                    opacity: isConnected ? 1 : 0.5,
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full shadow-md ${
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </div>

              {/* اطلاعات */}
              <div className="flex flex-col min-w-0">
                <h2 className="text-sm font-black text-gray-900 leading-tight flex items-center gap-1.5 truncate">
                  فروشگاه {id}
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                </h2>
                <motion.p
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`text-[10px] font-bold ${
                    isConnected ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {isConnected ? "🟢 آنلاین" : "⊕ در حال اتصال..."}
                </motion.p>
              </div>
            </div>
          </div>

          {/* قسمت راست */}
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              whileHover={{ scale: 1.08, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-teal-600 hover:bg-teal-50 transition-colors border border-teal-100/30"
              title="تماس"
            >
              <Phone className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors border border-gray-100"
              title="گزینه‌ها"
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ناحیه پیام‌ها */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 z-10 relative scroll-smooth max-w-6xl w-full mx-auto"
      >
        {/* جداکننده تاریخ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-4"
        >
          <span className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 text-gray-500 text-[10px] px-4 py-1.5 rounded-full font-bold">
            📅 امروز
          </span>
        </motion.div>

        {/* حالت خالی */}
        {messages.length === 0 && (
          <div className="space-y-4 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-3xl rounded-tl-none p-4 max-w-[80%] shadow-sm border border-gray-100 relative">
                <p className="text-sm text-gray-800 leading-relaxed font-medium">
                  👋 سلام! من فروشنده این کالا هستم. چطور می‌تونم کمکتون کنم؟
                </p>
                <p className="text-[9px] text-gray-400 mt-2 text-left font-bold">۱۰:۰۰</p>
              </div>
            </motion.div>

            {productId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center my-6"
              >
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200/50 px-4 py-3 rounded-2xl max-w-[90%] text-center shadow-sm">
                  <p className="text-xs font-black text-teal-900">📦 شما درباره یک کالا سوال دارید</p>
                  <p className="text-[10px] text-teal-700 mt-1.5 font-medium">
                    لینک کالا به صورت خودکار برای فروشنده ارسال شد ✓
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* لیست پیام‌ها */}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === String(user.phone ?? user.id);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: idx * 0.02 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={`rounded-3xl p-3.5 max-w-[85%] shadow-sm relative ${
                    isMe
                      ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-tr-none border border-teal-400/30"
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"
                  }`}
                >
                  <p className="text-[13px] leading-relaxed font-medium whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                  <div className={`flex items-center justify-end gap-1.5 mt-2 text-[9px]`}>
                    <span className={`font-bold ${isMe ? "text-teal-100" : "text-gray-400"}`}>
                      {msg.timestamp}
                    </span>
                    {isMe && renderMessageStatus(msg.status)}
                    {isMe && msg.status === "error" && (
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => retryMessage(msg)}
                        className="ml-1 text-red-200 hover:text-red-100 transition-colors"
                        title="ارسال مجدد"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* نشانگر نوشتن */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-3xl rounded-tl-none p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* دکمه اسکرول به پایین */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            onClick={scrollToBottom}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 w-11 h-11 bg-white shadow-lg rounded-full flex items-center justify-center text-teal-600 border-2 border-teal-200/50 hover:shadow-xl transition-shadow"
            title="رفتن به آخر"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ناحیه ورودی */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/80 backdrop-blur-xl p-4 border-t border-gray-200 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <form
          onSubmit={handleSendMessage}
          className="flex items-end gap-2.5 max-w-6xl mx-auto"
        >
          {/* دکمه تصویر */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shrink-0 border border-gray-100 mb-1"
            title="افزودن تصویر"
          >
            <ImageIcon className="w-5 h-5" />
          </motion.button>

          {/* Input متن */}
          <motion.div className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-2xl relative focus-within:ring-2 focus-within:ring-teal-200 focus-within:border-teal-400 focus-within:bg-white transition-all shadow-sm">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="پیام خود را بنویسید..."
              rows={1}
              className="w-full bg-transparent border-none rounded-2xl px-4 py-3 text-sm text-gray-800 focus:outline-none resize-none min-h-[44px] max-h-[120px] font-medium placeholder:text-gray-400"
              style={{
                overflowY: newMessage.length > 50 ? "auto" : "hidden",
              }}
            />
          </motion.div>

          {/* دکمه ارسال */}
          <motion.button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            whileHover={{ scale: newMessage.trim() && isConnected ? 1.08 : 1 }}
            whileTap={{ scale: 0.95 }}
            className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all shrink-0 mb-0.5 font-bold border-2 ${
              newMessage.trim() && isConnected
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 border-teal-500/50 hover:shadow-xl"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            }`}
            title="ارسال پیام (Enter)"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>

        {/* نشانگر اتصال */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-3 text-xs text-red-500 font-bold flex items-center justify-center gap-1.5"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            در حال برقرار‌کردن اتصال...
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}