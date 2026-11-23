-- PREPARED, NOT APPLIED. Apply only after migration 14 is installed.
-- Allows a new order to reserve stock when another order for that product is pending.
begin;

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

revoke all on function public.fruidges_respond_to_order(uuid,text) from public,anon;
grant execute on function public.fruidges_respond_to_order(uuid,text) to authenticated;
revoke all on function public.fruidges_protect_reserved_product() from public,anon,authenticated;

drop trigger if exists fruidges_protect_reserved_product_before_update_or_delete
  on public.fruidges_products;
drop trigger if exists fruidges_protect_reserved_product_before_delete
  on public.fruidges_products;
create trigger fruidges_protect_reserved_product_before_update_or_delete
  before update or delete on public.fruidges_products
  for each row execute function public.fruidges_protect_reserved_product();

commit;
