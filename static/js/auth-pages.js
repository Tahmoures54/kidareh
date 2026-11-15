
(() => {
  const root = document.querySelector(".auth-page");
  if (!root) return;

  const mode = root.dataset.authMode || "login";
  const isRegister = mode === "register";

  const query = new URLSearchParams(window.location.search);
  const rawNext = query.get("next") || "";

  // Only allow local absolute paths. Reject protocol-relative and backslash URLs.
  const requestedNext =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes("\\")
      ? rawNext
      : "";

  const authUrl = (path) => {
    const params = new URLSearchParams();
    if (requestedNext) params.set("next", requestedNext);
    return path + (params.size ? "?" + params.toString() : "");
  };

  document
    .querySelectorAll('a[href="/login"], a[href="/register"]')
    .forEach((link) => {
      link.href = authUrl(link.getAttribute("href"));
    });

  const form = document.querySelector("#authPageForm");
  if (!form) return;

  const phoneStep = document.querySelector("#authPhoneStep");
  const codeStep = document.querySelector("#authCodeStep");
  const profileStep = document.querySelector("#authProfileStep");
  const roleStep = document.querySelector("#authRoleStep");
  const captchaQuestion = document.querySelector("#captchaQuestion");
  const feedback = document.querySelector("#authFeedback");
  const tokenMeta = document.querySelector('meta[name="csrf-token"]');
  const buyerDetails = document.querySelector("#buyerDetails");

  const stepsIndicator = document.querySelector(
    isRegister ? "#registerStepsIndicator" : "#loginStepsIndicator"
  );

  let busy = false;
  let currentStep = isRegister ? "role" : "phone";
  let otpAbortController = null;

  const digits = (value) =>
    String(value || "").replace(/[۰-۹٠-٩]/g, (character) => {
      const index = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(character);
      return index >= 0 ? String(index % 10) : character;
    });

  function maskPhone(value) {
    const normalized = digits(value).replace(/\D/g, "");
    return normalized.length === 11
      ? `${normalized.slice(0, 2)}•••••${normalized.slice(-4)}`
      : normalized;
  }

  function message(text, isError = false) {
    if (!feedback) return;

    feedback.textContent = text || "";
    feedback.classList.toggle(
      "success",
      Boolean(text) && !isError
    );
    feedback.style.color = isError ? "#B91C1C" : "#0E7490";
  }

  async function api(path, payload) {
    const response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-Token": tokenMeta?.content || "",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "درخواست انجام نشد. دوباره تلاش کنید."
      );
    }

    return data;
  }

  async function loadChallenge() {
    if (!captchaQuestion) return;

    try {
      const response = await fetch("/api/auth/challenge", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("challenge_unavailable");
      }

      const data = await response.json();
      captchaQuestion.textContent =
        data.question || "پاسخ محاسبه امنیتی را وارد کنید";
    } catch {
      captchaQuestion.textContent =
        "بارگذاری محاسبه امنیتی ناموفق بود؛ صفحه را تازه‌سازی کنید.";
    }
  }

  function updateStepsIndicator(step) {
    if (!stepsIndicator) return;

    const order = isRegister
      ? ["role", "phone", "code"]
      : ["phone", "code"];

    const index = order.indexOf(step);

    stepsIndicator.querySelectorAll(".step-dot").forEach((dot) => {
      const stepName = dot.dataset.step;
      const dotIndex = order.indexOf(stepName);

      dot.classList.toggle("active", stepName === step);
      dot.classList.toggle("done", dotIndex >= 0 && dotIndex < index);
    });
  }

  function selectedRole() {
    const checked = form.querySelector(
      'input[name="role"]:checked'
    );

    return checked ? checked.value : "buyer";
  }

  function syncSellerDetails() {
    const isSeller = selectedRole() === "seller";

    if (buyerDetails) {
      buyerDetails.hidden = isSeller;
    }

    const buyerCity = form.elements.city;
    if (buyerCity) {
      buyerCity.required = !isSeller;
      buyerCity.disabled = isSeller;
    }

    const sellerDetails = document.querySelector("#sellerDetails");
    if (sellerDetails) {
      sellerDetails.hidden = !isSeller;
    }
  }

  function stopWebOtp() {
    otpAbortController?.abort();
    otpAbortController = null;
  }

  function startWebOtp() {
    if (
      !window.isSecureContext ||
      !("OTPCredential" in window) ||
      !navigator.credentials?.get
    ) {
      return;
    }

    stopWebOtp();
    otpAbortController = new AbortController();

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: otpAbortController.signal,
      })
      .then((credential) => {
        if (!credential?.code || currentStep !== "code") return;

        const otpInput = form.elements.otp;
        if (!otpInput) return;

        otpInput.value = digits(credential.code).slice(0, 6);

        if (otpInput.value.length === 6) {
          form.requestSubmit();
        }
      })
      .catch(() => {
        // Manual OTP entry remains available.
      });
  }

  function showStep(step) {
    currentStep = step;

    if (step !== "code") {
      stopWebOtp();
    }

    if (roleStep) roleStep.hidden = step !== "role";
    if (phoneStep) phoneStep.hidden = step !== "phone";
    if (codeStep) codeStep.hidden = step !== "code";
    if (profileStep) profileStep.hidden = step !== "profile";

    updateStepsIndicator(step);

    if (step === "phone") {
      form.elements.phone?.focus();
      loadChallenge();
    } else if (step === "code") {
      form.elements.otp?.focus();
      startWebOtp();
    } else if (step === "profile") {
      syncSellerDetails();
      form.elements.name?.focus();
    }
  }

  document
    .querySelector("#backToRoleButton")
    ?.addEventListener("click", () => {
      message("");
      showStep("role");
    });

  document
    .querySelector("#backToPhoneButton")
    ?.addEventListener("click", () => {
      message("");

      if (form.elements.otp) {
        form.elements.otp.value = "";
      }

      if (form.elements.captcha) {
        form.elements.captcha.value = "";
      }

      showStep("phone");
    });

  form
    .querySelectorAll('input[name="role"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        if (currentStep === "role") {
          message("");
          showStep("phone");
          return;
        }

        if (currentStep === "profile") {
          syncSellerDetails();
        }
      });
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (busy) return;

    busy = true;

    const submitButtons = [
      ...form.querySelectorAll('button[type="submit"]'),
    ];

    const originalLabels = submitButtons.map(
      (button) => button.textContent
    );

    submitButtons.forEach((button) => {
      button.disabled = true;
      button.textContent = "در حال انجام…";
    });

    try {
      if (currentStep === "phone") {
        const phone = digits(
          form.elements.phone?.value
        ).trim();

        const captcha = digits(
          form.elements.captcha?.value
        ).trim();

        const data = await api("request-otp", {
          phone,
          captcha_answer: captcha,
          terms_accepted: true,
          registering: isRegister,
          role: selectedRole(),
        });

        const phoneLabel = document.querySelector("#otpPhoneLabel");

        if (phoneLabel) {
          phoneLabel.textContent =
            maskPhone(form.elements.phone?.value || phone);
        }

        showStep("code");
        message(data.message || "کد تأیید ارسال شد.");
        return;
      }

      if (currentStep === "code") {
        const code = digits(
          form.elements.otp?.value
        ).trim();

        const data = await api("verify-otp", { code });

        if (data.existing_user && data.user) {
          if (tokenMeta && data.csrf_token) {
            tokenMeta.content = data.csrf_token;
          }

          message("ورود موفق بود؛ در حال انتقال…");

          const destination =
            requestedNext ||
            (data.user.role === "seller" ? "/seller" : "/");

          window.location.assign(destination);
          return;
        }

        if (data.phone) {
          if (!isRegister) {
            message(
              "حسابی با این شماره یافت نشد. در حال انتقال به ثبت‌نام…"
            );

            window.setTimeout(() => {
              window.location.assign(authUrl("/register"));
            }, 1200);

            return;
          }

          showStep("profile");
          message(
            "شماره تأیید شد؛ اطلاعات حساب را تکمیل کنید."
          );
          return;
        }

        throw new Error(
          "پاسخ نامعتبر از سرور دریافت شد. دوباره تلاش کنید."
        );
      }

      if (currentStep === "profile") {
        const role = selectedRole();

        const payload = {
          name: (form.elements.name?.value || "").trim(),
          role,
          city: role === "buyer"
            ? (form.elements.city?.value || "").trim()
            : "",
        };

        const data = await api("complete-profile", payload);

        if (tokenMeta && data.csrf_token) {
          tokenMeta.content = data.csrf_token;
        }

        message("حساب شما ساخته شد؛ خوش آمدید!");

        const destination =
          requestedNext &&
          (role === "seller" || requestedNext !== "/seller")
            ? requestedNext
            : role === "seller"
              ? "/seller"
              : "/account";

        window.location.assign(destination);
      }
    } catch (error) {
      const errorMessage =
        error?.message ||
        "ارتباط برقرار نشد، دوباره تلاش کنید.";

      message(errorMessage, true);

      if (
        currentStep === "phone" &&
        /محاسبه|captcha|پاسخ/i.test(errorMessage)
      ) {
        if (form.elements.captcha) {
          form.elements.captcha.value = "";
        }

        await loadChallenge();
      }
    } finally {
      busy = false;

      submitButtons.forEach((button, index) => {
        button.disabled = false;
        button.textContent = originalLabels[index];
      });
    }
  });

  // Initial state also loads the challenge if the phone step is first.
  showStep(currentStep);
})();
