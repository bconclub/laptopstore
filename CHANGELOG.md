# Changelog

## 2026-07-24 · Charts fill their cards, map = all stores + drill-in, bigger volume

- Every admin graph now fills its card end-to-end (no more floating lines): Orders-per-day and the dashboard revenue chart use a flex-fill container.
- Network map plots EVERY store at its real location (44 outlets/distributors), coloured by order activity (green busiest), fills the card edge-to-edge; click a store to drill into it (opens that node on the Network page via `?node=` deep-link).
- Seed volume up: 700 orders (was 250) + 220 repairs (was 80), creation biased toward recent days so the per-day sparklines trend UP and ~120 orders sit open — "Orders to fulfil" now reads in the hundreds.
- Orders API cap raised 300 -> 2000 so the dashboard counts the full order book.
- Network deep-link reads `window.location` (no `useSearchParams` Suspense bailout that was hanging the page).

## 2026-07-24 · Admin accessibility, responsive & polish (design audit)

Prompted by a design-director audit of the admin (scored Technical 14/20,
Heuristics ~30/40 — the gap was accessibility + responsive, not visual polish).

- Visible keyboard focus: `:focus-visible` ring (brand token) across the admin; nav links previously computed `outline: none`.
- Respect `prefers-reduced-motion`: slide/scale travel removed inside the admin, opacity/colour fades kept as the intentional reduced alternative.
- Semantic headings: dashboard card titles promoted from `<p>` to `<h2>` for a real screen-reader outline.
- Mobile layout: new `AdminShell` — static sidebar rail on desktop, off-canvas drawer + top-bar hamburger below `md`; collapse rail is desktop-only, mobile drawer always full-width and labelled.
- Loading skeletons: dashboard + drawers show pulse placeholders instead of bare "Loading…", so the layout doesn't jump.
- User-facing: admin now works on a phone, is keyboard-navigable, and honours reduced-motion.
- `(805d5a2)` a11y · mobile commit · skeletons head
