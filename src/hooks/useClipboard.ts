// src/hooks/useClipboard.ts
import { useState, useCallback } from 'react';

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return { copy, copied };
}