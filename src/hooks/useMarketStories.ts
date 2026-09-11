import { useEffect, useState } from "react";
import type { StoryItem } from "../components/feed/FeedStories";
import { mapApiStory } from "../lib/marketStories";
import { apiRequest } from "../utils/api";

export function useMarketStories(city: string) {
  const [items, setItems] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest<{ stories?: Record<string, unknown>[] }>(
      `/api/promotions/stories?city=${encodeURIComponent(city || "تهران")}&limit=24`
    )
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.stories) ? res.stories : [];
        setItems(rows.map((row) => mapApiStory(row)).filter((row): row is StoryItem => Boolean(row)));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  return { items, loading };
}

export function trackStoryView(id: string): void {
  if (!id || !/^\d+$/.test(id)) return;
  fetch(`/api/promotions/stories/${id}/view`, { method: "POST", credentials: "include" }).catch(() => {});
}

export function trackStoryClick(id: string): void {
  if (!id || !/^\d+$/.test(id)) return;
  fetch(`/api/promotions/stories/${id}/click`, { method: "POST", credentials: "include" }).catch(() => {});
}
