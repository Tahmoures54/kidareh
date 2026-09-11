import React, { useState } from "react";
import { cn } from "../../utils";

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

export default function PresenceImage({ src, alt = "", className }: Props) {
  const [broken, setBroken] = useState(false);
  if (broken || !src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[var(--paper-2)] text-[11px] font-black text-[var(--muted)]",
          className
        )}
      >
        بدون تصویر
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}
