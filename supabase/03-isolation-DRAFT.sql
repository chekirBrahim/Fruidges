-- DRAFT: local tests only; not applied to hosted Supabase.
-- Existing companies/memberships are unchanged; existing offers retain NULL audience.
begin;
create function public.fruidges_provision_membership(p_actor uuid, p_user uuid,
  p_role text, p_organization_name text, p_organization_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  perform 1 from public.fruidges_memberships
    where user_id=p_actor and role='admin' and status='active' for update;
  if not found then raise exception 'admin_required'; end if;
  if p_role is null or p_role not in ('supplier','buyer','wholesaler','restaurant','admin') then
    raise exception 'invalid_role'; end if;
  if (nullif(trim(p_organization_name),'') is null) = (p_organization_id is null)
    or length(trim(p_organization_name)) > 200 then raise exception 'invalid_organization'; end if;
  if p_organization_id is null then
    insert into public.fruidges_organizations(name) values(trim(p_organization_name)) returning id into target;
  else
    select id into target from public.fruidges_organizations where id=p_organization_id;
    if target is null then raise exception 'organization_not_found'; end if;
  end if;
  -- No upsert: retries must never reassign an existing user or escalate their role.
  insert into public.fruidges_memberships(user_id,organization_id,role,status)
    values(p_user,target,p_role,'active');
  return target;
end $$;
revoke all on function public.fruidges_provision_membership(uuid,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.fruidges_provision_membership(uuid,uuid,text,text,uuid) to service_role;
alter table public.fruidges_products add column sales_channel text
  check (sales_channel in ('source','resale'));
drop policy fruidges_products_read on public.fruidges_products;
create policy fruidges_products_read on public.fruidges_products for select to authenticated
using (exists (select 1 from public.fruidges_memberships m
  where m.user_id=(select auth.uid()) and m.status='active' and (
    m.role='admin'
    or (m.role in ('supplier','wholesaler') and m.organization_id=fruidges_products.organization_id)
    or (fruidges_products.status='published' and (
      (m.role in ('buyer','wholesaler','supplier') and sales_channel='source')
      or (m.role='restaurant' and sales_channel='resale'))))));
drop policy fruidges_products_create on public.fruidges_products;
create policy fruidges_products_create on public.fruidges_products for insert to authenticated with check (sales_channel is not null and (exists (select 1 from public.fruidges_memberships m
where m.user_id=(select auth.uid()) and m.status='active' and
(m.role='admin' or (m.organization_id=fruidges_products.organization_id and
((m.role='supplier' and sales_channel='source') or (m.role='wholesaler' and sales_channel='resale')))))));
drop policy fruidges_products_update on public.fruidges_products;
create policy fruidges_products_update on public.fruidges_products for update to authenticated using (exists (select 1 from public.fruidges_memberships m
where m.user_id=(select auth.uid()) and m.status='active' and
(m.role='admin' or (m.organization_id=fruidges_products.organization_id and
((m.role='supplier' and sales_channel='source') or (m.role='wholesaler' and sales_channel='resale')))))) with check (sales_channel is not null and (exists (select 1 from public.fruidges_memberships m
where m.user_id=(select auth.uid()) and m.status='active' and
(m.role='admin' or (m.organization_id=fruidges_products.organization_id and
((m.role='supplier' and sales_channel='source') or (m.role='wholesaler' and sales_channel='resale')))))));
drop policy fruidges_products_delete on public.fruidges_products;
create policy fruidges_products_delete on public.fruidges_products for delete to authenticated using (exists (select 1 from public.fruidges_memberships m
where m.user_id=(select auth.uid()) and m.status='active' and
(m.role='admin' or (m.organization_id=fruidges_products.organization_id and
((m.role='supplier' and sales_channel='source') or (m.role='wholesaler' and sales_channel='resale'))))));
commit;
