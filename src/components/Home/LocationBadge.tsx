import { motion } from "motion/react";
import { MapPin, Radio } from "lucide-react";

interface LocationBadgeProps {
  scope: "city" | "province" | "all";
  location: string;
  totalCount: number;
}

export default function LocationBadge({ scope, location, totalCount }: LocationBadgeProps) {
  const getScopeLabel = () => {
    switch (scope) {
      case "all":
        return "سراسر کشور";
      case "province":
        return `استان ${location}`;
      default:
        return `شهر ${location}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-2xl border border-teal-100/50 shadow-sm"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-teal-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-600 font-medium">نمایش در</p>
          <p className="text-sm font-bold text-gray-900 truncate">{getScopeLabel()}</p>
        </div>
      </div>
      
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-teal-700 border border-teal-200 shadow-sm flex-shrink-0 ml-3">
        <Radio className="w-3 h-3" />
        <span className="hidden sm:inline">آنلاین</span>
      </span>

      {totalCount > 0 && (
        <span className="hidden md:inline text-xs font-bold text-gray-600 ml-2">
          {totalCount.toLocaleString('fa-IR')}
        </span>
      )}
    </motion.div>
  );
}