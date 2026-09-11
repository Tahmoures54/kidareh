import React, { memo } from "react";
import { motion } from "framer-motion";

const FloatingParticles = memo(() => {
  const particles = [
    { initial: { x: 0, y: 0 }, animate: { x: [0, 20, -10, 0], y: [0, -30, 10, 0] }, duration: 12, className: "top-[15%] right-[10%] h-3 w-3 bg-[var(--accent)]/25", delay: 0 },
    { initial: { x: 0, y: 0 }, animate: { x: [0, -15, 15, 0], y: [0, 20, -15, 0] }, duration: 15, className: "bottom-[20%] left-[15%] h-4 w-4 bg-[var(--gold)]/20", delay: 2 },
    { initial: { x: 0, y: 0 }, animate: { x: [0, 25, -5, 0], y: [0, 15, -25, 0] }, duration: 18, className: "top-[40%] left-[5%] h-2 w-2 bg-[var(--accent)]/20", delay: 1 },
    { initial: { x: 0, y: 0 }, animate: { x: [0, -20, 10, 0], y: [0, -10, 20, 0] }, duration: 14, className: "bottom-[40%] right-[5%] h-3 w-3 bg-[var(--gold)]/15", delay: 3 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={p.initial}
          animate={p.animate}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          className={`absolute rounded-full blur-sm ${p.className}`}
        />
      ))}
    </div>
  );
});

export default FloatingParticles;
