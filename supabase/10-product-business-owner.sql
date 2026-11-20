-- Execute this file alone. Existing products are preserved.
begin;
create or replace function public.fruidges_check_product_business()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fruidges_memberships m
 where m.organization_id=new.organization_id and m.status='active'
 and ((new.sales_channel='source' and m.role='supplier')
 or (new.sales_channel='resale' and m.role='buyer'))) then
 raise exception 'product_requires_active_supplier_or_buyer';
 end if;
 return new;
end $$;
revoke all on function public.fruidges_check_product_business() from public,anon,authenticated;
create trigger fruidges_product_business_owner before insert or update of organization_id,sales_channel
on public.fruidges_products for each row execute function public.fruidges_check_product_business();

create or replace function public.fruidges_admin_image_target(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.fruidges_memberships where user_id=auth.uid() and role='admin' and status='active')
 and exists(select 1 from public.fruidges_memberships where organization_id::text=split_part(p_name,'/',1)
 and role in ('supplier','buyer') and status='active');
$$;
revoke all on function public.fruidges_admin_image_target(text) from public,anon;
grant execute on function public.fruidges_admin_image_target(text) to authenticated;
create policy fruidges_admin_business_image_insert on storage.objects for insert to authenticated
with check(bucket_id='fruidges-product-images' and public.fruidges_admin_image_target(name));
create policy fruidges_admin_business_image_read on storage.objects for select to authenticated
using(bucket_id='fruidges-product-images' and public.fruidges_admin_image_target(name));
commit;
