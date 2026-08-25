// src/context/SupportContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { apiRequest, ApiError } from "../utils/api";

export type TicketStatus = "pending" | "reviewing" | "closed";

export interface SupportTicket {
  id: string | number;
  userId: number | string;
  userName: string;
  userPhone: string;
  department: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
  adminName?: string;
}

export type CreateTicketPayload = Omit<
  SupportTicket,
  "id" | "status" | "createdAt" | "reply" | "repliedAt" | "adminName"
>;

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

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export function SupportProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const unreadCount = tickets.filter((t) => t.status === "closed" && t.reply).length;

  const fetchTickets = useCallback(async (): Promise<void> => {
    if (!user) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    // اگر درخواستی در حال اجراست، همان promise را برگردان
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    const promise = (async () => {
      if (!isMountedRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        const endpoint =
          user.role === "admin" || user.role === "support"
            ? "/api/support/tickets"
            : "/api/support/tickets?mine=1";

        const data = await apiRequest<any>(endpoint, { method: "GET", auth: true });

        if (!isMountedRef.current) return;

        const list = Array.isArray(data) ? data : data?.tickets ?? [];
        setTickets(list);
      } catch (err: any) {
        if (!isMountedRef.current) return;

        console.error("Fetch tickets error:", err);
        setError(err.message || "خطا در دریافت تیکت‌ها");
        setTickets([]);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const addTicket = useCallback(async (ticketData: CreateTicketPayload) => {
    const tempId = `temp-${Date.now()}`;
    const now =
      new Date().toLocaleDateString("fa-IR") +
      " - " +
      new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    const optimistic: SupportTicket = {
      ...ticketData,
      id: tempId,
      status: "pending",
      createdAt: now,
    };

    setTickets((prev) => [optimistic, ...prev]);

    try {
      const saved = await apiRequest<SupportTicket>("/api/support/tickets", {
        method: "POST",
        auth: true,
        body: ticketData,
      });

      setTickets((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
    } catch (err) {
      setTickets((prev) => prev.filter((t) => t.id !== tempId));
      throw err;
    }
  }, []);

  const replyTicket = useCallback(
    async (id: string | number, replyText: string) => {
      // optimistic update
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                reply: replyText,
                status: "closed",
                repliedAt: "همین الان",
                adminName: user?.name || "پشتیبانی",
              }
            : t
        )
      );

      try {
        await apiRequest(`/api/support/tickets/${id}`, {
          method: "PATCH",
          auth: true,
          body: { status: "closed", answer: replyText },
        });
      } catch (err) {
        // rollback by refetching
        fetchTickets();
        throw err;
      }
    },
    [user, fetchTickets]
  );

  const updateTicketStatus = useCallback(
    async (id: string | number, status: TicketStatus) => {
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

      try {
        await apiRequest(`/api/support/tickets/${id}`, {
          method: "PATCH",
          auth: true,
          body: { status },
        });
      } catch (err) {
        fetchTickets();
        throw err;
      }
    },
    [fetchTickets]
  );

  return (
    <SupportContext.Provider
      value={{
        tickets,
        isLoading,
        error,
        unreadCount,
        fetchTickets,
        addTicket,
        replyTicket,
        updateTicketStatus,
      }}
    >
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (ctx === undefined)
    throw new Error("useSupport must be used within a SupportProvider");
  return ctx;
}