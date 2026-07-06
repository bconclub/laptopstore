# Website ↔ Zoho Inventory Sync — Setup Request

**Purpose:** keep stock/availability on laptopstoreindia.com in sync with the inventory system the stores already update in Zoho. This is separate from lead handling — EDITR Proxy continues to own leads, calls, and WhatsApp as-is. This document only covers **inventory/stock sync**.

---

## 1. One thing to confirm first

"Zoho CRM" and "Zoho Inventory" are two different products in the Zoho suite:

- **Zoho CRM** — contacts, deals, leads (this is what EDITR Proxy likely already touches).
- **Zoho Inventory** (or the inventory module inside **Zoho Books**) — items, stock levels, warehouses/locations. This is almost always where multi-location stock-on-hand actually lives.

**Ask them:** *"Which Zoho product shows the stock count per store — Zoho Inventory, Zoho Books, or a custom module built inside Zoho CRM?"*

Everything below assumes **Zoho Inventory**, since that's the standard product for this. If it turns out to be a custom CRM module, the OAuth setup is identical — only the API paths change (Zoho CRM's `Products`/custom-module records instead of Inventory's `items`).

---

## 2. How the sync will work

```
Store staff update stock in Zoho (per location)
              │
              ▼
   Zoho Inventory (source of truth)
              │
   webhook (preferred) or scheduled poll every N minutes
              ▼
  Our sync service (server-side, holds the API token)
              │
   maps Zoho item_id → our product slug
              ▼
  Website product catalog: stock qty / in-stock flag updates
```

- **One-way by default**: Zoho → website. We do not write back to Zoho unless they specifically want the site to decrement stock on an online order (see question 6 below) — that would make it two-way and needs more care (race conditions between a store sale and a web sale).
- Leads, enquiries, WhatsApp — **unchanged**, still EDITR Proxy. This integration has no overlap with that.

---

## 3. What we need them (or their Zoho admin) to create

1. **A Server-based Application** in the [Zoho API Console](https://api-console.zoho.com/), under their Zoho account.
   → Gives us a **Client ID** and **Client Secret**.
2. **Redirect URI** — we'll provide this once hosting is finalized (e.g. `https://laptopstoreindia.com/api/zoho/callback`). They just need to know one is coming.
3. **Organization ID** (`org_id`) — visible in Zoho Inventory under Settings. Required on every API call.
4. **Data center / domain** — Zoho's API base URL differs by region: `.com` (US), `.in` (India), `.eu`, `.com.au`, etc. Whichever region their Zoho account is registered in.
5. **Scopes to grant** when authorizing the app:
   - `ZohoInventory.items.READ`
   - `ZohoInventory.warehouses.READ` (only if we're showing per-branch stock — see question 4)
   - Add a `.WRITE` scope only if two-way sync is wanted later.
6. Ideally a **dedicated API user** (least-privilege), not a personal admin login — ask if that's possible on their plan.

---

## 4. Endpoints we'd call (Zoho Inventory REST API v1)

| Purpose | Endpoint |
|---|---|
| List all items + stock on hand | `GET /inventory/v1/items` |
| Single item detail | `GET /inventory/v1/items/{item_id}` |
| List warehouses/locations | `GET /inventory/v1/warehouses` |
| Stock filtered to one location | `GET /inventory/v1/items?warehouse_id=...` |
| Outgoing webhook on stock change | Configured in Zoho Inventory → Settings → Automation → Webhooks |

Webhooks are strongly preferred over polling — instant updates, no rate-limit pressure. Confirm their plan tier supports outgoing webhooks (most paid Inventory plans do).

---

## 5. Questions to send them

1. Is stock tracked in **Zoho Inventory**, **Zoho Books**, or a custom module inside **Zoho CRM**?
2. Can someone create a **Server-based Application** in the Zoho API Console and share the **Client ID**, **Client Secret**, and **Organization ID**?
3. Which **Zoho data center** is the account on (.com / .in / .eu / other)?
4. Do you want **per-branch stock** shown on the site (e.g. "3 in stock in Chennai"), or just a single combined **in-stock / out-of-stock** flag across all locations? If per-branch, we'll need the list of warehouse IDs mapped to our 6 cities.
5. Can **outgoing webhooks** be enabled for stock changes, or should we poll on a fixed interval instead?
6. Should this stay **one-way** (Zoho → website), or do you also want the website to **decrement Zoho stock** when someone places an online order? (Two-way needs more design work to avoid double-selling the same unit.)
7. What's the current **Zoho Inventory plan/tier**? (Affects API rate limits — typically ~100 requests/minute on paid plans.)

---

## 6. What we build once we have the above

- OAuth token exchange + refresh-token storage (server-side only — never exposed to the browser).
- A small sync service: webhook receiver (preferred) or a scheduled job, mapping `Zoho item_id ↔ our product slug`.
- Stock/availability fields on the website update automatically as Zoho changes.
- No changes to how leads/enquiries are handled — that stays on EDITR Proxy.
