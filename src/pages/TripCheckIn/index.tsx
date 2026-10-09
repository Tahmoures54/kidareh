import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck, Store } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";

interface CheckInResponse {
  success: boolean;
  message: string;
  stopOrder: number;
}

function readPayload(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  // داده QR در fragment نگهداری می‌شود تا توکن در access log سرور ثبت نشود.
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export default function TripCheckIn() {
  const { user, loading, refreshing } = useAuth();
  const navigate = useNavigate();
  const [payload] = useState(readPayload);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const tripId = payload.get("tripId") || "";
  const stopOrder = Number(payload.get("stopOrder"));
  const token = payload.get("token") || "";
  const validPayload = tripId.length > 0 && Number.isSafeInteger(stopOrder) && stopOrder > 0 && token.length >= 32;

  const confirmArrival = async () => {
    if (!validPayload || submitting) return;
    if (!user) {
      navigate("/login", {
        state: { from: window.location.pathname + window.location.search + window.location.hash },
      });
      return;
    }
    if (user.role !== "seller" && user.role !== "admin") {
      setMessage("برای تأیید حضور، با حساب فروشنده همان فروشگاه وارد شوید.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const result = await apiRequest<CheckInResponse>(
        "/api/presence/trips/" + encodeURIComponent(tripId) + "/stops/" + stopOrder + "/check-in",
        { method: "POST", auth: true, body: { token } },
      );
      setSuccess(result.success);
      setMessage(result.message || "حضور با موفقیت تأیید شد.");
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "تأیید حضور انجام نشد. کد و حساب فروشگاه را بررسی کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || refreshing) {
    return <div className="flex min-h-screen items-center justify-center" dir="rtl"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f9f8] p-4" dir="rtl">
      <section className="w-full max-w-md rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-teal-900/5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          {success ? <CheckCircle2 className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
        </div>
        <h1 className="mt-4 text-center text-xl font-black text-slate-900">تأیید حضور کی‌داره</h1>
        <p className="mt-2 text-center text-sm leading-7 text-slate-500">
          {validPayload ? "این کد برای تأیید رسیدن خریدار به یکی از توقف‌های مسیر صادر شده است." : "کد QR ناقص یا نامعتبر است. از خریدار بخواهید کد تازه‌ای نمایش دهد."}
        </p>

        {message && (
          <p role="status" aria-live="polite" className={["mt-4 rounded-xl px-3 py-3 text-xs font-bold leading-6", success ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"].join(" ")}>
            {message}
          </p>
        )}

        {validPayload && !success && (
          <button
            type="button"
            onClick={confirmArrival}
            disabled={submitting}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#08a6a6] px-4 text-sm font-black text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
            {submitting ? "در حال تأیید…" : user ? "تأیید حضور خریدار" : "ورود فروشنده و تأیید حضور"}
          </button>
        )}

        {!user && (
          <p className="mt-4 text-center text-xs leading-6 text-slate-500">
            برای جلوگیری از تأیید جعلی، ورود به حساب فروشنده و تطبیق شماره فروشگاه لازم است.
          </p>
        )}

        <Link to="/" className="mt-5 block text-center text-xs font-black text-teal-700">بازگشت به کی‌داره</Link>
      </section>
    </main>
  );
}
