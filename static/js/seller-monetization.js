/**
 * Seller Console — Monetization page.
 * Loaded only from monetization.html.
 * Handles package purchase buttons and the orders table.
 */
(() => {
  const status = document.getElementById("moneyStatus");
  const orders = document.getElementById("moneyOrders");
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";

  if (!status || !orders) return;

  const say = (text, kind) => {
    status.textContent = text;
    status.classList.remove("is-error", "is-success");
    if (kind) status.classList.add(kind);
  };

  // ----- Buy buttons -----
  document.querySelectorAll(".buy-package").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      say("در حال آماده‌سازی پرداخت امن…");
      try {
        const response = await fetch("/api/monetization/orders", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
          },
          body: JSON.stringify({ package_id: button.dataset.package }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.message ||
              (data.error === "authentication_required"
                ? "ابتدا وارد حساب شوید."
                : "امکان شروع پرداخت وجود ندارد.")
          );
        }
        if (!data.redirect_url) throw new Error("نشانی درگاه دریافت نشد.");
        window.location.assign(data.redirect_url);
      } catch (error) {
        say(error.message || "ارتباط برقرار نشد، دوباره امتحان می‌کنیم؟", "is-error");
        button.disabled = false;
      }
    });
  });

  // ----- Orders table -----
  const renderOrdersError = (message) => {
    orders.setAttribute("aria-busy", "false");
    orders.replaceChildren(document.createTextNode(message + " "));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "retry-btn";
    button.textContent = "تلاش دوباره";
    button.addEventListener("click", loadOrders);
    orders.appendChild(button);
  };

  async function loadOrders() {
    orders.setAttribute("aria-busy", "true");
    orders.textContent = "در حال بارگذاری سفارش‌ها…";
    try {
      const response = await fetch("/api/monetization/orders", {
        credentials: "same-origin",
      });
      if (response.status === 401) {
        orders.setAttribute("aria-busy", "false");
        orders.textContent = "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
        return;
      }
      if (!response.ok) {
        renderOrdersError("دریافت سفارش‌ها ممکن نشد.");
        return;
      }
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        orders.setAttribute("aria-busy", "false");
        orders.textContent = "هنوز سفارشی ثبت نشده است.";
        return;
      }
      const names = Object.fromEntries(
        [...document.querySelectorAll(".buy-package")].map((b) => [
          b.dataset.package,
          b.closest(".money-card").querySelector("h2").textContent,
        ])
      );
      const table = document.createElement("table");
      const head = document.createElement("tr");
      ["شماره", "بسته", "مبلغ (تومان)", "وضعیت", "تاریخ"].forEach((label) => {
        const th = document.createElement("th");
        th.textContent = label;
        head.appendChild(th);
      });
      const thead = document.createElement("thead");
      thead.appendChild(head);
      table.appendChild(thead);
      const body = document.createElement("tbody");
      data.items.forEach((item) => {
        const tr = document.createElement("tr");
        [
          item.id,
          names[item.package_id] || item.package_id,
          Number(item.amount_toman).toLocaleString("fa-IR"),
          ({ paid: "پرداخت‌شده", pending: "در انتظار پرداخت", failed: "ناموفق" }[item.status] || item.status),
          item.created_at,
        ].forEach((v) => {
          const td = document.createElement("td");
          td.textContent = String(v ?? "");
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      table.appendChild(body);
      orders.replaceChildren(table);
      orders.setAttribute("aria-busy", "false");
    } catch {
      renderOrdersError("ارتباط با سرور برقرار نشد.");
    }
  }

  // ----- URL feedback -----
  const params = new URLSearchParams(location.search);
  if (params.get("payment") === "success") {
    say("پرداخت تأیید شد و بسته خریداری‌شده فعال شد.", "is-success");
  } else if (params.get("payment")) {
    say(
      "پرداخت تأیید نشد؛ اگر مبلغی کسر شده، کد سفارش را نگه دارید و با پشتیبانی پیگیری کنید.",
      "is-error"
    );
  }
  loadOrders();
})();