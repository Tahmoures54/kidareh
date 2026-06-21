import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { LayoutGrid } from "lucide-react";

interface Category {
  slug: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryCarouselProps {
  categories: Category[];
  iconMap: Record<string, React.ComponentType<any>>;
}

export default function CategoryCarousel({ categories, iconMap }: CategoryCarouselProps) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory">
      {categories.map((category, index) => {
        const IconComponent = iconMap[category.icon] || LayoutGrid;
        
        return (
          <motion.div
            key={category.slug}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="snap-start flex-shrink-0"
          >
            <Link
              to={`/categories/${category.slug}`}
              className="flex flex-col items-center gap-2.5 group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
                className={`w-16 h-16 ${category.color} rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}
              >
                <IconComponent className="w-7 h-7 text-white" />
              </motion.div>
              <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight w-16 truncate">
                {category.name}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}