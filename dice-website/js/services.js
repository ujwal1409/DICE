/* ==========================================================================
   DICE — services page script
   --------------------------------------------------------------------------
   Provides:
     1. Shared capability metadata (window.DICE.categories)
     2. Category filtering with no page reload, keyboard-operable toolbar
     3. Expanding "View Details" panels (accessible disclosure pattern)
     4. Expand all / collapse all
     5. Deep-link handling so homepage "View Details" links land on, and
        open, the right category

   Vanilla ES6+. No dependencies. Safe to load on pages without this markup.
   ========================================================================== */

(function () {
  "use strict";

  const D = window.DICE || {};
  const qs = D.qs || ((s, c) => (c || document).querySelector(s));
  const qsa =
    D.qsa ||
    ((s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s)));

  /* ----------------------------------------------------------------------
     1. Capability metadata — single source of truth, shared with the
        enquiry form and gallery filters in later parts.
     ---------------------------------------------------------------------- */

  const CATEGORIES = [
    {
      id: "engineering-cad",
      name: "Engineering & CAD",
      icon: "pen-tool",
      summary:
        "Design, drafting, 3D modelling and manufacturing documentation.",
      capabilities: [
        "2D drawing and drafting",
        "Conceptual design and 3D modelling",
        "Manufacturing drawings",
        "3D animation",
        "FEA design analysis",
        "Jig and fixture design",
      ],
      software: ["AutoCAD", "Autodesk Inventor", "Siemens NX", "SolidWorks"],
    },
    {
      id: "fabrication",
      name: "Fabrication",
      icon: "factory",
      summary:
        "Fabricated assemblies, pipe spools, bends and structural components.",
      capabilities: [
        "Process equipment and fabricated assemblies",
        "Pipe spools and bends",
        "Structural and process equipment",
        "Fixtures and components",
        "Relevant NDE scope, where applicable",
      ],
    },
    {
      id: "precision-manufacturing",
      name: "Precision Manufacturing",
      icon: "cog",
      summary:
        "CNC machining, milling, waterjet cutting and specialist machining.",
      capabilities: [
        "Precision CNC machining",
        "CNC milling and component processing",
        "Waterjet cutting",
        "Heavy-thickness cutting",
        "Specialist machining",
      ],
    },
    {
      id: "specialist-execution",
      name: "Specialist Execution",
      icon: "flame",
      summary: "Welding, assembly, cutting, forming and installation support.",
      capabilities: [
        "Welding",
        "Assembly and installation",
        "Laser and plasma cutting",
        "Pipe cutting and preparation",
        "Induction and cold bends",
        "Project-specific installation support",
      ],
    },
    {
      id: "manpower",
      name: "Manpower",
      icon: "hard-hat",
      summary:
        "Skilled welders, fitters, designers, NDE personnel and trade workers.",
      capabilities: [
        "Welders",
        "Fitters",
        "Designers",
        "NDE personnel",
        "Skilled trade workers",
        "Project-specific and overseas manpower support",
      ],
    },
    {
      id: "technical-support",
      name: "Technical Support",
      icon: "cpu",
      summary:
        "IT, ELV, security, fire systems, instrumentation and related technical support.",
      capabilities: [
        "IT hardware and software support",
        "ELV and security systems",
        "Fire-system support",
        "Instrumentation and control",
        "Controlled and temperature-managed environments",
      ],
    },
  ];

  window.DICE = window.DICE || {};
  window.DICE.categories = CATEGORIES;

  const isCategoryId = (value) =>
    CATEGORIES.some((category) => category.id === value);

  /* ----------------------------------------------------------------------
     2. Detail panels — accessible disclosure
     ---------------------------------------------------------------------- */

  const Details = (function () {
    /** Returns the panel a toggle controls. */
    function panelFor(toggle) {
      const id = toggle.getAttribute("aria-controls");
      return id ? document.getElementById(id) : null;
    }

    function setState(toggle, open) {
      const panel = panelFor(toggle);
      if (!panel) return;

      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      panel.dataset.open = open ? "true" : "false";

      const label = qs("[data-detail-label]", toggle);
      if (label) label.textContent = open ? "Hide Details" : "View Details";
    }

    function isOpen(toggle) {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    function toggleOne(toggle) {
      setState(toggle, !isOpen(toggle));
    }

    function all() {
      return qsa("[data-detail-toggle]");
    }

    /** Opens the panel belonging to a given category block. */
    function openForCategory(categoryId) {
      const block = document.getElementById(categoryId);
      if (!block) return;
      const toggle = qs("[data-detail-toggle]", block);
      if (toggle) setState(toggle, true);
    }

    function setAll(open) {
      all().forEach((toggle) => {
        // Skip toggles inside a filtered-out block
        const block = toggle.closest("[data-category]");
        if (block && block.hidden) return;
        setState(toggle, open);
      });
    }

    function init() {
      const toggles = all();
      if (!toggles.length) return;

      toggles.forEach((toggle) => {
        // Normalise the starting state from the markup
        setState(toggle, isOpen(toggle));
        toggle.addEventListener("click", () => toggleOne(toggle));
      });

      // Expand all / collapse all
      const expandBtn = qs("[data-expand-all]");
      if (expandBtn) {
        expandBtn.addEventListener("click", () => {
          const shouldOpen = expandBtn.dataset.state !== "open";
          setAll(shouldOpen);
          expandBtn.dataset.state = shouldOpen ? "open" : "closed";
          const label = qs("[data-expand-all-label]", expandBtn);
          if (label) {
            label.textContent = shouldOpen
              ? "Collapse all details"
              : "Expand all details";
          }
        });
      }
    }

    return {
      init: init,
      setAll: setAll,
      openForCategory: openForCategory,
    };
  })();

  /* ----------------------------------------------------------------------
     3. Category filtering
     ---------------------------------------------------------------------- */

  const Filters = (function () {
    let group, buttons, catalogue;

    function blocks() {
      return qsa("[data-category]", catalogue);
    }

    function apply(value) {
      let shown = 0;

      blocks().forEach((block) => {
        const match = value === "all" || block.dataset.category === value;
        block.hidden = !match;
        if (match) shown++;
      });

      const count = qs("[data-catalogue-count]");
      if (count) count.textContent = String(shown);

      const empty = qs("[data-catalogue-empty]");
      if (empty) empty.hidden = shown !== 0;

      return shown;
    }

    /** Marks one button active and moves the roving tabindex to it. */
    function setActive(button) {
      buttons.forEach((other) => {
        const active = other === button;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", active ? "true" : "false");
        other.setAttribute("tabindex", active ? "0" : "-1");
      });
    }

    /** Public: select a filter by value. */
    function select(value, options) {
      const settings = options || {};
      const button =
        buttons.filter((b) => b.dataset.filter === value)[0] ||
        buttons.filter((b) => b.dataset.filter === "all")[0];
      if (!button) return;

      setActive(button);
      apply(button.dataset.filter);

      if (settings.focus) button.focus();
      if (settings.scroll) {
        const bar = qs("#catalogue-bar");
        if (bar && typeof D.scrollToElement === "function") {
          D.scrollToElement(bar);
        }
      }
    }

    function onKeydown(event) {
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
    }

    function init() {
      group = qs("[data-filter-group]");
      catalogue = qs("[data-catalogue]");
      if (!group || !catalogue) return false;

      buttons = qsa("[data-filter]", group);
      if (!buttons.length) return false;

      buttons.forEach((button) => {
        button.setAttribute("tabindex", "-1");
        button.addEventListener("click", () => {
          setActive(button);
          apply(button.dataset.filter);
          // Collapsed panels in hidden blocks would be confusing on return
          Details.setAll(false);
          const expandBtn = qs("[data-expand-all]");
          if (expandBtn) {
            expandBtn.dataset.state = "closed";
            const label = qs("[data-expand-all-label]", expandBtn);
            if (label) label.textContent = "Expand all details";
          }
        });
      });

      group.addEventListener("keydown", onKeydown);

      // Honour whichever button the markup marks as pressed
      const initial =
        buttons.filter((b) => b.getAttribute("aria-pressed") === "true")[0] ||
        buttons[0];
      setActive(initial);
      apply(initial.dataset.filter);

      return true;
    }

    return { init: init, select: select, apply: apply };
  })();

  /* ----------------------------------------------------------------------
     4. Deep links from the homepage service cards
     ---------------------------------------------------------------------- */

  function highlight(id) {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.add("is-targeted");
    window.setTimeout(() => section.classList.remove("is-targeted"), 2400);
  }

  /**
   * Scrolls a category block into view, clearing both the sticky site header
   * and the sticky filter bar. The shared helper in main.js only knows about
   * the header, so this page needs its own offset.
   */
  function scrollToBlock(target) {
    const header = qs(".site-header");
    const bar = qs("#catalogue-bar");
    let offset = (header ? header.offsetHeight : 0) + 16;

    if (bar && window.getComputedStyle(bar).position === "sticky") {
      offset += bar.offsetHeight;
    }

    const top =
      target.getBoundingClientRect().top + window.pageYOffset - offset;
    const reduced =
      typeof D.prefersReducedMotion === "function"
        ? D.prefersReducedMotion()
        : false;

    window.scrollTo({
      top: top < 0 ? 0 : top,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  function handleHash(initial) {
    const hash = (window.location.hash || "").replace("#", "");
    if (!hash || !isCategoryId(hash)) return;

    const target = document.getElementById(hash);
    if (!target) return;

    // Make sure the block is not filtered out before scrolling to it
    if (target.hidden) Filters.select("all");

    // A "View Details" link should actually show the details
    Details.openForCategory(hash);
    highlight(hash);

    // Wait a beat so the panel has expanded before the scroll is measured
    window.setTimeout(() => scrollToBlock(target), initial ? 200 : 60);
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function init() {
    // Nothing to do unless this page renders the catalogue
    if (!qs("[data-catalogue]")) return;

    Details.init();
    Filters.init();
    handleHash(true);

    // In-page jumps between categories keep the same behaviour
    window.addEventListener("hashchange", () => handleHash(false));

    // Re-render any icons injected into changed labels
    if (typeof D.refreshIcons === "function") D.refreshIcons();
  }

  window.DICE.services = {
    categories: CATEGORIES,
    selectFilter: function (value) {
      Filters.select(value, { scroll: true });
    },
    setAllDetails: function (open) {
      Details.setAll(open);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
