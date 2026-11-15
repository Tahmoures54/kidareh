(() => {
  "use strict";
  const form = document.querySelector("#verifyOtpForm");
  if (!form || !window.KidarehAuth) return;
  const Auth = window.KidarehAuth;
  const codeInput = document.querySelector("#verifyOtpCode");
  const phoneLabel = document.querySelector("#verifyPhoneLabel");
  const feedback = document.querySelector("#verifyOtpFeedback");
  const countdown = document.querySelector("#otpResendCountdown");
  const resendButton = document.querySelector("#resendOtpButton");
  const captchaPanel = document.querySelector("#resendCaptchaPanel");
  const captchaQuestion = document.querySelector("#resendCaptchaQuestion");
  const captchaAnswer = document.querySelector("#resendCaptchaAnswer");
  const confirmResend = document.querySelector("#confirmResendButton");
  let flow = null, timer = null, busy = false;
  function startCountdown(seconds) {
    if (timer) window.clearInterval(timer);
    let remaining = Math.max(0, Number(seconds) || 0);
    const render = () => {
      countdown.textContent = remaining > 0
        ? "برای ارسال دوباره " + remaining.toLocaleString("fa-IR") + " ثانیه صبر کنید."
        : "اکنون می‌توانید کد تازه درخواست کنید.";
      resendButton.disabled = remaining > 0;
    };
    render();
    if (remaining <= 0) return;
    timer = window.setInterval(() => {
      remaining = Math.max(0, remaining - 1); render();
      if (!remaining) window.clearInterval(timer);
    }, 1000);
  }
  async function loadFlow() {
    try {
      flow = await Auth.api("/api/auth/flow");
      if (flow.state === "profile_pending") { window.location.replace(Auth.nextUrl("/register/profile")); return false; }
      if (flow.state === "authenticated") { await Auth.redirectForUser(flow.user); return false; }
      if (flow.state !== "otp_pending" || !flow.phone) { window.location.replace("/register"); return false; }
      phoneLabel.textContent = flow.masked_phone || "شماره همراه شما";
      startCountdown(flow.resend_after);
      return true;
    } catch { Auth.feedback(feedback, "وضعیت ثبت‌نام دریافت نشد؛ صفحه را تازه‌سازی کنید.", true); return false; }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const code = Auth.digits(codeInput.value).replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) { Auth.feedback(feedback, "کد تأیید باید دقیقاً شش رقم باشد.", true); codeInput.focus(); return; }
    busy = true;
    const button = document.querySelector("#verifyOtpButton"); button.disabled = true;
    try {
      const data = await Auth.api("verify-otp", { code });
      if (data.existing_user && data.user) {
        Auth.feedback(feedback, "ورود موفق بود؛ در حال انتقال…");
        await Auth.redirectForUser(data.user, new URLSearchParams(location.search).get("next") || "");
        return;
      }
      if (data.phone_verified) { window.location.assign(Auth.nextUrl("/register/profile")); return; }
      throw new Error("پاسخ نامعتبر از سرور دریافت شد.");
    } catch (error) {
      Auth.feedback(feedback, error.message, true);
      if (error.code === "otp_expired" || error.code === "otp_locked") window.setTimeout(() => window.location.assign("/register"), 900);
    } finally { busy = false; button.disabled = false; }
  });
  resendButton.addEventListener("click", async () => {
    if (resendButton.disabled || !flow) return;
    try {
      const data = await Auth.api("/api/auth/challenge");
      captchaQuestion.textContent = data.question || "محاسبه امنیتی";
      captchaPanel.hidden = false; captchaAnswer.focus(); resendButton.disabled = true;
    } catch { Auth.feedback(feedback, "بارگذاری محاسبه امنیتی ناموفق بود.", true); }
  });
  confirmResend.addEventListener("click", async () => {
    if (busy || !flow) return;
    const answer = Auth.digits(captchaAnswer.value).trim();
    if (!answer) { Auth.feedback(feedback, "پاسخ محاسبه امنیتی را وارد کنید.", true); return; }
    busy = true; confirmResend.disabled = true;
    try {
      await Auth.api("request-otp", { phone: flow.phone, captcha_answer: answer, terms_accepted: true });
      Auth.feedback(feedback, "کد تازه ارسال شد.");
      window.location.replace(Auth.nextUrl("/register/verify"));
    } catch (error) {
      Auth.feedback(feedback, error.message, true);
      if (error.code === "captcha_failed") {
        captchaAnswer.value = "";
        const challenge = await Auth.api("/api/auth/challenge");
        captchaQuestion.textContent = challenge.question || "محاسبه امنیتی";
      }
      if (error.retryAfter) startCountdown(error.retryAfter);
    } finally { busy = false; confirmResend.disabled = false; }
  });
  loadFlow();
})();
