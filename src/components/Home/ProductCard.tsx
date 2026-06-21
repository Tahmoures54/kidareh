import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Heart, Share2, Store, MapPin, ShoppingBag } from "lucide-react";
import { getBadgeStyle, formatPrice, truncateText } from "../../utils";
import type { Product } from "../../hooks/useProducts";

interface ProductCardProps {
  product: Product;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: «›“Êœ‰ »Â ⁄·«ﬁÂù„‰œÌùÂ«
    console.log("Like:", product.id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} - ${formatPrice(product.price)}  Ê„«‰`,
          url: `/product/${product.id}`
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: òÅÌ ·Ì‰ò
      navigator.clipboard.writeText(`${window.location.origin}/product/${product.id}`);
      alert("·Ì‰ò òÅÌ ‘œ!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        to={`/product/${product.id}`}
        className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 active:scale-[0.97] group"
      >
        {/*  ’ÊÌ— „Õ’Ê· */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3C/svg%3E";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <ShoppingBag className="w-16 h-16 text-gray-300" />
            </div>
          )}
          
          {/* »Ã */}
          {product.badge && (
            <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-md backdrop-blur-sm ${getBadgeStyle(product.badge)}`}>
              {product.badge}
            </div>
          )}

          {/* œò„ÂùÂ«Ì ”—Ì⁄ */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleLike}
              className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all active:scale-95"
              aria-label="«›“Êœ‰ »Â ⁄·«ﬁÂù„‰œÌùÂ«"
            >
              <Heart className="w-4 h-4 text-rose-500" />
            </button>
            <button
              onClick={handleShare}
              className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all active:scale-95"
              aria-label="«‘ —«òùê–«—Ì"
            >
              <Share2 className="w-4 h-4 text-blue-500" />
            </button>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* «ÿ·«⁄«  „Õ’Ê· */}
        <div className="p-3.5">
          <h4 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2 leading-snug min-h-[2.5rem]">
            {truncateText(product.name, 50)}
          </h4>
          
          {/* ‰«„ ›—Ê‘ê«Â */}
          {product.store_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
              <Store className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{product.store_name}</span>
            </div>
          )}

          {/* ‘Â— */}
          {product.city && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-3">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{product.city}</span>
            </div>
          )}

          {/* ﬁÌ„  Ê Ê÷⁄Ì  */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 mb-0.5">ﬁÌ„ </span>
              <span className="text-base font-black text-teal-600">
                {product.price ? `${formatPrice(product.price)}  Ê„«‰` : ' Ê«›ﬁÌ'}
              </span>
            </div>
            
            {product.status && (
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                product.status === '„ÊÃÊœ' 
                  ? 'bg-green-100 text-green-700' 
                  : product.status === '›ﬁÿ ? ⁄œœ'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {product.status}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}