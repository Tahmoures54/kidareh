import { SearchFilters } from "./types";

export const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export const formatDistance = (meters?: number) => {
  if (!meters || !Number.isFinite(meters)) return "نامشخص";
  if (meters < 1000) return `${Math.round(meters).toLocaleString("fa-IR")} متر`;
  return `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

export const calculateDistanceMeters = (lat1?: number, lng1?: number, lat2?: number, lng2?: number) => {
  if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) return undefined;
  const R = 6371e3;
  const φ1 = deg2rad(lat1);
  const φ2 = deg2rad(lat2);
  const Δφ = deg2rad(lat2 - lat1);
  const Δλ = deg2rad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const getActiveFilterCount = (filters: SearchFilters) => {
  let count = 0;
  if (filters.minPrice) count++;
  if (filters.maxPrice) count++;
  if (filters.selectedRadius !== "all") count++;
  if (filters.onlyAvailable) count++;
  if (filters.sortBy !== "newest") count++;
  // scope را حساب نمی‌کنیم چون همیشه مقدار دارد
  return count;
};