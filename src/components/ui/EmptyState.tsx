import { Search, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ComponentType<any>;
}

export default function EmptyState({ 
  title, 
  description, 
  action,
  icon: Icon = Search 
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {/* Icon */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-4 shadow-sm"
      >
        <Icon className="w-8 h-8 text-gray-400" />
      </motion.div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-6 max-w-xs leading-relaxed">
        {description}
      </p>

      {/* Action Button */}
      {action && (
        <motion.button
          onClick={action.onClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-shadow inline-flex items-center gap-2 group"
        >
          {action.label}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      )}
    </motion.div>
  );
}