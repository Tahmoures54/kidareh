import React from "react";
import { Lightbulb, type LucideIcon } from "lucide-react";

/** راهنمای کوتاه و دوستانه — برای فروشنده‌های کم‌تجربه */
export function HintCard({
  title,
  children,
  icon: Icon = Lightbulb,
  tone = "amber",
}: {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  tone?: "amber" | "blue" | "green";
}) {
  const tones = {
    amber: "from-amber-50 to-orange-50 border-amber-200/80 text-amber-900 dark:from-amber-950/40 dark:to-orange-950/30 dark:border-amber-800/40 dark:text-amber-100",
    blue: "from-sky-50 to-indigo-50 border-sky-200/80 text-sky-900 dark:from-sky-950/40 dark:to-indigo-950/30 dark:border-sky-800/40 dark:text-sky-100",
    green: "from-emerald-50 to-teal-50 border-emerald-200/80 text-emerald-900 dark:from-emerald-950/40 dark:to-teal-950/30 dark:border-emerald-800/40 dark:text-emerald-100",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-l p-4 ${tones[tone]}`}>
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-black/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 opacity-80" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black mb-1">{title}</p>
          <div className="text-[12px] leading-relaxed font-medium opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default HintCard;
