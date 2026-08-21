/**
 * Persian / Arabic text normalization for search & FTS indexing
 */

/** Map Arabic forms → Persian standard forms */
const ARABIC_TO_PERSIAN: Record<string, string> = {
  "\u064A": "\u06CC", // ي → ی
  "\u0643": "\u06A9", // ك → ک
  "\u0629": "\u0647", // ة → ه
  "\u0623": "\u0627", // أ → ا
  "\u0625": "\u0627", // إ → ا
  "\u0622": "\u0627", // آ → ا (simplify for search)
  "\u0671": "\u0627", // ٱ → ا
  "\u0649": "\u06CC", // ى → ی
  "\u06C0": "\u0647", // ۀ → ه
  "\u200C": " ", // ZWNJ → space
  "\u200D": "", // ZWJ remove
  "\u0640": "", // tatweel ـ
};

/** Arabic-Indic digits → ASCII */
const DIGIT_MAP: Record<string, string> = {
  "\u06F0": "0",
  "\u06F1": "1",
  "\u06F2": "2",
  "\u06F3": "3",
  "\u06F4": "4",
  "\u06F5": "5",
  "\u06F6": "6",
  "\u06F7": "7",
  "\u06F8": "8",
  "\u06F9": "9",
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9",
};

/** Remove combining marks (harakat) */
const HARAKAT_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizePersian(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input).normalize("NFC");
  s = s.replace(HARAKAT_RE, "");
  let out = "";
  for (const ch of s) {
    out += ARABIC_TO_PERSIAN[ch] ?? DIGIT_MAP[ch] ?? ch;
  }
  // collapse whitespace, lowercase latin only
  out = out.replace(/\s+/g, " ").trim().toLowerCase();
  return out;
}

/**
 * Build FTS5 MATCH expression from user query.
 * Multi-word → AND of prefix terms: گوشی سامسونگ → "گوشی*" "سامسونگ*"
 * Escapes FTS special chars.
 */
export function buildFtsMatchQuery(raw: string): string | null {
  const norm = normalizePersian(raw);
  if (!norm || norm.length < 1) return null;

  // strip FTS operators the user might type
  const cleaned = norm.replace(/["'^~*():{}]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const terms = cleaned.split(" ").filter((t) => t.length >= 1);
  if (!terms.length) return null;

  // prefix match each term (good for Persian partial words)
  return terms.map((t) => `"${t}"*`).join(" ");
}

/** Safe LIKE pattern from user input */
export function buildLikePattern(raw: string): string {
  const norm = normalizePersian(raw);
  // escape LIKE wildcards
  const escaped = norm.replace(/[%_\\]/g, "\\$&");
  return `%${escaped}%`;
}
