(() => {
  const grid = document.querySelector("#listingGrid");
  const count = document.querySelector("#resultsCount");
  const empty = document.querySelector("#emptyState");
  const searchForm = document.querySelector("#searchForm");
  const searchInput = document.querySelector("#searchInput");
  const citySelect = document.querySelector("#citySelect");
  const categorySelect = document.querySelector("#categorySelect");
  const activeMarketCity = document.querySelector("#activeMarketCity");
  const marketListingsTitle = document.querySelector("#marketListingsTitle");
  const changeMarketCityButton = document.querySelector("#changeMarketCityButton");
  const findMyLocationButton = document.querySelector("#findMyLocationButton");
  const nearbyListingsButton = document.querySelector("#nearbyListingsButton");
  const showAllButton = document.querySelector("#showAllButton");
  const clearFilters = document.querySelector("#clearFilters");
  let toast = document.querySelector("#pageToast");
  const storeGrid = document.querySelector("#storeGrid");
  const storesCount = document.querySelector("#storesCount");
  const storeSearchInput = document.querySelector("#storeSearchInput");
  const numberFormat = new Intl.NumberFormat("fa-IR");
  let currentFilter = "all";
  let userCoords = null;

  const categoryNames = {
    home: "خانه و زندگی",
    digital: "دیجیتال",
    fashion: "پوشاک",
    vehicle: "خودرو و حمل‌ونقل",
    services: "خدمات"
  };

  const escapeHTML = (value) => {
    const map = {
      "&": "&" + "amp;",
      "<": "&" + "lt;",
      ">": "&" + "gt;",
      '"': "&" + "quot;",
      "'": "&" + "#39;"
    };
    return String(value ?? "").replace(/[&<>"']/g, (char) => map[char]);
  };

  const categoryName = (id, label) => label || categoryNames[id] || id || "سایر";

  function showToast(message, kind = "info") {
    // Prefer the shared KidarehUI toast (loaded by base.html via ui.js).
    if (window.KidarehUI && typeof window.KidarehUI.toast === "function") {
      window.KidarehUI.toast(message, { kind });
      return;
    }
    if (!toast) toast = document.querySelector("#pageToast");
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("visible"), 3600);
  }

  function ensureLoadMoreButton() {
    let btn = document.querySelector("#loadMoreListings");
    if (!btn && grid) {
      btn = document.createElement("button");
      btn.id = "loadMoreListings";
      btn.type = "button";
      btn.className = "button button-outline";
      btn.textContent = "نمایش بیشتر";
      btn.hidden = true;
      grid.parentElement?.appendChild(btn);
      btn.addEventListener("click", () => {
        if (btn.dataset.cursor) loadListings({ cursor: btn.dataset.cursor, cursorFeatured: btn.dataset.cursorFeatured, append: true });
      });
    }
    return btn;
  }

  function availabilityLabel(status) {
    if (status === "in_stock") return "موجود اعلام شده";
    if (status === "out_of_stock") return "ناموجود";
    return "پیش از مراجعه استعلام کن";
  }

  function informationUpdatedLabel(value) {
    if (!value) return "زمان تأیید اطلاعات ثبت نشده";
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return "زمان تأیید اطلاعات نامشخص";
    const elapsed = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return "به‌روزرسانی همین حالا";
    if (minutes < 60) return "آخرین ثبت: " + numberFormat.format(minutes) + " دقیقه پیش";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return "آخرین ثبت: " + numberFormat.format(hours) + " ساعت پیش";
    const days = Math.floor(hours / 24);
    if (days < 30) return "آخرین ثبت: " + numberFormat.format(days) + " روز پیش";
    return "آخرین ثبت: " + new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric" }).format(timestamp);
  }

  async function shareListing(item, button) {
    const url = new URL("/product/" + encodeURIComponent(item.id), window.location.origin).href;
    const title = String(item.title || "کالا در کی‌داره");
    const text = [title, item.price ? numberFormat.format(item.price) + " تومان" : "قیمت توافقی", item.city || ""].filter(Boolean).join(" · ");
    if (navigator.share) {
      try {
        await navigator.share({ title: title + " | کی‌داره", text, url });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("copy_failed");
      }
      showToast("پیوند اختصاصی کالا کپی شد.", "success");
      if (button) {
        const previous = button.textContent;
        button.textContent = "کپی شد ✓";
        window.setTimeout(() => { button.textContent = previous; }, 1800);
      }
    } catch (_) {
      showToast("کپی پیوند ممکن نشد؛ نشانی صفحه را از نوار مرورگر کپی کنید.", "error");
    }
  }

  function renderListings(items, append) {
    if (!grid) return;
    if (!append) {
      if (!items.length) {
        grid.innerHTML = "";
        if (empty) empty.hidden = false;
        if (count) count.textContent = "۰ نتیجه";
        return;
      }
      if (empty) empty.hidden = true;
    }
    const html = items.map((item) => {
      const productUrl = "/product/" + encodeURIComponent(item.id);
      const storeId = Number.parseInt(item.store_id, 10);
      const storeLink = Number.isInteger(storeId) && storeId > 0
        ? '<a class="listing-store-visit" href="/store/' + storeId + '">ببین دیگه چی داره؟ <span aria-hidden="true">←</span></a>'
        : "";
      const image = item.image_path
        ? '<img class="listing-photo" src="' + escapeHTML(item.image_path) + '" alt="' + escapeHTML(item.title) + '" loading="lazy" decoding="async">'
        : '<span class="listing-emoji" aria-hidden="true">' + escapeHTML(item.emoji || "🛍️") + '</span>';
      return `
        <article class="listing-card">
          <a class="listing-card-main" href="${productUrl}" aria-label="مشاهده ${escapeHTML(item.title)}">
            <div class="listing-image category-art-${escapeHTML(item.category)}">
              ${image}
              ${item.paid_tag ? '<span class="paid-listing-tag tag-' + escapeHTML(item.paid_tag.type) + '">' + escapeHTML(item.paid_tag.label) + '</span>' : ""}
            </div>
            <div class="listing-body">
              <div class="listing-meta"><span>${escapeHTML(item.city)}</span><span class="meta-dot"></span><span>${escapeHTML(categoryName(item.category, item.category_name))}</span>${item.distance_km != null ? `<span class="meta-dot"></span><span>${numberFormat.format(item.distance_km)} کیلومتر</span>` : ""}</div>
              <h3>${escapeHTML(item.title)}</h3>
              ${item.store_name ? `<div class="listing-store-name">⌂ ${escapeHTML(item.store_name)}</div>` : ""}
              <p>${escapeHTML(item.description || "")}</p>
              <div class="listing-local-info">
                <span class="listing-availability status-${escapeHTML(item.availability_status || "ask")}">${availabilityLabel(item.availability_status)}</span>
                <small>${informationUpdatedLabel(item.price_updated_at)}</small>
              </div>
              <div class="listing-footer"><strong>${item.price ? numberFormat.format(item.price) + " تومان" : "توافقی"}</strong></div>
            </div>
          </a>
          <div class="listing-card-actions">
            ${storeLink}
            <button class="listing-share" type="button" data-share-listing="${escapeHTML(item.id)}" aria-label="اشتراک‌گذاری ${escapeHTML(item.title)}">
              <span aria-hidden="true">↗</span> اشتراک‌گذاری
            </button>
          </div>
        </article>`;
    }).join("");
    if (append) grid.insertAdjacentHTML("beforeend", html);
    else grid.innerHTML = html;
    grid.querySelectorAll("[data-share-listing]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const item = items.find((entry) => String(entry.id) === button.dataset.shareListing);
        if (item) shareListing(item, button);
      });
    });
  }

    async function loadListings(opts = {}) {
    const params = new URLSearchParams();
    const q = (searchInput?.value || "").trim();
    const city = citySelect?.value.trim() || "تهران";
    if (q) params.set("q", q);
    if (city && !userCoords) params.set("city", city);
    if (currentFilter && currentFilter !== "all") params.set("category", currentFilter);
    if (userCoords) {
      params.set("lat", String(userCoords.lat));
      params.set("lon", String(userCoords.lng));
      params.set("radius_km", "25");
    }
    if (opts.cursor) {
      params.set("before_id", opts.cursor);
      if (opts.cursorFeatured !== undefined && opts.cursorFeatured !== "") params.set("before_featured", opts.cursorFeatured);
    }
    try {
      const res = await fetch("/api/listings?" + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ارتباط برقرار نشد، دوباره امتحان می‌کنیم؟");
      const items = data.items || [];
      renderListings(items, Boolean(opts.append));
      if (count && data.count != null) count.textContent = numberFormat.format(data.count) + " نتیجه";
      else if (count && !opts.append) count.textContent = numberFormat.format(items.length) + " نتیجه";
      const moreBtn = ensureLoadMoreButton();
      if (moreBtn) {
        if (data.next_before_id) {
          moreBtn.dataset.cursor = data.next_before_id;
          moreBtn.dataset.cursorFeatured = data.next_before_featured ?? "";
          moreBtn.hidden = false;
        } else {
          moreBtn.hidden = true;
          delete moreBtn.dataset.cursor;
          delete moreBtn.dataset.cursorFeatured;
        }
      }
    } catch (err) {
      if (grid && !opts.append) {
        grid.innerHTML = '<div class="loading-card listing-load-error"><p>بارگذاری کالاها ممکن نشد. اتصال اینترنت را بررسی کنید.</p><button class="button button-outline" id="retryListings" type="button">تلاش دوباره</button></div>';
        grid.querySelector("#retryListings")?.addEventListener("click", () => loadListings());
        if (empty) empty.hidden = true;
        if (count) count.textContent = "کالاها الان نمایش داده نشدند؛ دوباره تلاش می‌کنیم؟";
      }
      showToast("بارگذاری کالاها ممکن نشد.", "error");
    }
  }

  function renderStores(items) {
    if (!storeGrid) return;
    if (!items.length) {
      storeGrid.innerHTML = '<div class="loading-card">فروشگاهی پیدا نشد.</div>';
      if (storesCount) storesCount.textContent = "۰ فروشگاه";
      return;
    }
    if (storesCount) storesCount.textContent = numberFormat.format(items.length) + " فروشگاه";
    storeGrid.innerHTML = items.map((store) => {
      return '<a class="store-card" href="/store/' + escapeHTML(store.id) + '">' +
      '<span class="store-card-mark">⌂</span><span class="store-card-copy"><strong>' + escapeHTML(store.name) +
      '</strong><small>' +
      escapeHTML(store.city) + ' · ' + numberFormat.format(store.product_count || 0) +
      ' کالا</small><span>' + escapeHTML(store.description || "برای دیدن کالاها وارد ویترین شو.") +
      '</span></span></a>';
    }).join("");
  }

  async function loadStores() {
    if (!storeGrid) return;
    const params = new URLSearchParams();
    const q = (storeSearchInput?.value || "").trim();
    if (q) params.set("q", q);
    try {
      const res = await fetch("/api/stores?" + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ارتباط برقرار نشد، دوباره امتحان می‌کنیم؟");
      renderStores(data.items || []);
      if (storesCount && data.count != null) storesCount.textContent = numberFormat.format(data.count) + " فروشگاه";
    } catch (err) {
      storeGrid.innerHTML = '<div class="loading-card">بارگذاری فروشگاه‌ها ممکن نشد.</div>';
    }
  }

  function updateMarketCity() {
    const city = citySelect?.value.trim() || "تهران";
    if (activeMarketCity) activeMarketCity.textContent = city;
    if (marketListingsTitle) marketListingsTitle.textContent = "بازار " + city;
  }

  function saveMarketCity() {
    const city = citySelect?.value.trim() || "";
    try {
      if (city) localStorage.setItem("kidareh.marketCity", city);
      else localStorage.removeItem("kidareh.marketCity");
    } catch (_) { /* City selection remains usable when storage is unavailable. */ }
    updateMarketCity();
  }

  try {
    const savedCity = localStorage.getItem("kidareh.marketCity");
    if (citySelect && savedCity) citySelect.value = savedCity;
  } catch (_) { /* Private browsing or storage restrictions should not block browsing. */ }
  updateMarketCity();

  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    userCoords = null;
    if (categorySelect) currentFilter = categorySelect.value || "all";
    saveMarketCity();
    loadListings();
  });
  citySelect?.addEventListener("input", updateMarketCity);
  citySelect?.addEventListener("change", () => {
    userCoords = null;
    saveMarketCity();
    loadListings();
  });
  categorySelect?.addEventListener("change", () => {
    currentFilter = categorySelect.value || "all";
    loadListings();
  });

  document.querySelectorAll("[data-search]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (searchInput) searchInput.value = btn.dataset.search || "";
      loadListings();
    });
  });

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      currentFilter = chip.dataset.filter || "all";
      loadListings();
    });
  });

  let categoryCataloguePromise = null;
  function loadCategoryCatalogue() {
    if (!categoryCataloguePromise) {
      categoryCataloguePromise = fetch("/api/categories", { headers: { Accept: "application/json" } })
        .then((response) => { if (!response.ok) throw new Error("categories_unavailable"); return response.json(); });
    }
    return categoryCataloguePromise;
  }

  async function renderSubcategories(groupId) {
    const host = document.querySelector("#homeSubcategories");
    if (!host) return;
    if (!groupId || groupId === "all") {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    try {
      const catalogue = await loadCategoryCatalogue();
      const children = (catalogue.subcategories || []).filter((item) => item.group_id === groupId);
      host.innerHTML = "";
      if (!children.length) { host.hidden = true; return; }
      const all = document.createElement("button");
      all.type = "button";
      all.className = "subcategory-chip is-active";
      all.dataset.subcategory = groupId;
      all.textContent = "همه " + (Array.from(document.querySelectorAll("[data-category]")).find((item) => item.dataset.category === groupId)?.textContent.trim() || "این دسته");
      host.appendChild(all);
      children.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "subcategory-chip";
        button.dataset.subcategory = item.id;
        button.textContent = item.name;
        host.appendChild(button);
      });
      host.hidden = false;
      host.querySelectorAll("[data-subcategory]").forEach((button) => {
        button.addEventListener("click", () => {
          currentFilter = button.dataset.subcategory;
          host.querySelectorAll(".subcategory-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
          loadListings();
        });
      });
    } catch (_) {
      host.hidden = true;
    }
  }

  document.querySelectorAll("[data-category]").forEach((tile) => {
    tile.addEventListener("click", () => {
      const cat = tile.dataset.category || "all";
      currentFilter = cat;
      document.querySelectorAll("[data-category]").forEach((item) => {
        const selected = item === tile;
        item.classList.toggle("is-active", selected);
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      document.querySelectorAll(".filter-chip").forEach((c) => {
        c.classList.toggle("selected", (c.dataset.filter || "") === currentFilter || (currentFilter === "all" && c.dataset.filter === "all"));
      });
      renderSubcategories(cat);
      document.querySelector("#listings")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      loadListings();
    });
  });

  showAllButton?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    currentFilter = "all";
    if (categorySelect) categorySelect.value = "all";
    userCoords = null;
    document.querySelectorAll(".category-tile").forEach((c) => c.classList.remove("active"));
    document.querySelectorAll(".filter-chip").forEach((c) => c.classList.toggle("selected", c.dataset.filter === "all"));
    loadListings();
  });

  clearFilters?.addEventListener("click", () => showAllButton?.click());

  // Location is requested only after an explicit user action; never on page load.
  function requestNearbyLocation(sourceButton) {
    if (!navigator.geolocation) {
      showToast("مرورگر شما از مکان‌یابی پشتیبانی نمی‌کند.");
      return;
    }
    const buttons = [findMyLocationButton, nearbyListingsButton].filter(Boolean);
    buttons.forEach((button) => { button.disabled = true; });
    if (sourceButton) sourceButton.textContent = "در حال دریافت موقعیت…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        buttons.forEach((button) => { button.disabled = false; });
        if (findMyLocationButton) findMyLocationButton.textContent = "موقعیت پیدا شد ✓";
        if (nearbyListingsButton) nearbyListingsButton.textContent = "کالاهای اطراف من ✓";
        showToast("موقعیت فقط برای جست‌وجوی اطراف استفاده شد؛ شهر بازار تغییر نکرد.");
        loadListings();
      },
      () => {
        buttons.forEach((button) => { button.disabled = false; });
        if (findMyLocationButton) findMyLocationButton.textContent = "یافتن موقعیت من";
        if (nearbyListingsButton) nearbyListingsButton.textContent = "پیدا کردن کالاهای اطراف من";
        showToast("موقعیت دریافت نشد؛ می‌توانید شهر را دستی انتخاب کنید.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }
  findMyLocationButton?.addEventListener("click", () => requestNearbyLocation(findMyLocationButton));
  nearbyListingsButton?.addEventListener("click", () => requestNearbyLocation(nearbyListingsButton));

  storeSearchInput?.addEventListener("input", () => {
    window.clearTimeout(storeSearchInput._t);
    storeSearchInput._t = window.setTimeout(loadStores, 280);
  });
  document.querySelector("#showAllStores")?.addEventListener("click", () => {
    if (storeSearchInput) storeSearchInput.value = "";
    loadStores();
  });


  // Seller actions: keep the storefront setup in the dedicated seller dashboard.
  document.querySelector("#openStoreForm")?.addEventListener("click", () => {
    window.location.assign("/seller");
  });

  const listingForm = document.querySelector("#listingSubmitForm");
  const openListingFormButton = document.querySelector("#openListingForm");
  const imageInput = listingForm?.querySelector('input[name="image"]');
  const imagePreviewWrap = document.querySelector("#imagePreviewWrap");
  const imagePreview = document.querySelector("#imagePreview");
  const removeImagePreview = document.querySelector("#removeImagePreview");
  let previewObjectUrl = null;

  function clearImagePreview() {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
    if (imagePreview) imagePreview.removeAttribute("src");
    if (imagePreviewWrap) imagePreviewWrap.hidden = true;
    if (imageInput) imageInput.value = "";
  }

  openListingFormButton?.addEventListener("click", () => {
    if (!listingForm) return;
    listingForm.hidden = false;
    listingForm.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    listingForm.querySelector('input[name="title"]')?.focus({ preventScroll: true });
  });

  imageInput?.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) {
      clearImagePreview();
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      clearImagePreview();
      showToast("فرمت عکس باید JPG، PNG یا WebP باشد.", "error");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      clearImagePreview();
      showToast("حجم عکس نباید بیشتر از ۴ مگابایت باشد.", "error");
      return;
    }
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(file);
    if (imagePreview) imagePreview.src = previewObjectUrl;
    if (imagePreviewWrap) imagePreviewWrap.hidden = false;
  });
  removeImagePreview?.addEventListener("click", clearImagePreview);

  listingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = listingForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || "افزودن کالا به ویترین";
    const token = document.querySelector('meta[name="csrf-token"]')?.content || "";
    if (imageInput?.files?.[0]?.size > 4 * 1024 * 1024) {
      showToast("حجم عکس نباید بیشتر از ۴ مگابایت باشد.", "error");
      return;
    }
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "در حال ثبت کالا…";
    }
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-CSRF-Token": token },
        body: new FormData(listingForm)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          showToast("برای ثبت کالا ابتدا وارد حساب شوید.", "error");
          let loginNotice = listingForm.querySelector("#listingLoginNotice");
          if (!loginNotice) {
            loginNotice = document.createElement("p");
            loginNotice.id = "listingLoginNotice";
            loginNotice.className = "form-note";
            const link = document.createElement("a");
            link.href = "/login";
            link.textContent = "ورود به حساب";
            loginNotice.append("برای ادامه، ", link, " را باز کنید؛ سپس فرم را دوباره تکمیل کنید.");
            listingForm.appendChild(loginNotice);
          }
          loginNotice.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return;
        }
        const messages = {
          csrf_failed: "صفحه منقضی شده است؛ صفحه را تازه‌سازی و دوباره تلاش کنید.",
          invalid_image: "عکس انتخاب‌شده معتبر نیست.",
          image_too_large: "حجم عکس نباید بیشتر از ۴ مگابایت باشد.",
          invalid_category: "لطفاً دسته‌بندی معتبر انتخاب کنید.",
          invalid_seller_phone: "شماره همراه را به شکل 09123456789 وارد کنید.",
          invalid_city: "لطفاً شهر یا روستا را وارد کنید."
        };
        throw new Error(data.message || messages[data.error] || "ثبت کالا انجام نشد؛ اطلاعات را بررسی کنید.");
      }
      const createdCity = listingForm.elements.city?.value.trim() || "";
      listingForm.reset();
      clearImagePreview();
      listingForm.hidden = true;
      const loginNotice = listingForm.querySelector("#listingLoginNotice");
      loginNotice?.remove();
      if (citySelect && createdCity) {
        citySelect.value = createdCity;
        saveMarketCity();
      }
      showToast("آگهی‌ات منتشر شد 🎉", "success");
      userCoords = null;
      await loadListings();
      document.querySelector("#listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showToast(error.message || "ثبت کالا انجام نشد؛ دوباره تلاش کنید.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
// Compact, accessible homepage message ticker.
  (function initMarketTicker() {
    const root = document.querySelector("#marketTicker");
    const message = document.querySelector("#marketTickerMessage");
    const link = document.querySelector("#marketTickerLink");
    if (!root || !message || !link) return;
    const items = [
      { text: "کالاهای شهر را ببین؛ قبل از مراجعه، انتخاب کن.", label: "دیدن کالاها", href: "#listings" },
      { text: "فروشگاه‌دار هستی؟ ویترینت را رایگان بساز و به مشتری‌های شهر معرفی کن.", label: "ساخت ویترین", href: "/seller" },
      { text: "دنبال کالای خاصی هستی؟ جست‌وجو و دسته‌بندی‌ها کمکت می‌کنند زودتر پیدایش کنی.", label: "جست‌وجو", href: "/search" },
      { text: "کی‌داره برای خرید حضوری است؛ کالاها را ببین و برای مراجعه آماده شو.", label: "کشف فروشگاه‌ها", href: "/stores" },
      { text: "شهر بازار را خودت انتخاب کن؛ مکان‌یابی فقط با درخواست خودت انجام می‌شود.", label: "انتخاب شهر", href: "#marketCityCombobox" }
    ];
    let index = 0;
    let timer = null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function show(next) {
      index = (next + items.length) % items.length;
      message.textContent = items[index].text;
      link.href = items[index].href;
      link.firstChild.textContent = items[index].label + " ";
    }
    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }
    function start() {
      stop();
      if (!reduceMotion && !document.hidden) timer = window.setInterval(() => show(index + 1), 5000);
    }
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", (event) => {
      if (!root.contains(event.relatedTarget)) start();
    });
    root.addEventListener("touchstart", stop, { passive: true });
    root.addEventListener("touchend", start, { passive: true });
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
    show(0);
    start();
  })();

  loadListings();
  loadStores();
})();
