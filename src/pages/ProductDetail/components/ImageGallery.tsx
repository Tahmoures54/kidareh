import React, { memo, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const FALLBACK = "https://placehold.co/800x800/1e293b/94a3b8?text=No+Image";
const SPRING_TRANSITION = { type: "spring", stiffness: 300, damping: 25 };

interface GalleryProps {
  images: string[];
  index: number;
  name: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const GalleryModal = memo(({ images, index, name, onClose, onPrev, onNext }: GalleryProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center touch-none" onClick={onClose}>
      <button onClick={onClose} className="absolute top-[max(24px,env(safe-area-inset-top))] right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white z-10 hover:bg-white/20 transition">
        <X className="w-6 h-6" />
      </button>
      <motion.img key={index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_TRANSITION} src={images[index]} alt={name} className="max-w-full max-h-[80vh] object-contain" onClick={e => e.stopPropagation()} onError={e => (e.currentTarget as HTMLImageElement).src = FALLBACK} />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 border border-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md">
            <ChevronRight className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 border border-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="absolute bottom-[max(32px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-white/10 border border-white/10 text-white text-xs font-black px-4 py-2 rounded-full backdrop-blur-md tracking-widest">
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </motion.div>
  );
});

export const ImageCarousel = memo(({ images, name, imgIndex, setImgIndex, setGalleryOpen }: any) => {
  return (
    <div className="relative h-[50vh] bg-[var(--bg-tertiary)] overflow-hidden cursor-pointer" onClick={() => setGalleryOpen(true)}>
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />
      
      <div className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar" onScroll={e => setImgIndex(Math.round((e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}>
        {images.map((img: string, i: number) => (
          <img key={i} src={img} alt={name} className="w-full h-full object-cover snap-center flex-shrink-0" loading={i === 0 ? "eager" : "lazy"} onError={e => (e.currentTarget as HTMLImageElement).src = FALLBACK} />
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 backdrop-blur-md px-3 py-2 rounded-full">
          {images.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === imgIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
});