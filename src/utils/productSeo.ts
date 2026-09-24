import type { ProductData } from "../pages/ProductDetail/types";

const DEFAULT_DESCRIPTION =
  "کالای موردنظرت را در فروشگاه‌های اطراف پیدا کن و حضوری بگیر.";

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${CSS.escape(key)}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function updateProductSeo(product: ProductData, url: string) {
  const title = `${product.name} — کی‌داره`;
  const description =
    product.description?.trim().slice(0, 180) ||
    (Number(product.price) > 0 ? `قیمت ${product.name}: ${Number(product.price).toLocaleString("fa-IR")} تومان. ${DEFAULT_DESCRIPTION}` : DEFAULT_DESCRIPTION);
  const rawImage = product.images?.find(Boolean) || product.image_url || "https://kidareh.com/og-image-1200x630.jpg";
  const image = /^https?:\\/\\//i.test(rawImage) ? rawImage : new URL(rawImage, "https://kidareh.com/").href;

  document.title = title;
  upsertCanonical(url);

  upsertMeta("name", "description", description);
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
  upsertMeta("property", "og:type", "product");
  upsertMeta("property", "og:site_name", "کی‌داره");
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:image:alt", product.name);
}
