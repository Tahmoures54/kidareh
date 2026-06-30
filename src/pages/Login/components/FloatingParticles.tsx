import React, { memo } from "react";
import { motion } from "framer-motion"; // اگر پکیج شما motion/react است، اصلاح کنید

const FloatingParticles = memo(() => {
  const particles = [
    { initial: { x: 0, y: 0 }, animate: { x: [0, 20, -10, 0], y: [0, -30, 10, 0] }, duration: 12, class: "top-[15%] right-[10%] w-3 h-3 bg-cyan-400/30", delay: 0 },
    { initial: { x: 0, y: 0 }, animate: { x: [0, -15, 15, 0], y: [0, 20, -15, 0] }, duration: 15, class: "bottom-[20%] left-[15%] w-4 h-4 bg-teal-400/20", delay: 2 },
    { initial: { x: 0, y: 0 }, animate: { x: [0, 25, -5, 0], y: [0, 15, -25, 0] }, duration: 18, class: "top-[40%] left-[5%] w-2 h-2 bg-violet-400/30", delay: 1 },
    { initial: { x: 0, y: 0 }, animate: { x: [0, -20, 10, 0], y: [0, -10, 20, 0] }, duration: 14, class: "bottom-[40%] right-[5%] w-3 h-3 bg-cyan-300/20", delay: 3 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={p.initial}
          animate={p.animate}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          className={`absolute rounded-full blur-sm ${p.class}`}
        />
      ))}
    </div>
  );
});

export default FloatingParticles;