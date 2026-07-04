import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiRequest } from "../../../utils/api";   // ✅ اصلاح: ../../../ به جای ../../
import { Msg, MsgStatus } from "./types";

export function useChatRoom(id: string | undefined, productId: string | null, user: any) {
  // States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [histLoad, setHistLoad] = useState(false);
  const [storeName, setStoreName] = useState("در حال دریافت...");
  const [nearBot, setNearBot] = useState(true);
  const [showScroll, setShowScroll] = useState(false);

  // Refs
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const roomId = useMemo(() => {
    if (!user?.id || !id) return "";
    return `chat_${user.id}_${id}`;
  }, [user?.id, id]);

  /* ── Fetch Store Info ── */
  useEffect(() => {
    if (!id) return;
    apiRequest(`/api/stores/${id}`, { auth: false })
      .then((d: any) => { if (mounted.current && d?.name) setStoreName(d.name); })
      .catch(() => setStoreName("فروشگاه کی‌داره"));
  }, [id]);

  /* ── Fetch History ── */
  const fetchHistory = useCallback(async () => {
    if (!roomId) return;
    setHistLoad(true);
    try {
      const data = await apiRequest<Msg[]>(`/api/messages/room/${roomId}`, { auth: true });
      if (!mounted.current) return;
      if (Array.isArray(data)) {
        setMessages(data.map(m => ({
          ...m,
          status: "sent" as MsgStatus,
          timestamp: m.timestamp || new Date(m.createdAt!).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        })));
      }
    } catch {}
    finally { if (mounted.current) setHistLoad(false); }
  }, [roomId]);

  /* ── Socket Connection ── */
  useEffect(() => {
    if (!user || !id) return;
    const base = (import.meta.env.VITE_API_URL as string)?.trim() || window.location.origin;
    const s = io(base, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true, reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, timeout: 15000,
    });
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      if (roomId) s.emit("join_room", roomId);
      if (productId && roomId) s.emit("product_context", { roomId, productId });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("receive_message", (d: Msg) => {
      if (!mounted.current) return;
      setMessages(prev => prev.some(m => m.id === d.id) ? prev : [...prev, { ...d, status: "sent" }]);
      setTyping(false);
      if(navigator.vibrate) navigator.vibrate(50);
    });
    s.on("message_read", (mid: string) => {
      setMessages(prev => prev.map(m => m.id === mid ? { ...m, status: "read" } : m));
    });
    s.on("typing", () => {
      setTyping(true);
      setTimeout(() => { if (mounted.current) setTyping(false); }, 3000);
    });

    fetchHistory();

    return () => {
      s.off("connect"); s.off("disconnect");
      s.off("receive_message"); s.off("message_read"); s.off("typing");
      s.disconnect();
      setSocket(null); setConnected(false);
    };
  }, [id, user, roomId, productId, fetchHistory]);

  /* ── Scrolling Logic ── */
  useEffect(() => {
    if (nearBot) endRef.current?.scrollIntoView({ behavior: "smooth" });
    else setShowScroll(true);
  }, [messages, nearBot, typing]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nb = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setNearBot(nb);
    setShowScroll(!nb);
  }, []);

  /* ── Send Logic ── */
  const sendMsg = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !user || !roomId) return;

    const mid = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const ts = new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    const msg: Msg & { roomId: string } = {
      id: mid, roomId,
      senderId: String(user.phone ?? user.id),
      text: input.trim(),
      timestamp: ts,
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);
    setInput("");
    
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const ok = (status: MsgStatus) => setMessages(prev => prev.map(m => m.id === mid ? { ...m, status } : m));

    if (socket && connected) {
      socket.emit("send_message", msg, (ack?: { ok?: boolean }) => {
        ok(ack?.ok === false ? "error" : "sent");
      });
    } else {
      try {
        await apiRequest("/api/messages", { method: "POST", auth: true, body: { roomId, content: msg.text } });
        ok("sent");
      } catch { ok("error"); }
    }
  };

  const retry = useCallback((m: Msg) => {
    if (!roomId) return;
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, status: "sending" } : x));
    const ok = (s: MsgStatus) => setMessages(prev => prev.map(x => x.id === m.id ? { ...x, status: s } : x));
    if (socket && connected) {
      socket.emit("send_message", { ...m, roomId }, (ack?: { ok?: boolean }) => {
        ok(ack?.ok === false ? "error" : "sent");
      });
    } else {
      apiRequest("/api/messages", { method: "POST", auth: true, body: { roomId, content: m.text } })
        .then(() => ok("sent")).catch(() => ok("error"));
    }
  }, [roomId, socket, connected]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return {
    refs: { endRef, containerRef, textareaRef },
    state: { messages, input, typing, histLoad, storeName, showScroll, connected },
    actions: { setInput, sendMsg, retry, handleScroll, handleInput }
  };
}