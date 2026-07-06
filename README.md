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
