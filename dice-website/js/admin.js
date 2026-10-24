/* ==========================================================================
   DICE — demonstration admin dashboard
   --------------------------------------------------------------------------
   Reads demonstration enquiry metadata written by js/enquiry.js from
   localStorage and renders a searchable, filterable, sortable table with a
   per-record detail view.

   THIS IS NOT A REAL ADMIN SYSTEM. There is no server, no database, no
   authentication and no access control, by design — there is nothing to
   authenticate against. Every record shown here was created by whoever used
   the RFQ form in THIS browser. None of it was received by DICE, and none of
   it represents a real customer submission.

   Do not add a fake login screen: a login that cannot actually protect
   anything is worse than none, because it implies security that is absent.
   Do not seed sample records to make the dashboard look busy — an honest
   empty state is the correct output when there is no data.
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

  const STORE_KEY = "dice.prototype.enquiries";
  const SEQ_KEY = "dice.prototype.refseq";

  /* ----------------------------------------------------------------------
     Storage access — prefer the shared store from enquiry.js
     ---------------------------------------------------------------------- */

  function sharedStore() {
    return window.DICE && window.DICE.enquiry && window.DICE.enquiry.store
      ? window.DICE.enquiry.store
      : null;
  }

  function readRecords() {
    const store = sharedStore();
    if (store) return store.read();
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function clearRecords() {
    const store = sharedStore();
    if (store) return store.clear();
    try {
      window.localStorage.removeItem(STORE_KEY);
      window.localStorage.removeItem(SEQ_KEY);
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ----------------------------------------------------------------------
     Helpers
     ---------------------------------------------------------------------- */

  function formatDateTime(iso) {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
  }

  function formatBytes(bytes) {
    if (D.enquiry && typeof D.enquiry.formatBytes === "function") {
      return D.enquiry.formatBytes(bytes);
    }
    const n = Number(bytes) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  function valueOf(record, key) {
    const value = record ? record[key] : "";
    if (value == null) return "";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  }

  function customerName(record) {
    return valueOf(record, "fullName") || valueOf(record, "name") || "";
  }

  /** Normalises a stored category to a comparison key. */
  function categoryKey(record) {
    const raw = valueOf(record, "category").toLowerCase();
    if (!raw) return "";
    if (raw.indexOf("engineering") !== -1 || raw.indexOf("cad") !== -1) {
      return "engineering-cad";
    }
    if (raw.indexOf("fabrication") !== -1) return "fabrication";
    if (raw.indexOf("precision") !== -1 || raw.indexOf("machin") !== -1) {
      return "precision-manufacturing";
    }
    if (raw.indexOf("specialist") !== -1) return "specialist-execution";
    if (raw.indexOf("manpower") !== -1) return "manpower";
    if (raw.indexOf("technical") !== -1) return "technical-support";
    return "other";
  }

  /* ----------------------------------------------------------------------
     Dashboard
     ---------------------------------------------------------------------- */

  function initDashboard(root) {
    const tableHost = qs("[data-admin-table]", root);
    const searchInput = qs("[data-admin-search]", root);
    const categorySelect = qs("[data-admin-category]", root);
    const sortSelect = qs("[data-admin-sort]", root);
    const emptyState = qs("[data-admin-empty]", root);
    const noResults = qs("[data-admin-noresults]", root);
    const detailView = qs("[data-admin-detail]", root);
    const detailBody = qs("[data-admin-detail-body]", root);
    const tableWrap = qs("[data-admin-table-wrap]", root);

    let records = [];
    let visible = [];

    /* ---- KPI cards ---- */

    function renderKpis() {
      const total = records.length;
      let cad = 0;
      let fabrication = 0;

      records.forEach((record) => {
        const key = categoryKey(record);
        if (key === "engineering-cad") cad++;
        else if (key === "fabrication") fabrication++;
      });

      const other = total - cad - fabrication;

      const set = (selector, value) => {
        const el = qs(selector, root);
        if (el) el.textContent = String(value);
      };

      set("[data-kpi-total]", total);
      set("[data-kpi-cad]", cad);
      set("[data-kpi-fab]", fabrication);
      set("[data-kpi-other]", other < 0 ? 0 : other);
    }

    /* ---- filtering, searching, sorting ---- */

    function computeVisible() {
      const term = (searchInput ? searchInput.value : "").trim().toLowerCase();
      const category = categorySelect ? categorySelect.value : "all";
      const sort = sortSelect ? sortSelect.value : "newest";

      let list = records.slice();

      if (category && category !== "all") {
        list = list.filter((record) => categoryKey(record) === category);
      }

      if (term) {
        list = list.filter((record) => {
          const haystack = [
            valueOf(record, "id"),
            customerName(record),
            valueOf(record, "company"),
            valueOf(record, "projectTitle"),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.indexOf(term) !== -1;
        });
      }

      list.sort((a, b) => {
        const ta = new Date(valueOf(a, "submittedAt")).getTime() || 0;
        const tb = new Date(valueOf(b, "submittedAt")).getTime() || 0;
        return sort === "oldest" ? ta - tb : tb - ta;
      });

      visible = list;
      return list;
    }

    /* ---- table ---- */

    function renderTable() {
      computeVisible();

      const countEl = qs("[data-admin-count]", root);
      if (countEl) countEl.textContent = String(visible.length);

      const hasAnyData = records.length > 0;
      if (emptyState) emptyState.hidden = hasAnyData;
      if (tableWrap) tableWrap.hidden = !hasAnyData || visible.length === 0;
      if (noResults) {
        noResults.hidden = !hasAnyData || visible.length > 0;
      }

      if (!tableHost) return;

      if (!visible.length) {
        tableHost.innerHTML = "";
        return;
      }

      const rows = visible
        .map((record) => {
          return (
            '<tr data-row="' +
            escapeHtml(valueOf(record, "id")) +
            '">' +
            '<td><span class="data-table__ref">' +
            escapeHtml(valueOf(record, "id")) +
            "</span></td>" +
            "<td>" +
            escapeHtml(formatDateTime(valueOf(record, "submittedAt"))) +
            "</td>" +
            "<td>" +
            escapeHtml(customerName(record) || "—") +
            "</td>" +
            "<td>" +
            escapeHtml(valueOf(record, "company") || "—") +
            "</td>" +
            '<td><span class="badge">' +
            escapeHtml(valueOf(record, "category") || "Not stated") +
            "</span></td>" +
            "<td>" +
            escapeHtml(valueOf(record, "projectTitle") || "—") +
            "</td>" +
            "<td>" +
            escapeHtml(valueOf(record, "location") || "—") +
            "</td>" +
            '<td><span class="badge badge--demo">' +
            escapeHtml(valueOf(record, "status") || "New (demo)") +
            "</span></td>" +
            '<td><button class="btn btn--outline btn--sm" type="button" ' +
            'data-view="' +
            escapeHtml(valueOf(record, "id")) +
            '">View</button></td>' +
            "</tr>"
          );
        })
        .join("");

      tableHost.innerHTML =
        "<thead><tr>" +
        '<th scope="col">Reference</th>' +
        '<th scope="col">Submitted</th>' +
        '<th scope="col">Customer</th>' +
        '<th scope="col">Company</th>' +
        '<th scope="col">Category</th>' +
        '<th scope="col">Project title</th>' +
        '<th scope="col">Location</th>' +
        '<th scope="col">Demo status</th>' +
        '<th scope="col"><span class="visually-hidden">Actions</span></th>' +
        "</tr></thead><tbody>" +
        rows +
        "</tbody>";
    }

    /* ---- detail view ---- */

    const DETAIL_SECTIONS = [
      {
        title: "Customer information",
        icon: "user",
        fields: [
          ["fullName", "Full name"],
          ["company", "Company name"],
          ["email", "Business email"],
          ["phone", "Phone number"],
          ["location", "Country / project location"],
        ],
      },
      {
        title: "Project scope",
        icon: "clipboard-list",
        fields: [
          ["category", "Service category"],
          ["projectTitle", "Project title"],
          ["scope", "Detailed scope or problem statement"],
          ["material", "Material grade / specification / finish"],
          ["quantity", "Quantity or project scope"],
          ["tolerances", "Required tolerances"],
        ],
      },
      {
        title: "Quality requirements",
        icon: "shield-check",
        fields: [
          ["quality", "Quality and inspection requirements"],
          ["nde", "NDE and documentation requirements"],
        ],
      },
      {
        title: "Delivery expectations",
        icon: "truck",
        fields: [
          ["deliveryDate", "Target delivery date"],
          ["installation", "Installation requirements"],
        ],
      },
      {
        title: "Additional notes",
        icon: "message-square",
        fields: [["notes", "Additional notes"]],
      },
    ];

    function openDetail(id) {
      const record = records.filter(
        (item) => valueOf(item, "id") === id
      )[0];
      if (!record || !detailView || !detailBody) return;

      let html =
        '<div class="review__group"><div class="review__head">' +
        '<h4 class="review__title"><i class="icon" data-lucide="hash" aria-hidden="true"></i>' +
        "Record metadata</h4></div><dl class=\"review__list\">" +
        '<div class="review__row"><dt>Demo reference</dt><dd>' +
        escapeHtml(valueOf(record, "id")) +
        "</dd></div>" +
        '<div class="review__row"><dt>Submitted (local time)</dt><dd>' +
        escapeHtml(formatDateTime(valueOf(record, "submittedAt"))) +
        "</dd></div>" +
        '<div class="review__row"><dt>Demo status</dt><dd>' +
        escapeHtml(valueOf(record, "status") || "New (demo)") +
        "</dd></div>" +
        "</dl></div>";

      DETAIL_SECTIONS.forEach((section) => {
        let rows = "";
        section.fields.forEach((pair) => {
          const value = valueOf(record, pair[0]);
          const isEmpty = !value;
          rows +=
            '<div class="review__row"><dt>' +
            escapeHtml(pair[1]) +
            "</dt><dd" +
            (isEmpty ? ' class="is-empty"' : "") +
            ">" +
            (isEmpty ? "Not provided" : escapeHtml(value)) +
            "</dd></div>";
        });

        html +=
          '<div class="review__group"><div class="review__head">' +
          '<h4 class="review__title"><i class="icon" data-lucide="' +
          section.icon +
          '" aria-hidden="true"></i>' +
          escapeHtml(section.title) +
          '</h4></div><dl class="review__list">' +
          rows +
          "</dl></div>";
      });

      // Documents — filenames and sizes only; contents were never stored
      const documents = Array.isArray(record.documents) ? record.documents : [];
      let docRows = "";
      if (!documents.length) {
        docRows =
          '<div class="review__row"><dt>Documents</dt>' +
          '<dd class="is-empty">No documents were selected</dd></div>';
      } else {
        documents.forEach((file, index) => {
          docRows +=
            '<div class="review__row"><dt>File ' +
            (index + 1) +
            "</dt><dd>" +
            escapeHtml(file && file.name ? file.name : "Unnamed") +
            ' <span class="filelist__size">' +
            escapeHtml(formatBytes(file ? file.size : 0)) +
            "</span></dd></div>";
        });
      }

      html +=
        '<div class="review__group"><div class="review__head">' +
        '<h4 class="review__title"><i class="icon" data-lucide="paperclip" aria-hidden="true"></i>' +
        'Selected filenames</h4></div><dl class="review__list">' +
        docRows +
        "</dl>" +
        '<p class="field__hint mt-4">File contents were never uploaded or ' +
        "stored. Only the filename and byte size were recorded.</p></div>";

      detailBody.innerHTML = html;
      detailView.hidden = false;

      const heading = qs("[data-admin-detail-ref]", detailView);
      if (heading) heading.textContent = valueOf(record, "id");

      if (typeof D.refreshIcons === "function") D.refreshIcons();

      const closeButton = qs("[data-admin-detail-close]", detailView);
      if (closeButton) closeButton.focus();

      if (typeof detailView.scrollIntoView === "function") {
        detailView.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }

    function closeDetail() {
      if (detailView) detailView.hidden = true;
      if (detailBody) detailBody.innerHTML = "";
    }

    /* ---- events ---- */

    if (tableHost) {
      tableHost.addEventListener("click", (event) => {
        const button = event.target.closest("[data-view]");
        if (button) {
          openDetail(button.getAttribute("data-view"));
          return;
        }
        const row = event.target.closest("[data-row]");
        if (row) openDetail(row.getAttribute("data-row"));
      });
    }

    qsa("[data-admin-detail-close]", root).forEach((button) =>
      button.addEventListener("click", closeDetail)
    );

    if (searchInput) {
      const debounce =
        typeof D.debounce === "function"
          ? D.debounce
          : (fn, wait) => {
              let t = null;
              return function () {
                const args = arguments;
                window.clearTimeout(t);
                t = window.setTimeout(() => fn.apply(null, args), wait || 150);
              };
            };
      searchInput.addEventListener("input", debounce(renderTable, 180));
    }

    if (categorySelect) categorySelect.addEventListener("change", renderTable);
    if (sortSelect) sortSelect.addEventListener("change", renderTable);

    qsa("[data-admin-refresh]", root).forEach((button) => {
      button.addEventListener("click", () => {
        closeDetail();
        refresh();
        const note = qs("[data-admin-status]", root);
        if (note) {
          note.textContent =
            "Reloaded from browser storage — " +
            records.length +
            " record(s) found.";
          note.hidden = false;
        }
      });
    });

    qsa("[data-admin-clear]", root).forEach((button) => {
      button.addEventListener("click", () => {
        const count = records.length;
        if (!count) {
          window.alert(
            "There are no demonstration records saved in this browser."
          );
          return;
        }
        const ok = window.confirm(
          "Permanently delete all " +
            count +
            " demonstration record" +
            (count === 1 ? "" : "s") +
            " saved in this browser?\n\nThis also resets the demo reference " +
            "counter. It cannot be undone, and it only affects this browser."
        );
        if (!ok) return;

        clearRecords();
        closeDetail();
        refresh();
        const note = qs("[data-admin-status]", root);
        if (note) {
          note.textContent = "All demonstration data cleared from this browser.";
          note.hidden = false;
        }
      });
    });

    // Keep multiple open tabs in step
    window.addEventListener("storage", (event) => {
      if (event.key === STORE_KEY) {
        closeDetail();
        refresh();
      }
    });

    /* ---- refresh ---- */

    function refresh() {
      records = readRecords();
      renderKpis();
      renderTable();
    }

    refresh();
    return { refresh: refresh };
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  let dashboard = null;

  function init() {
    const root = qs("[data-admin]");
    if (!root) return;
    dashboard = initDashboard(root);
  }

  window.DICE = window.DICE || {};
  window.DICE.admin = {
    read: readRecords,
    clear: clearRecords,
    refresh: function () {
      if (dashboard) dashboard.refresh();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
