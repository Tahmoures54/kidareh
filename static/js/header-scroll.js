/**
 * Toggle .is-scrolled on the sticky header once the page scrolls.
 * Loaded as an ES module from base.html.
 * The trailing `export {}` marks this file as a valid ES module so that
 * `import "kidareh-header-scroll"` in base.html resolves correctly.
 */
(() => {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);

  // Apply the correct class immediately on page load (e.g. after a refresh
  // while scrolled down).
  onScroll();

  // Passive listener keeps scrolling smooth on mobile.
  window.addEventListener("scroll", onScroll, { passive: true });
})();

export {};