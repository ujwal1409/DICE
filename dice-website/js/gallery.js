/* ==========================================================================
   DICE — projects gallery: category filtering + detail modal
   --------------------------------------------------------------------------
   Everything in the gallery is an ILLUSTRATIVE CONCEPT DEMONSTRATION. The
   cards show capability types, not completed DICE projects, and the modal
   repeats that so it cannot be mistaken for a case study. Do not relabel
   these as real projects, customers or outcomes.

   Reads its content straight from the markup, so the gallery still reads as
   a plain grid of cards if JavaScript never runs.
   ========================================================================== */

(function () {
  "use strict";

  const D = window.DICE || {};
  const qs = D.qs || ((s, c) => (c || document).querySelector(s));
  const qsa =
    D.qsa ||
    ((s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s)));
  const escapeHtml =
    D.escapeHtml ||
    ((v) =>
      String(v == null ? "" : v).replace(
        /[&<>"']/g,
        (ch) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[ch])
      ));

  /* ----------------------------------------------------------------------
     Reusable filter engine
     --------------------------------------------------------------------
     Hides or shows [data-category] items inside a root against a value.
     Exposed on window.DICE.gallery so other pages can reuse it.
     ---------------------------------------------------------------------- */

  function applyFilter(root, value) {
    const items = qsa("[data-category]", root);
    let shown = 0;

    items.forEach((item) => {
      const categories = (item.dataset.category || "").split(/\s+/);
      const match = value === "all" || categories.indexOf(value) !== -1;
      item.hidden = !match;
      if (match) shown++;
    });

    const empty = qs("[data-gallery-empty]", root.parentElement || root);
    if (empty) empty.hidden = shown !== 0;

    qsa("[data-gallery-count]").forEach((el) => {
      el.textContent = String(shown);
    });

    return shown;
  }

  function initFilters(root, buttonScope) {
    const scope = buttonScope || document;
    const buttons = qsa("[data-filter]", scope);
    if (!buttons.length) return;

    function select(button) {
      buttons.forEach((other) => {
        const active = other === button;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", active ? "true" : "false");
        other.setAttribute("tabindex", active ? "0" : "-1");
      });
      applyFilter(root, button.dataset.filter || "all");
    }

    buttons.forEach((button) => {
      button.setAttribute("tabindex", "-1");
      button.addEventListener("click", () => select(button));
    });

    // Arrow-key navigation across the filter group
    const group = qs("[data-filter-group]", scope) || scope;
    group.addEventListener("keydown", (event) => {
      const index = buttons.indexOf(document.activeElement);
      if (index === -1) return;
      let next = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = buttons[(index + 1) % buttons.length];
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = buttons[(index - 1 + buttons.length) % buttons.length];
          break;
        case "Home":
          next = buttons[0];
          break;
        case "End":
          next = buttons[buttons.length - 1];
          break;
        default:
          return;
      }

      event.preventDefault();
      next.focus();
    });

    const initial =
      buttons.filter((b) => b.getAttribute("aria-pressed") === "true")[0] ||
      buttons[0];
    select(initial);
  }

  /* ----------------------------------------------------------------------
     Detail modal
     ---------------------------------------------------------------------- */

  function initModal(gallery) {
    const modal = qs("#project-modal");
    if (!modal) return null;

    const dialog = qs(".modal__dialog", modal);
    const imgHost = qs("[data-modal-image]", modal);
    const titleHost = qs("[data-modal-title]", modal);
    const catHost = qs("[data-modal-category]", modal);
    const descHost = qs("[data-modal-description]", modal);
    const scopeHost = qs("[data-modal-scope]", modal);
    const closeButtons = qsa("[data-modal-close]", modal);
    let lastFocused = null;

    function focusables() {
      return qsa(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        dialog
      ).filter((el) => el.offsetParent !== null);
    }

    function open(card) {
      lastFocused = card;

      const image = qs("img", card);
      const title = card.getAttribute("data-title") || "";
      const category = card.getAttribute("data-category-label") || "";
      const description = card.getAttribute("data-description") || "";
      const scope = (card.getAttribute("data-scope") || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

      if (imgHost && image) {
        imgHost.src = image.currentSrc || image.src;
        imgHost.alt = image.alt || "";
      }
      if (titleHost) titleHost.textContent = title;
      if (catHost) catHost.textContent = category;
      if (descHost) descHost.textContent = description;

      if (scopeHost) {
        scopeHost.innerHTML = scope.length
          ? scope.map((line) => "<li>" + escapeHtml(line) + "</li>").join("")
          : "<li>Illustrative scope is not listed for this concept.</li>";
      }

      modal.classList.add("is-open");
      modal.removeAttribute("aria-hidden");
      document.body.classList.add("modal-open");

      const first = closeButtons[0] || focusables()[0];
      if (first) first.focus();
      if (dialog) dialog.scrollTop = 0;
    }

    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    closeButtons.forEach((button) =>
      button.addEventListener("click", close)
    );

    // Backdrop click
    const backdrop = qs(".modal__backdrop", modal);
    if (backdrop) backdrop.addEventListener("click", close);

    // Escape, and focus trapping inside the dialog
    document.addEventListener("keydown", (event) => {
      if (!modal.classList.contains("is-open")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "Tab") {
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
      }
    });

    // Cards are real buttons, so Enter and Space work without extra code
    if (gallery) {
      gallery.addEventListener("click", (event) => {
        const card = event.target.closest("[data-gallery-card]");
        if (card) open(card);
      });
    }

    modal.setAttribute("aria-hidden", "true");
    return { open: open, close: close };
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function init() {
    const gallery = qs("[data-gallery]");
    if (!gallery) return;

    initFilters(gallery, document);
    initModal(gallery);
  }

  window.DICE = window.DICE || {};
  window.DICE.gallery = { applyFilter: applyFilter, initFilters: initFilters };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
