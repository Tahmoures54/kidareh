import React, { memo } from "react";
import { Info, Calendar, Package, Navigation, MapPin } from "lucide-react";
import { StoreData, DistInfo } from "../types";

// تابع کمکی برای تبدیل تاریخ میلادی به فارسی
const fa = (dateStr: string): string => {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr; // در صورت نامعتبر بودن، خود رشته را برمی‌گرداند
  }
};

export const AboutTab = memo(
  ({ store, distInfo }: { store: StoreData; distInfo: DistInfo | null }) => {
    type InfoItem = { icon: any; label: string; value: string };
    const infoItems: InfoItem[] = [
      {
        icon: Calendar,
        label: "عضویت",
        value: `عضو از ${fa(store.joined)}`,
      },
      ...(store.category
        ? [{ icon: Package, label: "فعالیت", value: store.category }]
        : []),
      ...(distInfo
        ? [
            {
              icon: Navigation,
              label: "فاصله زمانی",
              value: `حدود ${distInfo.mins} دقیقه`,
            },
          ]
        : []),
    ];

    return (
      <div className="space-y-4 pb-6">
        <div className="bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-light)] p-5 shadow-sm">
          <h3 className="text-sm font-black text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--brand-primary)]" /> معرفی فروشگاه
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            {store.description ||
              `فروشگاه ${store.name} در دسته‌بندی ${
                store.category || "عمومی"
              } فعالیت می‌کند.`}
          </p>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-light)] p-5 space-y-4 shadow-sm">
          {infoItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-xl flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-bold mb-0.5">
                  {item.label}
                </p>
                <p className="text-xs font-black text-[var(--text-primary)]">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
          {store.address && (
            <div className="flex items-start gap-3 pt-2">
              <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-bold mb-0.5">
                  آدرس حضوری {distInfo && `(${distInfo.text})`}
                </p>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed">
                  {store.city && (
                    <span className="text-[var(--brand-primary)]">
                      {store.city}،{" "}
                    </span>
                  )}
                  {store.address}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);