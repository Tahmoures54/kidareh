import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, Store, MapPin, ChevronLeft, CheckCircle2, ShoppingBag, 
  Megaphone, Camera, Image as ImageIcon, X, UploadCloud, LogOut, 
  Check, ArrowRight, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { categoriesData } from '../data/categories';
import { compressImage } from '../utils/imageCompression';
import { iranCities } from '../data/iranCities';

// نقشه
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// تنظیم آیکون پیش‌فرض
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }: { position: any, setPosition: any }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function CompleteProfile() {
  const { user, updateProfile, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'buyer' | 'seller' | 'marketer'>('buyer');

  const [name, setName] = useState('');
  // فروشنده
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasBusinessLicense, setHasBusinessLicense] = useState(false);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // استان و شهر
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [referralCode, setReferralCode] = useState('');

  // لیست شهرهای استان انتخاب‌شده
  const citiesOfProvince = selectedProvince
    ? iranCities.find((p) => p.province === selectedProvince)?.cities || []
    : [];

  // وقتی استان عوض شد، شهر را ریست کن
  useEffect(() => {
    setSelectedCity('');
  }, [selectedProvince]);

  const handleConfirmLocation = () => {
    if (!storeLocation) {
      alert("لطفا یک نقطه روی نقشه انتخاب کنید.");
      return;
    }
    setShowMap(false);
  };

  useEffect(() => {
    if (showMap && !storeLocation && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setStoreLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {
        setStoreLocation({ lat: 35.6892, lng: 51.3890 });
      });
    }
  }, [showMap]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  const handleRoleSelect = (selectedRole: 'buyer' | 'seller' | 'marketer') => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleLogout = async () => {
    if (window.confirm('آیا از خروج اطمینان دارید؟')) {
      await logout();
      navigate('/login');
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری انتخاب کنید.');
      return;
    }
    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file, 400, 400, 0.7);
      setStoreImage(compressedBase64);
    } catch (error) {
      alert('خطا در بهینه‌سازی تصویر.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    setStoreImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'seller') {
      if (!storeName.trim() || !storeCategory || !address.trim() || !storeLocation) {
        alert('لطفاً تمام فیلدهای ستاره‌دار را پر کنید و موقعیت خود را روی نقشه مشخص کنید.');
        return;
      }
      if (!selectedProvince || !selectedCity) {
        alert('لطفاً استان و شهر خود را انتخاب کنید.');
        return;
      }
    } else {
      if (!name.trim()) {
        alert('لطفاً نام و نام خانوادگی خود را وارد کنید.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (role === 'buyer' || role === 'marketer') {
        await updateProfile({ role, name });
        navigate(role === 'marketer' ? '/wallet' : '/');
      } else {
        await updateProfile({
          role: 'seller',
          name: storeName,
          store_name: storeName,
          store_category: storeCategory,
          store_image: storeImage || undefined,
          address,
          lat: storeLocation?.lat,
          lng: storeLocation?.lng,
          city: selectedCity,
          province: selectedProvince,
        });
        alert('فروشگاه شما با موفقیت ساخته شد!');
        navigate('/seller');
      }
    } catch (error: any) {
      alert(error.message || 'خطا در ثبت اطلاعات');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full"
        />
        <p className="mt-4 text-gray-600 text-sm font-bold">درحال بررسی وضعیت...</p>
      </div>
    );
  }

  if (showMap) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col" dir="rtl">
        <div className="bg-white px-4 py-4 shadow-sm flex items-center justify-between relative z-10 border-b">
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" /> انتخاب روی نقشه
          </h2>
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMap(false)} 
            className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 border border-gray-100"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
        <div className="flex-1 relative z-0">
          <MapContainer 
            center={storeLocation || [35.6892, 51.3890]} 
            zoom={14} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker position={storeLocation} setPosition={setStoreLocation} />
          </MapContainer>
          
          <div className="absolute bottom-6 left-0 right-0 px-4 z-[1000]">
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white flex flex-col gap-3">
              <p className="text-xs font-bold text-gray-700 text-center">نقشه را حرکت دهید و روی مکان دقیق فروشگاه خود ضربه بزنید 📍</p>
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleConfirmLocation}
                disabled={!storeLocation}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black rounded-xl shadow-lg disabled:bg-gray-300 transition-all"
              >
                تایید این مکان
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-gray-50 via-white to-teal-50/20 flex flex-col items-center py-10 px-4 font-sans relative overflow-hidden" dir="rtl">
      {/* نورهای تزئینی */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-200/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-teal-500/10 border border-white/60 p-6 relative overflow-hidden mt-4"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100">
          <motion.div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
            initial={{ width: '50%' }}
            animate={{ width: step === 1 ? '50%' : '100%' }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>

        <div className="mt-4 mb-8 flex flex-col items-center relative">
          <motion.button
            whileHover={{ scale: 1.08, rotate: -5 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleLogout}
            className="absolute -top-2 left-0 w-9 h-9 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-all border border-red-200 hover:border-red-500"
            title="خروج از حساب"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
          
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30 transform mb-4 border border-white/20"
          >
            <User className="w-8 h-8 text-white" />
          </motion.div>
          
          <h1 className="text-2xl font-black text-gray-900 mb-1">تکمیل پروفایل</h1>
          <p className="text-gray-500 text-xs font-bold text-center">
            {step === 1 ? 'کدام یک از نقش‌های زیر مناسب شماست؟' : 'اطلاعات خواسته شده را بادقت وارد کنید'}
          </p>
        </div>

        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            {/* خریدار */}
            <motion.button 
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleRoleSelect('buyer')} 
              className="w-full flex items-center p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-teal-400 hover:bg-teal-50/30 transition-all group text-right shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center shrink-0 ml-4 group-hover:from-teal-500 group-hover:to-cyan-500 transition-all border border-teal-200/50">
                <ShoppingBag className="w-6 h-6 text-teal-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-900 mb-0.5 text-sm">خریدار هستم</h3>
                <p className="text-[10px] text-gray-500 font-medium">کالاها و فروشگاه‌های اطراف را جستجو می‌کنم.</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-teal-600 transition-colors" />
            </motion.button>

            {/* فروشنده */}
            <motion.button 
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleRoleSelect('seller')} 
              className="w-full flex items-center p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-amber-400 hover:bg-amber-50/30 transition-all group text-right shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl flex items-center justify-center shrink-0 ml-4 group-hover:from-amber-500 group-hover:to-yellow-500 transition-all border border-amber-200/50">
                <Store className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-900 mb-0.5 text-sm">فروشگاه دارم</h3>
                <p className="text-[10px] text-gray-500 font-medium">می‌خواهم کالاها و خدماتم را رایگان ثبت کنم.</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-amber-600 transition-colors" />
            </motion.button>

            {/* بازاریاب */}
            <motion.button 
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleRoleSelect('marketer')} 
              className="w-full flex items-center p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group text-right shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center shrink-0 ml-4 group-hover:from-emerald-500 group-hover:to-green-500 transition-all border border-emerald-200/50">
                <Megaphone className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-900 mb-0.5 text-sm">بازاریاب (رفرال)</h3>
                <p className="text-[10px] text-gray-500 font-medium">از طریق معرفی فروشندگان درآمد کسب می‌کنم.</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
            </motion.button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.form 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSubmit} 
            className="space-y-4"
          >
            {role === 'buyer' || role === 'marketer' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="مثال: محمد امینی" 
                      className="w-full pl-4 pr-10 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm shadow-sm hover:border-gray-300 transition-all" 
                    />
                    <User className="absolute right-3 top-4 w-4.5 h-4.5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* آپلود لوگو */}
                <div className="flex flex-col items-center gap-2 p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border-2 border-gray-200 overflow-hidden shadow-sm">
                      {isCompressing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full"
                        />
                      ) : storeImage ? (
                        <img src={storeImage} alt="Store" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-gray-300" />
                      )}
                    </div>
                    {storeImage && !isCompressing && (
                      <motion.button 
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        type="button" 
                        onClick={handleRemoveImage} 
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </motion.button>
                    )}
                  </div>
                  <p className="text-xs font-bold text-gray-600">لوگوی فروشگاه (اختیاری)</p>
                  <div className="flex gap-2 w-full mt-1">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button" 
                      onClick={() => cameraInputRef.current?.click()} 
                      className="flex-1 text-xs font-bold bg-white text-teal-700 py-2.5 rounded-lg flex justify-center items-center gap-1.5 border-2 border-teal-200 hover:bg-teal-50"
                    >
                      <Camera className="w-4 h-4" />دوربین
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="flex-1 text-xs font-bold bg-white border-2 border-gray-200 text-gray-700 py-2.5 rounded-lg flex justify-center items-center gap-1.5 hover:bg-gray-50"
                    >
                      <UploadCloud className="w-4 h-4" />گالری
                    </motion.button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">نام فروشگاه/خدمات <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={storeName} 
                      onChange={(e) => setStoreName(e.target.value)} 
                      placeholder="مثال: موبایل رضا" 
                      className="w-full pl-4 pr-10 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm shadow-sm hover:border-gray-300 transition-all" 
                    />
                    <Store className="absolute right-3 top-4 w-4.5 h-4.5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">صنف فعالیت <span className="text-red-500">*</span></label>
                  <select 
                    value={storeCategory} 
                    onChange={(e) => setStoreCategory(e.target.value)} 
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm text-gray-700 appearance-none shadow-sm font-medium hover:border-gray-300 transition-all"
                  >
                    <option value="" disabled>انتخاب صنف...</option>
                    {categoriesData.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.types.map((type) => (
                          <option key={type.value} value={type.value}>{type.text}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* استان و شهر */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">استان <span className="text-red-500">*</span></label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm text-gray-700 appearance-none shadow-sm font-medium hover:border-gray-300 transition-all"
                    >
                      <option value="">انتخاب...</option>
                      {iranCities.map((p) => (
                        <option key={p.province} value={p.province}>{p.province}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">شهر <span className="text-red-500">*</span></label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm text-gray-700 appearance-none shadow-sm font-medium hover:border-gray-300 transition-all"
                      disabled={!selectedProvince}
                    >
                      <option value="">انتخاب...</option>
                      {citiesOfProvince.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">آدرس متنی <span className="text-red-500">*</span></label>
                  <textarea 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="استان، شهر، خیابان، پلاک..." 
                    rows={2} 
                    className="w-full p-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm shadow-sm resize-none hover:border-gray-300 transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">لوکیشن روی نقشه <span className="text-red-500">*</span></label>
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button" 
                    onClick={() => setShowMap(true)} 
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-sm font-bold shadow-sm transition-all border-2 ${
                      storeLocation 
                        ? 'bg-green-50 border-green-300 text-green-700' 
                        : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      {storeLocation ? 'مکان ثبت شد (تغییر)' : 'مشخص کردن روی نقشه'}
                    </span>
                    {storeLocation && <Check className="w-5 h-5" />}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Referral Code */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">کد معرف (اختیاری)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={referralCode} 
                  onChange={(e) => setReferralCode(e.target.value)} 
                  placeholder="مثال: KD-1234" 
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm shadow-sm hover:border-gray-300 transition-all text-left font-mono" 
                  dir="ltr" 
                />
              </div>
            </div>

            <div className="pt-4 flex gap-2 border-t border-gray-100">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button" 
                onClick={() => setStep(1)} 
                className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors border border-gray-200"
              >
                بازگشت
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit" 
                disabled={isSubmitting} 
                className="flex-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white py-3.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-teal-500/30 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center shadow-md"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'تایید نهایی و ورود'
                )}
              </motion.button>
            </div>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}