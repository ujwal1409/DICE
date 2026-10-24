/* ==========================================================================
   DICE — enquiry, contact and multi-step RFQ form engine
   --------------------------------------------------------------------------
   Powers:
     1. The general enquiry form on contact.html
     2. The five-step Request for Quote wizard on request-quote.html
     3. Drag-and-drop document selection with extension + size validation
     4. Review generation, demonstration submission and reference numbers
     5. Browser-only storage of demo enquiry metadata

   PRIVACY AND SCOPE — read this before changing anything here.

   This is a demonstration prototype with no backend. Nothing is transmitted
   anywhere. Submissions are written to localStorage, which means they stay
   in the visitor's own browser on their own machine and never reach the real
   DICE business. File *contents* are never stored or uploaded — only the
   filename and byte size are kept, and only so the review and success
   screens can list what was selected. Do not add real personal or
   commercial data, and do not change this to imply an email was sent.
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
     Configuration
     ---------------------------------------------------------------------- */

  const STORE_KEY = "dice.prototype.enquiries";
  const SEQ_KEY = "dice.prototype.refseq";
  const SEQ_START = 1000;

  const MAX_FILES = 5;
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file

  // Extension allow-list. Browsers report inconsistent (often empty) MIME
  // types for DWG/DXF/STEP, so the extension is the primary check and the
  // MIME type is only ever advisory.
  const ALLOWED_EXT = [
    "pdf",
    "dwg",
    "dxf",
    "step",
    "stp", // common alternative extension for STEP files
    "jpg",
    "jpeg",
    "png",
  ];

  /* ----------------------------------------------------------------------
     Browser-only storage
     ---------------------------------------------------------------------- */

  const Store = {
    key: STORE_KEY,

    available: function () {
      try {
        const probe = "__dice_probe__";
        window.localStorage.setItem(probe, "1");
        window.localStorage.removeItem(probe);
        return true;
      } catch (err) {
        return false;
      }
    },

    read: function () {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    },

    write: function (records) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(records));
        return true;
      } catch (err) {
        return false;
      }
    },

    /** Prepends a record. Caller supplies the reference id. */
    add: function (record) {
      const records = Store.read();
      const entry = Object.assign(
        {
          id: Store.nextReference(),
          submittedAt: new Date().toISOString(),
          status: "New (demo)",
        },
        record
      );
      records.unshift(entry);
      Store.write(records);
      return entry;
    },

    clear: function () {
      try {
        window.localStorage.removeItem(STORE_KEY);
        window.localStorage.removeItem(SEQ_KEY);
        return true;
      } catch (err) {
        return false;
      }
    },

    count: function () {
      return Store.read().length;
    },

    /** Sequential demo reference, e.g. DICE-DEMO-1001. */
    nextReference: function () {
      let next = SEQ_START + 1;
      try {
        const current = parseInt(window.localStorage.getItem(SEQ_KEY), 10);
        if (!isNaN(current) && current >= SEQ_START) next = current + 1;
        window.localStorage.setItem(SEQ_KEY, String(next));
      } catch (err) {
        // Storage blocked — still produce a plausible unique reference
        next = SEQ_START + 1 + (Date.now() % 9000);
      }
      return "DICE-DEMO-" + next;
    },
  };

  /* ----------------------------------------------------------------------
     Validation
     ---------------------------------------------------------------------- */

  const Validate = {
    email: function (value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
    },

    phone: function (value) {
      const digits = String(value).replace(/[^\d]/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },

    required: function (value) {
      return String(value == null ? "" : value).trim().length > 0;
    },

    minLength: function (value, min) {
      return String(value == null ? "" : value).trim().length >= min;
    },
  };

  /** Shows or clears an accessible error message for one control. */
  function setFieldError(input, message) {
    if (!input) return;
    const wrapper = input.closest(".field") || input.parentElement;
    const slot = wrapper ? qs(".field__error", wrapper) : null;

    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (slot) {
        if (!slot.id) {
          slot.id =
            (input.id || input.name || "field") + "-error-" + Math.random().toString(36).slice(2, 7);
        }
        slot.textContent = message;
        const described = (input.getAttribute("aria-describedby") || "").split(
          /\s+/
        );
        if (described.indexOf(slot.id) === -1) {
          described.push(slot.id);
          input.setAttribute("aria-describedby", described.join(" ").trim());
        }
      }
    } else {
      input.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }
  }

  /** Evaluates the data-validate rules on one control. Returns a message. */
  function messageFor(input) {
    const rules = (input.dataset.validate || "").split(/\s+/).filter(Boolean);
    if (!rules.length) return "";

    const isCheckbox = input.type === "checkbox";
    const value = isCheckbox ? (input.checked ? "on" : "") : input.value;
    let message = "";

    rules.forEach((rule) => {
      if (message) return;

      if (rule === "required") {
        if (isCheckbox && !input.checked) {
          message = "Please confirm this to continue.";
        } else if (!isCheckbox && !Validate.required(value)) {
          message = "This field is required.";
        }
        return;
      }
      if (rule === "email" && value && !Validate.email(value)) {
        message = "Enter a valid email address, for example name@company.com.";
        return;
      }
      if (rule === "phone" && value && !Validate.phone(value)) {
        message = "Enter a valid phone number, including the country code.";
        return;
      }
      if (rule.indexOf("min:") === 0) {
        const min = parseInt(rule.split(":")[1], 10) || 0;
        if (value && !Validate.minLength(value, min)) {
          message = "Please provide at least " + min + " characters.";
        }
      }
    });

    return message;
  }

  /**
   * Validates every [data-validate] control inside a scope.
   * Returns true when the scope is valid; focuses the first problem if not.
   */
  function validateScope(scope, options) {
    const settings = options || {};
    const fields = qsa("[data-validate]", scope);
    let firstInvalid = null;

    fields.forEach((input) => {
      const message = messageFor(input);
      setFieldError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid && settings.focus !== false) {
      firstInvalid.focus();
      if (typeof firstInvalid.scrollIntoView === "function") {
        firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    return !firstInvalid;
  }

  /** Live error clearing as the visitor types or corrects a control. */
  function wireLiveValidation(scope) {
    qsa("[data-validate]", scope).forEach((input) => {
      const clear = () => setFieldError(input, "");
      input.addEventListener("input", clear);
      input.addEventListener("change", clear);
      input.addEventListener("blur", () => {
        // Only nag about a field the visitor has actually touched
        if (input.type === "checkbox" || input.value) {
          setFieldError(input, messageFor(input));
        }
      });
    });
  }

  function showStatus(host, type, text) {
    if (!host) return;
    host.className =
      "form-status is-visible " +
      (type === "ok" ? "form-status--ok" : "form-status--err");
    host.textContent = text;
    host.setAttribute("role", "status");
  }

  function hideStatus(host) {
    if (!host) return;
    host.className = "form-status";
    host.textContent = "";
  }

  /* ----------------------------------------------------------------------
     Helpers
     ---------------------------------------------------------------------- */

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  function extensionOf(filename) {
    const name = String(filename || "");
    const dot = name.lastIndexOf(".");
    return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
  }

  /** Readable value of a control, using option text for selects. */
  function readableValue(form, name) {
    const el = form.elements[name];
    if (!el) return "";

    // A same-name group (RadioNodeList) has no tagName of its own
    if (!el.tagName) return el.value || "";
    if (el.tagName === "SELECT") {
      const option = el.options[el.selectedIndex];
      if (!option || !option.value) return "";
      return option.textContent.trim();
    }
    if (el.type === "checkbox") return el.checked ? "Yes" : "No";
    return (el.value || "").trim();
  }

  function scrollIntoViewTop(element) {
    if (!element) return;
    const header = qs(".site-header");
    const offset = (header ? header.offsetHeight : 0) + 24;
    const top =
      element.getBoundingClientRect().top + window.pageYOffset - offset;
    const reduced =
      typeof D.prefersReducedMotion === "function"
        ? D.prefersReducedMotion()
        : false;
    window.scrollTo({
      top: top < 0 ? 0 : top,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  /* ----------------------------------------------------------------------
     Document selection (drag and drop + picker fallback)
     ---------------------------------------------------------------------- */

  function createFileManager(root) {
    const zone = qs("[data-dropzone]", root);
    const input = qs("[data-file-input]", root);
    const list = qs("[data-file-list]", root);
    const empty = qs("[data-file-empty]", root);
    const errorSlot = qs("[data-file-error]", root);
    const counter = qs("[data-file-count]", root);
    if (!zone || !input) return null;

    /** Selected File objects. Never persisted, never uploaded. */
    let files = [];

    function setError(message) {
      if (!errorSlot) return;
      errorSlot.textContent = message || "";
    }

    function render() {
      if (list) list.innerHTML = "";

      if (!files.length) {
        if (empty) empty.hidden = false;
        if (list) list.hidden = true;
      } else {
        if (empty) empty.hidden = true;
        if (list) {
          list.hidden = false;
          files.forEach((file, index) => {
            const item = document.createElement("li");
            item.className = "filelist__item";
            item.innerHTML =
              '<span class="filelist__icon" aria-hidden="true">' +
              '<i class="icon" data-lucide="file-text"></i></span>' +
              '<span class="filelist__meta">' +
              '<span class="filelist__name">' +
              escapeHtml(file.name) +
              "</span>" +
              '<span class="filelist__size">' +
              escapeHtml(extensionOf(file.name).toUpperCase()) +
              " &middot; " +
              formatBytes(file.size) +
              "</span></span>" +
              '<button class="filelist__remove" type="button" data-remove="' +
              index +
              '" aria-label="Remove ' +
              escapeHtml(file.name) +
              '"><i class="icon" data-lucide="x" aria-hidden="true"></i></button>';
            list.appendChild(item);
          });
        }
      }

      if (counter) {
        counter.textContent =
          files.length + " of " + MAX_FILES + " files selected";
      }

      if (typeof D.refreshIcons === "function") D.refreshIcons();
    }

    function isDuplicate(file) {
      return files.some(
        (existing) => existing.name === file.name && existing.size === file.size
      );
    }

    /** Validates and appends a list of candidate files. */
    function addFiles(candidates) {
      const problems = [];
      let added = 0;

      Array.prototype.forEach.call(candidates, (file) => {
        if (files.length >= MAX_FILES) {
          problems.push(
            "Maximum " + MAX_FILES + " files — " + file.name + " was not added."
          );
          return;
        }

        const ext = extensionOf(file.name);
        if (!ext) {
          problems.push(file.name + " has no file extension and was rejected.");
          return;
        }
        if (ALLOWED_EXT.indexOf(ext) === -1) {
          problems.push(
            file.name +
              " is a ." +
              ext +
              " file. Allowed types: PDF, DWG, DXF, STEP, JPG, JPEG, PNG."
          );
          return;
        }
        if (file.size === 0) {
          problems.push(file.name + " appears to be empty and was rejected.");
          return;
        }
        if (file.size > MAX_BYTES) {
          problems.push(
            file.name +
              " is " +
              formatBytes(file.size) +
              ". The limit is " +
              formatBytes(MAX_BYTES) +
              " per file."
          );
          return;
        }
        if (isDuplicate(file)) {
          problems.push(file.name + " has already been selected.");
          return;
        }

        files.push(file);
        added++;
      });

      setError(problems.join(" "));
      if (added) render();
      else if (problems.length) render();

      // Always reset the native input so re-picking the same file still fires
      input.value = "";
      return added;
    }

    function remove(index) {
      if (index < 0 || index >= files.length) return;
      const name = files[index].name;
      files.splice(index, 1);
      setError("");
      render();
      if (counter) {
        counter.textContent =
          files.length + " of " + MAX_FILES + " files selected";
      }
      // Announce the removal for assistive technology
      if (errorSlot) {
        errorSlot.textContent = "";
      }
      const announce = qs("[data-file-announce]", root);
      if (announce) announce.textContent = name + " removed.";
    }

    /* events */

    input.addEventListener("change", () => {
      if (input.files && input.files.length) addFiles(input.files);
    });

    if (list) {
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove]");
        if (!button) return;
        remove(parseInt(button.getAttribute("data-remove"), 10));
      });
    }

    ["dragenter", "dragover"].forEach((type) => {
      zone.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.add("is-over");
      });
    });

    ["dragleave", "dragend"].forEach((type) => {
      zone.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove("is-over");
      });
    });

    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      zone.classList.remove("is-over");
      const dropped =
        event.dataTransfer && event.dataTransfer.files
          ? event.dataTransfer.files
          : null;
      if (dropped && dropped.length) addFiles(dropped);
    });

    // Stop the whole page from hijacking an accidental drop
    ["dragover", "drop"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (!zone.contains(event.target)) event.preventDefault();
      });
    });

    render();

    return {
      get: () => files.slice(),
      /** Metadata only — never file contents. */
      metadata: () => files.map((f) => ({ name: f.name, size: f.size })),
      count: () => files.length,
      reset: function () {
        files = [];
        setError("");
        input.value = "";
        render();
      },
    };
  }

  /* ----------------------------------------------------------------------
     Review configuration — drives both the review step and the stored record
     ---------------------------------------------------------------------- */

  const REVIEW_GROUPS = [
    {
      title: "Customer information",
      icon: "user",
      step: 1,
      fields: [
        ["fullName", "Full name"],
        ["company", "Company name"],
        ["email", "Business email"],
        ["phone", "Phone number"],
        ["location", "Country / project location"],
      ],
    },
    {
      title: "Selected service",
      icon: "layers",
      step: 2,
      fields: [["category", "Service category"]],
    },
    {
      title: "Project details",
      icon: "clipboard-list",
      step: 2,
      fields: [
        ["projectTitle", "Project title"],
        ["scope", "Scope or problem statement"],
      ],
    },
    {
      title: "Material and quantity",
      icon: "box",
      step: 2,
      fields: [
        ["material", "Material grade / specification / finish"],
        ["quantity", "Quantity or project scope"],
        ["tolerances", "Required tolerances"],
      ],
    },
    {
      title: "Quality requirements",
      icon: "shield-check",
      step: 2,
      fields: [
        ["quality", "Quality and inspection requirements"],
        ["nde", "NDE and documentation requirements"],
      ],
    },
    {
      title: "Delivery timeline",
      icon: "truck",
      step: 2,
      fields: [["deliveryDate", "Target delivery date"]],
    },
    {
      title: "Installation requirements",
      icon: "wrench",
      step: 2,
      fields: [["installation", "Installation requirements"]],
    },
    {
      title: "Additional notes",
      icon: "message-square",
      step: 2,
      fields: [["notes", "Additional notes"]],
    },
  ];

  /* ----------------------------------------------------------------------
     The multi-step wizard
     ---------------------------------------------------------------------- */

  function initWizard(root) {
    const form = qs("[data-wizard-form]", root);
    if (!form) return;

    const steps = qsa("[data-step]", form).sort(
      (a, b) => Number(a.dataset.step) - Number(b.dataset.step)
    );
    if (!steps.length) return;

    const total = steps.length;
    const progress = qs("[data-wizard-progress]", root);
    const dots = qsa("[data-step-dot]", root);
    const statusEl = qs("[data-wizard-status]", root);
    const btnPrev = qs("[data-wizard-prev]", root);
    const btnNext = qs("[data-wizard-next]", root);
    const btnSubmit = qs("[data-wizard-submit]", root);
    const btnReset = qs("[data-wizard-reset]", root);
    const reviewHost = qs("[data-review]", root);
    const statusBox = qs("[data-form-status]", root);
    const successPanel = document.getElementById(
      root.getAttribute("data-wizard-success") || ""
    );

    const files = createFileManager(root);
    let current = 1;
    let submitting = false;

    function labelFor(step) {
      const dot = dots[step - 1];
      return dot ? dot.getAttribute("data-step-label") || "" : "";
    }

    function show(step, options) {
      const settings = options || {};
      current = Math.min(Math.max(step, 1), total);

      steps.forEach((section) => {
        section.hidden = Number(section.dataset.step) !== current;
      });

      dots.forEach((dot, index) => {
        const number = index + 1;
        dot.classList.toggle("is-current", number === current);
        dot.classList.toggle("is-done", number < current);
        if (number === current) dot.setAttribute("aria-current", "step");
        else dot.removeAttribute("aria-current");
      });

      if (progress) {
        progress.style.setProperty(
          "--progress",
          total > 1 ? (current - 1) / (total - 1) : 0
        );
      }

      if (btnPrev) btnPrev.hidden = current === 1;
      if (btnNext) btnNext.hidden = current === total;
      if (btnSubmit) btnSubmit.hidden = current !== total;

      if (statusEl) {
        statusEl.textContent =
          "Step " + current + " of " + total + " — " + labelFor(current);
      }

      hideStatus(statusBox);

      if (steps[current - 1].hasAttribute("data-step-review")) renderReview();

      if (settings.scroll !== false) scrollIntoViewTop(root);

      if (settings.focus !== false) {
        const heading = qs("[data-step-heading]", steps[current - 1]);
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }
    }

    /** Builds the review summary from live form values. */
    function renderReview() {
      if (!reviewHost) return;
      let html = "";

      REVIEW_GROUPS.forEach((group) => {
        let rows = "";
        group.fields.forEach((pair) => {
          const value = readableValue(form, pair[0]);
          const empty = !value;
          rows +=
            '<div class="review__row"><dt>' +
            escapeHtml(pair[1]) +
            "</dt><dd" +
            (empty ? ' class="is-empty"' : "") +
            ">" +
            (empty ? "Not provided" : escapeHtml(value)) +
            "</dd></div>";
        });

        html +=
          '<section class="review__group"><div class="review__head">' +
          '<h3 class="review__title"><i class="icon" data-lucide="' +
          group.icon +
          '" aria-hidden="true"></i>' +
          escapeHtml(group.title) +
          "</h3>" +
          '<button class="review__edit" type="button" data-goto-step="' +
          group.step +
          '"><i class="icon" data-lucide="pencil" aria-hidden="true"></i>Edit</button>' +
          '</div><dl class="review__list">' +
          rows +
          "</dl></section>";
      });

      // Documents
      const meta = files ? files.metadata() : [];
      let docRows = "";
      if (!meta.length) {
        docRows =
          '<div class="review__row"><dt>Documents</dt>' +
          '<dd class="is-empty">No documents selected</dd></div>';
      } else {
        meta.forEach((file, index) => {
          docRows +=
            '<div class="review__row"><dt>File ' +
            (index + 1) +
            "</dt><dd>" +
            escapeHtml(file.name) +
            " <span class=\"filelist__size\">" +
            formatBytes(file.size) +
            "</span></dd></div>";
        });
      }

      html +=
        '<section class="review__group"><div class="review__head">' +
        '<h3 class="review__title"><i class="icon" data-lucide="paperclip" aria-hidden="true"></i>' +
        "Drawings &amp; documents</h3>" +
        '<button class="review__edit" type="button" data-goto-step="3">' +
        '<i class="icon" data-lucide="pencil" aria-hidden="true"></i>Edit</button>' +
        '</div><dl class="review__list">' +
        docRows +
        "</dl></section>";

      reviewHost.innerHTML = html;
      if (typeof D.refreshIcons === "function") D.refreshIcons();
    }

    /** Collects the record written to localStorage. Metadata only. */
    function collect() {
      const record = {};
      REVIEW_GROUPS.forEach((group) => {
        group.fields.forEach((pair) => {
          record[pair[0]] = readableValue(form, pair[0]);
        });
      });
      // admin.js reads `name`; keep both for compatibility
      record.name = record.fullName;
      record.documents = files ? files.metadata() : [];
      return record;
    }

    function resetAll(options) {
      const settings = options || {};
      form.reset();
      qsa("[data-validate]", form).forEach((input) => setFieldError(input, ""));
      if (files) files.reset();
      hideStatus(statusBox);
      if (successPanel) successPanel.hidden = true;
      root.hidden = false;
      submitting = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.removeAttribute("aria-busy");
      }
      show(1, { scroll: settings.scroll !== false });
    }

    /* ---- navigation ---- */

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        if (!validateScope(steps[current - 1])) {
          showStatus(
            statusBox,
            "err",
            "Please correct the highlighted fields before continuing."
          );
          return;
        }
        show(current + 1);
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener("click", () => show(current - 1));
    }

    if (btnReset) {
      btnReset.addEventListener("click", () => {
        const ok = window.confirm(
          "Clear everything you have entered and start this form again?"
        );
        if (!ok) return;
        resetAll();
      });
    }

    // "Edit" buttons inside the generated review
    root.addEventListener("click", (event) => {
      const jump = event.target.closest("[data-goto-step]");
      if (!jump) return;
      show(parseInt(jump.getAttribute("data-goto-step"), 10));
    });

    // Enter should advance rather than submit, except on the final step
    form.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const tag = (event.target.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "button") return;
      if (current !== total) {
        event.preventDefault();
        if (btnNext) btnNext.click();
      }
    });

    /* ---- submission ---- */

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (submitting) return;

      // Validate every step, not just the visible one
      for (let step = 1; step <= total; step++) {
        if (!validateScope(steps[step - 1], { focus: false })) {
          show(step);
          validateScope(steps[step - 1]);
          showStatus(
            statusBox,
            "err",
            "Some required information is missing on step " +
              step +
              ". Please check the highlighted fields."
          );
          return;
        }
      }

      submitting = true;
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.setAttribute("aria-busy", "true");
      }

      const record = Store.add(collect());

      if (successPanel) {
        const refSlot = qs("[data-ref]", successPanel);
        if (refSlot) refSlot.textContent = record.id;

        const fileHost = qs("[data-success-files]", successPanel);
        const fileWrap = qs("[data-success-files-wrap]", successPanel);
        const meta = record.documents || [];
        if (fileHost) {
          fileHost.innerHTML = meta.length
            ? meta
                .map(
                  (file) =>
                    "<li><span>" +
                    escapeHtml(file.name) +
                    "</span><span>" +
                    formatBytes(file.size) +
                    "</span></li>"
                )
                .join("")
            : "";
        }
        if (fileWrap) fileWrap.hidden = meta.length === 0;

        const storedNote = qs("[data-storage-note]", successPanel);
        if (storedNote && !Store.available()) {
          storedNote.textContent =
            "Browser storage is unavailable, so this demonstration reference was not saved locally.";
        }

        root.hidden = true;
        successPanel.hidden = false;
        scrollIntoViewTop(successPanel);
        const heading = qs("h2", successPanel);
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
        if (typeof D.refreshIcons === "function") D.refreshIcons();
      }
    });

    // "Start another enquiry"
    if (successPanel) {
      qsa("[data-start-another]", successPanel).forEach((button) => {
        button.addEventListener("click", () => resetAll());
      });
    }

    wireLiveValidation(form);
    show(1, { scroll: false, focus: false });
  }

  /* ----------------------------------------------------------------------
     Simple single-step forms (contact page)
     ---------------------------------------------------------------------- */

  function initSimpleForms() {
    qsa("[data-enquiry-form]").forEach((form) => {
      // The wizard handles its own submission
      if (form.hasAttribute("data-wizard-form")) return;

      const statusBox =
        qs("[data-form-status]", form) ||
        qs("[data-form-status]", form.parentElement || document);
      const successPanel = document.getElementById(
        form.getAttribute("data-success") || ""
      );
      let submitting = false;

      wireLiveValidation(form);

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (submitting) return;

        if (!validateScope(form)) {
          showStatus(
            statusBox,
            "err",
            "Please correct the highlighted fields and try again."
          );
          return;
        }

        submitting = true;
        const submitButton = qs('button[type="submit"]', form);
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.setAttribute("aria-busy", "true");
        }

        const data = {};
        new FormData(form).forEach((value, key) => {
          if (data[key] === undefined) data[key] = value;
          else data[key] = [].concat(data[key], value);
        });
        data.name = data.fullName || data.name || "";
        data.source = form.getAttribute("data-enquiry-form") || "contact";

        const record = Store.add(data);

        if (successPanel) {
          const refSlot = qs("[data-ref]", successPanel);
          if (refSlot) refSlot.textContent = record.id;

          form.hidden = true;
          const formWrap = form.closest("[data-form-wrap]");
          if (formWrap) formWrap.hidden = true;

          successPanel.hidden = false;
          scrollIntoViewTop(successPanel);
          const heading = qs("h2", successPanel);
          if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus({ preventScroll: true });
          }
          if (typeof D.refreshIcons === "function") D.refreshIcons();
        } else {
          showStatus(
            statusBox,
            "ok",
            "Recorded in this prototype as " +
              record.id +
              ". Nothing has been transmitted to DICE."
          );
        }

        form.reset();
        qsa("[data-validate]", form).forEach((i) => setFieldError(i, ""));

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
        submitting = false;
      });

      // "Send another enquiry"
      if (successPanel) {
        qsa("[data-start-another]", successPanel).forEach((button) => {
          button.addEventListener("click", () => {
            successPanel.hidden = true;
            form.hidden = false;
            const formWrap = form.closest("[data-form-wrap]");
            if (formWrap) formWrap.hidden = false;
            hideStatus(statusBox);
            scrollIntoViewTop(form);
            const first = qs("input, select, textarea", form);
            if (first) first.focus();
          });
        });
      }
    });
  }

  /* ----------------------------------------------------------------------
     "Clear Demo Data" controls
     ---------------------------------------------------------------------- */

  function initClearData() {
    const update = () => {
      qsa("[data-demo-count]").forEach((el) => {
        el.textContent = String(Store.count());
      });
    };

    qsa("[data-clear-demo]").forEach((button) => {
      button.addEventListener("click", () => {
        const count = Store.count();
        if (!count) {
          window.alert(
            "There are no demonstration enquiries saved in this browser."
          );
          update();
          return;
        }
        const ok = window.confirm(
          "Permanently delete " +
            count +
            " demonstration enquiry record" +
            (count === 1 ? "" : "s") +
            " saved in this browser?\n\nThis cannot be undone. It only affects " +
            "this browser — nothing is stored anywhere else."
        );
        if (!ok) return;
        Store.clear();
        update();
        const note = qs("[data-clear-demo-status]");
        if (note) {
          note.textContent =
            "Demonstration data cleared from this browser.";
          note.hidden = false;
        }
      });
    });

    update();
    window.addEventListener("storage", (event) => {
      if (event.key === STORE_KEY) update();
    });
  }

  /* ----------------------------------------------------------------------
     Public namespace
     ---------------------------------------------------------------------- */

  window.DICE = window.DICE || {};
  window.DICE.enquiry = {
    store: Store,
    validate: Validate,
    validateForm: validateScope,
    validateScope: validateScope,
    setFieldError: setFieldError,
    showStatus: showStatus,
    formatBytes: formatBytes,
    limits: {
      maxFiles: MAX_FILES,
      maxBytes: MAX_BYTES,
      allowedExtensions: ALLOWED_EXT.slice(),
    },
  };

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function init() {
    qsa("[data-wizard]").forEach(initWizard);
    initSimpleForms();
    initClearData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
