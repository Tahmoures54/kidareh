/* کی‌داره — تور راهنما (خریدار + فروشنده). وضعیت در localStorage ذخیره می‌شود. */
(() => {
  "use strict";

  const BUYER_KEY = "kidareh-onboarding-done-v1";
  const SELLER_KEY = "kidareh-seller-onboarding-done-v1";

  /**
   * Each step accepts `selectors` (array). The first *visible* match wins.
   * This lets one step work across multiple pages and layouts without
   * duplicating tour definitions, and gracefully falls back when the
   * primary target is hidden (e.g. the add-product form lives inside a
   * closed <dialog> on /seller).
   */
  const BUYER_STEPS = [
    {
      selectors: ["#marketCityCombobox", "#citySelect", ".home-location-bar", ".market-location-bar"],
      title: "اول شهرت را انتخاب کن",
      text: "کالاهای نزدیک خودت را می‌بینی. هر وقت خواستی می‌توانی شهر را عوض کنی یا از «اطراف من» استفاده کنی."
    },
    {
      selectors: ["#listings", "#listingGrid", ".listings-section", "#pageListings", ".page-card-grid"],
      title: "کالا را پیدا کن",
      text: "با جست‌وجو و دسته‌بندی سریع‌تر به کالای موردنظرت برس. نشان «≈ تقریبی» یعنی قیمت را قبل از مراجعه هماهنگ کن."
    },
    {
      selectors: [".mobile-bottom-nav", ".desktop-nav", ".home-bottom-nav"],
      title: "هماهنگی حضوری",
      text: "از همین‌جا به ویترین‌ها، گفت‌وگوها و ثبت آگهی برو. خرید حضوری، با آرامش!"
    }
  ];

  const SELLER_STEPS = [
    {
      selectors: ["#storePanel", "#sellerStatus", ".seller-hero"],
      title: "۱. ویترینت را کامل کن",
      text: "نام فروشگاه، شهر و نشانی را وارد کن. هرچه شفاف‌تر باشی، مشتری راحت‌تر حضوری می‌آید."
    },
    {
      selectors: [
        ".seller-hero-actions .button-primary",
        "[data-open-add-product]:not([disabled])",
        "[data-open-add-product]",
        ".seller-quick-links .primary",
        "#sellerProductForm",
        ".seller-products"
      ],
      title: "۲. اولین کالا را اضافه کن",
      text: "با یک کلیک، پنجرهٔ ثبت کالا باز می‌شود. نام، عکس و قیمت به‌روز را وارد کن و در همان پنجره پیش‌نمایش را ببین."
    },
    {
      selectors: [
        "#shareMyStore:not([hidden])",
        ".seller-secondary-card",
        "#myProductsPanel"
      ],
      title: "۳. لینک را پخش کن",
      text: "لینک ویترین را در واتساپ و شبکه‌های اجتماعی بفرست. مشتری را به سمت مغازه بکش — منتظر عبور عابر نمان."
    }
  ];

  function isDone(key) {
    try { return localStorage.getItem(key) === "1"; } catch { return true; }
  }
  function markDone(key) {
    try { localStorage.setItem(key, "1"); } catch { /* private mode */ }
  }

  function findFirstVisible(selectors) {
    for (const sel of selectors) {
      let el;
      try { el = document.querySelector(sel); } catch (_) { continue; }
      if (!el) continue;
      if (el.hidden) continue;
      if (el.getClientRects().length === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      return el;
    }
    return null;
  }

  function runTour(steps, storageKey) {
    if (isDone(storageKey)) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let highlighted = null;

    const card = document.createElement("div");
    card.className = "onboarding-tip";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "راهنمای شروع کی‌داره");
    document.body.append(card);

    function clearHighlight() {
      if (highlighted) {
        highlighted.classList.remove("onboarding-highlight");
        highlighted = null;
      }
    }

    function close() {
      clearHighlight();
      markDone(storageKey);
      card.remove();
    }

    function render() {
      const step = steps[index];
      card.replaceChildren();
      clearHighlight();

      const counter = document.createElement("small");
      counter.textContent = `مرحلهٔ ${index + 1} از ${steps.length}`;

      const title = document.createElement("strong");
      title.textContent = step.title;

      const text = document.createElement("p");
      text.textContent = step.text;

      const actions = document.createElement("div");
      actions.className = "onboarding-actions";

      const skip = document.createElement("button");
      skip.type = "button";
      skip.className = "button button-ghost";
      skip.textContent = "رد کردن";
      skip.addEventListener("click", close);

      const next = document.createElement("button");
      next.type = "button";
      next.className = "button button-primary";
      next.textContent = index === steps.length - 1 ? "متوجه شدم" : "بعدی";
      next.addEventListener("click", () => {
        if (index === steps.length - 1) close();
        else { index += 1; render(); }
      });

      actions.append(skip, next);
      card.append(counter, title, text, actions);

      const target = findFirstVisible(step.selectors);
      if (target) {
        target.scrollIntoView({
          block: "center",
          behavior: reduceMotion ? "auto" : "smooth"
        });
        target.classList.add("onboarding-highlight");
        highlighted = target;
        window.setTimeout(() => {
          if (highlighted === target) {
            target.classList.remove("onboarding-highlight");
            highlighted = null;
          }
        }, 2400);
      }

      next.focus();
    }

    // Escape closes the tour (matches dialog behavior across the site)
    card.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    });

    render();
  }

  function start() {
    const path = (window.location.pathname || "/").replace(/\/$/, "") || "/";

    // Seller console: main dashboard only.
    // Sub-pages (/seller/tags, /monetization) have their own focused purpose
    // and do not need a buyer-style walkthrough.
    if (path === "/seller") {
      runTour(SELLER_STEPS, SELLER_KEY);
      return;
    }

    // Buyer tour: homepage and search-like pages share the same shape.
    if (path === "/" || path === "/search" || path === "/stores") {
      runTour(BUYER_STEPS, BUYER_KEY);
    }
  }

  // Wait until seller.js / app.js / location-picker.js have finished
  // populating the UI so the tour targets are visible when it runs.
  if (document.readyState === "complete") {
    window.setTimeout(start, 900);
  } else {
    window.addEventListener("load", () => window.setTimeout(start, 900));
  }
})();