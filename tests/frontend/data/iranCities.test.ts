import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_IRAN_CITY,
  IRAN_CITIES_BY_PROVINCE,
  IRAN_CITY_COUNT,
  citiesInProvince,
  findIranCity,
  findNearestIranCity,
  getPopularIranCities,
  iranCities,
  iranProvinceNames,
  isTehranCity,
  normalizeCityText,
  searchIranCities,
} from "../../../src/data/processed/iranCities";
import { POPULAR_CITY_SLUGS } from "../../../src/data/processed/iranCityCoords";
import {
  APP_CITY_KEY,
  LEGACY_CITY_KEY,
  readAppLocation,
  saveIranCity,
  writeAppLocation,
} from "../../../src/hooks/useAppLocation";

describe("iranCities dataset", () => {
  it("loads all Iranian provinces and a full city list", () => {
    expect(iranProvinceNames.length).toBe(31);
    expect(IRAN_CITIES_BY_PROVINCE).toHaveLength(31);
    expect(IRAN_CITY_COUNT).toBeGreaterThan(1000);
    expect(iranCities.length).toBe(IRAN_CITY_COUNT);
  });

  it("keeps Tehran as the default city", () => {
    expect(DEFAULT_IRAN_CITY.name).toBe("تهران");
    expect(DEFAULT_IRAN_CITY.province).toBe("تهران");
    expect(isTehranCity("تهران")).toBe(true);
    expect(isTehranCity("مشهد")).toBe(false);
  });

  it("finds major cities across provinces", () => {
    expect(findIranCity("مشهد")?.province).toBe("خراسان رضوی");
    expect(findIranCity("شیراز")?.province).toBe("فارس");
    expect(findIranCity("تبریز")?.province).toBe("آذربایجان شرقی");
    expect(findIranCity("اهواز")?.province).toBe("خوزستان");
    expect(findIranCity("کرج")?.province).toBe("البرز");
    expect(findIranCity("ارومیه")?.slug).toBe("urmia");
  });

  it("groups Tehran-province cities and searches by prefix", () => {
    const tehranCities = citiesInProvince("تهران");
    expect(tehranCities.some((city) => city.name === "تهران")).toBe(true);
    expect(tehranCities.some((city) => city.name === "اسلامشهر")).toBe(true);
    expect(searchIranCities("مشه").some((city) => city.name === "مشهد")).toBe(true);
    expect(searchIranCities("shiraz").some((city) => city.slug === "shiraz")).toBe(true);
  });

  it("resolves every popular city slug", () => {
    const popular = getPopularIranCities();
    expect(popular.length).toBe(POPULAR_CITY_SLUGS.length);
    expect(popular.map((city) => city.name)).toEqual(
      expect.arrayContaining(["تهران", "مشهد", "شیراز", "اصفهان", "تبریز", "کرج"])
    );
  });

  it("normalizes Arabic Yeh and finds the nearest mapped city", () => {
    expect(normalizeCityText("تهران")).toBe("تهران");
    expect(findIranCity("تهران")?.name).toBe("تهران");
    const nearMashhad = findNearestIranCity(36.26, 59.61);
    expect(nearMashhad?.name).toBe("مشهد");
    const nearShiraz = findNearestIranCity(29.59, 52.58);
    expect(nearShiraz?.name).toBe("شیراز");
  });
});

describe("app city persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Tehran and stores a selected city for feed/search", () => {
    expect(readAppLocation().city).toBe("تهران");
    const mashhad = findIranCity("مشهد");
    expect(mashhad).toBeTruthy();
    saveIranCity(mashhad!);
    const stored = readAppLocation();
    expect(stored.city).toBe("مشهد");
    expect(stored.province).toBe("خراسان رضوی");
    expect(JSON.parse(localStorage.getItem(APP_CITY_KEY) || "{}").city).toBe("مشهد");
    expect(JSON.parse(localStorage.getItem(LEGACY_CITY_KEY) || "{}").city).toBe("مشهد");
    expect(JSON.parse(localStorage.getItem("kidareh_presence_origin_v1") || "{}").label).toContain("مشهد");
  });

  it("keeps a Tehran neighborhood when rewriting Tehran", () => {
    localStorage.setItem(
      "kidareh_presence_origin_v1",
      JSON.stringify({ lat: 35.8, lng: 51.43, label: "تجریش، تهران", neighborhoodId: "tajrish" })
    );
    const tehran = findIranCity("تهران", "تهران");
    writeAppLocation({
      city: tehran!.name,
      province: tehran!.province,
      display: tehran!.display,
      slug: tehran!.slug,
      lat: tehran!.lat ?? 35.68,
      lng: tehran!.lng ?? 51.38,
      source: "manual",
    });
    const origin = JSON.parse(localStorage.getItem("kidareh_presence_origin_v1") || "{}");
    expect(origin.neighborhoodId).toBe("tajrish");
    expect(origin.label).toContain("تجریش");
  });
});
