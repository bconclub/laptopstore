-- ============================================================================
-- Laptop Store India — schema v2 (master catalog + operations)
-- Mirrors src/lib/types.ts 1:1 (column names = camelCase fields in snake_case;
-- checked by scripts/check-schema.ts). Run in the Supabase SQL editor when the
-- project exists; v1 (schema.sql) stays untouched for reference.
--
-- RLS philosophy (mirrors the MockProvider read scoping):
--   anon        → read active catalog only; insert orders/enquiries/jobs/rentals
--   staff roles → scoped by dashboard user row (node_id for outlet/distributor/
--                 repair_desk); hq_admin + b2b_desk see all
--   Zoho-owned columns (price, mrp, sku, status, zoho_record_id, stock qty) are
--   written ONLY by the sync engine's service role. Zoho always wins.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Enums (must match the TS unions verbatim) ────────────────────────────────
create type line_type as enum ('new','refurbished','rental','spares','accessories');
create type audience as enum ('b2c','b2b');
create type product_status as enum ('active','draft','archived');
create type serial_status as enum ('available','reserved','sold');
create type rental_unit_status as enum ('in_fleet','retired');
create type node_type as enum ('outlet','distributor','warehouse');
create type node_status as enum ('active','inactive');
create type stock_source as enum ('own','hub');
create type user_role as enum ('hq_admin','outlet_manager','distributor','repair_desk','b2b_desk','customer');
create type order_status as enum ('confirmed','processing','ready','dispatched','completed','cancelled');
create type fulfilment_mode as enum ('pickup','delivery');
create type fulfilment_status as enum ('pending','ready','dispatched','delivered');
create type payment_method as enum ('upi','card','emi','cod','net30');
create type payment_status as enum ('paid','pending','mock');
create type enquiry_type as enum ('b2b_bulk','exchange','rental_corporate');
create type enquiry_stage as enum ('new','contacted','requirement','quoted','negotiation','order_confirmed','lost');
create type repair_stage as enum ('booked','received','diagnosed','quoted','approved','in_repair','ready','delivered','cancelled');
create type repair_mode as enum ('dropoff','pickup','onsite');
create type rental_stage as enum ('enquiry','availability_confirmed','agreement','deposit_paid','dispatched','active','return_due','returned','closed','cancelled');
create type sync_status as enum ('synced','failed','stale','pending');
create type oem_type as enum ('oem','compatible');

-- ── Network ──────────────────────────────────────────────────────────────────
create table nodes (
  id text primary key,
  type node_type not null,
  name text not null,
  city text not null,
  area text not null default '',
  address text not null default '',
  phone text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  territories text[] not null default '{}',
  stock_source stock_source not null default 'own',
  commission_pct numeric,
  service_capable boolean not null default false,
  rental_capable boolean not null default false,
  status node_status not null default 'active'
);

create table node_pincodes (
  node_id text not null references nodes(id) on delete cascade,
  pincode text not null,
  primary key (node_id, pincode)
);
create index idx_node_pincodes_pin on node_pincodes(pincode);

-- ── Users (id = auth.users.id when Supabase Auth lands) ──────────────────────
create table users (
  id text primary key,
  phone text not null unique,
  name text not null,
  email text,
  role user_role not null default 'customer',
  audience audience not null default 'b2c',
  company_name text,
  gstin text,
  node_id text references nodes(id)
);

-- ── Master catalog ───────────────────────────────────────────────────────────
create table products (
  id text primary key,
  zoho_record_id text,                        -- Zoho-owned
  sku text not null unique,                   -- Zoho-owned
  slug text not null unique,                  -- website-owned
  line line_type not null,
  status product_status not null default 'active',  -- Zoho-owned
  titles_ops text not null,                   -- mirrors Zoho item name
  titles_display text not null,               -- website-owned
  titles_seo text not null,                   -- website-owned
  brand text not null,
  category text not null,
  price numeric not null,                     -- Zoho-owned; sync engine only
  mrp numeric,
  images text[] not null default '{}',
  highlights text[] not null default '{}',
  specs jsonb not null default '[]',          -- [{label,value}]
  warranty text not null default '',
  rating numeric,
  review_count integer,
  badge text,
  data_gaps text[] not null default '{}',
  line_data jsonb not null default '{}'       -- per-line block, discriminated on line
);
create index idx_products_line on products(line);
create index idx_products_category on products(category);
create index idx_products_brand on products(brand);

create table price_tiers (
  product_id text not null references products(id) on delete cascade,
  min_qty integer not null,
  unit_price numeric not null,
  primary key (product_id, min_qty)
);

create table stock_records (
  product_id text not null references products(id) on delete cascade,
  node_id text not null references nodes(id) on delete cascade,
  qty integer not null default 0 check (qty >= 0),   -- Zoho-owned
  primary key (product_id, node_id)
);

create table serial_units (
  serial text primary key,
  product_id text not null references products(id) on delete cascade,
  grade text not null check (grade in ('A','B','C')),
  battery_health_pct integer not null,
  warranty_months integer not null,
  age_months integer not null,
  source text not null default '',
  photos text[] not null default '{}',
  node_id text not null references nodes(id),
  status serial_status not null default 'available',
  sold_order_id text
);
create index idx_serial_units_product on serial_units(product_id);

create table rental_units (
  id text primary key,
  serial text not null,
  product_id text not null references products(id) on delete cascade,
  node_id text not null references nodes(id),
  status rental_unit_status not null default 'in_fleet'
);

create table rental_bookings (
  rental_unit_id text not null references rental_units(id) on delete cascade,
  rental_id text not null,
  from_date date not null,
  to_date date not null,
  primary key (rental_unit_id, rental_id),
  check (from_date < to_date)
);

create table repair_services (
  id text primary key,
  name text not null,
  service_types text[] not null default '{}',
  brands text[] not null default '{}',
  base_tat_days integer not null default 1,
  advance_amount numeric
);

-- ── Operations ───────────────────────────────────────────────────────────────
create table orders (
  id text primary key,
  code text not null unique,
  audience audience not null,
  user_id text references users(id),
  customer jsonb not null,                    -- {name, phone, pincode}
  items jsonb not null,                       -- OrderItem[]
  status order_status not null default 'confirmed',
  payment_method payment_method not null,
  payment_status payment_status not null default 'mock',
  trade_in_credit numeric,
  trade_in_device text,
  gst_invoice jsonb,                          -- {gstin, number}
  totals jsonb not null,                      -- {sub, credit, grand}
  source_enquiry_id text,
  created_at timestamptz not null default now()
);
create index idx_orders_status on orders(status);
create index idx_orders_phone on orders((customer->>'phone'));

create table fulfilments (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  node_id text not null references nodes(id),
  item_indexes integer[] not null default '{}',
  mode fulfilment_mode not null,
  status fulfilment_status not null default 'pending'
);
create index idx_fulfilments_order on fulfilments(order_id);
create index idx_fulfilments_node on fulfilments(node_id);

create table enquiries (
  id text primary key,
  code text not null unique,
  type enquiry_type not null,
  stage enquiry_stage not null default 'new',
  contact jsonb not null,                     -- {name, phone, company?, gstin?}
  items jsonb not null,                       -- [{productId, qty}]
  assigned_to text references users(id),
  converted_order_id text references orders(id),
  created_at timestamptz not null default now()
);

create table enquiry_quotes (
  enquiry_id text not null references enquiries(id) on delete cascade,
  at timestamptz not null default now(),
  unit_price numeric not null,
  qty integer not null,
  valid_days integer not null default 15,
  terms text not null default '',
  primary key (enquiry_id, at)
);

create table repair_jobs (
  id text primary key,
  code text not null unique,
  customer jsonb not null,
  service_type text not null,
  brand text not null,
  model text not null default '',
  issue text not null,
  mode repair_mode not null default 'dropoff',
  node_id text not null references nodes(id),
  slot jsonb not null,                        -- {date, window}
  stage repair_stage not null default 'booked',
  diagnosis text,
  quote_amount numeric,
  advance_paid boolean not null default false,
  tat_days integer not null default 1,
  created_at timestamptz not null default now()
);
create index idx_repair_jobs_node on repair_jobs(node_id);

create table rentals (
  id text primary key,
  code text not null unique,
  customer jsonb not null,                    -- {name, phone, pincode, audience}
  product_id text not null references products(id),
  unit_id text references rental_units(id),
  node_id text not null references nodes(id),
  from_date date not null,
  to_date date not null,
  tier jsonb not null,                        -- {minDays, perDay}
  deposit numeric not null default 0,
  stage rental_stage not null default 'enquiry',
  return_node_id text references nodes(id),
  created_at timestamptz not null default now()
);

-- Shared status timeline for all four machines (Order/Enquiry/RepairJob/Rental)
create table status_events (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('order','enquiry','repair_job','rental')),
  entity_id text not null,
  at timestamptz not null default now(),
  from_status text not null,
  to_status text not null,
  by_user text not null default 'system',
  note text
);
create index idx_status_events_entity on status_events(entity_type, entity_id);

-- ── Zoho sync health ─────────────────────────────────────────────────────────
create table sync_records (
  id text primary key,
  entity_type text not null check (entity_type in ('product','stock','price','order')),
  entity_id text not null,
  zoho_record_id text,
  status sync_status not null default 'pending',
  last_run_at timestamptz not null default now(),
  error text
);
create index idx_sync_records_status on sync_records(status);

-- ── RLS sketch (enable + baseline policies; tighten per role at go-live) ─────
alter table products enable row level security;
create policy anon_read_active_products on products for select using (status = 'active');
alter table stock_records enable row level security;
create policy anon_read_stock on stock_records for select using (true);
alter table nodes enable row level security;
create policy anon_read_nodes on nodes for select using (status = 'active');
alter table orders enable row level security;
create policy anon_insert_orders on orders for insert with check (true);
alter table enquiries enable row level security;
create policy anon_insert_enquiries on enquiries for insert with check (true);
alter table repair_jobs enable row level security;
create policy anon_insert_repairs on repair_jobs for insert with check (true);
alter table rentals enable row level security;
create policy anon_insert_rentals on rentals for insert with check (true);
-- Staff read/write policies attach to Supabase Auth JWT claims (role, node_id)
-- exactly mirroring MockProvider.scopeNode(): outlet_manager/distributor/
-- repair_desk filtered by node, hq_admin/b2b_desk unrestricted.
