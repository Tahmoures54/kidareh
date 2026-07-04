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

import Layout from "./components/Layout";
import Home from "./pages/Home";

/* ====================== LAZY PAGES ====================== */
const Login = lazy(() => import("./pages/Login"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const Search = lazy(() => import("./pages/Search"));
const Categories = lazy(() => import("./pages/Categories"));
const Stores = lazy(() => import("./pages/Stores"));
const Saved = lazy(() => import("./pages/Saved"));
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
const BecomeSeller = lazy(() => import("./pages/BecomeSeller")); // صفحه ارتقا به فروشنده

/* ====================== COMPONENTS ====================== */
function PageLoader() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 gap-3"
      dir="rtl"
    >
      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200 dark:shadow-none">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
      <p className="text-xs font-bold text-gray-400">در حال بارگذاری...</p>
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
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6 text-center"
      dir="rtl"
    >
      <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-3xl flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">صفحه پیدا نشد</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
        آدرسی که وارد کردید معتبر نیست یا این صفحه حذف شده است.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform shadow-lg shadow-teal-200 hover:bg-teal-700 dark:shadow-none"
      >
        <HomeIcon className="w-4 h-4" /> بازگشت به خانه
      </Link>
    </div>
  );
}

/* ====================== AUTH ROUTES ====================== */

// مسیر محافظت شده عمومی (فقط لاگین کرده باشد)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, loading, refreshing } = useAuth();

  if (loading || refreshing) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

// مسیر محافظت شده فروشنده (لاگین کرده و نقش فروشنده/ادمین را داشته باشد)
function SellerProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isSeller, loading, refreshing } = useAuth();

  if (loading || refreshing) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // اگر کاربر است اما فروشنده نیست -> هدایت به صفحه ارتقا حساب
  if (!isSeller) {
    return <Navigate to="/become-seller" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

// مسیر مهمان (فقط برای کاربرانی که لاگین نکرده‌اند)
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, refreshing } = useAuth();

  if (loading || refreshing) return <PageLoader />;

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

/* ====================== MAIN APP ====================== */
export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SupportProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* مسیرهای دارای Layout اصلی سایت */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="search" element={<Search />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="categories/:slug" element={<Categories />} />
                  <Route path="stores" element={<Stores />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="terms" element={<TermsAndGuidePage />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="ai" element={<AIPage />} />

                  {/* مسیرهای نیازمند لاگین (Protected) */}
                  <Route
                    path="profile"
                    element={<ProtectedRoute><Profile /></ProtectedRoute>}
                  />
                  <Route
                    path="complete-profile"
                    element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>}
                  />
                  <Route
                    path="saved"
                    element={<ProtectedRoute><Saved /></ProtectedRoute>}
                  />
                  <Route
                    path="messages"
                    element={<ProtectedRoute><Messages /></ProtectedRoute>}
                  />
                  <Route
                    path="referral"
                    element={<ProtectedRoute><ReferralPage /></ProtectedRoute>}
                  />
                  
                  {/* صفحه ارتقا به فروشنده (نیاز به لاگین دارد اما نیاز به نقش فروشنده ندارد) */}
                  <Route
                    path="become-seller"
                    element={<ProtectedRoute><BecomeSeller /></ProtectedRoute>}
                  />

                  {/* پنل فروشنده (نیازمند نقش فروشنده) */}
                  <Route
                    path="seller"
                    element={<SellerProtectedRoute><SellerPanel /></SellerProtectedRoute>}
                  />
                  <Route
                    path="dashboard"
                    element={<SellerProtectedRoute><SellerPanel /></SellerProtectedRoute>}
                  />
                  <Route
                    path="add-product"
                    element={<SellerProtectedRoute><AddProduct /></SellerProtectedRoute>}
                  />
                  <Route
                    path="buy-badge"
                    element={<SellerProtectedRoute><BuyBadge /></SellerProtectedRoute>}
                  />

                  {/* پنل ادمین */}
                  <Route
                    path="admin"
                    element={<ProtectedRoute><AdminPanel /></ProtectedRoute>}
                  />
                  <Route
                    path="admin/stats"
                    element={<ProtectedRoute><AdminPanel /></ProtectedRoute>}
                  />
                </Route>

                {/* مسیرهای مستقل (بدون Layout اصلی) */}
                <Route
                  path="/login"
                  element={<GuestRoute><Login /></GuestRoute>}
                />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/store/:id" element={<StoreDetail />} />
                <Route path="/stores/:id" element={<StoreDetail />} />
                <Route
                  path="/chat/:id"
                  element={<ProtectedRoute><ChatRoom /></ProtectedRoute>}
                />
                <Route
                  path="/chat/:conversationId/:userId"
                  element={<ProtectedRoute><ChatRoom /></ProtectedRoute>}
                />
                <Route
                  path="/payment-callback"
                  element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>}
                />
                <Route
                  path="/payment/callback"
                  element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>}
                />
                <Route
                  path="/seller/add-product"
                  element={<SellerProtectedRoute><AddProduct /></SellerProtectedRoute>}
                />
                <Route
                  path="/seller/buy-badge"
                  element={<SellerProtectedRoute><BuyBadge /></SellerProtectedRoute>}
                />

                {/* ریدایرکت‌ها */}
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/saved-products" element={<Navigate to="/saved" replace />} />
                <Route path="/dashboard/products" element={<Navigate to="/seller" replace />} />
                <Route path="/products" element={<Navigate to="/search" replace />} />
                <Route path="/wallet" element={<Navigate to="/referral" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SupportProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}