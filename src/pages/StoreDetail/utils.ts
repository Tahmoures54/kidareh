export const FALLBACK_PRODUCT = "https://placehold.co/400x400/1e293b/94a3b8?text=No+Image";

export function fa(n: number | string) { 
  return Number(n || 0).toLocaleString("fa-IR"); 
}

export function calcDist(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371;
  const dL = ((la2 - la1) * Math.PI) / 180;
  const dO = ((lo2 - lo1) * Math.PI) / 180;
  const a = Math.sin(dL / 2) ** 2 + Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fmtDist(km: number) {
  if (km < 1) return `${Math.round(km * 1000).toLocaleString("fa-IR")} متر`;
  return `${km.toFixed(1).replace(".", "٫")} کیلومتر`;
}