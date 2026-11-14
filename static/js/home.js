/**
 * Kidareh homepage — promo carousel only.
 *
 * Loaded as a classic (non-module) deferred script from index.html's
 * {% block scripts %}. Header scroll is handled by header-scroll.js which
 * base.html loads as a module.
 *
 * No dependencies. Safe to load on every page: the function exits early
 * if the promo container does not exist.
 */
(() => {
  const visual = document.getElementById("homePromoVisual");
  if (!visual) return;

  const slides = Array.from(visual.querySelectorAll("[data-promo-slide]"));
  const dots = Array.from(visual.querySelectorAll("[data-promo-dot]"));
  if (slides.length < 2 || dots.length !== slides.length) return;

  let active = 0;
  let timer = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CYCLE_MS = 5000;
  const EXIT_MS = 800;

  function show(next) {
    if (next === active) return;
    const previous = active;

    // Old slide fades out to the left, new one slides in from the right.
    slides[previous].classList.remove("is-active");
    slides[previous].classList.add("is-exiting");
    dots[previous].setAttribute("aria-current", "false");

    active = (next + slides.length) % slides.length;

    slides[active].classList.remove("is-exiting");
    slides[active].classList.add("is-active");
    dots[active].setAttribute("aria-current", "true");

    window.setTimeout(
      () => slides[previous].classList.remove("is-exiting"),
      reduceMotion ? 0 : EXIT_MS
    );
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (!reduceMotion && !document.hidden) {
      timer = window.setInterval(
        () => show((active + 1) % slides.length),
        CYCLE_MS
      );
    }
  }

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      show(index);
      start();
    });
  });

  // Pause while hovering or focusing so the user can read the active slide.
  visual.addEventListener("mouseenter", stop);
  visual.addEventListener("mouseleave", start);
  visual.addEventListener("focusin", stop);
  visual.addEventListener("focusout", (event) => {
    // Only resume when focus actually leaves the whole visual, not when it
    // moves between the dots inside it.
    if (!visual.contains(event.relatedTarget)) start();
  });

  // Pause when the tab is hidden; resume when it becomes visible again.
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  start();
})();