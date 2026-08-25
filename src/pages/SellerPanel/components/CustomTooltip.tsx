// src/pages/SellerPanel/components/CustomTooltip.tsx
import React from "react";
import { Eye } from "lucide-react";

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

export const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-secondary)]/95 backdrop-blur-md text-[var(--text-primary)] px-3.5 py-2.5 rounded-2xl shadow-xl text-xs font-bold border border-[var(--border-light)]">
        <p className="mb-1 text-[var(--text-muted)]">{label}</p>
        <p className="text-[var(--brand-primary)] flex items-center gap-1.5 font-black">
          <Eye className="w-3.5 h-3.5" /> {payload[0].value} ÈÇÒÏíÏ
        </p>
      </div>
    );
  }
  return null;
};