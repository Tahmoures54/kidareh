import React, { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { Loader2, AlertTriangle, Home as HomeIcon } from "lucide-react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { SupportProvider } from "./context/SupportContext";

import PresenceShell from "./components/presence/Shell";
import PresenceHome from "./pages/PresenceHome";

const Login = lazy(() => import("./pages/Login"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const Search = lazy(() => import("./pages/Search"));
const Categories = lazy(() => import("./pages/Categories"));
const Stores = lazy(() => import("./pages/Stores"));
const Saved = lazy(() => import("./pages/Saved"));
const Following = lazy(() => import("./pages/Following"));
const Messages = lazy(() => import("./pages/Messages"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const StoreDetail = lazy(() => import("./pages/StoreDetail"));
const SellerPanel = lazy(() => import("./pages/SellerPanel"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const BuyBadge = lazy(() => import("./pages/BuyBadge"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ReferralPage = lazy(() => import("./pages/Referral"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const AIPage = lazy(() => import("./pages/AI"));
const SupportPage = lazy(() => import("./pages/Support"));
const TermsAndGuidePage = lazy(() => import("./pages/TermsAndGuide"));
const Privacy = lazy(() => import("./pages/Privacy"));
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const OnboardingFlow = lazy(() => import("./pages/Onboarding"));
const RadarPage = lazy(() => import("./pages/Radar"));
const ExplorePage = lazy(() => import("./pages/Explore"));
const TripPage = lazy(() => import("./pages/Trip"));
const HoldsPage = lazy(() => import("./pages/Holds"));
const PresenceListing = lazy(() => import("./pages/PresenceListing"));
const LegacyHome = lazy(() => import("./pages/Home"));

function PageLoader() {
  return (
    <div className="presence-root flex min-h-screen flex-col items-center justify-center gap-3" dir="rtl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-black text-white">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-xs font-black text-[var(--muted)]">در حال آماده‌سازی محله…</p>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="presence-root flex min-h-screen flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--line)] bg-white">
        <AlertTriangle className="h-10 w-10 text-[var(--gold)]" />
      </div>
      <h1 className="mb-2 text-2xl font-black">این صفحه پیدا نشد</h1>
      <p className="mb-8 max-w-xs text-sm font-bold leading-relaxed text-[var(--muted)]">
        آدرس اشتباه است یا صفحه جابه‌جا شده. برگرد به محله و از آنجا ادامه بده.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-black text-white"
      >
        <HomeIcon className="h-4 w-4" /> بازگشت به محله
      </Link>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, loading, refreshing } = useAuth();
  if (loading || refreshing) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function SellerProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isSeller, loading, refreshing } = useAuth();
  if (loading || refreshing) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isSeller) {
    return <Navigate to="/become-seller" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isAdmin, loading, refreshing } = useAuth();
  if (loading || refreshing) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, refreshing } = useAuth();
  if (loading || refreshing) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SupportProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<PresenceShell />}>
                  <Route index element={<PresenceHome />} />
                  <Route path="explore" element={<ExplorePage />} />
                  <Route path="radar" element={<RadarPage />} />
                  <Route path="trip" element={<TripPage />} />
                  <Route path="holds" element={<HoldsPage />} />
                  <Route path="reservations" element={<HoldsPage />} />
                  <Route path="p/:id" element={<PresenceListing />} />
                  <Route path="product/:id" element={<PresenceListing />} />
                  <Route path="legacy" element={<LegacyHome />} />
                  <Route path="search" element={<Search />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="categories/:slug" element={<Categories />} />
                  <Route path="stores" element={<Stores />} />
                  <Route path="store/:id" element={<StoreDetail />} />
                  <Route path="stores/:id" element={<StoreDetail />} />
                  <Route path="products/:id" element={<ProductDetail />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="terms" element={<TermsAndGuidePage />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="ai" element={<AIPage />} />

                  {/* پیام‌ها بدون اجبار ورود — مهمان صفحه راهنما می‌بیند */}
                  <Route path="messages" element={<Messages />} />

                  <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
                  <Route path="saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
                  <Route path="following" element={<ProtectedRoute><Following /></ProtectedRoute>} />
                  <Route path="referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
                  <Route path="become-seller" element={<ProtectedRoute><BecomeSeller /></ProtectedRoute>} />

                  <Route path="seller" element={<SellerProtectedRoute><SellerPanel /></SellerProtectedRoute>} />
                  <Route path="dashboard" element={<SellerProtectedRoute><SellerPanel /></SellerProtectedRoute>} />
                  <Route path="add-product" element={<SellerProtectedRoute><AddProduct /></SellerProtectedRoute>} />
                  <Route path="buy-badge" element={<SellerProtectedRoute><BuyBadge /></SellerProtectedRoute>} />

                  <Route path="admin" element={<AdminProtectedRoute><AdminPanel /></AdminProtectedRoute>} />
                  <Route path="admin/stats" element={<AdminProtectedRoute><AdminPanel /></AdminProtectedRoute>} />
                </Route>

                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/onboarding" element={<GuestRoute><OnboardingFlow /></GuestRoute>} />
                <Route path="/chat/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
                <Route path="/chat/:conversationId/:userId" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
                <Route path="/payment-callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
                <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
                <Route path="/seller/add-product" element={<SellerProtectedRoute><AddProduct /></SellerProtectedRoute>} />
                <Route path="/seller/buy-badge" element={<SellerProtectedRoute><BuyBadge /></SellerProtectedRoute>} />

                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/saved-products" element={<Navigate to="/saved" replace />} />
                <Route path="/dashboard/products" element={<Navigate to="/seller" replace />} />
                <Route path="/products" element={<Navigate to="/search" replace />} />
                <Route path="/wallet" element={<Navigate to="/referral" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SupportProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
