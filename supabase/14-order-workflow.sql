-- Migration 14 definition. Apply only once, after reviewing 13-market-roles-and-visibility.sql.
-- One order is created per seller. Stock is reserved by reducing available cartons.
begin;

create table public.fruidges_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  buyer_organization_id uuid not null references public.fruidges_organizations(id),
  buyer_role text not null check (buyer_role in ('importer','distributor','horeca')),
  seller_organization_id uuid not null references public.fruidges_organizations(id),
  seller_channel text not null check (seller_channel in ('source','resale','distribution')),
  buyer_company_name text not null,
  seller_company_name text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress','confirmed','rejected','cancelled')),
  idempotency_key uuid not null,
  request_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fruidges_orders_not_self check (buyer_organization_id <> seller_organization_id),
  constraint fruidges_orders_idempotency_unique
    unique (buyer_organization_id,idempotency_key,seller_organization_id)
);

create index fruidges_orders_buyer_created_idx
  on public.fruidges_orders (buyer_organization_id,created_at desc);
create index fruidges_orders_seller_created_idx
  on public.fruidges_orders (seller_organization_id,created_at desc);

create table public.fruidges_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.fruidges_orders(id) on delete cascade,
  product_id uuid references public.fruidges_products(id) on delete set null,
  sku text not null,
  name_en text not null,
  name_ar text not null,
  origin_country char(2) not null check (origin_country ~ '^[A-Z]{2}$'),
  packaging text not null,
  net_weight_kg numeric(12,3) not null check (net_weight_kg > 0),
  cartons integer not null check (cartons > 0),
  unit_price numeric(14,3) not null check (unit_price >= 0),
  currency text not null check (currency in ('USD','KWD')),
  price_term text not null check (price_term in ('CIF','FOB','EXW')),
  price_destination text,
  line_total numeric(20,3) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index fruidges_order_items_order_idx
  on public.fruidges_order_items (order_id);

alter table public.fruidges_orders enable row level security;
alter table public.fruidges_order_items enable row level security;
revoke all on public.fruidges_orders,public.fruidges_order_items from public,anon,authenticated;
grant select on public.fruidges_orders,public.fruidges_order_items to authenticated;

create policy fruidges_orders_participant_read
  on public.fruidges_orders for select to authenticated
  using (exists (
    select 1 from public.fruidges_memberships m
    where m.user_id=auth.uid() and m.status='active'
      and (
        m.role='admin'
        or (m.organization_id=buyer_organization_id and m.role=buyer_role)
        or (m.organization_id=seller_organization_id and m.role=case seller_channel
          when 'source' then 'supplier' when 'resale' then 'importer' when 'distribution' then 'distributor' end)
      )
  ));

create policy fruidges_order_items_participant_read
  on public.fruidges_order_items for select to authenticated
  using (exists (
    select 1
    from public.fruidges_orders o
    join public.fruidges_memberships m on m.user_id=auth.uid() and m.status='active'
    where o.id=order_id
      and (
        m.role='admin'
        or (m.organization_id=o.buyer_organization_id and m.role=o.buyer_role)
        or (m.organization_id=o.seller_organization_id and m.role=case o.seller_channel
          when 'source' then 'supplier' when 'resale' then 'importer' when 'distribution' then 'distributor' end)
      )
  ));

create or replace function public.fruidges_create_orders(
  p_buyer_organization uuid,
  p_buyer_role text,
  p_items jsonb,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_buyer_name text;
  v_seller_name text;
  v_product public.fruidges_products%rowtype;
  v_item record;
  v_order_id uuid;
  v_order_count integer;
  v_same_fingerprint boolean;
  v_fingerprint text;
  v_result jsonb;
begin
  if auth.uid() is null or p_buyer_organization is null or p_buyer_role is null
    or p_buyer_role not in ('importer','distributor','horeca') then
    raise exception 'buyer_required';
  end if;
  perform 1 from public.fruidges_memberships
    where user_id=auth.uid() and organization_id=p_buyer_organization
      and role=p_buyer_role and status='active'
    for share;
  if not found then raise exception 'buyer_required'; end if;

  if p_idempotency_key is null or p_items is null or jsonb_typeof(p_items)<>'array' then
    raise exception 'invalid_cart';
  end if;
  if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then
    raise exception 'invalid_cart';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item
    where jsonb_typeof(item)<>'object'
      or jsonb_typeof(item->'product_id')<>'string'
      or coalesce(item->>'product_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'cartons')<>'number'
      or coalesce(item->>'cartons','') !~ '^[1-9][0-9]*$'
      or length(coalesce(item->>'cartons',''))>10
      or (length(coalesce(item->>'cartons',''))=10 and item->>'cartons'>'2147483647')
  ) then raise exception 'invalid_cart'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as item(product_id uuid,cartons integer)
    group by product_id having count(*)>1
  ) then raise exception 'duplicate_cart_item'; end if;
  select md5(string_agg(product_id::text||':'||cartons::text,',' order by product_id))
    into v_fingerprint
    from jsonb_to_recordset(p_items) as item(product_id uuid,cartons integer);

  perform pg_advisory_xact_lock(hashtext(p_buyer_organization::text),hashtext(p_idempotency_key::text));
  select count(*),bool_and(request_fingerprint=v_fingerprint)
    into v_order_count,v_same_fingerprint
    from public.fruidges_orders
    where buyer_organization_id=p_buyer_organization and idempotency_key=p_idempotency_key;
  if v_order_count>0 then
    if not coalesce(v_same_fingerprint,false) then raise exception 'idempotency_conflict'; end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'reference',reference,'seller_organization_id',seller_organization_id,'status',status
    ) order by reference),'[]'::jsonb) into v_result
      from public.fruidges_orders
      where buyer_organization_id=p_buyer_organization and idempotency_key=p_idempotency_key;
    return v_result;
  end if;

  if (
    select count(*) from public.fruidges_products p
    join jsonb_to_recordset(p_items) as item(product_id uuid,cartons integer)
      on item.product_id=p.id
  ) <> jsonb_array_length(p_items) then raise exception 'offer_unavailable'; end if;

  perform p.id
    from public.fruidges_products p
    join jsonb_to_recordset(p_items) as item(product_id uuid,cartons integer)
      on item.product_id=p.id
    order by p.id
    for update of p;

  select name into v_buyer_name from public.fruidges_organizations where id=p_buyer_organization;
  if v_buyer_name is null then raise exception 'buyer_required'; end if;

  for v_item in
    select * from jsonb_to_recordset(p_items) as item(product_id uuid,cartons integer)
    order by product_id
  loop
    select * into v_product from public.fruidges_products where id=v_item.product_id;
    if v_product.status<>'published'
      or not (p_buyer_role=any(v_product.audience_roles))
      or v_product.organization_id=p_buyer_organization then
      raise exception 'offer_unavailable';
    end if;
    perform 1 from public.fruidges_memberships m
      where m.organization_id=v_product.organization_id and m.status='active'
        and m.role=case v_product.sales_channel
          when 'source' then 'supplier' when 'resale' then 'importer' when 'distribution' then 'distributor' end
      for share;
    if not found then raise exception 'seller_unavailable'; end if;
    if v_item.cartons<1 or v_product.stock_cartons<v_item.cartons then
      raise exception 'stock_changed';
    end if;

    update public.fruidges_products
      set stock_cartons=stock_cartons-v_item.cartons
      where id=v_product.id;

    select id into v_order_id from public.fruidges_orders
      where buyer_organization_id=p_buyer_organization
        and idempotency_key=p_idempotency_key
        and seller_organization_id=v_product.organization_id;
    if v_order_id is null then
      select name into v_seller_name from public.fruidges_organizations
        where id=v_product.organization_id;
      if v_seller_name is null then raise exception 'seller_unavailable'; end if;
      insert into public.fruidges_orders(
        reference,buyer_organization_id,buyer_role,seller_organization_id,seller_channel,
        buyer_company_name,seller_company_name,status,idempotency_key,request_fingerprint
      ) values (
        'ORD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
        p_buyer_organization,p_buyer_role,v_product.organization_id,v_product.sales_channel,
        v_buyer_name,v_seller_name,'in_progress',p_idempotency_key,v_fingerprint
      ) returning id into v_order_id;
    end if;
    insert into public.fruidges_order_items(
      order_id,product_id,sku,name_en,name_ar,origin_country,packaging,net_weight_kg,
      cartons,unit_price,currency,price_term,price_destination,line_total
    ) values (
      v_order_id,v_product.id,v_product.sku,v_product.name_en,v_product.name_ar,
      v_product.origin_country,v_product.packaging,v_product.net_weight_kg,
      v_item.cartons,v_product.price_per_carton,v_product.currency,v_product.price_term,
      v_product.price_destination,v_product.price_per_carton*v_item.cartons
    );
    v_order_id:=null;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'reference',reference,'seller_organization_id',seller_organization_id,'status',status
  ) order by reference),'[]'::jsonb) into v_result
    from public.fruidges_orders
    where buyer_organization_id=p_buyer_organization and idempotency_key=p_idempotency_key;
  return v_result;
end
$$;

create or replace function public.fruidges_respond_to_order(p_order uuid,p_action text)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.fruidges_orders%rowtype;
  v_status text;
  v_item record;
begin
  if auth.uid() is null or p_action is null or p_action not in ('accept','reject','cancel') then
    raise exception 'invalid_order_action';
  end if;
  select * into v_order from public.fruidges_orders where id=p_order for update;
  if not found then raise exception 'order_not_found'; end if;

  if p_action in ('accept','reject') then
    if not exists (
      select 1 from public.fruidges_memberships m
      where m.user_id=auth.uid() and m.organization_id=v_order.seller_organization_id
        and m.status='active'
        and m.role=case v_order.seller_channel
          when 'source' then 'supplier' when 'resale' then 'importer' when 'distribution' then 'distributor' end
    ) then raise exception 'seller_required'; end if;
    v_status:=case p_action when 'accept' then 'confirmed' else 'rejected' end;
  else
    if not exists (
      select 1 from public.fruidges_memberships m
      where m.user_id=auth.uid() and m.organization_id=v_order.buyer_organization_id
        and m.role=v_order.buyer_role and m.status='active'
    ) then raise exception 'buyer_required'; end if;
    v_status:='cancelled';
  end if;
  if v_order.status<>'in_progress' then raise exception 'order_not_pending'; end if;

  if v_status in ('rejected','cancelled') then
    perform p.id from public.fruidges_products p
      join public.fruidges_order_items i on i.product_id=p.id
      where i.order_id=v_order.id order by p.id for update of p;
    if exists (
      select 1 from public.fruidges_products p
      join public.fruidges_order_items i on i.product_id=p.id
      where i.order_id=v_order.id and p.stock_cartons>2147483647-i.cartons
    ) then raise exception 'stock_restore_overflow'; end if;
    update public.fruidges_orders set status=v_status,updated_at=now() where id=v_order.id;
    perform set_config('fruidges.order_stock_release','on',true);
    for v_item in select product_id,cartons from public.fruidges_order_items
      where order_id=v_order.id and product_id is not null order by product_id
    loop
      update public.fruidges_products
        set stock_cartons=stock_cartons+v_item.cartons
        where id=v_item.product_id;
    end loop;
    perform set_config('fruidges.order_stock_release','off',true);
    return;
  end if;

  update public.fruidges_orders set status=v_status,updated_at=now() where id=v_order.id;
end
$$;

create or replace function public.fruidges_protect_reserved_product()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    if exists (
      select 1 from public.fruidges_order_items i
      join public.fruidges_orders o on o.id=i.order_id
      where i.product_id=old.id and o.status='in_progress'
    ) then raise exception 'product_has_pending_order'; end if;
    return old;
  end if;
  if new.stock_cartons>old.stock_cartons
    and current_setting('fruidges.order_stock_release',true) is distinct from 'on'
    and exists (
      select 1 from public.fruidges_order_items i
      join public.fruidges_orders o on o.id=i.order_id
      where i.product_id=old.id and o.status='in_progress'
    ) then raise exception 'product_has_pending_order'; end if;
  return new;
end
$$;

revoke all on function public.fruidges_create_orders(uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.fruidges_create_orders(uuid,text,jsonb,uuid) to authenticated;
revoke all on function public.fruidges_respond_to_order(uuid,text) from public,anon;
grant execute on function public.fruidges_respond_to_order(uuid,text) to authenticated;
revoke all on function public.fruidges_protect_reserved_product() from public,anon,authenticated;

create trigger fruidges_protect_reserved_product_before_update_or_delete
  before update or delete on public.fruidges_products
  for each row execute function public.fruidges_protect_reserved_product();

commit;
