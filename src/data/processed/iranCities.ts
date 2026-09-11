import rawIranCities from "../raw/iranCities.json";
import { IRAN_CITY_COORDS, POPULAR_CITY_SLUGS } from "./iranCityCoords";

export interface IranCity {
  id?: string | number;
  name: string;
  province: string;
  display: string;
  slug?: string;
  lat?: number;
  lng?: number;
  cityEn?: string;
  provinceEn?: string;
}

type AnyRecord = Record<string, any>;

export function normalizeCityText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\u064A/g, "\u06CC")
    .replace(/\u0649/g, "\u06CC")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u0623\u0625]/g, "\u0627")
    .replace(/\u200C/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyFa(value: string): string {
  return normalizeCityText(value)
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .toLowerCase();
}

function coordsFor(cityEn: string, name: string): { lat: number; lng: number } | undefined {
  return (
    IRAN_CITY_COORDS[cityEn] ||
    IRAN_CITY_COORDS[cityEn.replace(/\s+/g, "-")] ||
    Object.entries(IRAN_CITY_COORDS).find(([key]) => key === slugifyFa(name))?.[1]
  );
}

function makeCity(input: AnyRecord, fallbackProvinceFa = "", fallbackProvinceEn = ""): IranCity | null {
  const name = normalizeCityText(input["city-fa"] ?? input.name ?? input.city ?? input.title);
  if (!name) return null;

  const province = normalizeCityText(input["province-fa"] ?? input.province ?? fallbackProvinceFa);
  const cityEn = String(input["city-en"] ?? input.slug ?? "").trim();
  const provinceEn = String(input["province-en"] ?? fallbackProvinceEn ?? "").trim();
  const coords = coordsFor(cityEn, name);

  return {
    name,
    province,
    display: province ? `${name}، ${province}` : name,
    slug: cityEn || slugifyFa(name),
    cityEn: cityEn || undefined,
    provinceEn: provinceEn || undefined,
    lat: coords?.lat,
    lng: coords?.lng,
  };
}

function normalizeIranCities(raw: unknown): IranCity[] {
  const result: IranCity[] = [];

  if (Array.isArray(raw)) {
    for (const provinceItem of raw) {
      if (!provinceItem || typeof provinceItem !== "object") continue;
      const provinceObj = provinceItem as AnyRecord;
      const provinceFa = normalizeCityText(provinceObj["province-fa"] ?? provinceObj.province ?? "");
      const provinceEn = String(provinceObj["province-en"] ?? "").trim();
      const cities = Array.isArray(provinceObj.cities) ? provinceObj.cities : [];

      for (const cityItem of cities) {
        if (!cityItem || typeof cityItem !== "object") continue;
        const city = makeCity(cityItem as AnyRecord, provinceFa, provinceEn);
        if (city) result.push(city);
      }
    }
  }

  const seen = new Set<string>();
  const unique = result.filter((city) => {
    const key = `${city.name}__${city.province}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) =>
    `${a.province} ${a.name}`.localeCompare(`${b.province} ${b.name}`, "fa")
  );
}

export const iranCities: IranCity[] = normalizeIranCities(rawIranCities);

const bySlug = new Map<string, IranCity>();
const byNameProvince = new Map<string, IranCity>();
for (const city of iranCities) {
  if (city.slug) bySlug.set(city.slug, city);
  byNameProvince.set(`${normalizeCityText(city.name)}__${normalizeCityText(city.province)}`, city);
}

export const iranProvinceNames: string[] = Array.from(new Set(iranCities.map((c) => c.province))).sort((a, b) =>
  a.localeCompare(b, "fa")
);

export function citiesInProvince(province: string): IranCity[] {
  const key = normalizeCityText(province);
  return iranCities.filter((city) => normalizeCityText(city.province) === key);
}

export function iranCitiesByProvince(): { province: string; cities: IranCity[] }[] {
  return iranProvinceNames.map((province) => ({
    province,
    cities: citiesInProvince(province),
  }));
}

export const IRAN_CITIES_BY_PROVINCE = iranCitiesByProvince();

export const IRAN_CITY_COUNT = iranCities.length;

export function isTehranCity(name?: string | null): boolean {
  return normalizeCityText(name) === "تهران";
}

export function findIranCity(name: string, province?: string): IranCity | undefined {
  const n = normalizeCityText(name);
  if (!n) return undefined;
  if (province) {
    const exact = byNameProvince.get(`${n}__${normalizeCityText(province)}`);
    if (exact) return exact;
  }
  return iranCities.find((city) => normalizeCityText(city.name) === n);
}

export function getPopularIranCities(): IranCity[] {
  const picked: IranCity[] = [];
  const seen = new Set<string>();
  for (const slug of POPULAR_CITY_SLUGS) {
    const city = bySlug.get(slug);
    if (!city) continue;
    const key = `${city.name}__${city.province}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(city);
  }
  return picked;
}

export function searchIranCities(query: string, limit = 40): IranCity[] {
  const q = normalizeCityText(query);
  if (!q) return getPopularIranCities();
  const starts: IranCity[] = [];
  const includes: IranCity[] = [];
  for (const city of iranCities) {
    const name = normalizeCityText(city.name);
    const province = normalizeCityText(city.province);
    if (name.startsWith(q) || province.startsWith(q)) starts.push(city);
    else if (name.includes(q) || province.includes(q) || (city.cityEn || "").includes(q.toLowerCase())) {
      includes.push(city);
    }
    if (starts.length >= limit) break;
  }
  return [...starts, ...includes].slice(0, limit);
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function findNearestIranCity(lat: number, lng: number): IranCity | null {
  let nearest: IranCity | null = null;
  let min = Infinity;
  for (const city of iranCities) {
    if (typeof city.lat !== "number" || typeof city.lng !== "number") continue;
    const d = haversineKm({ lat, lng }, { lat: city.lat, lng: city.lng });
    if (d < min) {
      min = d;
      nearest = city;
    }
  }
  return nearest;
}

export const DEFAULT_IRAN_CITY: IranCity =
  findIranCity("تهران", "تهران") ?? iranCities[0];

export default iranCities;
