/**
 * Kidareh homepage — accessible, lightweight hero carousel.
 * Vanilla JS only; each slide enters from the right, holds centered,
 * then exits left when the next slide arrives.
 */
(() => {
  const visual = document.getElementById("homePromoVisual");
  if (!visual) return;

  const slides = Array.from(visual.querySelectorAll("[data-promo-slide]"));
  const dots = Array.from(visual.querySelectorAll("[data-promo-dot]"));
  const previousButton = visual.querySelector("[data-promo-prev]");
  const nextButton = visual.querySelector("[data-promo-next]");
  const pauseButton = visual.querySelector("[data-promo-pause]");
  if (slides.length < 2 || dots.length !== slides.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const CYCLE_MS = 3200;
  const EXIT_MS = 780;
  let active = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));
  let timer = null;
  let manuallyPaused = false;
  let onScreen = true;
  let touchStartX = null;

  function renderPauseButton() {
    if (!pauseButton) return;
    pauseButton.setAttribute("aria-pressed", String(manuallyPaused));
    pauseButton.textContent = manuallyPaused ? "ادامه حرکت" : "توقف حرکت";
    pauseButton.setAttribute("aria-label", manuallyPaused ? "ادامه پخش خودکار پیام‌ها" : "توقف پخش خودکار پیام‌ها");
  }

  function show(next) {
    const index = (next + slides.length) % slides.length;
    if (index === active) return;

    const previous = active;
    slides[previous].classList.remove("is-active");
    slides[previous].classList.add("is-exiting");
    slides[previous].setAttribute("aria-hidden", "true");
    dots[previous].setAttribute("aria-current", "false");

    active = index;
    slides[active].classList.remove("is-exiting");
    slides[active].classList.add("is-active");
    slides[active].setAttribute("aria-hidden", "false");
    dots[active].setAttribute("aria-current", "true");

    window.setTimeout(() => slides[previous].classList.remove("is-exiting"), reduceMotion.matches ? 0 : EXIT_MS);
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function shouldRun() {
    return !manuallyPaused && onScreen && !document.hidden;
  }

  function start() {
    stop();
    if (shouldRun()) timer = window.setInterval(() => show(active + 1), CYCLE_MS);
  }

  function navigate(next) {
    show(next);
    start();
  }

  dots.forEach((dot, index) => dot.addEventListener("click", () => navigate(index)));
  previousButton?.addEventListener("click", () => navigate(active - 1));
  nextButton?.addEventListener("click", () => navigate(active + 1));

  pauseButton?.addEventListener("click", () => {
    manuallyPaused = !manuallyPaused;
    renderPauseButton();
    start();
  });

  visual.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); navigate(active + 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); navigate(active - 1); }
  });

  visual.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
    stop();
  }, { passive: true });
  visual.addEventListener("touchend", (event) => {
    const endX = event.changedTouches[0]?.clientX;
    if (touchStartX !== null && typeof endX === "number") {
      const delta = endX - touchStartX;
      if (Math.abs(delta) > 45) navigate(active + (delta < 0 ? 1 : -1));
    }
    touchStartX = null;
    start();
  }, { passive: true });
  visual.addEventListener("touchcancel", () => { touchStartX = null; start(); }, { passive: true });

  document.addEventListener("visibilitychange", start);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      onScreen = Boolean(entries[0]?.isIntersecting);
      start();
    }, { threshold: 0.15 });
    observer.observe(visual);
  }

  // Reduced-motion users still get the content rotation; CSS removes the animation.
  renderPauseButton();
  start();
})();
