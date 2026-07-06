-- Laptop Store India — Supabase schema
-- Mirrors src/lib/types.ts. Apply with: supabase db push (or SQL editor).

create extension if not exists "uuid-ossp";

create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  short_name text,
  description text not null default '',
  icon text not null default 'laptop',
  parent_id uuid references categories(id) on delete cascade,
  product_count int,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create type product_condition as enum ('new', 'refurbished');
create type stock_status as enum ('in', 'low', 'out');

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  brand text not null,
  category_id uuid not null references categories(id),
  condition product_condition not null default 'new',
  price numeric(10,2) not null,
  mrp numeric(10,2),
  highlights text[] not null default '{}',
  warranty text not null default '',
  stock stock_status not null default 'in',
  rating numeric(2,1),
  review_count int,
  badge text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_specs (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  value text not null,
  sort_order int not null default 0
);

create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0
);

create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  city text not null,
  area text not null,
  address text not null,
  phone text not null,
  hours text not null,
  maps_query text not null
);

create table if not exists service_bookings (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  city text not null,
  device text not null,
  issue text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- Useful indexes
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_condition on products(condition);
create index if not exists idx_products_brand on products(brand);
create index if not exists idx_categories_parent on categories(parent_id);

-- Row Level Security: public catalog is read-only for anon
alter table categories enable row level security;
alter table products enable row level security;
alter table product_specs enable row level security;
alter table product_images enable row level security;
alter table stores enable row level security;
alter table service_bookings enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read products" on products for select using (active);
create policy "public read specs" on product_specs for select using (true);
create policy "public read images" on product_images for select using (true);
create policy "public read stores" on stores for select using (true);
create policy "anon can create booking" on service_bookings for insert with check (true);
