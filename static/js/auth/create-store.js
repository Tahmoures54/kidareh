(() => {
  "use strict";
  const form = document.querySelector("#createStoreForm");
  if (!form || !window.KidarehAuth) return;
  const Auth = window.KidarehAuth;
  const feedback = document.querySelector("#createStoreFeedback");
  const button = document.querySelector("#createStoreButton");
  let busy = false;
  Auth.api("/api/auth/me").then(async (data) => {
    if (!data.user || data.user.role !== "seller") { window.location.replace("/register"); return; }
    const store = await Auth.api("/api/my/store");
    if (store.item) window.location.replace("/seller");
  }).catch((error) => { if (error.status === 401) window.location.replace("/login"); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const payload = {
      name: document.querySelector("#storeName").value.trim(),
      category: document.querySelector("#storeCategory").value.trim(),
      city: document.querySelector("#storeCity").value.trim(),
      address: document.querySelector("#storeAddress").value.trim(),
      description: document.querySelector("#storeDescription").value.trim(),
    };
    if (!payload.name || !payload.category || !payload.city) { Auth.feedback(feedback, "نام فروشگاه، دسته‌بندی و شهر را تکمیل کنید.", true); return; }
    busy = true; button.disabled = true; button.textContent = "در حال ساخت فروشگاه…";
    try {
      await Auth.api("/api/stores", payload);
      Auth.feedback(feedback, "فروشگاه ساخته شد؛ در حال ورود به پنل…");
      window.location.assign("/seller");
    } catch (error) { Auth.feedback(feedback, error.message, true); }
    finally { busy = false; button.disabled = false; button.textContent = "ساخت فروشگاه و ورود به پنل"; }
  });
})();
