# Changelog

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
