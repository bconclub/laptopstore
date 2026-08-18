-- ============================================================================
-- Sync engine surface — run AFTER schema_v2.sql, in the Supabase SQL editor.
--
-- The sync engine talks to the database ONLY through these functions, called
-- via PostgREST RPC with the service_role key. The functions enforce the
-- ownership rule in SQL, so even the sync engine cannot clobber website-owned
-- columns: on conflict it updates Zoho-owned fields and nothing else.
--   Zoho-owned:    zoho_record_id, sku, price, status (product) · qty (stock)
--   website-owned: slug, titles, images, highlights, specs, category, badge…
-- ============================================================================

-- ── Zoho warehouse → our node ────────────────────────────────────────────────
-- Zoho warehouse ids are per-org and die at cutover (contract §12), so the map
-- lives in data, not code. Unmapped warehouses get a placeholder node of type
-- 'warehouse' so stock keeps flowing end to end; ZH-08 later renames/remaps
-- them to real outlets without touching the sync engine.
create table if not exists zoho_warehouse_map (
  zoho_warehouse_id text primary key,
  zoho_warehouse_name text not null default '',
  node_id text not null references nodes(id),
  mapped_by text not null default 'auto',   -- 'auto' placeholder | 'manual' ZH-08 answer
  updated_at timestamptz not null default now()
);

-- ── Product upsert, ownership-safe ───────────────────────────────────────────
-- items: [{ zoho_record_id, sku, name, price, status, data_gaps: text[] }]
create or replace function sync_upsert_products(items jsonb)
returns table (sku text, action text) language plpgsql security definer as $$
declare it jsonb;
begin
  for it in select * from jsonb_array_elements(items) loop
    insert into products (
      id, zoho_record_id, sku, slug, line, status,
      titles_ops, titles_display, titles_seo,
      brand, category, price, data_gaps
    ) values (
      'P-' || lower(it->>'sku'),
      it->>'zoho_record_id',
      it->>'sku',
      -- placeholder slug from sku; the website owns and will replace it
      lower(regexp_replace(it->>'sku', '[^a-zA-Z0-9]+', '-', 'g')),
      'new',                                   -- line refined during curation
      case when it->>'status' = 'active' then 'active'::product_status
           else 'archived'::product_status end,
      coalesce(it->>'name', ''),
      coalesce(it->>'name', ''),               -- display starts as ops name
      coalesce(it->>'name', ''),
      'Unknown',                               -- brand extracted during curation
      'uncategorised',
      (it->>'price')::numeric,
      coalesce(
        (select array_agg(x) from jsonb_array_elements_text(it->'data_gaps') x),
        '{}'
      ) || '{new-from-zoho}'
    )
    on conflict (sku) do update set
      zoho_record_id = excluded.zoho_record_id,
      price          = excluded.price,
      status         = excluded.status,
      titles_ops     = excluded.titles_ops,    -- ops title mirrors Zoho
      data_gaps      = (
        -- keep website-added flags, refresh sync-derived ones
        (select coalesce(array_agg(g), '{}') from unnest(products.data_gaps) g
          where g not in ('no-tax','no-hsn','stock-unknown','no-warehouse-rows','missing-sku'))
        || (select coalesce(array_agg(x), '{}')
              from jsonb_array_elements_text(it->'data_gaps') x)
      );
      -- deliberately NOT touched: slug, titles_display, titles_seo, brand,
      -- category, images, highlights, specs, line, badge, warranty
    sku := it->>'sku';
    action := case when found then 'upserted' else 'skipped' end;
    return next;
  end loop;
end $$;

-- ── Stock upsert, resolving warehouse → node on the way in ───────────────────
-- rows: [{ sku, zoho_warehouse_id, zoho_warehouse_name, qty }]
-- qty is SELLABLE stock (warehouse_available_for_sale_stock), never on-hand.
create or replace function sync_upsert_stock(rows jsonb)
returns table (sku text, node_id text, qty integer) language plpgsql security definer as $$
declare r jsonb; v_product text; v_node text;
begin
  for r in select * from jsonb_array_elements(rows) loop
    select p.id into v_product from products p where p.sku = r->>'sku';
    if v_product is null then continue; end if;

    -- resolve or auto-create the node for this Zoho warehouse
    select m.node_id into v_node from zoho_warehouse_map m
      where m.zoho_warehouse_id = r->>'zoho_warehouse_id';
    if v_node is null then
      v_node := 'wh-' || substr(md5(r->>'zoho_warehouse_id'), 1, 8);
      insert into nodes (id, type, name, city, status)
        values (v_node, 'warehouse',
                coalesce(nullif(r->>'zoho_warehouse_name',''), 'Zoho warehouse'),
                'Unmapped', 'active')
        on conflict (id) do nothing;
      insert into zoho_warehouse_map (zoho_warehouse_id, zoho_warehouse_name, node_id)
        values (r->>'zoho_warehouse_id', coalesce(r->>'zoho_warehouse_name',''), v_node)
        on conflict (zoho_warehouse_id) do nothing;
    end if;

    insert into stock_records (product_id, node_id, qty)
      values (v_product, v_node, greatest((r->>'qty')::numeric::integer, 0))
      on conflict (product_id, node_id) do update set qty = excluded.qty;

    sku := r->>'sku'; node_id := v_node; qty := (r->>'qty')::numeric::integer;
    return next;
  end loop;
end $$;

-- ── Sync health, one row per run ─────────────────────────────────────────────
create or replace function sync_mark_run(
  p_entity text, p_status sync_status, p_error text default null
) returns void language sql security definer as $$
  insert into sync_records (id, entity_type, entity_id, status, last_run_at, error)
  values ('run-' || p_entity, p_entity, 'catalog', p_status, now(), p_error)
  on conflict (id) do update
    set status = excluded.status, last_run_at = now(), error = excluded.error;
$$;

-- RPCs are privileged-caller only. On Supabase, strip execute from the public
-- roles; on plain Postgres (RDS) those roles do not exist, so guard the revoke.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function sync_upsert_products(jsonb) from anon;
    revoke execute on function sync_upsert_stock(jsonb) from anon;
    revoke execute on function sync_mark_run(text, sync_status, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function sync_upsert_products(jsonb) from authenticated;
    revoke execute on function sync_upsert_stock(jsonb) from authenticated;
    revoke execute on function sync_mark_run(text, sync_status, text) from authenticated;
  end if;
end $$;
