(() => {
  "use strict";
  const form = document.querySelector("#registerPhoneForm");
  if (!form || !window.KidarehAuth) return;
  const Auth = window.KidarehAuth;
  const feedback = document.querySelector("#registerPhoneFeedback");
  const question = document.querySelector("#registerCaptchaQuestion");
  const submit = document.querySelector("#requestOtpButton");
  const phoneInput = document.querySelector("#registerPhone");
  const captchaInput = document.querySelector("#registerCaptchaAnswer");
  const terms = document.querySelector("#registerTerms");
  let busy = false;
  async function loadChallenge() {
    try {
      const data = await Auth.api("/api/auth/challenge");
      question.textContent = data.question || "محاسبه امنیتی";
    } catch { question.textContent = "بارگذاری محاسبه ناموفق بود؛ صفحه را تازه‌سازی کنید."; }
  }
  async function resumeFlow() {
    try {
      const state = await Auth.api("/api/auth/flow");
      if (state.state === "otp_pending") window.location.replace(Auth.nextUrl("/register/verify"));
      else if (state.state === "profile_pending") window.location.replace(Auth.nextUrl("/register/profile"));
      else if (state.state === "authenticated") await Auth.redirectForUser(state.user);
    } catch { /* A fresh registration remains available. */ }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const phone = Auth.digits(phoneInput.value).replace(/\D/g, "");
    const captcha = Auth.digits(captchaInput.value).trim();
    if (!/^09\d{9}$/.test(phone)) { Auth.feedback(feedback, "شماره همراه معتبر وارد کنید؛ مانند 09123456789.", true); phoneInput.focus(); return; }
    if (!terms.checked) { Auth.feedback(feedback, "برای ادامه، پذیرش قوانین و حریم خصوصی الزامی است.", true); return; }
    busy = true; submit.disabled = true; submit.textContent = "در حال ارسال پیامک…";
    try {
      const data = await Auth.api("request-otp", { phone, captcha_answer: captcha, terms_accepted: true });
      Auth.feedback(feedback, data.message || "کد تأیید ارسال شد.");
      window.location.assign(Auth.nextUrl("/register/verify"));
    } catch (error) {
      Auth.feedback(feedback, error.message, true);
      if (error.code === "captcha_failed") { captchaInput.value = ""; await loadChallenge(); }
    } finally { busy = false; submit.disabled = false; submit.textContent = "دریافت کد تأیید"; }
  });
  loadChallenge();
  resumeFlow();
})();
