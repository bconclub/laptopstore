# Laptop Store India — Redesign

Modern, app-like storefront for [laptopstoreindia.com](https://www.laptopstoreindia.com/) — The Laptop Specialist since 2007.

## Stack

- **Next.js 16** (App Router, React 19, static generation)
- **Tailwind CSS v4** (design tokens in `src/app/globals.css`)
- **lucide-react** icons
- **Supabase-ready** — `@supabase/supabase-js` installed, schema in `supabase/schema.sql`

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (80 static pages)
```

## Structure

```
src/
  app/                     # Pages: home, category/[slug], product/[slug],
                           # categories, cart, service, stores
  components/              # Design system (Header, BottomNav, ProductCard, …)
  data/                    # Seed catalog: real category tree + 16 curated products
  lib/
    data.ts                # Data-access layer — swap bodies for Supabase queries
    supabase.ts            # Client, activates via env vars
supabase/schema.sql        # Postgres schema + RLS policies
```

## Connecting Supabase (next step)

1. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Replace the function bodies in `src/lib/data.ts` with Supabase queries —
   page code needs no changes.
4. Import the full ~3,400-product catalog from the live OpenCart store
   (scrape or DB export) into the `products` / `product_specs` tables.

## Brand

Extracted from the live site: blue `#2584C5`, accent yellow `#F6D62C`,
ink `#0F1C2E`, Poppins (display) + Inter (body). Full token scale in
`globals.css`. Design decisions in [DESIGN.md](DESIGN.md).

---

## Backend (mock-first) — run-book

The site + admin run entirely on a **deterministic in-memory mock** (no
Supabase yet). Zoho stays the future system of record; the sync engine is a
separate workstream.

### Run

```bash
npm run dev          # site :3000  (storefront + /admin + all APIs)
npm run smoke        # seed integrity + determinism check (no server needed)
npm run simulate     # full end-to-end simulation against a running server
npm run mock:reset   # clear the persisted mock state (.mock/state.json)
```

- `MOCK_PERSIST=1` (dev default via launch config) persists mock writes to
  `.mock/state.json` across restarts; delete it (or `npm run mock:reset`) to
  reseed the deterministic baseline.
- **Logins (demo):** storefront/account = any mobile + OTP `0000`; admin =
  `/admin/login`, one-click role (HQ, outlet manager, distributor, repair
  desk, B2B desk).

### Simulation harness

`npm run simulate` resets to the seeded baseline and drives **8 flows over
HTTP** (set `SIM_BASE_URL` to target another port/preview):
reads · purchase-b2c · purchase-split · repair · rental · enquiry-b2b ·
guarantees · admin-surfaces — ~100 assertions covering: stock decrement +
split fulfilment routing, refurb serials selling exactly once, trade-in
totals, all four state machines end-to-end (409 + allowed list on illegal
moves), B2B tier pricing + quote→Net-30 conversion, rental unit hold/free,
zero-stock block ("no phantom stock"), Zoho-owned field write rejection
("Zoho always wins"), sync retry, stock-override→stale, role scoping, and
analytics deltas. Each run writes `scripts/simulate/reports/run-*.json` and
exits non-zero on any failure. Re-runnable indefinitely.

### Swap to Supabase (when the project exists)

1. Run `supabase/schema_v2.sql` in the SQL editor.
2. Implement `src/lib/provider/supabase/provider.ts` against the
   `DataProvider` contract (`src/lib/provider/contract.ts`) — pages, APIs,
   admin and the harness don't change.
3. Point `getProvider()` at it + set the env keys; seed with the same
   generators.

Note (Vercel preview): mock state is per-serverless-instance — the rich
seeded history keeps demos populated, but run the simulation locally.
