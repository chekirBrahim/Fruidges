-- APPLIED 2026-11-20 to project otaodwohbksacvbheshd with owner authorization.
begin;

create table public.fruidges_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.fruidges_organizations(id),
  sku text not null check (length(trim(sku)) > 0),
  name_en text not null check (length(trim(name_en)) > 0),
  name_ar text not null check (length(trim(name_ar)) > 0),
  category_en text check (category_en is null or length(trim(category_en)) > 0),
  category_ar text check (category_ar is null or length(trim(category_ar)) > 0),
  origin_country char(2) not null check (origin_country ~ '^[A-Z]{2}$'),
  packaging text not null check (length(trim(packaging)) > 0),
  net_weight_kg numeric(12,3) not null check (net_weight_kg > 0),
  stock_cartons integer not null default 0 check (stock_cartons >= 0),
  price_per_carton numeric(14,3) not null check (price_per_carton >= 0),
  currency text not null check (currency in ('USD', 'KWD')),
  price_term text not null check (price_term in ('CIF', 'FOB', 'EXW')),
  price_destination text check (price_destination is null or length(trim(price_destination)) > 0),
  photo_path text,
  photo_status text not null default 'missing'
    check (photo_status in ('missing', 'available')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  constraint fruidges_products_org_sku_unique unique (organization_id, sku),
  constraint fruidges_products_photo_state check (
    (photo_status = 'missing' and photo_path is null)
    or (photo_status = 'available' and photo_path is not null
      and length(trim(photo_path)) > 0)
  )
);

create index fruidges_products_published_idx
  on public.fruidges_products (status, organization_id);

alter table public.fruidges_products enable row level security;
revoke all on public.fruidges_products from public, anon, authenticated;
grant select, insert, update, delete on public.fruidges_products to authenticated;

create policy fruidges_products_read
  on public.fruidges_products
  for select to authenticated
  using (exists (
    select 1
    from public.fruidges_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and (
        (m.role in ('buyer', 'wholesaler', 'restaurant', 'supplier', 'admin')
          and fruidges_products.status = 'published')
        or m.role = 'admin'
        or (m.role = 'supplier'
          and m.organization_id = fruidges_products.organization_id)
      )
  ));

create policy fruidges_products_create
  on public.fruidges_products
  for insert to authenticated
  with check (exists (
    select 1
    from public.fruidges_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and (
        m.role = 'admin'
        or (m.role = 'supplier'
          and m.organization_id = fruidges_products.organization_id)
      )
  ));

create policy fruidges_products_update
  on public.fruidges_products
  for update to authenticated
  using (exists (
    select 1
    from public.fruidges_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and (
        m.role = 'admin'
        or (m.role = 'supplier'
          and m.organization_id = fruidges_products.organization_id)
      )
  ))
  with check (exists (
    select 1
    from public.fruidges_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and (
        m.role = 'admin'
        or (m.role = 'supplier'
          and m.organization_id = fruidges_products.organization_id)
      )
  ));

create policy fruidges_products_delete
  on public.fruidges_products
  for delete to authenticated
  using (exists (
    select 1
    from public.fruidges_memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and (
        m.role = 'admin'
        or (m.role = 'supplier'
          and m.organization_id = fruidges_products.organization_id)
      )
  ));

commit;
