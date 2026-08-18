<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Zoho

Anything touching Zoho: read `../docs/zoho-contract.md` first. Verified field
names, endpoints, paging and stock semantics for both this app and the sync
engine. Two traps documented there: sell against `warehouse_available_for_sale_stock`
not `stock_on_hand`, and per-warehouse stock only comes from `/itemdetails`,
batched, never `/items`.

Check it still holds: `python ../scripts/zoho/zoho.py verify`
