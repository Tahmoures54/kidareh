(() => {
  const page = window.KIDAREH_PAGE || {};
  if (page.type !== "seller") return;

  const tokenMeta = document.querySelector('meta[name="csrf-token"]');
  const toast = document.querySelector("#pageToast");
  const fmt = new Intl.NumberFormat("fa-IR");
  const escapeHTML = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  async function api(url, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.method && options.method !== "GET") {
      headers["X-CSRF-Token"] = tokenMeta?.content || "";
    }
    const response = await fetch(url, { cache: "no-store", ...options, headers, credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || "درخواست انجام نشد.");
    return data;
  }

  function setAddProductAvailability(canAdd, reason) {
    document.querySelectorAll("[data-open-add-product]").forEach((btn) => {
      btn.disabled = !canAdd;
      btn.title = canAdd ? "" : (reason || "ابتدا ویترین بساز");
    });
  }

  function setStoreEditVisibility(canEdit) {
    // The wrapper div holds the edit button that opens the store-edit dialog
    document.querySelectorAll("[data-store-edit-actions]").forEach((el) => {
      el.hidden = !canEdit;
    });
  }

  async function loadSellerListings(storeId) {
    const target = document.querySelector("#pageListings");
    if (!target || !storeId) return;
    target.innerHTML = '<div class="loading-card">در حال دریافت کالاهای ویترین…</div>';
    try {
      const data = await api("/api/stores/" + storeId);
      const items = data.items || [];
      target.innerHTML = items.length
        ? items
            .map((item) => {
              const price = Number(item.price) > 0 ? fmt.format(item.price) + " تومان" : "قیمت توافقی";
              const art = item.image_path
                ? '<img src="' + escapeHTML(item.image_path) + '" alt="' + escapeHTML(item.title) + '" loading="lazy">'
                : "<span>" + escapeHTML(item.emoji || "🛍️") + "</span>";
              return (
                '<article class="page-listing-card"><a class="page-listing-art" href="/product/' +
                item.id +
                '">' +
                art +
                '</a><div class="page-listing-body"><h3>' +
                escapeHTML(item.title) +
                "</h3><p>" +
                escapeHTML(item.description || "") +
                '</p><div class="seller-stock-status">' +
                (item.availability_status === "in_stock"
                  ? "موجود است"
                  : item.availability_status === "out_of_stock"
                  ? "فعلاً ناموجود"
                  : "موجودی را از فروشنده بپرسید") +
                (item.price_updated_at
                  ? " · آخرین به‌روزرسانی قیمت: " +
                    escapeHTML(new Date(item.price_updated_at).toLocaleDateString("fa-IR"))
                  : "") +
                '</div><div class="page-listing-footer"><strong>' +
                price +
                '</strong><label class="seller-price-inline">قیمت <input type="number" min="0" max="1000000000000" step="1" value="' +
                Number(item.price || 0) +
                '" data-listing-price="' +
                item.id +
                '"></label><button type="button" class="button button-outline" data-save-listing="' +
                item.id +
                '">ذخیره</button><select aria-label="وضعیت موجودی" data-listing-availability="' +
                item.id +
                '"><option value="in_stock"' +
                (item.availability_status === "in_stock" ? " selected" : "") +
                '>موجود</option><option value="out_of_stock"' +
                (item.availability_status === "out_of_stock" ? " selected" : "") +
                '>ناموجود</option><option value="ask"' +
                (!item.availability_status || item.availability_status === "ask" ? " selected" : "") +
                '>تماس بگیرید</option></select><button type="button" data-delete-listing="' +
                item.id +
                '" class="button button-outline">حذف</button></div></div></article>'
              );
            })
            .join("")
        : '<div class="empty-page-state"><span aria-hidden="true">＋</span><h3>یک قدم تا آنلاین‌شدن فروشگاهت</h3><p>اولین کالا را ثبت کن تا ویترینت برای مشتری‌ها قابل مشاهده شود. عکس و توضیحات ضروری نیستند.</p><button class="button button-primary" type="button" data-open-add-product>ثبت اولین کالا</button></div>';
      const count = document.querySelector("#pageResultsCount");
      if (count) count.textContent = fmt.format(items.length) + " کالا";
      const productMetric = document.querySelector("#sellerProductMetric");
      if (productMetric) productMetric.textContent = fmt.format(items.length) + " کالا";
      const nextStepMetric = document.querySelector("#sellerNextStepMetric");
      if (nextStepMetric) nextStepMetric.textContent = items.length ? "به‌روزرسانی موجودی" : "ثبت اولین کالا";
      // The empty-state button was rendered after setAddProductAvailability
      // ran; make sure it also reflects the current state.
      setAddProductAvailability(true);
    } catch (e) {
      target.innerHTML = '<div class="empty-page-state">' + escapeHTML(e.message) + "</div>";
    }
  }

  async function initSeller() {
    const status = document.querySelector("#sellerStatus");
    const createForm = document.querySelector("#storeCreateForm");
    const editForm = document.querySelector("#storeEditForm");
    const productForm = document.querySelector("#sellerProductForm");
    let storeId = null;

    try {
      const me = await api("/api/auth/me");

      // ── Guest ──
      if (!me.user) {
        const storeMetric = document.querySelector("#sellerStoreMetric");
        const nextMetric = document.querySelector("#sellerNextStepMetric");
        if (storeMetric) storeMetric.textContent = "نیازمند ورود";
        if (nextMetric) nextMetric.textContent = "ورود به حساب";
        if (status)
          status.innerHTML =
            'برای مدیریت ویترین باید <a href="/login">وارد حساب</a> شوی یا <a href="/register">ثبت‌نام</a> کنی.';
        if (createForm) createForm.hidden = true;
        setAddProductAvailability(false, "ابتدا وارد حساب شوید");
        setStoreEditVisibility(false);
        return;
      }
      if (me.csrf_token && tokenMeta) tokenMeta.content = me.csrf_token;

      // ── Buyer ──
      if (me.user.role !== "seller") {
        const storeMetric = document.querySelector("#sellerStoreMetric");
        const nextMetric = document.querySelector("#sellerNextStepMetric");
        if (storeMetric) storeMetric.textContent = "حساب خریدار";
        if (nextMetric) nextMetric.textContent = "فعال‌سازی فروشندگی";
        if (status) {
          status.innerHTML =
            "حساب فعلی شما خریدار است. برای ساخت ویترین و ثبت کالا، حساب را به فروشنده تبدیل کنید." +
            ' <button type="button" class="button button-primary" id="becomeSellerButton">تبدیل حساب به فروشنده</button>';
        }
        if (createForm) createForm.hidden = true;
        setAddProductAvailability(false, "فقط فروشندگان می‌توانند کالا ثبت کنند");
        setStoreEditVisibility(false);

        const becomeSellerButton = document.querySelector("#becomeSellerButton");
        becomeSellerButton?.addEventListener("click", async () => {
          const oldLabel = becomeSellerButton.textContent;
          becomeSellerButton.disabled = true;
          becomeSellerButton.textContent = "در حال انجام…";
          try {
            await api("/api/auth/become-seller", { method: "POST" });
            window.location.reload();
          } catch (error) {
            notify(error.message || "تبدیل حساب انجام نشد.");
            becomeSellerButton.disabled = false;
            becomeSellerButton.textContent = oldLabel;
          }
        });
        return;
      }

      // ── Seller: check store existence ──
      const mine = await api("/api/my/store");
      const store = mine.item;

      // ── Seller without store ──
      if (!store) {
        const storeMetric = document.querySelector("#sellerStoreMetric");
        const nextMetric = document.querySelector("#sellerNextStepMetric");
        if (storeMetric) storeMetric.textContent = "ساخته نشده";
        if (nextMetric) nextMetric.textContent = "ساخت ویترین";
        if (status)
          status.innerHTML =
            "<strong>سلام " +
            escapeHTML(me.user.name) +
            "</strong><br>هنوز ویترین نساخته‌ای. فرم زیر را پر کن.";
        if (createForm) createForm.hidden = false;
        setAddProductAvailability(false, "ابتدا ویترین بساز");
        setStoreEditVisibility(false);
        return;
      }

      // ── Seller with store ──
      storeId = store.id;
      const storeMetric = document.querySelector("#sellerStoreMetric");
      const welcomeTitle = document.querySelector("#sellerWelcomeTitle");
      if (storeMetric) storeMetric.textContent = "فعال";
      if (welcomeTitle) welcomeTitle.textContent = store.name || "فروشگاه من";
      const storeAvatar = document.querySelector("#sellerStoreAvatar");
      if (storeAvatar) {
        storeAvatar.textContent = Array.from(String(store.name || "ف").trim())[0] || "ف";
        storeAvatar.setAttribute("aria-label", "نماد فروشگاه " + (store.name || ""));
      }
      const welcomeDescription = document.querySelector("#sellerWelcomeDescription");
      if (welcomeDescription) {
        welcomeDescription.textContent = [store.city, store.category].filter(Boolean).join(" · ") ||
          "کالاها و خدمات ویترین فروشگاهت را مدیریت کن.";
      }

      // Populate the edit dialog form (hidden until user clicks "ویرایش")
      if (editForm && store) {
        ["name", "category", "city", "description", "address", "latitude", "longitude"].forEach(
          (key) => {
            if (editForm.elements[key]) editForm.elements[key].value = store[key] ?? "";
          }
        );
      }

      // Auto-prefill the add-product form from the store's city / category
      if (productForm && store) {
        if (productForm.elements.city) productForm.elements.city.value = store.city || "";
        const categorySelect = productForm.elements.category;
        if (
          categorySelect &&
          store.category &&
          [...categorySelect.options].some((option) => option.value === store.category)
        ) {
          categorySelect.value = store.category;
        }
      }

      // Status panel
      if (status)
        status.innerHTML =
          "<strong>" +
          escapeHTML(store.name) +
          "</strong><br>" +
          escapeHTML(store.city) +
          '<br><a href="/store/' +
          encodeURIComponent(store.id) +
          '" class="text-link">مشاهده ویترین عمومی ←</a>';

      if (createForm) createForm.hidden = true;
      setAddProductAvailability(true);
      setStoreEditVisibility(true);
      await loadSellerListings(storeId);

      // ── Create form submit ──
      createForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await api("/api/stores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: createForm.name.value.trim(),
              city: createForm.city.value.trim(),
              description: createForm.description.value.trim(),
              category: createForm.category?.value || "",
              address: createForm.address?.value.trim() || "",
              latitude: createForm.latitude?.value || null,
              longitude: createForm.longitude?.value || null,
            }),
          });
          notify("ویترین ساخته شد.");
          location.reload();
        } catch (err) {
          notify(err.message);
        }
      });

      // ── Edit form submit (inside dialog) ──
      editForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!storeId) return;

        const submitBtn = editForm
          .closest("dialog")
          ?.querySelector('button[type="submit"][form="storeEditForm"]');
        const originalText = submitBtn?.textContent || "ذخیره تغییرات";
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "در حال ذخیره…";
        }

        try {
          await api("/api/stores/" + storeId, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: editForm.name.value.trim(),
              city: editForm.city.value.trim(),
              description: editForm.description.value.trim(),
              category: editForm.category?.value || "",
              address: editForm.address?.value.trim() || "",
              latitude: editForm.latitude?.value || null,
              longitude: editForm.longitude?.value || null,
            }),
          });
          notify("اطلاعات ویترین ذخیره شد.");
          location.reload();
        } catch (err) {
          notify(err.message || "ذخیرهٔ اطلاعات فروشگاه انجام نشد.");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
        }
      });

      // ── Add product form submit (inside dialog) ──
      productForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!storeId) {
          notify("ابتدا ویترین بساز.");
          return;
        }

        const submitBtn = document.querySelector("[data-dialog-submit]");
        const originalText = submitBtn?.textContent || "ثبت کالا";
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "در حال ثبت…";
        }

        try {
          const fd = new FormData(productForm);
          const response = await fetch("/api/listings", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "X-CSRF-Token": tokenMeta?.content || "",
              Accept: "application/json",
            },
            body: fd,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(data.message || data.error || "ثبت کالا انجام نشد.");
          notify("کالا ثبت شد؛ ویترینت آمادهٔ معرفی است 🎉");
          productForm.reset();
          if (productForm.elements.city) productForm.elements.city.value = store?.city || "";
          const categorySelect = productForm.elements.category;
          if (
            categorySelect &&
            store?.category &&
            [...categorySelect.options].some((option) => option.value === store.category)
          ) {
            categorySelect.value = store.category;
          }
          await loadSellerListings(storeId);

          const dialog = document.getElementById("addProductDialog");
          if (dialog && typeof dialog.close === "function") {
            dialog.close();
            dialog.dispatchEvent(
              new CustomEvent("kidareh:product-created", { bubbles: true })
            );
          }
          window.setTimeout(() => {
            document.querySelector("#myProductsPanel")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 60);
        } catch (err) {
          notify(err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
        }
      });

      // ── Inline listing edits (price / availability) ──
      document.addEventListener("change", async (e) => {
        const select = e.target.closest("[data-listing-availability]");
        if (!select) return;
        select.disabled = true;
        try {
          await api("/api/listings/" + select.dataset.listingAvailability, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ availability_status: select.value }),
          });
          notify("وضعیت موجودی به‌روز شد.");
          await loadSellerListings(storeId);
        } catch (err) {
          notify(err.message);
        } finally {
          select.disabled = false;
        }
      });

      document.addEventListener("click", async (e) => {
        const save = e.target.closest("[data-save-listing]");
        if (save) {
          const id = save.dataset.saveListing;
          const input = document.querySelector('[data-listing-price="' + id + '"]');
          const stock = document.querySelector('[data-listing-availability="' + id + '"]');
          const price = Number(input?.value);
          if (!Number.isSafeInteger(price) || price < 0 || price > 1000000000000) {
            notify("قیمت معتبر وارد کن.");
            return;
          }
          save.disabled = true;
          try {
            await api("/api/listings/" + id, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                price,
                availability_status: stock?.value || "ask",
              }),
            });
            notify("قیمت و موجودی به‌روز شد.");
            await loadSellerListings(storeId);
          } catch (err) {
            notify(err.message);
          } finally {
            save.disabled = false;
          }
          return;
        }
        const del = e.target.closest("[data-delete-listing]");
        if (!del) return;
        if (!confirm("این کالا حذف شود؟")) return;
        try {
          await api("/api/listings/" + del.dataset.deleteListing, { method: "DELETE" });
          notify("کالا حذف شد.");
          await loadSellerListings(storeId);
        } catch (err) {
          notify(err.message);
        }
      });
    } catch (e) {
      if (status) status.textContent = e.message || "بارگذاری پنل فروشنده ناموفق بود.";
      setAddProductAvailability(false, "بارگذاری وضعیت حساب ممکن نشد");
      setStoreEditVisibility(false);
    }
  }

  function setupStoreLocationCapture() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-capture-store-location]");
      if (!button) return;
      const form = button.closest("form");
      const status = form?.querySelector("[data-location-status]");
      const latitude = form?.elements.latitude;
      const longitude = form?.elements.longitude;
      if (!form || !latitude || !longitude) return;
      if (!("geolocation" in navigator)) {
        if (status)
          status.textContent =
            "این مرورگر امکان دریافت موقعیت مکانی را ندارد؛ شهر و نشانی را وارد کن.";
        return;
      }
      button.disabled = true;
      button.textContent = "در حال دریافت موقعیت…";
      if (status)
        status.textContent = "لطفاً اجازهٔ دسترسی به موقعیت مکانی را در مرورگر تأیید کن.";
      navigator.geolocation.getCurrentPosition(
        (position) => {
          latitude.value = position.coords.latitude.toFixed(6);
          longitude.value = position.coords.longitude.toFixed(6);
          if (status) status.textContent = "موقعیت ثبت شد. مختصات همراه فرم ذخیره می‌شود.";
          button.disabled = false;
          button.textContent = "📍 دریافت دوبارهٔ موقعیت";
        },
        (error) => {
          const messages = {
            1: "اجازهٔ موقعیت مکانی داده نشد؛ از تنظیمات مرورگر اجازه بده یا شهر و نشانی را وارد کن.",
            2: "موقعیت فعلاً در دسترس نیست؛ GPS یا سرویس مکان‌یابی دستگاه را بررسی کن.",
            3: "دریافت موقعیت بیش از حد طول کشید؛ دوباره تلاش کن.",
          };
          if (status)
            status.textContent =
              messages[error.code] ||
              "دریافت موقعیت ناموفق بود؛ شهر و نشانی را وارد کن.";
          button.disabled = false;
          button.textContent = "📍 تلاش دوباره برای ثبت موقعیت";
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  }

  function setupLivePreview() {
    const form = document.querySelector("#sellerProductForm");
    if (!form) return;
    let preview = document.querySelector("#sellerLivePreview");
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "sellerLivePreview";
      preview.className = "seller-live-preview";
      preview.innerHTML =
        '<span class="seller-live-preview-label">پیش‌نمایش زنده</span>' +
        '<div class="seller-live-preview-card">' +
        '<strong id="previewTitle">عنوان کالا اینجا دیده می‌شود</strong>' +
        '<small id="previewMeta">شهر · دسته</small>' +
        '<span class="preview-price" id="previewPrice">قیمت</span>' +
        '<p id="previewDesc" style="margin:0;color:#64748B;font-size:.82rem;line-height:1.6">توضیح کوتاه کالا</p>' +
        "</div>";
      form.appendChild(preview);
    }
    const titleEl = preview.querySelector("#previewTitle");
    const metaEl = preview.querySelector("#previewMeta");
    const priceEl = preview.querySelector("#previewPrice");
    const descEl = preview.querySelector("#previewDesc");
    const update = () => {
      const title = (form.title?.value || form.querySelector("[name=title]")?.value || "").trim();
      const city = (form.city?.value || "شهر").trim();
      const cat =
        form.category?.selectedOptions?.[0]?.textContent || form.category?.value || "دسته";
      const priceRaw = form.price?.value || form.querySelector("[name=price]")?.value || "";
      const desc = (form.description?.value || form.querySelector("[name=description]")?.value || "").trim();
      if (titleEl) titleEl.textContent = title || "عنوان کالا اینجا دیده می‌شود";
      if (metaEl) metaEl.textContent = city + " · " + cat;
      if (priceEl) {
        const n = Number(String(priceRaw).replace(/[^\d.]/g, ""));
        priceEl.textContent = n > 0 ? fmt.format(n) + " تومان" : "توافقی";
      }
      if (descEl) descEl.textContent = desc || "توضیح کوتاه کالا";
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
  }

  Promise.resolve(initSeller()).finally(setupLivePreview);
  setupStoreLocationCapture();
})();