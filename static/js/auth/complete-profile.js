(() => {
  "use strict";
  const form = document.querySelector("#completeProfileForm");
  if (!form || !window.KidarehAuth) return;
  const Auth = window.KidarehAuth;
  const feedback = document.querySelector("#completeProfileFeedback");
  const cityPanel = document.querySelector("#buyerCityPanel");
  const cityInput = document.querySelector("#profileCity");
  const button = document.querySelector("#completeProfileButton");
  let busy = false;
  function selectedRole() { return form.querySelector('input[name="role"]:checked')?.value || "seller"; }
  function syncRole() {
    const buyer = selectedRole() === "buyer";
    cityPanel.hidden = !buyer; cityInput.required = buyer; cityInput.disabled = !buyer;
  }
  form.querySelectorAll('input[name="role"]').forEach((radio) => radio.addEventListener("change", syncRole));
  syncRole();
  Auth.api("/api/auth/flow").then((state) => {
    if (state.state === "otp_pending") window.location.replace(Auth.nextUrl("/register/verify"));
    else if (state.state !== "profile_pending") window.location.replace("/register");
  }).catch(() => Auth.feedback(feedback, "وضعیت تأیید شماره دریافت نشد؛ صفحه را تازه‌سازی کنید.", true));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const role = selectedRole();
    const payload = { name: document.querySelector("#profileName").value.trim(), role, city: role === "buyer" ? cityInput.value.trim() : "" };
    if (!payload.name) { Auth.feedback(feedback, "نام و نام خانوادگی را وارد کنید.", true); return; }
    if (role === "buyer" && !payload.city) { Auth.feedback(feedback, "شهر محل سکونت را انتخاب کنید.", true); return; }
    busy = true; button.disabled = true; button.textContent = "در حال ساخت حساب…";
    try {
      const data = await Auth.api("complete-profile", payload);
      if (data.user?.role === "seller") window.location.assign(Auth.nextUrl("/register/store"));
      else {
        const next = new URLSearchParams(location.search).get("next") || "";
        window.location.assign(Auth.safeNext(next) || "/account");
      }
    } catch (error) { Auth.feedback(feedback, error.message, true); }
    finally { busy = false; button.disabled = false; button.textContent = "ساخت حساب"; }
  });
})();
