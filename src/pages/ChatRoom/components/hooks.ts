import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiRequest } from "../../../utils/api";
import { Msg, MsgStatus } from "./types";

type RoomInfo = { roomId: string; success?: boolean };

export function useChatRoom(id: string | undefined, productId: string | null, user: any) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [histLoad, setHistLoad] = useState(false);
  const [storeName, setStoreName] = useState("در حال دریافت...");
  const [roomId, setRoomId] = useState("");
  const [showScroll, setShowScroll] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const resolveRoom = useCallback(async () => {
    if (!id || !user?.id) return "";
    const store = await apiRequest<any>(`/api/stores/${id}`, { auth: false });
    if (!store?.owner_id || Number(store.owner_id) === Number(user.id)) {
      throw new Error("فروشگاه یا مالک گفتگو معتبر نیست");
    }
    if (mounted.current) setStoreName(store.name || "فروشگاه کی‌داره");
    const room = await apiRequest<RoomInfo>("/api/messages/rooms", {
      method: "POST",
      auth: true,
      body: { receiverId: Number(store.owner_id), productId: productId ? Number(productId) : undefined },
    });
    if (!room?.roomId) throw new Error("اتاق گفتگو ایجاد نشد");
    if (mounted.current) setRoomId(room.roomId);
    return room.roomId;
  }, [id, user?.id, productId]);

  const fetchHistory = useCallback(async (rid: string) => {
    setHistLoad(true);
    try {
      const data = await apiRequest<{ messages: Msg[]; roomId: string }>(`/api/messages/${encodeURIComponent(rid)}`, { auth: true });
      if (!mounted.current) return;
      setMessages(Array.isArray(data?.messages) ? data.messages.map(m => ({
        ...m,
        status: "sent" as MsgStatus,
        timestamp: m.timestamp || new Date((m as any).created_at || m.createdAt || Date.now()).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      })) : []);
    } catch {
      if (mounted.current) setMessages([]);
    } finally {
      if (mounted.current) setHistLoad(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user || !id) return;
    (async () => {
      try {
        const rid = await resolveRoom();
        if (!rid || cancelled || !mounted.current) return;
        await fetchHistory(rid);

        const base = (import.meta.env.VITE_API_URL as string)?.trim() || window.location.origin;
        const accessToken = typeof window !== "undefined" ? window.localStorage.getItem("kidareh_access_token") : null;
        const s = io(base, {
          auth: accessToken ? { token: accessToken } : undefined,
          withCredentials: true,
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          timeout: 15000,
        });
        setSocket(s);
        s.on("connect", () => {
          setConnected(true);
          s.emit("join_room", rid);
        });
        s.on("disconnect", () => setConnected(false));
        s.on("receive_message", (d: Msg) => {
          if (!mounted.current) return;
          setMessages(prev => prev.some(m => String(m.id) === String(d.id)) ? prev : [...prev, { ...d, status: "sent" }]);
          setTyping(false);
        });
        s.on("message_read", (d: any) => {
          const mid = typeof d === "string" ? d : d?.messageId;
          if (mid) setMessages(prev => prev.map(m => String(m.id) === String(mid) ? { ...m, status: "read" } : m));
        });
        s.on("user_typing", () => {
          setTyping(true);
          window.setTimeout(() => mounted.current && setTyping(false), 3000);
        });
        s.on("user_stop_typing", () => setTyping(false));
      } catch {
        if (mounted.current) setConnected(false);
      }
    })();
    return () => {
      cancelled = true;
      setConnected(false);
      setSocket(prev => {
        prev?.disconnect();
        return null;
      });
    };
  }, [id, user?.id, productId, resolveRoom, fetchHistory]);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScroll(!near);
  }, []);

  const sendMsg = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !user || !roomId) return;
    const mid = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const msg: any = { id: mid, roomId, senderId: String(user.id), text, content: text, timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }), status: "sending", createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const mark = (status: MsgStatus) => setMessages(prev => prev.map(m => String(m.id) === mid ? { ...m, status } : m));
    if (socket && connected) {
      socket.emit("send_message", msg, (ack: any) => mark(ack?.ok === false ? "error" : "sent"));
    } else {
      try {
        const rid = roomId;
        const room = await apiRequest<any>(`/api/messages/${encodeURIComponent(rid)}`, { auth: true });
        const receiverId = Number(room?.messages?.[0]?.sender_id || 0);
        if (!receiverId) throw new Error("گیرنده گفتگو مشخص نیست");
        await apiRequest("/api/messages", { method: "POST", auth: true, body: { roomId: rid, receiverId, content: text, productId: productId ? Number(productId) : undefined } });
        mark("sent");
      } catch { mark("error"); }
    }
  };

  const retry = useCallback((m: Msg) => {
    if (!roomId || !user) return;
    const payload: any = { ...m, roomId, senderId: String(user.id), text: (m as any).text || (m as any).content || "" };
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, status: "sending" } : x));
    if (socket && connected) {
      socket.emit("send_message", payload, (ack: any) => setMessages(prev => prev.map(x => x.id === m.id ? { ...x, status: ack?.ok === false ? "error" : "sent" } : x)));
    }
  }, [roomId, socket, connected, user]);

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
