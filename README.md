# Seller Portal — concept prototype

An Arabic-first (RTL) portal for an online marketplace with two roles:

- **Platform ops:** store analytics, a data-import gateway, a co-funded discount calculator and a salary-cycle radar.
- **Merchant:** a store summary, sales-data upload, and the offers the platform sends.

It does two things a spreadsheet-driven marketplace team needs:

1. **Cleans messy seller sales sheets.** Shops send Excel/CSV files with Arabic headers, Arabic digits (`٢٥٠٠٠`), prices written as `145 الف`, Excel date cells and the odd typo. The import gateway reads them, shows **how each column was understood**, flags every row that is wrong or doubtful, lets the user fix the unclear ones, and only then adds them to the ledger.
2. **Answers "does this campaign help both sides?"** Given a store's real numbers and a discount that the store and the platform co-fund, the calculator shows profit before and after for **each** side and finds the split where both gain.

> **Unofficial concept prototype.** It is not affiliated with any real company, and it has no backend and no real authentication. All stores, numbers and conversations are fictional. State lives in the browser (`localStorage`).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 140 tests
npm run build
```

Click **"جرّب عينة غير مرتبة"** (try a messy sample) on the *Data gateway* page to see the cleanup in action without preparing a file.

## How the engine is organised

All logic lives in `src/core/` as pure functions with no Vue, no DOM and no global state, so it is unit-tested on its own. The UI only calls it.

| Module | Job |
|---|---|
| `arabic.js` | Reads `٢٥٬٠٠٠`, `25 الف`, `1.5 مليون`, `25,000 IQD`. Returns `null` instead of guessing. |
| `dates.js` | Excel serials, `YYYY-MM-DD`, day-first `DD/MM/YYYY`, Arabic digits. |
| `tabular.js` | RFC-4180 CSV/TSV reader and writer (quoted commas, BOM, formula-injection guard). |
| `headers.js` | Maps Arabic/English column names to canonical fields. |
| `ledger.js` | Row validation: errors, "needs your choice", warnings, duplicates. |
| `stores.js` | Per-store KPIs and an explainable 0–100 health score. |
| `deal.js` | Co-funded discount model and the split optimiser. |
| `radar.js` | Salary-days vs mid-month demand by buyer segment. |

The Vue layer: Pinia store with validated persistence, lazy-loaded routes, Chart.js (only the parts used) and SheetJS loaded on demand.

## Testing

`npm test` runs 140 tests (Vitest). Two groups matter most:

- **Characterisation tests** (`tests/golden.test.js`). This project grew out of a single-file prototype. `tests/golden.json` holds the numbers the *original* code produced for its own demo data. The refactored modules reproduce every KPI, health score, deal result and optimiser choice exactly.
- **Regression tests for bugs found in the prototype** (below).

## What was wrong in the original prototype, and what changed

| Problem in the original | Fix |
|---|---|
| Unknown category silently became "Electronics"; unknown status became "delivered"; a bad or missing date became `2026-11-05`. | Rows are flagged; the user picks a value or the row is excluded. |
| Excel date cells (serial numbers) were rejected and replaced by the default date, which broke the salary-cycle radar. | Excel serials, `DD/MM/YYYY` and Arabic-digit dates are parsed. |
| CSV parser split on commas before removing quotes, so `"25,000"` or a store name with a comma was corrupted. | Proper CSV parser; export → import round-trips. |
| Imported text went straight into `innerHTML`, so a store name like `<img onerror=…>` could inject script. | Vue templates escape everything; no `v-html` anywhere; verified in the browser. |
| A merchant could "replace" the entire platform ledger when importing. | Only admins can replace; merchants can only add, and only to their own store. |
| `parseFloat("٢٥٠٠٠")` is `NaN`: Arabic-digit prices failed. | `parseAmount` handles Arabic digits, separators and magnitude words. |
| Demo offer showed hard-coded profit numbers that the calculator itself would not produce. | The seeded offer is computed by the same engine. |
| The tips promised effects ("+12 points", "doubles your exposure") with no basis. | Tips use what-if numbers from the same scoring formula. |
| The installment subsidy `0.65` was a hidden constant. | It is a named, adjustable, clearly labelled **assumption** in the UI. |

## Accessibility

Checked with axe-core (WCAG 2.2 A/AA + best practices) in a real browser on **11 screen states**: entry, all admin and merchant screens, the import review table, both radar periods, both drawer tabs and the 404 page. **Result: 0 violations.** The first pass found real problems, all fixed:

- The brand orange was 3.6:1 on white; it is now `#C2410C` (5.2:1). Light-grey helper text was raised to meet 4.5:1.
- Charts had no text alternative; each now has a label that states the figures.
- Scrollable tables and chat were unreachable by keyboard; they are now focusable named regions.
- The messages drawer is a modal dialog: focus moves in, Tab is trapped, the page behind is `inert`, Escape closes it and focus returns to the button that opened it.
- Skip link, a unique `<title>` per screen, and focus moves to the main content after each in-app navigation.
- Respects `prefers-reduced-motion`.

Not covered: a manual screen-reader pass (NVDA/VoiceOver). Automated tools find roughly a third of issues, so treat this as a strong baseline, not a certificate.

## Launch readiness

- Self-hosted Cairo font (SIL OFL): no third-party requests at page load.
- Favicon set (SVG, 32 px, 180 px Apple touch icon), web manifest, `theme-color`, Open Graph and Twitter card tags with a 1200×630 preview image, canonical link, `robots.txt`, and a real 404 screen.
- Set `VITE_SITE_URL` (see `.env`) to the deployed URL so canonical and social-card links are absolute.

## Assumptions and limits

- The installment-funding factor (default 65%) and the 5%-step split search are modelling assumptions, not measured values.
- The health score weights (volume 25, sales 20, returns 25, delivery 20, margin 10) are a transparent heuristic, not a real platform's criteria.
- No server, no auth, no multi-user sync. `localStorage` is the only persistence, and it is validated on load.
- Files are limited to 5 MB and 20,000 rows; parsing runs on the main thread.

## Stack

Vue 3 (Composition API) · Vite · Pinia · Vue Router · Tailwind CSS · Chart.js · SheetJS (0.20.3 from the vendor CDN, which fixes the CVEs of the npm `0.18.5` build) · Vitest
