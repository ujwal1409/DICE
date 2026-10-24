# DICE Engineering & Consultancy — Website Prototype

**Connecting your requirement to Reliable Solutions**

> Your Requirement. Our Engineering. The Right Partner.
> Ideas. Inspiration. Innovation.

A 13-page, framework-free static website prototype. No build step, no package
manager, no backend.

---

## 1. Purpose

This site demonstrates how DICE Engineering & Consultancy presents its
engineering capabilities, manufacturing and fabrication services, specialist
partner coordination, project workflow, manpower support and customer
enquiry process.

It is a **front-end prototype built for demonstration**, not a production
business system. See [section 11](#11-limitations--what-this-prototype-is-not)
for exactly what it does not do.

---

## 2. How to open it locally

**Option 1 — just double-click**

Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari). Every
link uses a relative path, so the whole site works straight from the file
system. No server required.

**Option 2 — serve it over HTTP** (recommended, so `404.html` behaves as it
will when hosted)

```bash
# Python 3
python -m http.server 8000
# then visit http://localhost:8000
```

Nothing needs to be installed, compiled or configured first.

---

## 3. Technology stack

| Layer  | Used                                                   |
| ------ | ------------------------------------------------------ |
| Markup | HTML5, semantic landmarks, ARIA where needed           |
| Styles | CSS3 — custom properties, grid, flexbox, `clamp()`     |
| Script | Vanilla JavaScript (ES6+), no dependencies             |
| Icons  | Lucide via CDN, with a CSS fallback if it is blocked   |
| Fonts  | Barlow + Inter via Google Fonts, system-font fallback  |

No React, TypeScript, Next.js, Vite, Tailwind, Bootstrap, jQuery, Node.js,
npm, bundlers, databases or API keys.

---

## 4. Folder structure

```
dice-website/
├── index.html                    Homepage
├── about.html                    About Us + ecosystem diagram
├── services.html                 Capabilities catalogue (6 categories)
├── industries.html               Industries & Applications (6 areas)
├── projects.html                 Concept gallery + detail modal
├── how-it-works.html             5-step process + engineering workflow
├── partner-network.html          Interactive partner network map
├── quality-safety.html           5 principles + quality requirements
├── manpower-international.html   Manpower + India→Europe workflow
├── contact.html                  Contact details + enquiry form
├── request-quote.html            5-step RFQ wizard
├── demo-admin.html               Local demo enquiry dashboard
├── 404.html                      Not-found page
├── css/
│   └── style.css                 Entire design system + all page styles
├── js/
│   ├── main.js                   Nav, active state, year, reveal, tablists, fallbacks
│   ├── services.js               Capability metadata, filters, detail panels
│   ├── gallery.js                Gallery filters + project modal
│   ├── enquiry.js                Contact form, RFQ wizard, files, localStorage
│   └── admin.js                  Demo dashboard rendering
├── assets/
│   ├── images/
│   │   ├── dice-logo-mark.png    Logo "D" mark, transparent (used site-wide)
│   │   ├── dice-logo-full.png    Full stacked lockup, transparent (spare)
│   │   ├── dice-icon-32.png      Favicon
│   │   └── dice-icon-180.png     Apple touch icon
│   └── icons/
│       └── logo.jpg              Original supplied artwork (reference only)
└── README.md
```

---

## 5. Pages and features

| Page | Main interactions |
| ---- | ----------------- |
| `index.html` | Hero, six capability cards, five-step process, value cards, capability mosaic, partner diagram, five principles |
| `about.html` | Inline-SVG ecosystem diagram (hub + six nodes), three pillars, partner-led model, six benefits |
| `services.html` | Sticky keyboard-operable filter toolbar, six capability blocks, expanding detail panels, expand-all, deep links |
| `industries.html` | Six alternating image-led application areas with capability references |
| `projects.html` | Eight category filters, 20 concept cards, accessible detail modal |
| `how-it-works.html` | Interactive five-step stepper, Input→Release workflow, three capability-mix scenarios |
| `partner-network.html` | Interactive network map, node detail panels, connector highlighting |
| `quality-safety.html` | Five large principle cards, quality requirements checklist |
| `manpower-international.html` | Five personnel categories, deployment topics, three-stage international workflow |
| `contact.html` | Validated enquiry form, confirmation screen, quick links |
| `request-quote.html` | Five-step RFQ wizard, drag-and-drop files, review, demo submission |
| `demo-admin.html` | KPI cards, searchable/filterable/sortable table, per-record detail view |
| `404.html` | Not-found page with routes back into the site |

### Shared interaction widgets

Two reusable controllers do most of the work:

- **`initTablist`** in `main.js` — drives the how-it-works stepper and the
  partner-network map from markup alone. Click, arrow keys, `Home`/`End`,
  roving tabindex. `data-lights="key"` on a tab toggles `.is-lit` on the
  matching `[data-line="key"]`, which is how the map highlights connectors.
- **`applyFilter` / `initFilters`** in `gallery.js` — the filter engine used by
  the projects gallery, exposed on `window.DICE.gallery` for reuse.

---

## 6. Demo RFQ form behaviour

`request-quote.html` is a five-step wizard: Customer Details → Project
Requirement → Drawings & Documents → Review → Submit.

- Progress indicator with step labels, plus a live `role="status"` line that
  names the current step.
- Per-step validation. Next is blocked until the visible step is valid;
  Submit re-validates every step and jumps back to the first problem.
- Values are preserved across steps (the fields stay in the DOM), so moving
  back and forth never loses data.
- The Review step is generated from live form values, with an **Edit** button
  per group that jumps to the relevant step.
- Submitting generates a sequential reference (`DICE-DEMO-1001`, `1002`, …),
  writes the record to localStorage and shows a success screen.
- Double submission is blocked via a flag plus a disabled button.
- Reset asks for confirmation, then clears fields, files and errors and
  returns to step 1.
- No page reload happens at any point in normal progression.

### Explicitly not implemented

The success screen states plainly that the submission is local, that nothing
was emailed, and that selected documents were not transmitted. There is no
message anywhere claiming a quote request was sent.

---

## 7. LocalStorage behaviour

> **localStorage data is stored only in the browser you are using, on the
> device you are using. It never reaches the real DICE business.** It is not
> synchronised, not backed up, not encrypted, and not visible to anyone else
> unless they have access to that device.

| Key | Contents |
| --- | -------- |
| `dice.prototype.enquiries` | Array of demo enquiry records (newest first) |
| `dice.prototype.refseq` | Integer counter behind the `DICE-DEMO-####` references |

A stored record holds the form field values plus `id`, `submittedAt`, `status`
and a `documents` array of `{ name, size }`. **File contents are never stored.**

Clearing it:

- **Clear Demo Data** on `request-quote.html` or `demo-admin.html` — both ask
  for confirmation first and both also reset the reference counter.
- Clearing your browser's site data for this origin.

Please use placeholder information rather than real personal or commercial
data. Both forms say so in the interface.

---

## 8. File-selection limitations

Step 3 of the RFQ form has a drag-and-drop area with a standard file-picker
fallback (a real `<input type="file">` with a `<label>`, so it is keyboard
operable).

- **Accepted extensions:** PDF, DWG, DXF, STEP (`.step` and `.stp`), JPG,
  JPEG, PNG.
- **Limits:** 10 MB per file, maximum 5 files.
- Selected files are listed with name, type and size, and each can be removed
  individually.
- Duplicates (same name and size) are rejected, as are empty files.

**Validation is by file extension, not MIME type.** Browsers report
inconsistent or empty MIME types for engineering formats such as DWG, DXF and
STEP, so the extension is the primary check and the reported type is only ever
advisory. This is a deliberate trade-off: it accepts a renamed file, but it
does not reject a legitimate DWG because the browser had no opinion about it.

`.stp` is accepted alongside `.step` because it is in common use for the same
format. That is a small addition to the originally specified list.

**Nothing is uploaded.** Files stay in the browser session as `File` objects
for the lifetime of the page. Only filenames and sizes reach the review
screen, the success screen and localStorage.

---

## 9. Demo admin dashboard limitations

`demo-admin.html` reads the records written by the RFQ form and offers KPI
cards, search (reference, customer, company, project title), category
filtering, date sorting, a detail view per record, refresh and Clear Demo
Data.

It is labelled **"DEMONSTRATION ADMIN — Browser-local data only."** and:

- **has no authentication and no access control.** There is deliberately no
  login screen. A prototype with no server cannot protect anything, and a fake
  login would imply security that does not exist.
- **must not be used for real customer data.** Records sit unencrypted in
  localStorage, readable by anyone with access to the device or its developer
  tools.
- **shows no real submissions.** Every record was created by whoever used the
  RFQ form in that same browser. None were received by DICE.
- **is seeded with nothing.** With no data it shows an honest empty state and a
  link to the RFQ form, rather than fabricated sample enquiries.

---

## 10. External dependencies

Three external resources, all optional. The site degrades gracefully without
any of them:

| Resource | Used for | If it fails |
| -------- | -------- | ----------- |
| `unpkg.com/lucide@0.460.0` | Icons via `data-lucide` | `main.js` adds `html.no-lucide` and CSS renders a small geometric mark per icon |
| `fonts.googleapis.com` | Barlow + Inter | Falls back to Barlow / Segoe UI / Helvetica / Arial |
| `images.unsplash.com` | Photography | `main.js` swaps in a branded blueprint placeholder; dark scrims keep all hero text readable regardless |

The logo and favicon are local files, so branding never depends on a network
request. The logo images carry `data-no-placeholder`, which tells `main.js` to
leave them alone rather than substituting the blueprint placeholder, since that
would look worse than nothing in a small fixed slot.

With JavaScript disabled entirely: all content is visible, forms fall back to
native browser validation, reveal animations simply do not run, and tab panels
read as a plain stack.

### A note on the photography

Every image referenced has been **visually confirmed** against its alt text.
A stock photo ID is not evidence of what the picture shows: during the build,
two images turned out to be a photo of lemons and a photo of a building
facade, captioned as pipework and a CNC machine. Both were removed and all
remaining images were checked by eye.

If you add photography, confirm the subject before writing the alt text, or
drop local files into `assets/images/` and reference them relatively.

---

## 11. Limitations — what this prototype is **not**

- **No backend.** No server-side code of any kind.
- **No database.** The only persistence is browser localStorage.
- **No real email transmission.** Nothing is ever sent. Neither form contacts
  anyone, and no message claims otherwise.
- **No real document uploads.** Files never leave the browser.
- **No production authentication.** `demo-admin.html` is unprotected by
  design, because there is no server to protect it.
- **No verified business claims.** The site deliberately asserts no company
  history, founding date, employee numbers, revenue, certifications,
  accreditations, standards compliance, named customers, endorsements,
  partnerships, confirmed overseas deployments, work permits, overseas
  offices, performance metrics or completed projects. Gallery items are
  labelled **Concept Demonstration**; industry sections are labelled
  illustrative application areas.

To contact DICE for real: [dice.ec.2020@gmail.com](mailto:dice.ec.2020@gmail.com)
or [+91-7203050180](tel:+917203050180).

---

## 12. Deploying to Vercel

The folder is already static-host ready.

1. Put the contents of `dice-website/` in a Git repository (or drag the folder
   into the Vercel dashboard).
2. Create a new Vercel project pointing at it.
3. **Framework Preset:** *Other*.
4. **Build Command:** leave empty.
5. **Output Directory:** leave empty (the repository root is the site root).
6. **Install Command:** leave empty.
7. Deploy.

No environment variables, secrets or service credentials are required.

**No `vercel.json` is included, because none is needed.** Vercel's zero-config
static hosting already serves `index.html` at `/`, serves each page at its
literal path such as `/about.html`, and uses a root-level `404.html` for
not-found responses. Adding a config file would only risk changing that
working behaviour.

The same applies to Netlify, Cloudflare Pages, GitHub Pages or any static
host. To share by email, compress the whole `dice-website` folder into a ZIP —
there are no `node_modules` or build artefacts to exclude.

---

## 13. Design system

| Token         | Value     | Use                                  |
| ------------- | --------- | ------------------------------------ |
| Dark navy     | `#0B1D2C` | Primary dark surface, headings       |
| Deep blue     | `#102B40` | Secondary dark surface, image bases  |
| Turquoise     | `#08A6B5` | Primary accent, links, active states |
| Orange accent | `#F28C28` | Calls to action, focus rings         |
| White         | `#FFFFFF` | Light surface                        |
| Light grey    | `#F2F6F8` | Alternating section background       |

Spacing, radius, elevation, motion and type scales are all declared as custom
properties at the top of `css/style.css`, so the whole site re-themes from one
place.

### Logo

The header and footer use the supplied DICE logo mark — the navy "D" holding a
silver gear and turquoise circuit traces — paired with the company name as real
HTML text. The mark is used rather than the full stacked lockup because the
lockup already contains the words "DICE" and "ENGINEERING & CONSULTANCY", which
would be duplicated next to the text, and because it is too tall for a sticky
header.

| File | Use |
| ---- | --- |
| `assets/icons/logo.jpg` | The original supplied artwork. Kept for reference; not referenced by any page |
| `assets/images/dice-logo-mark.png` | The "D" mark, transparent, 160×166 — used in every header and footer |
| `assets/images/dice-logo-full.png` | The complete stacked lockup, transparent, 720×832 — available but not currently used |
| `assets/images/dice-icon-32.png` | Favicon |
| `assets/images/dice-icon-180.png` | Apple touch icon |

**The supplied `logo.jpg` could not be used directly.** It had been exported
from a transparent PNG but saved as JPEG, which has no alpha channel, so the
editor's transparency checkerboard was baked in as real grey and white squares.
Dropped into the navy header it would have shown a visible chequered box.

The transparent PNGs above were derived from it by:

1. flagging light, near-neutral pixels as background;
2. restoring small enclosed islands, which are silver gear highlights that
   happen to be as bright as the checkerboard;
3. keeping enclosed islands that are roughly half pure white, because those are
   genuine background inside letter counters such as the "D" of DICE;
4. deleting sub-30-pixel speckles left by JPEG compression;
5. feathering the remaining light neutral fringe to remove the grey halo;
6. trimming to the artwork bounds.

If you can supply the original PNG, SVG or EPS, replacing these files with a
true vector or lossless export would render more crisply, especially on
high-density screens. The current PNGs are raster and derived from a lossy
source.

The mark is exported at 160px wide and displayed at 46px (header) or 54px
(footer), so it is still roughly a 3x pixel ratio for high-density screens at
35 KB rather than 119 KB. `dice-logo-full.png` keeps the full resolution if a
larger render is ever needed.

**On dark surfaces the mark sits on a white plate.** The logo's navy is very
close to the site's own navy, so on the footer the D silhouette and strapline
would almost disappear. Rather than recolour the supplied artwork, the
`.wordmark--light` variant puts it on a small white rounded plate. If an
official reversed or mono-white version of the logo exists, use that instead
and drop the plate.

The site palette was **not** changed to match the logo exactly. The logo's navy
is about `#0E2747` and its turquoise about `#0A7B8A`, both slightly deeper than
the site tokens, but close enough to sit naturally without re-theming every
page.

---

## 14. Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `footer`) and a skip link on
  every page.
- Keyboard operable throughout: the mobile drawer traps focus and closes on
  `Escape`; the "More" dropdown responds to click, hover and `ArrowDown`;
  filter toolbars and tablists support arrow keys, `Home` and `End` with
  roving tabindex; the project modal traps focus, closes on `Escape` and on
  backdrop click, and restores focus to the card that opened it.
- `aria-current="page"` applied to the active navigation item by `main.js`.
- Form errors are inline, associated via `aria-describedby`, and announced
  through live regions. `aria-invalid` is set on failing controls.
- Collapsed disclosure panels use `visibility`/`hidden` so they leave both the
  tab order and the accessibility tree.
- Gallery cards are `<article>` elements whose heading contains a real
  `<button>` with a stretched hit area — full card clickability without
  nesting flow content inside a button.
- Visible focus states everywhere; meaningful `alt` text; decorative imagery
  marked `aria-hidden`.
- `prefers-reduced-motion` disables animation and scroll reveal.
  `prefers-contrast: more` strengthens muted text and image scrims.
- Background scroll is locked while the modal or mobile drawer is open, and
  restored on close.

Full WCAG conformance has not been assessed. That needs manual testing with
real assistive technology and an expert accessibility review; the above
describes what was built and checked structurally, not a certified result.
