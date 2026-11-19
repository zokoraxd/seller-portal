# Seller Portal — concept prototype

**Live demo:** https://seller-portal-azure.vercel.app (Arabic, RTL — click "الدخول كمشرف", then *بوابة البيانات* → "جرّب عينة غير مرتبة")

An Arabic-first (RTL) portal for an online marketplace with two roles:

- **Platform ops:** store analytics, a data-import gateway, a co-funded discount calculator and a salary-cycle radar.
- **Merchant:** a store summary, sales-data upload, and the offers the platform sends.

It does two things a spreadsheet-driven marketplace team needs:

1. **Cleans messy seller sales sheets.** Shops send Excel/CSV files with Arabic headers, Arabic digits (`٢٥٠٠٠`), prices written as `145 الف`, Excel date cells and the odd typo. The import gateway reads them, shows **how each column was understood**, flags every row that is wrong or doubtful, lets the user fix the unclear ones, and only then adds them to the ledger.
2. **Answers "does this campaign help both sides?"** Given a store's real numbers and a discount that the store and the platform co-fund, the calculator shows profit before and after for **each** side and finds the split where both gain.

> **Unofficial concept prototype.** It is not affiliated with any real company, and it has no real user accounts or passwords (each visitor gets a private anonymous workspace). All stores, numbers and conversations are fictional.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 154 tests
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

`npm test` runs 154 tests (Vitest). Two groups matter most:

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

## Backend (Supabase)

Optional: without the two env vars the app runs entirely in the browser. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key to use Supabase (both are public by design; safety comes from row-level security, not from hiding them).

- **One private workspace per visitor.** The app signs each visitor in anonymously (Supabase anonymous auth) and every row carries `owner_id = auth.uid()`. Admin and merchant are two *views* of one workspace, not separate permission levels.
- **Row-level security on every table** (`ledger_entries`, `offers`, `messages`, `tasks`), one policy per operation, forced for table owners, nothing granted to the `anon` role. Verified with a transaction-wrapped SQL test: workspace A cannot read, update, delete or forge rows of workspace B; the signed-out role has no access; deleting a user cascades to their rows. The Supabase security and performance advisors report no issues.
- **Database constraints** mirror the validation in `src/core` (value ranges, allowed statuses and categories, shares summing to 100%), so a bad row cannot be stored even if the client is bypassed.
- **Free-tier protection:** per-workspace row caps (5,000 ledger rows) enforced by a statement-level trigger, and a daily `pg_cron` job that deletes anonymous workspaces idle for 30 days.
- **Offline-tolerant client:** every change applies instantly and is written to Supabase in order in the background. If the server cannot be reached at start the app uses local mode; if a write fails the user is told the change may not be saved.

## Assumptions and limits

- The installment-funding factor (default 65%) and the 5%-step split search are modelling assumptions, not measured values.
- The health score weights (volume 25, sales 20, returns 25, delivery 20, margin 10) are a transparent heuristic, not a real platform's criteria.
- No email sign-up and no sharing between users: a workspace is one anonymous browser session. Clearing site data starts a new workspace (the old one is purged after 30 idle days).
- Supabase free plan: projects pause after one week of inactivity and there are no automatic backups. If the server is paused or unreachable the app falls back to local mode and says so in the header.
- Files are limited to 5 MB and 20,000 rows; parsing runs on the main thread.

## Stack

Vue 3 (Composition API) · Vite · Pinia · Vue Router · Tailwind CSS · Chart.js · SheetJS (0.20.3 from the vendor CDN, which fixes the CVEs of the npm `0.18.5` build) · Vitest
