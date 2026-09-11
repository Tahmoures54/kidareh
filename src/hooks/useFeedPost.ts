import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { FeedPostData } from "../lib/feedMappers";
import { buildShareUrl, shareFeedItem, shareTextForPost } from "../lib/feedShare";
import {
  isLiked,
  isListingSaved,
  isProductSaved,
  onFeedChange,
  setProductSaved,
  toggleLike,
  toggleListingSaved,
} from "../lib/feedStorage";
import { apiRequest } from "../utils/api";

export function useFeedPost(post: FeedPostData) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(() => isLiked(post.key));
  const [saved, setSaved] = useState(() =>
    post.kind === "listing"
      ? isListingSaved(post.listingId || "")
      : isProductSaved(post.productId ?? post.key)
  );
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setLiked(isLiked(post.key));
      setSaved(
        post.kind === "listing"
          ? isListingSaved(post.listingId || "")
          : isProductSaved(post.productId ?? post.key)
      );
    };
    sync();
    return onFeedChange(sync);
  }, [post.key, post.kind, post.listingId, post.productId]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const like = useCallback(() => {
    setLiked(toggleLike(post.key));
  }, [post.key]);

  const save = useCallback(async () => {
    if (post.kind === "listing") {
      if (!post.listingId) return;
      const next = toggleListingSaved(post.listingId);
      setSaved(next);
      setFlash(next ? "کالا ذخیره شد" : "از ذخیره‌ها برداشته شد");
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", { state: { from: post.href } });
      return;
    }
    if (!post.productId) return;

    const next = !saved;
    setSaved(next);
    setProductSaved(post.productId, next);
    setBusy(true);
    try {
      await apiRequest("/api/products/save", {
        method: "POST",
        auth: true,
        body: { productId: post.productId, save: next },
      });
      setFlash(next ? "کالا ذخیره شد" : "از ذخیره‌ها برداشته شد");
    } catch {
      setSaved(!next);
      setProductSaved(post.productId, !next);
      setFlash("ذخیره نشد. دوباره بزن.");
    } finally {
      setBusy(false);
    }
  }, [isAuthenticated, navigate, post.href, post.kind, post.listingId, post.productId, saved]);

  const share = useCallback(async () => {
    const url = buildShareUrl(post.href, window.location.origin);
    const result = await shareFeedItem({
      title: post.title,
      url,
      text: shareTextForPost(post.title, post.storeName),
    });
    if (result === "copied") setFlash("لینک کپی شد");
    if (result === "failed") setFlash("اشتراک‌گذاری انجام نشد");
    return result;
  }, [post.href, post.storeName, post.title]);

  const openComments = useCallback(() => {
    navigate(post.href);
  }, [navigate, post.href]);

  const openMessage = useCallback(() => {
    if (post.kind === "product") {
      if (!isAuthenticated) {
        navigate("/login", { state: { from: post.href } });
        return;
      }
      if (post.storeId) navigate(`/chat/${post.storeId}`);
      else navigate("/messages");
      return;
    }
    navigate(post.href);
  }, [isAuthenticated, navigate, post.href, post.kind, post.storeId]);

  return {
    liked,
    saved,
    busy,
    flash,
    like,
    save,
    share,
    openComments,
    openMessage,
  };
}
