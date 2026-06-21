import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// ==========================================
// 1. Types & Interfaces
// ==========================================
export type TicketStatus = 'pending' | 'reviewing' | 'closed';

export interface SupportTicket {
  id: string | number;
  userId: number | string;
  userName: string;
  userPhone: string;
  department: string; // دپارتمان (مالی، فنی و...)
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
  adminName?: string; // نام پشتیبانی که پاسخ داده
}

// دیتایی که فرانت‌اند برای ساخت تیکت به متد پاس می‌دهد
export type CreateTicketPayload = Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'reply' | 'repliedAt' | 'adminName'>;

interface SupportContextType {
  tickets: SupportTicket[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  
  fetchTickets: () => Promise<void>;
  addTicket: (ticket: CreateTicketPayload) => Promise<void>;
  replyTicket: (id: string | number, reply: string) => Promise<void>;
  updateTicketStatus: (id: string | number, status: TicketStatus) => Promise<void>;
}

// ==========================================
// 2. Context Setup
// ==========================================
const SupportContext = createContext<SupportContextType | undefined>(undefined);

export function SupportProvider({ children }: { children: ReactNode }) {
  const { user, getToken } = useAuth();
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // محاسبه تعداد تیکت‌هایی که پاسخ داده شده‌اند اما کاربر هنوز ندیده است (اختیاری)
  const unreadCount = tickets.filter(t => t.status === 'closed' && t.reply).length;

  // ==========================================
  // 3. دریافت لیست تیکت‌ها از سرور
  // ==========================================
  const fetchTickets = useCallback(async () => {
    if (!user) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      // ادمین و پشتیبان لیست همه تیکت‌ها را می‌بینند، کاربر عادی فقط تیکت‌های خودش را
      const endpoint = (user.role === 'admin' || user.role === 'support') 
        ? '/api/admin/tickets' 
        : '/api/tickets/my-tickets';

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('خطا در دریافت لیست پیام‌ها');
      
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Fetch Tickets Error:', err);
      // Fallback به دیتای تستی در صورت قطع بودن سرور (فقط برای توسعه)
      if (process.env.NODE_ENV !== 'production' && tickets.length === 0) {
        setTickets(getMockTickets(user.phone));
      } else {
        setError(err.message || 'خطا در ارتباط با سرور');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken]);

  // دریافت تیکت‌ها در زمان لود اولیه یا تغییر کاربر
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ==========================================
  // 4. ثبت تیکت جدید (کاربر) + Optimistic UI
  // ==========================================
  const addTicket = async (ticketData: CreateTicketPayload) => {
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'});

    // 1. Optimistic Update: نمایش فوری در UI بدون صبر کردن برای سرور
    const optimisticTicket: SupportTicket = {
      ...ticketData,
      id: tempId,
      status: 'pending',
      createdAt: now,
    };
    
    setTickets(prev => [optimisticTicket, ...prev]);

    try {
      const token = getToken();
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ticketData)
      });

      if (!res.ok) throw new Error('سرور پاسخ نداد');
      
      const savedTicket = await res.json();
      
      // جایگزین کردن تیکت موقت با تیکت واقعی (که ID دیتابیس دارد)
      setTickets(prev => prev.map(t => t.id === tempId ? savedTicket : t));
      
    } catch (err) {
      // 2. Rollback: اگر سرور ارور داد، تیکت موقت را پاک می‌کنیم
      setTickets(prev => prev.filter(t => t.id !== tempId));
      throw new Error('خطا در ارسال پیام. لطفاً اتصال اینترنت خود را بررسی کنید.');
    }
  };

  // ==========================================
  // 5. پاسخ دادن به تیکت (ادمین / پشتیبانی)
  // ==========================================
  const replyTicket = async (id: string | number, replyText: string) => {
    // Optimistic Update
    setTickets(prev => prev.map(t => 
      t.id === id ? { 
        ...t, 
        reply: replyText, 
        status: 'closed', 
        repliedAt: 'همین الان',
        adminName: user?.name || 'پشتیبانی'
      } : t
    ));

    try {
      const token = getToken();
      const res = await fetch(`/api/admin/tickets/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reply: replyText })
      });

      if (!res.ok) throw new Error();
    } catch (err) {
      // برای حفظ یکپارچگی، کل لیست را از سرور ری‌فرش می‌کنیم
      fetchTickets();
      throw new Error('خطا در ثبت پاسخ در سرور.');
    }
  };

  // ==========================================
  // 6. تغییر وضعیت تیکت (بستن یا در حال بررسی)
  // ==========================================
  const updateTicketStatus = async (id: string | number, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));

    try {
      const token = getToken();
      await fetch(`/api/admin/tickets/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      fetchTickets();
    }
  };

  return (
    <SupportContext.Provider value={{ 
      tickets, 
      isLoading, 
      error, 
      unreadCount, 
      fetchTickets, 
      addTicket, 
      replyTicket, 
      updateTicketStatus 
    }}>
      {children}
    </SupportContext.Provider>
  );
}

// ==========================================
// Hooks & Utilities
// ==========================================
export function useSupport() {
  const context = useContext(SupportContext);
  if (context === undefined) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
}

// دیتای تستی برای زمانی که بک‌اند هنوز آماده نیست
function getMockTickets(userPhone?: string): SupportTicket[] {
  return [
    {
      id: 'mock-1',
      userId: 'user1',
      userName: 'علی رضایی',
      userPhone: userPhone || '09121111111',
      department: 'امور مالی و پرداخت',
      subject: 'عدم اعمال برچسب خریداری شده',
      message: 'سلام، من نیم ساعت پیش پکیج بلک‌فرایدی رو خریدم، پول از حسابم کم شد اما برچسب اعمال نشده روی محصولم. لطفاً پیگیری کنید.',
      status: 'pending',
      createdAt: 'امروز، ۱۰:۳۰',
    },
    {
      id: 'mock-2',
      userId: 'user1',
      userName: 'علی رضایی',
      userPhone: userPhone || '09121111111',
      department: 'راهنمایی عمومی',
      subject: 'تغییر آدرس روی نقشه',
      message: 'چطور می‌تونم آدرس مغازه‌ام رو روی نقشه دقیق‌تر تنظیم کنم؟',
      status: 'closed',
      createdAt: 'دیروز، ۱۵:۴۵',
      reply: 'سلام همکار گرامی. کافیست وارد پنل "فروشگاه من" شوید، دکمه ویرایش اطلاعات را بزنید و روی نقشه پین را جابجا کنید.',
      repliedAt: 'دیروز، ۱۶:۰۰',
      adminName: 'پشتیبان ارشد'
    }
  ];
}