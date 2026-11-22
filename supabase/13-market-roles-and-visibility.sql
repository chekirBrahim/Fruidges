-- PREPARED, NOT APPLIED. Execute only after inventory and coordinated frontend/Edge deployment.
-- Approved mapping: buyer/wholesaler -> importer; restaurant -> horeca.
begin;
alter table public.fruidges_memberships drop constraint fruidges_memberships_role_check;
update public.fruidges_memberships set role='importer' where role in ('buyer','wholesaler');
update public.fruidges_memberships set role='horeca' where role='restaurant';
alter table public.fruidges_memberships add constraint fruidges_memberships_role_check
check(role in ('supplier','importer','distributor','horeca','admin'));
alter table public.fruidges_products drop constraint fruidges_products_sales_channel_check;
alter table public.fruidges_products add constraint fruidges_products_sales_channel_check
check(sales_channel in ('source','resale','distribution'));
alter table public.fruidges_products add column audience_roles text[] not null default '{}',
 add column audience_override boolean not null default false;
update public.fruidges_products set audience_roles=case sales_channel
 when 'source' then array['importer'] when 'resale' then array['distributor']
 when 'distribution' then array['horeca'] else '{}'::text[] end;
alter table public.fruidges_products add constraint fruidges_audience_valid
check(audience_roles <@ array['supplier','importer','distributor','horeca']::text[]
 and array_position(audience_roles,null) is null);

create or replace function public.fruidges_check_product_business()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fruidges_memberships m where m.organization_id=new.organization_id
 and m.status='active' and m.role=case new.sales_channel when 'source' then 'supplier'
 when 'resale' then 'importer' when 'distribution' then 'distributor' end)
 then raise exception 'product_requires_active_seller';end if;
 return new;
end $$;
create or replace function public.fruidges_guard_audience()
returns trigger language plpgsql security definer set search_path='' as $$
declare is_admin boolean; expected text[];
begin
 select exists(select 1 from public.fruidges_memberships where user_id=auth.uid() and role='admin' and status='active') into is_admin;
 expected:=case new.sales_channel when 'source' then array['importer'] when 'resale' then array['distributor']
 when 'distribution' then array['horeca'] else '{}'::text[] end;
 if TG_OP='INSERT' then
   if not is_admin and (new.audience_override or (cardinality(new.audience_roles)>0 and new.audience_roles<>expected)) then raise exception 'admin_required';end if;
   if not new.audience_override then new.audience_roles:=expected;end if;
 else
   if not is_admin and (new.audience_roles is distinct from old.audience_roles or new.audience_override is distinct from old.audience_override
      or new.organization_id<>old.organization_id or new.sales_channel is distinct from old.sales_channel) then raise exception 'admin_required';end if;
   if is_admin and not new.audience_override then new.audience_roles:=expected;end if;
 end if;
 if new.audience_override and cardinality(new.audience_roles)=0 then raise exception 'empty_audience';end if;
 return new;
end $$;
revoke all on function public.fruidges_guard_audience() from public,anon,authenticated;
create trigger fruidges_audience_guard before insert or update on public.fruidges_products
 for each row execute function public.fruidges_guard_audience();

drop policy fruidges_products_read on public.fruidges_products;
create policy fruidges_products_read on public.fruidges_products for select to authenticated using(exists(
 select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and
 (m.role='admin' or (m.role in ('supplier','importer','distributor') and m.organization_id=fruidges_products.organization_id)
 or (fruidges_products.status='published' and m.role=any(fruidges_products.audience_roles)))));
drop policy fruidges_products_create on public.fruidges_products;
create policy fruidges_products_create on public.fruidges_products for insert to authenticated with check (exists(select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and (m.role='admin' or (m.role in ('supplier','importer','distributor') and m.organization_id=fruidges_products.organization_id))));
drop policy fruidges_products_update on public.fruidges_products;
create policy fruidges_products_update on public.fruidges_products for update to authenticated using (exists(select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and (m.role='admin' or (m.role in ('supplier','importer','distributor') and m.organization_id=fruidges_products.organization_id)))) with check (exists(select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and (m.role='admin' or (m.role in ('supplier','importer','distributor') and m.organization_id=fruidges_products.organization_id))));
drop policy fruidges_products_delete on public.fruidges_products;
create policy fruidges_products_delete on public.fruidges_products for delete to authenticated using (exists(select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and (m.role='admin' or (m.role in ('supplier','importer','distributor') and m.organization_id=fruidges_products.organization_id))));
create or replace function public.fruidges_provision_membership(
  p_actor uuid,
  p_user uuid,
  p_role text,
  p_organization_name text,
  p_organization_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare target uuid;
begin
  perform 1 from public.fruidges_memberships
    where user_id=p_actor and role='admin' and status='active' for update;
  if not found then raise exception 'admin_required'; end if;
  if p_role is null or p_role not in ('supplier','importer','distributor','horeca','admin') then
    raise exception 'invalid_role'; end if;
  if (nullif(trim(p_organization_name),'') is null) = (p_organization_id is null)
    or length(trim(p_organization_name)) > 200 then raise exception 'invalid_organization'; end if;
  if p_organization_id is null then
    insert into public.fruidges_organizations(name)
      values(trim(p_organization_name)) returning id into target;
  else
    select id into target from public.fruidges_organizations where id=p_organization_id;
    if target is null then raise exception 'organization_not_found'; end if;
  end if;
  insert into public.fruidges_memberships(user_id,organization_id,role,status)
    values(p_user,target,p_role,'active');
  return target;
end
$$;
revoke all on function public.fruidges_provision_membership(uuid,uuid,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.fruidges_provision_membership(uuid,uuid,text,text,uuid)
  to service_role;


create or replace function public.fruidges_admin_set_product_audience(p_product uuid,p_roles text[])
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.fruidges_memberships where user_id=auth.uid() and role='admin' and status='active' for update;
 if not found then raise exception 'admin_required';end if;
 if p_roles is not null and (cardinality(p_roles)=0 or not p_roles <@ array['supplier','importer','distributor','horeca']::text[]
 or array_position(p_roles,null) is not null) then raise exception 'invalid_audience';end if;
 update public.fruidges_products set audience_override=p_roles is not null,
 audience_roles=coalesce((select array_agg(distinct r order by r) from unnest(p_roles) r),'{}'::text[])
 where id=p_product;
 if not found then raise exception 'product_not_found';end if;
end $$;
revoke all on function public.fruidges_admin_set_product_audience(uuid,text[]) from public,anon;
grant execute on function public.fruidges_admin_set_product_audience(uuid,text[]) to authenticated;
create or replace function public.fruidges_admin_image_target(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.fruidges_memberships where user_id=auth.uid() and role='admin' and status='active')
 and exists(select 1 from public.fruidges_memberships where organization_id::text=split_part(p_name,'/',1)
 and role in ('supplier','importer','distributor') and status='active');$$;
drop policy fruidges_image_upload on storage.objects;
create policy fruidges_image_upload on storage.objects for insert to authenticated with check (bucket_id='fruidges-product-images' and exists(select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and m.role in ('admin','supplier','importer','distributor') and m.organization_id::text=split_part(name,'/',1)));
drop policy fruidges_image_cleanup on storage.objects;
create policy fruidges_image_cleanup on storage.objects for delete to authenticated using (bucket_id='fruidges-product-images' and exists(select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and m.role in ('admin','supplier','importer','distributor') and m.organization_id::text=split_part(name,'/',1)));
drop policy fruidges_image_read on storage.objects;
create policy fruidges_image_read on storage.objects for select to authenticated using(bucket_id='fruidges-product-images' and (exists(select 1 from public.fruidges_products p where p.photo_path=name) or exists(select 1 from public.fruidges_memberships m where m.user_id=auth.uid() and m.status='active' and m.role in ('admin','supplier','importer','distributor') and m.organization_id::text=split_part(name,'/',1))));
commit;
