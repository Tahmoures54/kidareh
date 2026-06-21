import { Store } from "lucide-react";

const stores = [
  { id: 1, name: "فروشگاه موبایل پارس", city: "تهران", category: "موبایل" },
  { id: 2, name: "لوازم خانگی آریا", city: "اصفهان", category: "لوازم خانگی" },
  { id: 3, name: "خودرو سنتر", city: "شیراز", category: "خودرو" },
  { id: 4, name: "گالری مبل مدرن", city: "تهران", category: "مبلمان" },
];

export default function Stores() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-6 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">فروشگاه‌ها</h1>
            <p className="text-sm text-gray-500">فروشندگان فعال در کی‌دارم</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{store.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{store.city}</p>
                </div>
                <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  {store.category}
                </span>
              </div>
              <button className="mt-4 text-sm w-full bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-2.5 rounded-xl font-bold">
                مشاهده فروشگاه
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}