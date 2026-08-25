// src/data/processed/iranCities.ts
import rawIranCities from "../raw/iranCities.json";

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

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\u064A/g, "\u06CC")
    .replace(/\u0649/g, "\u06CC")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u0623\u0625]/g, "\u0627")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyFa(value: string): string {
  return normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .toLowerCase();
}

function makeCity(input: AnyRecord, fallbackProvinceFa = "", fallbackProvinceEn = ""): IranCity | null {
  const name = normalizeText(input["city-fa"] ?? input.name ?? input.city ?? input.title);
  if (!name) return null;

  const province = normalizeText(input["province-fa"] ?? input.province ?? fallbackProvinceFa);
  const cityEn = String(input["city-en"] ?? input.slug ?? "").trim();
  const provinceEn = String(input["province-en"] ?? fallbackProvinceEn ?? "").trim();

  return {
    name,
    province,
    display: province ? `${name}، ${province}` : name,
    slug: cityEn || slugifyFa(name),
    cityEn: cityEn || undefined,
    provinceEn: provinceEn || undefined,
  };
}

function normalizeIranCities(raw: unknown): IranCity[] {
  const result: IranCity[] = [];

  if (Array.isArray(raw)) {
    for (const provinceItem of raw) {
      if (!provinceItem || typeof provinceItem !== "object") continue;
      const provinceObj = provinceItem as AnyRecord;

      const provinceFa = normalizeText(provinceObj["province-fa"] ?? provinceObj.province ?? "");
      const provinceEn = String(provinceObj["province-en"] ?? "").trim();

      const cities = Array.isArray(provinceObj.cities) ? provinceObj.cities : [];

      for (const cityItem of cities) {
        if (!cityItem || typeof cityItem !== "object") continue;
        const city = makeCity(cityItem as AnyRecord, provinceFa, provinceEn);
        if (city) result.push(city);
      }
    }
  }

  // حذف تکراری‌ها بر اساس نام و استان
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

export default iranCities;
