/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// 1. TypeScript Interfaces
// ==========================================
export interface SubCategory {
  value: string;
  text: string;
  icon?: string;
}

export interface CategoryGroup {
  id: string;
  slug: string; // برای URL
  group: string;
  icon: string;
  color: string;
  types: SubCategory[];
  description?: string;
}

// ==========================================
// 2. Categories Data
// ==========================================
export const categoriesData: CategoryGroup[] = [
  {
    id: "digital_goods",
    slug: "digital",
    group: "کالای دیجیتال",
    icon: "Smartphone",
    color: "bg-blue-500 text-blue-50",
    description: "موبایل، لپتاپ و لوازم الکترونیکی",
    types: [
      { value: "electronics", text: "موبایل، تبلت و لوازم جانبی" },
      { value: "laptops", text: "لپ‌تاپ و کامپیوتر" },
      { value: "gaming", text: "کنسول بازی و گجت‌ها" },
      { value: "cameras", text: "دوربین عکاسی و فیلم‌برداری" },
      { value: "audio", text: "صوتی و تصویری (تلویزیون، اسپیکر)" },
      { value: "smart_home", text: "خانه هوشمند" },
      { value: "wearables", text: "ساعت و دستبند هوشمند" }
    ]
  },
  {
    id: "real_estate",
    slug: "real-estate",
    group: "املاک و مستغلات",
    icon: "Building2",
    color: "bg-emerald-500 text-emerald-50",
    description: "خرید، فروش و اجاره ملک",
    types: [
      { value: "property_sales", text: "خرید و فروش آپارتمان" },
      { value: "rent_apartment", text: "رهن و اجاره آپارتمان" },
      { value: "villa_garden", text: "ویلا، باغ و زمین" },
      { value: "commercial_property", text: "مغازه و املاک تجاری" },
      { value: "workspace", text: "دفتر کار و فضای اشتراکی" },
      { value: "land", text: "زمین و کشاورزی" }
    ]
  },
  {
    id: "vehicles",
    slug: "vehicles",
    group: "وسایل نقلیه",
    icon: "Car",
    color: "bg-rose-500 text-rose-50",
    description: "خودرو، موتور و قطعات",
    types: [
      { value: "cars", text: "خودرو سواری" },
      { value: "motorcycles", text: "موتورسیکلت" },
      { value: "bicycles", text: "دوچرخه" },
      { value: "electric_vehicles", text: "خودرو و اسکوتر برقی" },
      { value: "trucks", text: "کامیون و خودروهای سنگین" },
      { value: "agricultural_machinery", text: "ماشین‌آلات کشاورزی" },
      { value: "construction_vehicles", text: "ماشین‌آلات راه‌سازی" },
      { value: "boats", text: "قایق و وسایل آبی" },
      { value: "auto_parts", text: "قطعات یدکی خودرو" },
      { value: "tires_rims", text: "لاستیک و رینگ" },
      { value: "car_accessories", text: "لوازم جانبی و اسپرت خودرو" },
      { value: "trailers", text: "تریلر و یدک‌کش" }
    ]
  },
  {
    id: "home_and_life",
    slug: "home",
    group: "خانه و زندگی",
    icon: "Sofa",
    color: "bg-amber-500 text-amber-50",
    description: "لوازم خانگی و دکوراسیون",
    types: [
      { value: "home_appliances", text: "لوازم برقی خانگی" },
      { value: "furniture", text: "مبلمان و صنایع چوبی" },
      { value: "carpets_rugs", text: "فرش، قالی و موکت" },
      { value: "kitchenware", text: "ظروف و لوازم آشپزخانه" },
      { value: "kitchen_appliances", text: "تجهیزات توکار (هود، سینک، گاز)" },
      { value: "decor", text: "لوازم تزئینی و دکوری" },
      { value: "lighting", text: "لوستر و لوازم روشنایی" },
      { value: "textiles", text: "پارچه، پرده و کالای خواب" },
      { value: "glassware", text: "ظروف شیشه‌ای و بلور" },
      { value: "garden", text: "باغبانی و فضای سبز" }
    ]
  },
  {
    id: "personal_goods",
    slug: "fashion",
    group: "لوازم شخصی و مد",
    icon: "ShoppingBag",
    color: "bg-fuchsia-500 text-fuchsia-50",
    description: "پوشاک، کیف و کفش",
    types: [
      { value: "clothing", text: "پوشاک و لباس" },
      { value: "shoes", text: "کیف و کفش" },
      { value: "health_beauty", text: "آرایشی، بهداشتی و سلامت" },
      { value: "jewelry", text: "زیورآلات، طلا و جواهرات" },
      { value: "watches", text: "ساعت و اکسسوری" },
      { value: "kids", text: "لوازم کودک و سیسمونی" },
      { value: "toys", text: "اسباب‌بازی و سرگرمی" },
      { value: "leather", text: "محصولات چرمی" },
      { value: "stationery", text: "نوشت‌افزار و لوازم اداری" },
      { value: "sunglasses", text: "عینک آفتابی و طبی" }
    ]
  },
  {
    id: "industrial_materials",
    slug: "industrial",
    group: "متریال و تجهیزات صنعتی",
    icon: "Factory",
    color: "bg-slate-600 text-slate-50",
    description: "مواد اولیه و تجهیزات صنعتی",
    types: [
      { value: "steel_alloys", text: "فولاد و آلیاژهای فلزی" },
      { value: "machinery", text: "ماشین‌آلات و خطوط تولید" },
      { value: "piping_materials", text: "اقلام لوله‌کشی (Piping)" },
      { value: "pipes_fittings", text: "لوله و اتصالات (Fittings)" },
      { value: "valves", text: "شیرآلات صنعتی (Valves)" },
      { value: "flanges", text: "فلنج و گسکت (Flanges)" },
      { value: "industrial_chemicals", text: "مواد شیمیایی صنعتی" },
      { value: "polymers_plastics", text: "پلیمرها و پلاستیک‌های صنعتی" },
      { value: "cement_refractories", text: "سیمان نسوز و مواد دیرگداز" },
      { value: "pumps_compressors", text: "پمپ و کمپرسور" },
      { value: "heat_exchangers", text: "مبدل‌های حرارتی" },
      { value: "tanks_vessels", text: "مخازن و مخازن تحت فشار" },
      { value: "welding_consumables", text: "تجهیزات و مواد مصرفی جوشکاری" },
      { value: "corrosion_protection", text: "مواد و پوشش‌های ضدخوردگی" },
      { value: "industrial_insulation", text: "عایق‌های صنعتی" },
      { value: "lubricants", text: "روان‌کننده‌ها و روغن‌های صنعتی" },
      { value: "conveyor_systems", text: "تسمه نقاله و سیستم‌های انتقال" },
      { value: "bearings", text: "بلبرینگ و یاتاقان" },
      { value: "fasteners", text: "پیچ و مهره صنعتی (Fasteners)" },
      { value: "control_systems", text: "سیستم‌های کنترل و اتوماسیون (DCS)" },
      { value: "ndt_materials", text: "مواد و تجهیزات تست غیرمخرب (NDT)" }
    ]
  },
  {
    id: "building_materials",
    slug: "construction",
    group: "مصالح ساختمانی",
    icon: "Hammer",
    color: "bg-orange-500 text-orange-50",
    description: "مصالح و ابزار ساختمانی",
    types: [
      { value: "cement", text: "سیمان، گچ و ملات" },
      { value: "bricks", text: "آجر، سفال و بلوک" },
      { value: "tiles", text: "کاشی و سرامیک" },
      { value: "steel", text: "آهن‌آلات و میلگرد" },
      { value: "profiles_building", text: "پروفیل و قوطی‌های ساختمانی" },
      { value: "wood", text: "چوب و الوار" },
      { value: "stone", text: "سنگ‌های ساختمانی و نما" },
      { value: "sand_gravel", text: "شن، ماسه و پوکه" },
      { value: "doors_windows", text: "درب، پنجره و شیشه" },
      { value: "pipes", text: "لوله و اتصالات ساختمانی" },
      { value: "insulation", text: "عایق‌های حرارتی و رطوبتی ایزوگام" },
      { value: "roofing", text: "پوشش سقف و بام" },
      { value: "paints", text: "رنگ و رزین ساختمانی" },
      { value: "wires_cables", text: "سیم، کابل و تجهیزات الکتریکی" },
      { value: "plumbing", text: "لوله‌کشی و شیرآلات" }
    ]
  },
  {
    id: "services",
    slug: "services",
    group: "خدمات و کسب‌وکار",
    icon: "Briefcase",
    color: "bg-indigo-500 text-indigo-50",
    description: "خدمات حرفه‌ای و تخصصی",
    types: [
      { value: "repairs", text: "تعمیرات لوازم خانگی و دیجیتال" },
      { value: "plumbing", text: "لوله‌کشی و تاسیسات" },
      { value: "electrical", text: "برق‌کاری و خدمات الکتریکی" },
      { value: "cleaning", text: "نظافت و قالیشویی" },
      { value: "transportation", text: "حمل‌ونقل، باربری و اتوبار" },
      { value: "painting", text: "نقاشی و دکوراسیون ساختمان" },
      { value: "carpentry", text: "نجاری و کابینت‌سازی" },
      { value: "welding", text: "جوشکاری و آهنگری" },
      { value: "digital_services", text: "طراحی سایت، برنامه‌نویسی و IT" },
      { value: "advertising", text: "تبلیغات، چاپ و بازاریابی" },
      { value: "legal", text: "خدمات حقوقی و مشاوره" },
      { value: "finance", text: "حسابداری، مالی و بیمه" },
      { value: "medical", text: "خدمات پزشکی، پرستاری و درمانی" },
      { value: "events", text: "تشریفات، عکاسی و مجالس" },
      { value: "tourism", text: "تور، گردشگری و مهاجرت" },
      { value: "education", text: "آموزش و تدریس خصوصی" }
    ]
  },
  {
    id: "agriculture",
    slug: "agriculture",
    group: "کشاورزی و مواد غذایی",
    icon: "Tractor",
    color: "bg-lime-500 text-lime-50",
    description: "محصولات کشاورزی و غذایی",
    types: [
      { value: "food", text: "مواد غذایی، خواربار و خشکبار" },
      { value: "dairy", text: "لبنیات و محصولات محلی" },
      { value: "honey", text: "عسل و محصولات زنبورداری" },
      { value: "seeds", text: "بذر، نهال و پیاز گیاهان" },
      { value: "fertilizers", text: "کود و سموم کشاورزی" },
      { value: "livestock", text: "دام، طیور و آبزیان زنده" },
      { value: "pet_supplies", text: "خوراک و لوازم حیوانات خانگی" },
      { value: "irrigation", text: "تجهیزات آبیاری و پمپ آب" },
      { value: "greenhouses", text: "تجهیزات گلخانه و کشاورزی" },
      { value: "herbs", text: "گیاهان دارویی و عطاری" },
      { value: "organic", text: "محصولات ارگانیک" }
    ]
  },
  {
    id: "leisure_culture",
    slug: "culture",
    group: "سرگرمی، فرهنگ و هنر",
    icon: "Palette",
    color: "bg-pink-500 text-pink-50",
    description: "کتاب، موسیقی و هنر",
    types: [
      { value: "books", text: "کتاب، مجله و نشریات" },
      { value: "musical_instruments", text: "سازهای موسیقی" },
      { value: "sports_equipment", text: "لوازم ورزشی و بدنسازی" },
      { value: "camping", text: "لوازم کوهنوردی و کمپینگ" },
      { value: "traditional_crafts", text: "صنایع دستی، ترمه و میناکاری" },
      { value: "calligraphy", text: "خطاطی و تابلوهای هنری" },
      { value: "pottery", text: "سفال، سرامیک و کوزه‌گری" },
      { value: "collectibles", text: "اشیای عتیقه و کلکسیونی" },
      { value: "music_lessons", text: "آموزش موسیقی و هنر" },
      { value: "art_supplies", text: "لوازم نقاشی و هنری" }
    ]
  },
  {
    id: "others",
    slug: "others",
    group: "سایر نیازمندی‌ها",
    icon: "LayoutGrid",
    color: "bg-gray-500 text-gray-50",
    description: "موارد متفرقه",
    types: [
      { value: "tools", text: "ابزارآلات دستی و یراق‌آلات" },
      { value: "used", text: "کالاهای دست‌دوم متفرقه" },
      { value: "recycling", text: "ضایعات و مواد بازیافتی" },
      { value: "rental", text: "اجاره تجهیزات و ابزارآلات" },
      { value: "auctions", text: "حراجی و مزایده‌ها" },
      { value: "charity", text: "امور خیریه و اهدایی" },
      { value: "lost_found", text: "گم و پیدا" },
      { value: "exchange", text: "معاوضه" },
      { value: "other", text: "موارد دیگر" }
    ]
  }
];

// ==========================================
// 3. Helper Functions (بهینه شده)
// ==========================================

/** Cache برای جلوگیری از جستجوی مکرر */
const categoryCache = new Map<string, { text: string; groupInfo: any }>();

/**
 * دریافت نام فارسی دسته‌بندی از value
 */
export const getCategoryTextByValue = (value: string): string => {
  if (categoryCache.has(value)) {
    return categoryCache.get(value)!.text;
  }

  for (const group of categoriesData) {
    const found = group.types.find(type => type.value === value);
    if (found) {
      categoryCache.set(value, { text: found.text, groupInfo: null });
      return found.text;
    }
  }
  
  return value;
};

/**
 * دریافت اطلاعات گروه از value دسته‌بندی
 */
export const getCategoryGroupInfo = (value: string) => {
  const cached = categoryCache.get(value);
  if (cached?.groupInfo) {
    return cached.groupInfo;
  }

  for (const group of categoriesData) {
    const found = group.types.find(type => type.value === value);
    if (found) {
      const info = {
        icon: group.icon,
        color: group.color,
        groupName: group.group,
        slug: group.slug
      };
      categoryCache.set(value, { text: found.text, groupInfo: info });
      return info;
    }
  }

  return {
    icon: "LayoutGrid",
    color: "bg-gray-500 text-gray-50",
    groupName: "نامشخص",
    slug: "others"
  };
};

/**
 * دریافت تمام دسته‌بندی‌ها به صورت تخت (Flat)
 */
export const getAllFlatCategories = (): SubCategory[] => {
  return categoriesData.flatMap(group => group.types);
};

/**
 * جستجو در دسته‌بندی‌ها
 */
export const searchCategories = (query: string): SubCategory[] => {
  const lowerQuery = query.toLowerCase();
  return getAllFlatCategories().filter(cat =>
    cat.text.toLowerCase().includes(lowerQuery) ||
    cat.value.toLowerCase().includes(lowerQuery)
  );
};

/**
 * دریافت گروه از slug
 */
export const getCategoryGroupBySlug = (slug: string): CategoryGroup | null => {
  return categoriesData.find(group => group.slug === slug) || null;
};

/**
 * دریافت دسته‌بندی‌های پرطرفدار (Mock - باید از API بیاید)
 */
export const getPopularCategories = (): SubCategory[] => {
  return [
    { value: "electronics", text: "موبایل و تبلت" },
    { value: "cars", text: "خودرو" },
    { value: "property_sales", text: "خرید و فروش ملک" },
    { value: "home_appliances", text: "لوازم خانگی" },
    { value: "clothing", text: "پوشاک" }
  ];
};

// ==========================================
// 4. Data Integrity Validation (Development Only)
// ==========================================
if (import.meta.env.DEV) {
  const allIds = new Set<string>();
  const allValues = new Set<string>();
  const allSlugs = new Set<string>();

  categoriesData.forEach(group => {
    // بررسی تکراری نبودن ID
    if (allIds.has(group.id)) {
      console.error(`🔴 Duplicate category group ID: "${group.id}"`);
    }
    allIds.add(group.id);

    // بررسی تکراری نبودن Slug
    if (allSlugs.has(group.slug)) {
      console.error(`🔴 Duplicate category group slug: "${group.slug}"`);
    }
    allSlugs.add(group.slug);

    // بررسی تکراری نبودن Value
    group.types.forEach(type => {
      if (allValues.has(type.value)) {
        console.error(`🔴 Duplicate category value: "${type.value}"`);
      }
      allValues.add(type.value);
    });
  });

  console.log(`✅ Categories validated: ${categoriesData.length} groups, ${allValues.size} subcategories`);
}

// ==========================================
// 5. Export Constants
// ==========================================
export const TOTAL_CATEGORIES = categoriesData.length;
export const TOTAL_SUBCATEGORIES = getAllFlatCategories().length;