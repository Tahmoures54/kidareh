import React, { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, MessageCircle, PackageCheck, RefreshCw, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

type Status = "requested" | "seller_confirmed" | "ready_for_pickup" | "completed" | "cancelled" | "expired";
type Reservation = { id: number; buyer_id: number; seller_id: number; product_id: number; status: Status; price_snapshot: number; product_name_snapshot: string; store_name_snapshot: string; created_at: string; expires_at?: string | null; room_id?: string | null };

const labels: Record<Status, string> = { requested: "در انتظار تأیید فروشنده", seller_confirmed: "تأیید شده", ready_for_pickup: "آماده تحویل", completed: "تکمیل شده", cancelled: "لغو شده", expired: "منقضی شده" };
const transitions: Record<Status, { status: Status; label: string }[]> = {
  requested: [{ status: "seller_confirmed", label: "تأیید درخواست" }, { status: "cancelled", label: "لغو" }],
  seller_confirmed: [{ status: "ready_for_pickup", label: "آماده تحویل" }, { status: "cancelled", label: "لغو" }],
  ready_for_pickup: [{ status: "completed", label: "تکمیل" }, { status: "cancelled", label: "لغو" }],
  completed: [], cancelled: [], expired: [],
};

export default function Reservations() {
  const { user, isSeller } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError("");
    try { const data = await apiRequest<{ reservations?: Reservation[] }>("/api/reservations", { auth: true }); setItems(Array.isArray(data?.reservations) ? data.reservations : []); }
    catch (e) { setError(e instanceof ApiError ? e.message : "دریافت درخواست‌ها ناموفق بود."); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: number, status: Status) => {
    setBusy(id); setError("");
    try { await apiRequest(`/api/reservations/${id}/status`, { method: "PATCH", auth: true, body: { status } }); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "تغییر وضعیت انجام نشد."); }
    finally { setBusy(null); }
  };

  if (!user) return <div className="p-8 text-center" dir="rtl">برای مشاهده درخواست‌های رزرو وارد شوید.</div>;
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white px-4 py-6 pb-28" dir="rtl">
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5"><div><h1 className="text-xl font-black flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-emerald-600" /> درخواست‌های رزرو</h1><p className="text-xs text-gray-500 mt-1">درخواست‌ها تا تأیید فروشنده قطعی نیستند.</p></div><button onClick={load} className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"><RefreshCw className="w-4 h-4" /></button></div>
      {error && <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 p-3 text-xs font-bold">{error}</div>}
      {loading ? <div className="py-16 text-center text-sm text-gray-500">در حال دریافت…</div> : items.length === 0 ? <div className="py-16 text-center"><PackageCheck className="w-10 h-10 mx-auto text-gray-300 mb-3" /><p className="font-black">درخواستی ثبت نشده است</p></div> : <div className="space-y-3">{items.map(r => { const actions = isSeller ? transitions[r.status] : r.status === "requested" ? [{ status: "cancelled" as Status, label: "لغو درخواست" }] : []; return <article key={r.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-sm">{r.product_name_snapshot}</h2><p className="text-[11px] text-gray-500 mt-1">{r.store_name_snapshot}</p><p className="text-xs font-black text-violet-600 mt-2">{new Intl.NumberFormat("fa-IR").format(Math.round(r.price_snapshot))} تومان</p></div><span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-[10px] font-black">{labels[r.status]}</span></div><div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1"><Clock3 className="w-3 h-3" /> ثبت: {new Date(r.created_at).toLocaleString("fa-IR")}</div><div className="mt-3 flex flex-wrap gap-2">{r.room_id && <button onClick={() => navigate(`/chat/${r.seller_id === user.id ? r.buyer_id : r.seller_id}?product=${r.product_id}`)} className="h-9 px-3 rounded-xl bg-teal-700 text-white text-[10px] font-black flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> گفت‌وگو</button>}{actions.map(a => <button key={a.status} disabled={busy === r.id} onClick={() => changeStatus(r.id, a.status)} className={`h-9 px-3 rounded-xl text-[10px] font-black flex items-center gap-1 ${a.status === "cancelled" ? "border border-rose-200 text-rose-700" : "bg-emerald-600 text-white"}`}>{a.status === "cancelled" ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}{busy === r.id ? "…" : a.label}</button>)}</div></article>; })}</div>}
    </div>
  </div>;
}
