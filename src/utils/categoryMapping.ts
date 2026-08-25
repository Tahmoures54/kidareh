/**
 * Category Mapping Utility
 * Maps store categories (صنف) to product categories
 * This allows automatic category assignment based on store guild
 */

// Type definitions
export type StoreCategoryKey = string;
export type ProductCategory = string;

/**
 * Mapping from store categories (صنف) to product categories
 * Persian guild names map to English product category names
 */
const STORE_TO_PRODUCT_CATEGORY_MAP: Record<StoreCategoryKey, ProductCategory> = {
  // پوشاک و مد (Clothing & Fashion)
  "پوشاک": "Fashion",
  "کفش": "Footwear",
  "کیف و چمدان": "Bags",
  "لباس": "Fashion",
  "لباس مردانه": "Fashion",
  "لباس زنانه": "Fashion",
  "لباس کودک": "Fashion",

  // الکترونیک (Electronics)
  "فروشگاه الکترونیکی": "Electronics",
  "الکترونیک": "Electronics",
  "کامپیوتر": "Computers",
  "تلفن همراه": "Mobile",
  "گوشی": "Mobile",
  "لپ تاپ": "Computers",
  "تبلت": "Tablets",

  // خواربار و مواد غذایی (Grocery & Food)
  "مواد غذایی": "Grocery",
  "خواربار": "Grocery",
  "قصاب": "Meat",
  "گوشت": "Meat",
  "میوه و سبزی": "Vegetables",
  "نانوایی": "Bakery",
  "نان": "Bakery",
  "شیرینی و کیک": "Bakery",
  "قهوه و چای": "Beverages",
  "آشامیدنی": "Beverages",
  "شیر و لبنیات": "Dairy",
  "یخچال فروشی": "Frozen Foods",

  // آرایشی و بهداشتی (Beauty & Personal Care)
  "آرایشی بهداشتی": "Beauty",
  "آرایش": "Beauty",
  "بهداشتی": "Personal Care",
  "آرایشگاه": "Beauty Services",
  "سلون": "Beauty Services",
  "دفاعیات": "Cosmetics",
  "عطاری": "Herbal",

  // خانه و آشپزخانه (Home & Kitchen)
  "لوازم خانگی": "Home",
  "لوازم آشپزخانه": "Kitchen",
  "فروشگاه لوازم خانگی": "Home",
  "مبلمان": "Furniture",
  "مبل": "Furniture",
  "تزیین و دکوراسیون": "Decor",
  "گلفروشی": "Flowers",

  // اسباب و بازی (Toys & Recreation)
  "اسباب بازی": "Toys",
  "بازی": "Toys",
  "کتاب و مجله": "Books",
  "کتابفروشی": "Books",
  "ورزشی": "Sports",
  "لوازم ورزشی": "Sports",

  // خودرو (Automotive)
  "خودرو": "Automotive",
  "لوازم خودرو": "Automotive",
  "تعمیرات خودرو": "Automotive Services",
  "لوازم یدکی": "Automotive",

  // سلامت و پزشکی (Health & Medical)
  "داروخانه": "Pharmacy",
  "دارو": "Pharmacy",
  "پزشکی": "Medical",
  "تجهیزات پزشکی": "Medical",
  "دندانپزشکی": "Medical",

  // سفر و گردشگری (Travel & Tourism)
  "سفر": "Travel",
  "هتل": "Travel",
  "تورعملیاتی": "Travel",

  // اپلیانس (Appliances)
  "لوازم برقی": "Appliances",
  "یخچال": "Appliances",
  "لباسشویی": "Appliances",
  "جاروبرقی": "Appliances",

  // جواهرات و ساعت (Jewelry & Watches)
  "جواهرات": "Jewelry",
  "زیورآلات": "Jewelry",
  "ساعت": "Watches",

  // هنر و فرهنگ (Arts & Culture)
  "گالری": "Art",
  "هنر": "Art",
  "موسیقی": "Music",
  "موسیقی و آلات موسیقی": "Music",

  // دام و حیوانات (Pets & Animals)
  "حیوانات خانگی": "Pets",
  "فروشگاه حیوانات": "Pets",
  "دام": "Livestock",

  // خدمات (Services)
  "خدمات": "Services",
  "تنظیفات": "Services",
  "ایمن‌سازی": "Services",
  "برق کاری": "Services",
  "لوله‌کشی": "Services",
};

/**
 * Get product category from store category (صنف)
 * If exact match not found, tries partial matching
 * Falls back to a default "General" category
 * 
 * @param storeCategory - Store category (صنف) name
 * @returns Product category name
 */
export function getProductCategoryFromStoreCategory(
  storeCategory: string | undefined | null
): ProductCategory {
  if (!storeCategory) {
    return "General";
  }

  // Normalize input
  const normalized = storeCategory.trim();

  // Try exact match first
  if (normalized in STORE_TO_PRODUCT_CATEGORY_MAP) {
    return STORE_TO_PRODUCT_CATEGORY_MAP[normalized];
  }

  // Try case-insensitive match
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, value] of Object.entries(STORE_TO_PRODUCT_CATEGORY_MAP)) {
    if (key.toLowerCase() === lowerNormalized) {
      return value;
    }
  }

  // Try partial match (if store category contains any of the mapping keys)
  for (const [key, value] of Object.entries(STORE_TO_PRODUCT_CATEGORY_MAP)) {
    if (lowerNormalized.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerNormalized)) {
      return value;
    }
  }

  // Default fallback
  return "General";
}

/**
 * Get all available product categories
 * @returns Array of unique product categories
 */
export function getAvailableProductCategories(): ProductCategory[] {
  return [...new Set(Object.values(STORE_TO_PRODUCT_CATEGORY_MAP))];
}

/**
 * Get all store categories
 * @returns Array of store categories
 */
export function getAllStoreCategories(): StoreCategoryKey[] {
  return Object.keys(STORE_TO_PRODUCT_CATEGORY_MAP);
}

export default {
  getProductCategoryFromStoreCategory,
  getAvailableProductCategories,
  getAllStoreCategories,
};
