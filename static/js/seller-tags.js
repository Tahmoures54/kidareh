/**
 * Seller Console — Tags page.
 * Loaded only from /seller/tags.
 * Handles listing selector population, tag purchase, and owned listings.
 */
(() => {
  const status = document.querySelector("#tagBuyStatus");
  const listingBox = document.querySelector("#tagOwnedListings");
  const selectors = [...document.querySelectorAll(".tag-listing-select")];
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
  const labels = {
    listing_tag_sale: "حراج",
    listing_tag_special: "فروش ویژه",
    listing_tag_discount: "تخفیف‌دار",
  };
  let items = [];

  if (!status || !listingBox) return;

  const say = (message, kind) => {
    status.textContent = message;
    status.classList.remove("is-error", "is-success");
    if (kind) status.classList.add(kind);
  };

  const fmt = (value) => Number(value || 0).toLocaleString("fa-IR");
  const safe = (value) =>
    String(value ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

  const renderListingsError = (message) => {
    listingBox.setAttribute("aria-busy", "false");
    listingBox.replaceChildren(document.createTextNode(message + " "));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "retry-btn";
    button.textContent = "تلاش دوباره";
    button.addEventListener("click", load);
    listingBox.appendChild(button);
  };

  async function load() {
    listingBox.setAttribute("aria-busy", "true");
    listingBox.textContent = "در حال بارگذاری…";
    try {
      const response = await fetch("/api/my/listings", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (response.status === 401) {
        listingBox.setAttribute("aria-busy", "false");
        listingBox.textContent =
          "برای خرید تگ و دیدن کالاهای خود، ابتدا وارد حساب فروشنده شوید.";
        selectors.forEach((select) => {
          select.innerHTML = '<option value="">ابتدا وارد حساب فروشنده شوید</option>';
        });
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "بارگذاری کالاها ممکن نشد.");
      items = data.items || [];
      selectors.forEach((select) => {
        const selected = select.value;
        select.replaceChildren(new Option("انتخاب کالا", ""));
        items.forEach((item) =>
          select.add(new Option(item.title + " · " + item.city, String(item.id)))
        );
        if (items.some((item) => String(item.id) === selected)) select.value = selected;
        if (!items.length) select.add(new Option("هنوز کالایی ثبت نکرده‌اید", ""));
      });
      listingBox.innerHTML = items.length
        ? items
            .map((item) => {
              const active = item.active_tag
                ? '<span class="tag-active">تگ فعال: ' +
                  safe(labels[item.active_tag] || "ویژه") +
                  " · تا " +
                  new Date(item.tag_ends_at).toLocaleDateString("fa-IR") +
                  "</span>"
                : "<small>بدون تگ پولی · انتشار رایگان</small>";
              return (
                '<div class="tag-owned-item"><div><strong>' +
                safe(item.title) +
                "</strong><small>" +
                safe(item.city) +
                " · " +
                fmt(item.price) +
                " تومان</small></div>" +
                active +
                "</div>"
              );
            })
            .join("")
        : '<div class="empty-page-state">هنوز کالایی ثبت نکرده‌ای. <a href="/seller#addProductPanel">اولین کالا را رایگان ثبت کن ←</a></div>';
      listingBox.setAttribute("aria-busy", "false");
    } catch (error) {
      renderListingsError(error.message || "بارگذاری کالاها ممکن نشد.");
      selectors.forEach((select) => {
        select.innerHTML = '<option value="">بارگذاری ناموفق</option>';
      });
    }
  }

  // ----- Buy buttons -----
  document.querySelectorAll(".tag-buy-button").forEach((button) =>
    button.addEventListener("click", async () => {
      const card = button.closest(".tag-product-card");
      const listingId = card.querySelector("select").value;
      if (!listingId) {
        say("ابتدا کالایی را برای این تگ انتخاب کن.", "is-error");
        return;
      }
      button.disabled = true;
      say("در حال آماده‌سازی پرداخت امن زیبال…");
      try {
        const response = await fetch("/api/monetization/orders", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
            Accept: "application/json",
          },
          body: JSON.stringify({
            package_id: button.dataset.package,
            listing_id: Number(listingId),
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.message ||
              (data.error === "authentication_required"
                ? "ابتدا وارد حساب فروشنده شوید."
                : "شروع پرداخت ممکن نشد.")
          );
        if (!data.redirect_url) throw new Error("نشانی درگاه دریافت نشد.");
        window.location.assign(data.redirect_url);
      } catch (error) {
        say(error.message || "ارتباط با درگاه برقرار نشد.", "is-error");
        button.disabled = false;
      }
    })
  );

  // ----- URL feedback -----
  const params = new URLSearchParams(location.search);
  if (params.get("payment") === "success") {
    say("پرداخت تأیید شد؛ تگ کالا فعال شد.", "is-success");
  } else if (params.get("payment")) {
    say(
      "پرداخت تأیید نشد یا قابل بررسی نبود. اگر مبلغی کسر شده، اطلاعات سفارش را برای پیگیری نگه دارید.",
      "is-error"
    );
  }
  load();
})();