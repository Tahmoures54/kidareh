import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  action?: { label: string; onClick: () => void };
  className?: string;
  actionVariant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
}

/** وضعیت خالی با لحن دوستانه */
export default function EmptyState({
  title,
  description,
  icon: Icon = Search,
  action,
  className = "",
  actionVariant = "primary",
  children,
}: EmptyStateProps) {
  const actionStyles = {
    primary: "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-teal-500/40",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200",
    ghost: "text-teal-600 hover:bg-teal-50 border border-teal-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="w-16 h-16 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/30 rounded-full flex items-center justify-center mb-4 border border-teal-100 dark:border-teal-900"
      >
        <Icon className="w-8 h-8 text-teal-500" />
      </motion.div>

      <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">{description}</p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2 transition-all active:scale-95 ${actionStyles[actionVariant]}`}
        >
          {action.label}
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
      )}

      {children}
    </motion.div>
  );
}
