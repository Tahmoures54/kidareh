import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../../utils/api";
import { Conversation } from "./types"; // اصلاح مسیر (چون در همان پوشه است)
import { normalize } from "./utils";    // اصلاح مسیر (چون در همان پوشه است)

export function useConversations(user: any, logout: () => Promise<void>) {
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const mounted = useRef(true);

  // کنترل مانت شدن کامپوننت برای جلوگیری از نشت حافظه (Memory Leak)
  useEffect(() => { 
    mounted.current = true; 
    return () => { mounted.current = false; }; 
  }, []);

  const fetchConvs = useCallback(async () => {
    if (!user) return;
    
    // فقط در صورتی که لیست خالی است لودینگ نشان بده (برای UX بهتر)
    if (convs.length === 0) setLoading(true); 
    setError("");
    
    try {
      const data = await apiRequest<any[]>("/api/messages/conversations", { auth: true });
      if (!mounted.current) return;
      
      const list = (Array.isArray(data) ? data : []).map(normalize).filter(Boolean) as Conversation[];
      setConvs(list.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err: any) {
      if (!mounted.current) return;
      if (err instanceof ApiError && err.status === 401) {
        await logout(); 
        navigate("/login", { replace: true }); 
        return;
      }
      if (err instanceof ApiError && err.status === 404) { 
        setConvs([]); 
        return; 
      }
      setError("دریافت گفتگوها با مشکل مواجه شد.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [user, logout, navigate, convs.length]);

  // دریافت اولیه چت‌ها
  useEffect(() => { 
    if (user) fetchConvs(); 
    else setLoading(false); 
  }, [user, fetchConvs]);

  // مدیریت ارتباط سوکت
  useEffect(() => {
    if (!user) return;
    
    const base = (import.meta.env.VITE_API_URL as string)?.trim() || window.location.origin;
    const s = io(base, { 
      withCredentials: true, 
      transports: ["websocket", "polling"], 
      reconnection: true 
    });

    s.on("connect", () => { if (mounted.current) setOnline(true); });
    s.on("disconnect", () => { if (mounted.current) setOnline(false); });
    
    s.on("receive_message", (d: any) => {
      if (!mounted.current) return;
      
      const sid = String(d.storeId || d.senderId || "").trim();
      if (!sid) return;
      
      if (navigator.vibrate) navigator.vibrate(50);

      let needsFetch = false;

      setConvs(prev => {
        const idx = prev.findIndex(c => c.storeId === sid);
        
        // اگر شخص جدیدی پیام داده است
        if (idx === -1) {
          needsFetch = true;
          return prev; 
        }
        
        // آپدیت پیام و انتقال آن به بالای لیست
        const updated = { 
          ...prev[idx], 
          lastMessage: d.text || prev[idx].lastMessage, 
          timestamp: Date.now(), 
          time: "هم‌اکنون", 
          unread: prev[idx].unread + 1 
        };
        
        const next = [...prev];
        next.splice(idx, 1);
        return [updated, ...next]; 
      });

      // اگر چت جدید بود، کل لیست را از بک‌اند میگیریم تا پروفایل و نام فروشگاه ایجاد شود
      if (needsFetch) {
        fetchConvs();
      }
    });

    return () => { s.disconnect(); };
  }, [user, fetchConvs]);

  return { convs, setConvs, loading, error, online, fetchConvs };
}