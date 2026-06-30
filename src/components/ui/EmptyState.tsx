// src/components/ui/EmptyState.tsx
import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Search } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  actionVariant?: "primary" | "secondary" | "ghost";
}

/**
 * کامپوننت برای نمایش وضعیت خالی (Empty State)
 * با animation و طراحی مدرن
 */
export default function EmptyState({
  title,
  description,
  icon: Icon = Search,
  action,
  className = "",
  actionVariant = "primary",
}: EmptyStateProps) {
  const actionStyles = {
    primary:
      "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-teal-500/50",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200",
    ghost: "text-teal-600 hover:bg-teal-50 border border-teal-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {/* Icon with animation */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
        className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-4 shadow-sm"
      >
        <Icon className="w-8 h-8 text-gray-400" />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-lg font-bold text-gray-900 mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-gray-600 mb-6 max-w-xs leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Action Button */}
      {action && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          onClick={action.onClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2 group transition-all ${
            actionStyles[actionVariant]
          }`}
        >
          {action.label}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      )}
    </motion.div>
  );
}