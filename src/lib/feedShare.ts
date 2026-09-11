export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export function buildShareUrl(path: string, origin = ""): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = origin.replace(/\/+$/, "");
  const href = path.startsWith("/") ? path : `/${path}`;
  return `${base}${href}`;
}

export function shareTextForPost(title: string, storeName?: string): string {
  const store = storeName ? ` در ${storeName}` : "";
  return `${title}${store} — ببین کی داره، حضوری بگیر`;
}

export async function shareFeedItem(opts: {
  title: string;
  url: string;
  text?: string;
}): Promise<ShareResult> {
  const payload = {
    title: opts.title,
    text: opts.text ?? opts.title,
    url: opts.url,
  };

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share(payload);
      return "shared";
    }
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "AbortError") return "cancelled";
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(opts.url);
      return "copied";
    }
  } catch {
    return "failed";
  }

  return "failed";
}
