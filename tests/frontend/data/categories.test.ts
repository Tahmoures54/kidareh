import { describe, expect, it } from "vitest";
import {
  CATEGORY_GROUP_COUNT,
  CATEGORY_TYPE_COUNT,
  categoriesData,
  filterCategoryGroups,
  getCategoryFilterValues,
  getCategoryGroupBySlug,
  getCategoryTextByValue,
  resolveCategoryRef,
  searchCategories,
} from "../../../src/data/processed/categories";
import { getProductCategoryFromStoreCategory } from "../../../src/utils/categoryMapping";

describe("marketplace categories", () => {
  it("covers everyday goods through housing, vehicles, and industrial materials", () => {
    const slugs = categoriesData.map((group) => group.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        "everyday",
        "appliances",
        "home",
        "real-estate",
        "vehicles",
        "digital",
        "fashion",
        "construction",
        "industrial",
        "services",
        "jobs",
      ])
    );
    expect(CATEGORY_GROUP_COUNT).toBeGreaterThanOrEqual(18);
    expect(CATEGORY_TYPE_COUNT).toBeGreaterThanOrEqual(200);
  });

  it("keeps unique group slugs and subcategory values", () => {
    const slugs = categoriesData.map((group) => group.slug);
    const values = categoriesData.flatMap((group) => group.types.map((type) => type.value));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(values).size).toBe(values.length);
  });

  it("finds mobile, car, cement, and housing from Persian search", () => {
    expect(searchCategories("موبایل").some((item) => item.value === "electronics")).toBe(true);
    expect(searchCategories("خودرو").some((item) => item.value === "cars")).toBe(true);
    expect(searchCategories("سیمان").some((item) => item.value === "cement")).toBe(true);
    expect(filterCategoryGroups("مسکن").some((group) => group.slug === "real-estate")).toBe(true);
  });

  it("expands group slugs into filter tokens that match legacy Persian labels", () => {
    const applianceTokens = getCategoryFilterValues("appliances");
    expect(applianceTokens).toEqual(expect.arrayContaining(["home_appliances", "لوازم خانگی"]));
    expect(applianceTokens).not.toContain("خانه");
    expect(applianceTokens).not.toContain("خوراکی");

    const homeTokens = getCategoryFilterValues("home");
    expect(homeTokens).toEqual(expect.arrayContaining(["furniture", "خانه"]));

    const carTokens = getCategoryFilterValues("cars");
    expect(carTokens).toEqual(expect.arrayContaining(["cars", "ماشین"]));
    expect(carTokens).not.toContain("motorcycles");

    const groceryTokens = getCategoryFilterValues("everyday");
    expect(groceryTokens).toEqual(expect.arrayContaining(["food", "خوراکی"]));
  });

  it("resolves slugs before legacy English maps", () => {
    expect(resolveCategoryRef("fashion")?.kind).toBe("group");
    expect(resolveCategoryRef("fashion")?.group.slug).toBe("fashion");
    expect(resolveCategoryRef("clothing")?.type?.value).toBe("clothing");
    expect(getCategoryGroupBySlug("vehicles")?.group).toContain("نقلیه");
    expect(getCategoryTextByValue("home_appliances")).toContain("لوازم");
  });

  it("maps store guild names onto catalog values", () => {
    expect(getProductCategoryFromStoreCategory("پوشاک")).toBe("clothing");
    expect(getProductCategoryFromStoreCategory("لوازم خانگی")).toBe("home_appliances");
    expect(getProductCategoryFromStoreCategory("")).toBe("other");
  });
});
