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

import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { SupportProvider } from "./context/SupportContext";

import Layout from "./components/Layout";
import Home from "./pages/Home";

// Lazy-loaded Pages
const Search = lazy(() => import("./pages/Search"));
const SellerPanel = lazy(() => import("./pages/SellerPanel"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const StoreDetail = lazy(() => import("./pages/StoreDetail"));
const Saved = lazy(() => import("./pages/Saved"));
const Messages = lazy(() => import("./pages/Messages"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Login = lazy(() => import("./pages/Login"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const WalletPage = lazy(() => import("./pages/Wallet"));
const SupportPage = lazy(() => import("./pages/Support"));
const TermsPage = lazy(() => import("./pages/Terms"));
const Categories = lazy(() => import("./pages/Categories"));
const BuyBadge = lazy(() => import("./pages/BuyBadge"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Stores = lazy(() => import("./pages/Stores"));           // ← اضافه شد
const AIPage = lazy(() => import("./pages/AI"));               // ← اضافه شد
const Privacy = lazy(() => import("./pages/Privacy"));         // ← اضافه شد

// Loading Component
const PageLoader = () => (
  <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50/80 px-6 text-center backdrop-blur-sm" dir="rtl">
    <Loader2 className="mb-4 h-10 w-10 animate-spin text-teal-600" />
    <p className="animate-pulse text-sm font-medium text-gray-600">در حال بارگذاری...</p>
    <p className="mt-2 text-xs font-bold text-teal-700">ببین کی داره؟ برو بگیر</p>
  </div>
);

// Scroll to top
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
};

// 404 Page
const NotFoundPage = () => (
  <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 p-6 text-center" dir="rtl">
    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-500">
      <AlertTriangle className="h-12 w-12" />
    </div>
    <h1 className="mb-2 text-3xl font-bold text-gray-900">صفحه پیدا نشد!</h1>
    <p className="mb-8 max-w-xs text-gray-500">آدرسی که وارد کرده‌اید معتبر نیست.</p>
    <Link to="/" className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-bold text-white">
      <HomeIcon className="h-5 w-5" /> بازگشت به خانه
    </Link>
  </div>
);

// Auth helpers
const getAuthToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("kidareh_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token")
    : null;

// Protected Route
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  if (!getAuthToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

// Guest Route
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  return getAuthToken() ? <Navigate to="/" replace /> : <>{children}</>;
};

// ==================== APP ====================
export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SupportProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Layout Routes */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="search" element={<Search />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="stores" element={<Stores />} />           {/* ← اضافه شد */}

                  <Route path="saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
                  <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                  <Route path="seller" element={<ProtectedRoute><SellerPanel /></ProtectedRoute>} />
                  <Route path="admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                </Route>

                {/* Auth Routes */}
                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />

                {/* Product & Store */}
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/store/:id" element={<StoreDetail />} />
                <Route path="/stores/:id" element={<StoreDetail />} />

                {/* AI Assistant */}
                <Route path="/ai" element={<ProtectedRoute><AIPage /></ProtectedRoute>} />   {/* ← اضافه شد */}

                {/* Chat */}
                <Route path="/chat/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
                <Route path="/chat/:conversationId/:userId" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />

                {/* Payment */}
                <Route path="/payment-callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
                <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />

                {/* Add Product & Badge */}
                <Route path="/add-product" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
                <Route path="/seller/add-product" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
                <Route path="/buy-badge" element={<ProtectedRoute><BuyBadge /></ProtectedRoute>} />
                <Route path="/seller/buy-badge" element={<ProtectedRoute><BuyBadge /></ProtectedRoute>} />

                {/* Extra Pages */}
                <Route path="/privacy" element={<Privacy />} />           {/* ← اضافه شد */}

                {/* Redirects */}
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/profile" element={<Navigate to="/complete-profile" replace />} />
                <Route path="/saved-products" element={<Navigate to="/saved" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SupportProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}