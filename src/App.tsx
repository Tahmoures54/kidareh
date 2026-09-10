import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { Loader2, AlertTriangle, Home as HomeIcon } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { SupportProvider } from "./context/SupportContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
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
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const OnboardingFlow = lazy(() => import("./pages/Onboarding"));
const Reservations = lazy(() => import("./pages/Reservations"));
function PageLoader(){return <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 gap-3" dir="rtl"><div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg"><Loader2 className="w-6 h-6 text-white animate-spin"/></div><p className="text-xs font-bold text-gray-400">یه لحظه صبر کن…</p></div>}
function ScrollToTop(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo({top:0,behavior:"auto"})},[pathname]);return null}
function NotFound(){return <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6 text-center" dir="rtl"><AlertTriangle className="w-10 h-10 text-red-400 mb-4"/><h1 className="text-2xl font-black mb-2">این صفحه پیدا نشد</h1><p className="text-sm text-gray-500 mb-8">آدرس اشتباهه یا صفحه جابه‌جا شده.</p><Link to="/" className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold"><HomeIcon className="w-4 h-4"/>بازگشت به خانه</Link></div>}
function ProtectedRoute({children}:{children:React.ReactNode}){const location=useLocation();const {isAuthenticated,loading,refreshing}=useAuth();if(loading||refreshing)return <PageLoader/>;return isAuthenticated?<>{children}</>:<Navigate to="/login" replace state={{from:location.pathname}}/>}
function SellerProtectedRoute({children}:{children:React.ReactNode}){const location=useLocation();const {isAuthenticated,isSeller,loading,refreshing}=useAuth();if(loading||refreshing)return <PageLoader/>;if(!isAuthenticated)return <Navigate to="/login" replace state={{from:location.pathname}}/>;return isSeller?<>{children}</>:<Navigate to="/become-seller" replace state={{from:location.pathname}}/>}
function AdminProtectedRoute({children}:{children:React.ReactNode}){const {isAuthenticated,isAdmin,loading,refreshing}=useAuth();if(loading||refreshing)return <PageLoader/>;if(!isAuthenticated)return <Navigate to="/login" replace/>;return isAdmin?<>{children}</>:<Navigate to="/" replace/>}
function GuestRoute({children}:{children:React.ReactNode}){const {isAuthenticated,loading,refreshing}=useAuth();if(loading||refreshing)return <PageLoader/>;return isAuthenticated?<Navigate to="/" replace/>:<>{children}</>}
export default function App(){return <AuthProvider><SettingsProvider><SupportProvider><BrowserRouter><ScrollToTop/><Suspense fallback={<PageLoader/>}><Routes><Route path="/" element={<Layout/>}><Route index element={<Home/>}/><Route path="search" element={<Search/>}/><Route path="categories" element={<Categories/>}/><Route path="categories/:slug" element={<Categories/>}/><Route path="stores" element={<Stores/>}/><Route path="support" element={<SupportPage/>}/><Route path="terms" element={<TermsAndGuidePage/>}/><Route path="privacy" element={<Privacy/>}/><Route path="ai" element={<AIPage/>}/><Route path="messages" element={<Messages/>}/><Route path="reservations" element={<ProtectedRoute><Reservations/></ProtectedRoute>}/><Route path="profile" element={<ProtectedRoute><Profile/></ProtectedRoute>}/><Route path="complete-profile" element={<ProtectedRoute><CompleteProfile/></ProtectedRoute>}/><Route path="saved" element={<ProtectedRoute><Saved/></ProtectedRoute>}/><Route path="referral" element={<ProtectedRoute><ReferralPage/></ProtectedRoute>}/><Route path="become-seller" element={<ProtectedRoute><BecomeSeller/></ProtectedRoute>}/><Route path="seller" element={<SellerProtectedRoute><SellerPanel/></SellerProtectedRoute>}/><Route path="dashboard" element={<SellerProtectedRoute><SellerPanel/></SellerProtectedRoute>}/><Route path="add-product" element={<SellerProtectedRoute><AddProduct/></SellerProtectedRoute>}/><Route path="buy-badge" element={<SellerProtectedRoute><BuyBadge/></SellerProtectedRoute>}/><Route path="admin" element={<AdminProtectedRoute><AdminPanel/></AdminProtectedRoute>}/><Route path="admin/stats" element={<AdminProtectedRoute><AdminPanel/></AdminProtectedRoute>}/></Route><Route path="/login" element={<GuestRoute><Login/></GuestRoute>}/><Route path="/onboarding" element={<GuestRoute><OnboardingFlow/></GuestRoute>}/><Route path="/product/:id" element={<ProductDetail/>}/><Route path="/products/:id" element={<ProductDetail/>}/><Route path="/store/:id" element={<StoreDetail/>}/><Route path="/stores/:id" element={<StoreDetail/>}/><Route path="/chat/:id" element={<ProtectedRoute><ChatRoom/></ProtectedRoute>}/><Route path="/chat/:conversationId/:userId" element={<ProtectedRoute><ChatRoom/></ProtectedRoute>}/><Route path="/payment-callback" element={<ProtectedRoute><PaymentCallback/></ProtectedRoute>}/><Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback/></ProtectedRoute>}/><Route path="/seller/add-product" element={<SellerProtectedRoute><AddProduct/></SellerProtectedRoute>}/><Route path="/seller/buy-badge" element={<SellerProtectedRoute><BuyBadge/></SellerProtectedRoute>}/><Route path="/home" element={<Navigate to="/" replace/>}/><Route path="/saved-products" element={<Navigate to="/saved" replace/>}/><Route path="/dashboard/products" element={<Navigate to="/seller" replace/>}/><Route path="/products" element={<Navigate to="/search" replace/>}/><Route path="/wallet" element={<Navigate to="/referral" replace/>}/><Route path="*" element={<NotFound/>}/></Routes></Suspense></BrowserRouter></SupportProvider></SettingsProvider></AuthProvider>}
