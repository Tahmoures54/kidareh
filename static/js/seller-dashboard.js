/**
 * Seller Console — Dashboard behavior
 *   1. Dialogs (add product + store edit)
 *   2. Stats chart (with fallback table when Chart.js is unavailable)
 *   3. aria-busy sync for the products grid
 *
 * Loaded only on /seller via dashboard.html. Chart.js is loaded by the
 * same template before this file (both `defer`).
 */
(() => {
  "use strict";

  // ═══════════════════════════════════════════════════════════════
  // 1. Dialogs — add product & store edit
  // ═══════════════════════════════════════════════════════════════
  {
    const addDialog = document.getElementById("addProductDialog");
    const editDialog = document.getElementById("storeEditDialog");
    const supportsDialog =
      typeof HTMLDialogElement !== "undefined" &&
      typeof HTMLDialogElement.prototype.showModal === "function";

    const openDialog = (dialog) => {
      if (!dialog) return;
      if (!supportsDialog) {
        // Fallback: scroll to the store panel
        document.getElementById("storePanel")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      dialog.showModal();
    };

    // Event delegation — works for buttons rendered later by seller.js too
    document.addEventListener("click", (event) => {
      const addBtn = event.target.closest("[data-open-add-product]");
      if (addBtn) {
        if (addBtn.disabled) return;
        event.preventDefault();
        openDialog(addDialog);
        return;
      }

      const editBtn = event.target.closest("[data-open-store-edit]");
      if (editBtn) {
        if (editBtn.disabled || editBtn.hidden) return;
        event.preventDefault();
        openDialog(editDialog);
        return;
      }

      // Universal closer — finds the parent <dialog> of whichever
      // [data-dialog-close] button was clicked
      const closer = event.target.closest("[data-dialog-close]");
      if (closer) {
        const parentDialog = closer.closest("dialog");
        if (parentDialog && parentDialog.open) {
          event.preventDefault();
          parentDialog.close();
        }
      }
    });

    // Backdrop click + cleanup on close for every seller dialog
    document.querySelectorAll("dialog.seller-product-dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", () => {
        const feedback = dialog.querySelector("#sellerProductFeedback");
        if (feedback) feedback.textContent = "";
      });
    });

    // seller.js dispatches this after a successful product creation
    addDialog?.addEventListener("kidareh:product-created", () => {
      if (addDialog.open) addDialog.close();
    });

    // Deep-link compatibility
    if (location.hash === "#addProductPanel") {
      window.setTimeout(() => {
        const btn = document.querySelector("[data-open-add-product]:not([disabled])");
        btn?.click();
      }, 500);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Stats chart
  // ═══════════════════════════════════════════════════════════════
  {
    const statsNote = document.getElementById("sellerStatsNote");
    if (statsNote) {
      const viewsEl = document.getElementById("sellerViewsStat");
      const salesEl = document.getElementById("sellerSalesStat");
      const listingsEl = document.getElementById("sellerListingsStat");
      const chartEl = document.getElementById("sellerStatsChart");
      const fmt = (n) => Number(n || 0).toLocaleString("fa-IR");

      const setStatsNote = (text, { retry = false } = {}) => {
        statsNote.replaceChildren(document.createTextNode(text));
        if (retry) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "retry-btn";
          button.textContent = "تلاش دوباره";
          button.addEventListener("click", loadStats);
          statsNote.appendChild(button);
        }
      };

      const renderStatsFallback = (stats) => {
        if (!chartEl || !chartEl.parentElement) return;
        const table = document.createElement("table");
        table.className = "stats-fallback";
        table.style.width = "100%";
        table.innerHTML =
          "<tbody>" +
          "<tr><td>بازدید</td><td>" + fmt(stats.views) + "</td></tr>" +
          "<tr><td>سفارش‌ها</td><td>" + fmt(stats.sales) + "</td></tr>" +
          "<tr><td>تعداد کالا</td><td>" + fmt(stats.listing_count) + "</td></tr>" +
          "</tbody>";
        chartEl.parentElement.replaceChildren(table);
      };

      let chartInstance = null;

      async function loadStats() {
        setStatsNote("در حال دریافت آمار…");
        try {
          const response = await fetch("/api/seller/stats", {
            cache: "no-store",
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          if (response.status === 403) {
            setStatsNote("این بخش فقط برای حساب‌های فروشنده قابل مشاهده است.");
            if (viewsEl) viewsEl.textContent = "—";
            if (salesEl) salesEl.textContent = "—";
            if (listingsEl) listingsEl.textContent = "—";
            return;
          }
          if (!response.ok) throw new Error("stats_unavailable");
          const stats = await response.json();
          if (viewsEl) viewsEl.textContent = fmt(stats.views);
          if (salesEl) salesEl.textContent = fmt(stats.sales);
          if (listingsEl) listingsEl.textContent = fmt(stats.listing_count);

          if (window.Chart && chartEl) {
            chartInstance?.destroy?.();
            chartInstance = new window.Chart(chartEl, {
              type: "bar",
              data: {
                labels: ["بازدید", "سفارش‌ها", "کالاهای ثبت‌شده"],
                datasets: [{
                  label: "آمار",
                  data: [stats.views || 0, stats.sales || 0, stats.listing_count || 0],
                  backgroundColor: ["#0891B2", "#0D9488", "#64748B"],
                  borderRadius: 8,
                  maxBarThickness: 54,
                }],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
              },
            });
            setStatsNote("آمار از داده‌های موجود در پایگاه داده محاسبه شده است.");
          } else {
            renderStatsFallback(stats);
            setStatsNote("نمودار نیازمند بارگذاری Chart.js است؛ اعداد بالا از سرور خوانده شده‌اند.");
          }
        } catch (_) {
          setStatsNote("دریافت آمار ممکن نشد. اتصال اینترنت یا وضعیت سرور را بررسی کنید.", { retry: true });
        }
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadStats, { once: true });
      } else {
        loadStats();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. aria-busy sync for the products grid
  // ═══════════════════════════════════════════════════════════════
  {
    const grid = document.getElementById("pageListings");
    if (grid) {
      const sync = () => {
        grid.setAttribute("aria-busy", grid.querySelector(".loading-card") ? "true" : "false");
      };
      new MutationObserver(sync).observe(grid, { childList: true, subtree: true });
      sync();
    }
  }
})();