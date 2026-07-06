export const FALLBACK = "https://placehold.co/400x400/1e293b/94a3b8?text=No+Image";

export const SPRING_TRANSITION = { 
  type: "spring", 
  stiffness: 300, 
  damping: 25 
} as const;

export const SUGGESTED_TERMS = [
  "آیفون",
  "لپ‌تاپ", 
  "دوچرخه",
  "یخچال",
  "مبل",
  "کفش",
  "ماشین لباسشویی",
  "تلویزیون",
];

export const SORT_OPTIONS = [
  { key: "newest", label: "جدیدترین" },
  { key: "nearest", label: "نزدیک‌ترین" },
  { key: "cheapest", label: "ارزان‌ترین" },
] as const;

export const RADIUS_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "1", label: "۱ کیلومتر" },
  { value: "3", label: "۳ کیلومتر" },
  { value: "5", label: "۵ کیلومتر" },
  { value: "10", label: "۱۰ کیلومتر" },
  { value: "20", label: "۲۰ کیلومتر" },
] as const;
