/* ==========================================================================
   DICE Engineering & Consultancy — shared site JavaScript
   Vanilla ES6+. No frameworks, no bundler, no external dependencies beyond
   the optional Lucide icon CDN (which degrades gracefully if unavailable).
   --------------------------------------------------------------------------
   Exposes a tiny namespace (window.DICE) with helpers reused by the
   page-specific scripts: services.js, gallery.js, enquiry.js, admin.js
   ========================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     Small DOM helpers
     ---------------------------------------------------------------------- */

  const qs = (selector, scope) => (scope || document).querySelector(selector);
  const qsa = (selector, scope) =>
    Array.prototype.slice.call((scope || document).querySelectorAll(selector));

  const on = (el, type, handler, options) => {
    if (el) el.addEventListener(type, handler, options);
  };

  const prefersReducedMotion = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Debounce: trailing-edge only. */
  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const ctx = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(ctx, args), wait || 150);
    };
  }

  /** Normalised current page filename, e.g. "index.html". */
  function currentPage() {
    const path = window.location.pathname;
    let file = path.substring(path.lastIndexOf("/") + 1);
    if (!file || file === "/") file = "index.html";
    return file.toLowerCase();
  }

  /** Escape user-supplied strings before injecting into markup. */
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[ch])
    );
  }

  /* ----------------------------------------------------------------------
     Progressive-enhancement flag
     Adds `.js` to <html> so CSS can opt in to JS-only behaviour such as
     scroll reveal. Without JS nothing is hidden.
     ---------------------------------------------------------------------- */

  document.documentElement.classList.add("js");

  /* ----------------------------------------------------------------------
     Lucide icons — initialise with a safe CSS fallback
     ---------------------------------------------------------------------- */

  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      try {
        window.lucide.createIcons();
        document.documentElement.classList.remove("no-lucide");
        return true;
      } catch (err) {
        /* fall through to the CSS fallback below */
      }
    }
    // CDN unavailable or blocked: CSS renders a small geometric mark instead
    // so no layout collapses and nothing looks broken.
    document.documentElement.classList.add("no-lucide");
    return false;
  }

  /* ----------------------------------------------------------------------
     Image fallbacks for optional/remote photography
     If a remote photo fails, swap in a branded CSS placeholder so the
     layout and contrast stay intact.
     ---------------------------------------------------------------------- */

  function markImageFallback(img) {
    if (!img || img.dataset.fallbackApplied === "true") return;
    img.dataset.fallbackApplied = "true";
    img.classList.add("img-fallback");
    img.removeAttribute("src");
    img.removeAttribute("srcset");
    const host = img.closest(".card__media, .media, .figure") || img;
    host.classList.add("has-img-fallback");
  }

  function initImageFallbacks() {
    qsa("img").forEach((img) => {
      // Opt-out for images where a blueprint placeholder would look worse
      // than nothing — the logo, for example, sits in a small fixed slot.
      if (img.hasAttribute("data-no-placeholder")) return;

      on(img, "error", () => markImageFallback(img));
      // Catch images that already failed before this script ran
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
        markImageFallback(img);
      }
    });
  }

  /* ----------------------------------------------------------------------
     Header: sticky shadow state
     ---------------------------------------------------------------------- */

  function initStickyHeader() {
    const header = qs(".site-header");
    if (!header) return;

    const update = () => {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    update();
    on(window, "scroll", update, { passive: true });
  }

  /* ----------------------------------------------------------------------
     Navigation: mobile drawer + "More" dropdown
     ---------------------------------------------------------------------- */

  const Nav = (function () {
    let nav, toggle, scrim, closeBtn;
    const DRAWER_QUERY = "(max-width: 1080px)";

    const isDrawerMode = () =>
      window.matchMedia && window.matchMedia(DRAWER_QUERY).matches;

    function focusables() {
      return qsa(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        nav
      ).filter((el) => el.offsetParent !== null);
    }

    function openDrawer() {
      if (!nav || !toggle) return;
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close main menu");
      document.body.classList.add("nav-open");
      const first = focusables()[0];
      if (first) first.focus();
    }

    function closeDrawer(returnFocus) {
      if (!nav || !toggle) return;
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open main menu");
      document.body.classList.remove("nav-open");
      closeAllSubmenus();
      if (returnFocus) toggle.focus();
    }

    function toggleDrawer() {
      if (nav.classList.contains("is-open")) closeDrawer(true);
      else openDrawer();
    }

    /* ---- submenu ("More") ---- */

    function closeAllSubmenus(except) {
      qsa(".nav__item--has-menu").forEach((item) => {
        if (item === except) return;
        item.classList.remove("is-open");
        const btn = qs("[aria-expanded]", item);
        if (btn) btn.setAttribute("aria-expanded", "false");
      });
    }

    function initSubmenus() {
      qsa(".nav__item--has-menu").forEach((item) => {
        const btn = qs(".nav__link[aria-expanded]", item);
        if (!btn) return;

        on(btn, "click", (event) => {
          event.preventDefault();
          const willOpen = !item.classList.contains("is-open");
          closeAllSubmenus(item);
          item.classList.toggle("is-open", willOpen);
          btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
        });

        // Pointer users get hover-to-open on desktop
        on(item, "mouseenter", () => {
          if (isDrawerMode()) return;
          closeAllSubmenus(item);
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        });

        on(item, "mouseleave", () => {
          if (isDrawerMode()) return;
          item.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
        });

        // Keyboard: ArrowDown opens and moves into the list
        on(btn, "keydown", (event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            item.classList.add("is-open");
            btn.setAttribute("aria-expanded", "true");
            const first = qs(".nav__submenu a", item);
            if (first) first.focus();
          }
        });

        // Closing when focus leaves the whole item
        on(item, "focusout", (event) => {
          if (isDrawerMode()) return;
          if (!item.contains(event.relatedTarget)) {
            item.classList.remove("is-open");
            btn.setAttribute("aria-expanded", "false");
          }
        });
      });

      // Click outside closes any open dropdown
      on(document, "click", (event) => {
        if (!event.target.closest(".nav__item--has-menu")) closeAllSubmenus();
      });
    }

    /* ---- active page highlighting ---- */

    function markActivePage() {
      const page = currentPage();
      let matched = false;

      qsa(".nav a[href], .footer-list a[href]").forEach((link) => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        if (!href || href.charAt(0) === "#" || href.indexOf("mailto:") === 0)
          return;
        const file = href.split("#")[0].split("?")[0];
        if (!file) return;

        if (file === page) {
          matched = true;
          link.setAttribute("aria-current", "page");

          // Reflect the state on the parent "More" toggle too
          const parentItem = link.closest(".nav__item--has-menu");
          if (parentItem) {
            const btn = qs(".nav__link[aria-expanded]", parentItem);
            if (btn) btn.classList.add("is-active-parent");
          }
        }
      });

      // Opening the folder root (or a server index) should light up Home
      if (!matched && (page === "index.html" || page === "")) {
        const home = qs('.nav a[href="index.html"]');
        if (home) home.setAttribute("aria-current", "page");
      }
    }

    function init() {
      nav = qs("#primary-nav");
      toggle = qs("#nav-toggle");
      scrim = qs("#nav-scrim");
      closeBtn = qs("#nav-close");

      if (!nav) return;

      markActivePage();
      initSubmenus();

      if (toggle) {
        on(toggle, "click", toggleDrawer);
      }
      on(closeBtn, "click", () => closeDrawer(true));
      on(scrim, "click", () => closeDrawer(true));

      // Any nav link closes the drawer (hash links included)
      qsa("a[href]", nav).forEach((link) => {
        on(link, "click", () => {
          if (isDrawerMode()) closeDrawer(false);
        });
      });

      // Escape closes the drawer and dropdowns
      on(document, "keydown", (event) => {
        if (event.key !== "Escape") return;
        closeAllSubmenus();
        if (nav.classList.contains("is-open")) closeDrawer(true);
      });

      // Keep focus inside the open drawer
      on(nav, "keydown", (event) => {
        if (event.key !== "Tab" || !nav.classList.contains("is-open")) return;
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });

      // Resizing out of drawer mode resets everything cleanly
      on(
        window,
        "resize",
        debounce(() => {
          if (!isDrawerMode()) {
            nav.classList.remove("is-open");
            document.body.classList.remove("nav-open");
            if (toggle) toggle.setAttribute("aria-expanded", "false");
            closeAllSubmenus();
          }
        }, 180)
      );
    }

    return { init: init, close: closeDrawer };
  })();

  /* ----------------------------------------------------------------------
     Current year in the footer (and anywhere else requested)
     ---------------------------------------------------------------------- */

  function initYear() {
    const year = String(new Date().getFullYear());
    qsa("[data-current-year]").forEach((el) => {
      el.textContent = year;
    });
  }

  /* ----------------------------------------------------------------------
     Smooth scrolling for same-page anchors, offset for the sticky header
     ---------------------------------------------------------------------- */

  function headerOffset() {
    const header = qs(".site-header");
    return (header ? header.offsetHeight : 0) + 16;
  }

  function scrollToElement(target) {
    if (!target) return;
    const top =
      target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({
      top: top < 0 ? 0 : top,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function initAnchorScroll() {
    on(document, "click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      let target;
      try {
        target = qs(hash);
      } catch (err) {
        return; // malformed selector — let the browser handle it
      }
      if (!target) return;

      event.preventDefault();
      scrollToElement(target);

      // Keep the URL shareable and move focus for keyboard users
      if (window.history && window.history.pushState) {
        window.history.pushState(null, "", hash);
      }
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    });

    // Landing with a hash: correct for the sticky header
    if (window.location.hash) {
      window.setTimeout(() => {
        let target = null;
        try {
          target = qs(window.location.hash);
        } catch (err) {
          target = null;
        }
        if (target) scrollToElement(target);
      }, 120);
    }
  }

  /* ----------------------------------------------------------------------
     Scroll reveal animations (IntersectionObserver, with fallback)
     ---------------------------------------------------------------------- */

  function revealAll() {
    qsa(".reveal").forEach((el) => el.classList.add("is-visible"));
  }

  function initReveal() {
    const items = qsa(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    // Stagger siblings inside a shared container for a calmer cascade
    qsa("[data-reveal-group]").forEach((group) => {
      qsa(".reveal", group).forEach((el, index) => {
        if (!el.style.getPropertyValue("--reveal-delay")) {
          el.style.setProperty("--reveal-delay", index * 80 + "ms");
        }
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    items.forEach((el) => observer.observe(el));

    // Safety net: never leave content hidden
    window.setTimeout(revealAll, 4000);
  }

  /* ----------------------------------------------------------------------
     Reusable tablist controller
     --------------------------------------------------------------------
     Drives any group marked up with the standard ARIA tabs pattern:

       <div data-tablist role="tablist" aria-orientation="horizontal">
         <button role="tab" id="x-tab" aria-controls="x-panel"
                 aria-selected="true">...</button>
       </div>
       <div role="tabpanel" id="x-panel" aria-labelledby="x-tab">...</div>

     Panels are located via aria-controls so they can sit anywhere in the
     document. Without JS every panel stays visible, so the content still
     reads as a plain stack.

     Used by the five-step process stepper (how-it-works.html) and the
     partner network map (partner-network.html).
     ---------------------------------------------------------------------- */

  function initTablist(list) {
    const tabs = qsa('[role="tab"]', list);
    if (tabs.length < 2) return;

    const panelOf = (tab) => {
      const id = tab.getAttribute("aria-controls");
      return id ? document.getElementById(id) : null;
    };

    function select(tab, moveFocus) {
      tabs.forEach((candidate) => {
        const active = candidate === tab;
        candidate.setAttribute("aria-selected", active ? "true" : "false");
        candidate.setAttribute("tabindex", active ? "0" : "-1");
        candidate.classList.toggle("is-active", active);

        const panel = panelOf(candidate);
        if (panel) {
          panel.hidden = !active;
          panel.classList.toggle("is-active", active);
        }
      });

      if (moveFocus) tab.focus();

      // Optional: light the matching connector in a linked diagram.
      // A tab carrying data-lights="engineering" lights the element with
      // data-line="engineering" inside the same tablist.
      const lightKey = tab.getAttribute("data-lights");
      if (lightKey) {
        qsa("[data-line]", list).forEach((line) => {
          line.classList.toggle(
            "is-lit",
            line.getAttribute("data-line") === lightKey
          );
        });
      }

      // Let pages react to a change (e.g. redraw a diagram highlight)
      list.dispatchEvent(
        new CustomEvent("dice:tabchange", {
          bubbles: true,
          detail: { tab: tab, panel: panelOf(tab) },
        })
      );
    }

    tabs.forEach((tab) => {
      on(tab, "click", () => select(tab, false));
    });

    on(list, "keydown", (event) => {
      const index = tabs.indexOf(document.activeElement);
      if (index === -1) return;

      const vertical =
        list.getAttribute("aria-orientation") === "vertical";
      let next = null;

      switch (event.key) {
        case "ArrowRight":
          if (!vertical) next = tabs[(index + 1) % tabs.length];
          break;
        case "ArrowLeft":
          if (!vertical) next = tabs[(index - 1 + tabs.length) % tabs.length];
          break;
        case "ArrowDown":
          next = tabs[(index + 1) % tabs.length];
          break;
        case "ArrowUp":
          next = tabs[(index - 1 + tabs.length) % tabs.length];
          break;
        case "Home":
          next = tabs[0];
          break;
        case "End":
          next = tabs[tabs.length - 1];
          break;
        default:
          return;
      }

      if (!next) return;
      event.preventDefault();
      select(next, true);
    });

    // Honour whichever tab the markup marks as selected
    const initial =
      tabs.filter((t) => t.getAttribute("aria-selected") === "true")[0] ||
      tabs[0];
    select(initial, false);
  }

  function initTablists(scope) {
    qsa("[data-tablist]", scope || document).forEach(initTablist);
  }

  /* ----------------------------------------------------------------------
     Scroll-to-top control
     ---------------------------------------------------------------------- */

  function initScrollTop() {
    const btn = qs("#scroll-top");
    if (!btn) return;

    const update = () => {
      btn.classList.toggle("is-visible", window.scrollY > 600);
    };
    update();
    on(window, "scroll", update, { passive: true });

    on(btn, "click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      const skip = qs(".skip-link") || qs(".wordmark");
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  /* ----------------------------------------------------------------------
     External links: safety attributes
     ---------------------------------------------------------------------- */

  function initExternalLinks() {
    qsa('a[target="_blank"]').forEach((link) => {
      const rel = (link.getAttribute("rel") || "").split(/\s+/);
      if (rel.indexOf("noopener") === -1) rel.push("noopener");
      if (rel.indexOf("noreferrer") === -1) rel.push("noreferrer");
      link.setAttribute("rel", rel.join(" ").trim());
    });
  }

  /* ----------------------------------------------------------------------
     Public namespace for page scripts
     ---------------------------------------------------------------------- */

  window.DICE = window.DICE || {};
  Object.assign(window.DICE, {
    qs: qs,
    qsa: qsa,
    on: on,
    debounce: debounce,
    escapeHtml: escapeHtml,
    currentPage: currentPage,
    prefersReducedMotion: prefersReducedMotion,
    scrollToElement: scrollToElement,
    refreshIcons: initIcons,
    revealAll: revealAll,
    closeNav: Nav.close,
    initTablists: initTablists,
    contact: {
      email: "dice.ec.2020@gmail.com",
      phone: "+91-7203050180",
      phoneHref: "+917203050180",
    },
  });

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function boot() {
    initIcons();
    initImageFallbacks();
    initStickyHeader();
    Nav.init();
    initYear();
    initAnchorScroll();
    initTablists();
    initReveal();
    initScrollTop();
    initExternalLinks();

    // Lucide may land after DOMContentLoaded when served from a CDN
    window.setTimeout(initIcons, 600);
    on(window, "load", initIcons);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
