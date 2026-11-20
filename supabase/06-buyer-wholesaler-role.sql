-- Apply manually after 03-isolation-DRAFT.sql.
-- Existing wholesaler memberships become the combined buyer/wholesaler role.
begin;

update public.fruidges_memberships
set role='buyer'
where role='wholesaler';

alter table public.fruidges_memberships
  drop constraint if exists fruidges_memberships_role_check;
alter table public.fruidges_memberships
  add constraint fruidges_memberships_role_check
  check (role in ('supplier','buyer','restaurant','admin'));

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
  if p_role is null or p_role not in ('supplier','buyer','restaurant','admin') then
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

drop policy if exists fruidges_products_read on public.fruidges_products;
create policy fruidges_products_read on public.fruidges_products
  for select to authenticated
  using (exists (
    select 1 from public.fruidges_memberships m
    where m.user_id=(select auth.uid()) and m.status='active'
      and (
        m.role='admin'
        or (
          m.organization_id=fruidges_products.organization_id
          and (
            (m.role='supplier' and (sales_channel='source' or sales_channel is null))
            or (m.role='buyer' and (sales_channel='resale' or sales_channel is null))
          )
        )
        or (
          fruidges_products.status='published'
          and (
            (m.role in ('buyer','supplier') and sales_channel='source')
            or (m.role='restaurant' and sales_channel='resale')
          )
        )
      )
  ));

drop policy if exists fruidges_products_create on public.fruidges_products;
create policy fruidges_products_create on public.fruidges_products
  for insert to authenticated
  with check (
    sales_channel is not null
    and exists (
      select 1 from public.fruidges_memberships m
      where m.user_id=(select auth.uid()) and m.status='active'
        and (
          m.role='admin'
          or (
            m.organization_id=fruidges_products.organization_id
            and (
              (m.role='supplier' and sales_channel='source')
              or (m.role='buyer' and sales_channel='resale')
            )
          )
        )
    )
  );

drop policy if exists fruidges_products_update on public.fruidges_products;
create policy fruidges_products_update on public.fruidges_products
  for update to authenticated
  using (exists (
    select 1 from public.fruidges_memberships m
    where m.user_id=(select auth.uid()) and m.status='active'
      and (
        m.role='admin'
        or (
          m.organization_id=fruidges_products.organization_id
          and (
            (m.role='supplier' and sales_channel='source')
            or (m.role='buyer' and sales_channel='resale')
          )
        )
      )
  ))
  with check (
    sales_channel is not null
    and exists (
      select 1 from public.fruidges_memberships m
      where m.user_id=(select auth.uid()) and m.status='active'
        and (
          m.role='admin'
          or (
            m.organization_id=fruidges_products.organization_id
            and (
              (m.role='supplier' and sales_channel='source')
              or (m.role='buyer' and sales_channel='resale')
            )
          )
        )
    )
  );

drop policy if exists fruidges_products_delete on public.fruidges_products;
create policy fruidges_products_delete on public.fruidges_products
  for delete to authenticated
  using (exists (
    select 1 from public.fruidges_memberships m
    where m.user_id=(select auth.uid()) and m.status='active'
      and (
        m.role='admin'
        or (
          m.organization_id=fruidges_products.organization_id
          and (
            (m.role='supplier' and (sales_channel='source' or sales_channel is null))
            or (m.role='buyer' and (sales_channel='resale' or sales_channel is null))
          )
        )
      )
  ));

do $do$
begin
  if to_regclass('storage.buckets') is not null then
    if exists (select 1 from storage.buckets where id='fruidges-product-images') then
      execute 'drop policy if exists fruidges_image_upload on storage.objects';
      execute $policy$
        create policy fruidges_image_upload on storage.objects
        for insert to authenticated
        with check (
          bucket_id='fruidges-product-images'
          and exists (
            select 1 from public.fruidges_memberships m
            where m.user_id=(select auth.uid()) and m.status='active'
              and m.role in ('admin','supplier','buyer')
              and split_part(name,'/',1)=m.organization_id::text
          )
        )
      $policy$;

      execute 'drop policy if exists fruidges_image_read on storage.objects';
      execute $policy$
        create policy fruidges_image_read on storage.objects
        for select to authenticated
        using (
          bucket_id='fruidges-product-images'
          and (
            exists (select 1 from public.fruidges_products p where p.photo_path=name)
            or exists (
              select 1 from public.fruidges_memberships m
              where m.user_id=(select auth.uid()) and m.status='active'
                and m.role in ('admin','supplier','buyer')
                and split_part(name,'/',1)=m.organization_id::text
            )
          )
        )
      $policy$;

      execute 'drop policy if exists fruidges_image_cleanup on storage.objects';
      execute $policy$
        create policy fruidges_image_cleanup on storage.objects
        for delete to authenticated
        using (
          bucket_id='fruidges-product-images'
          and exists (
            select 1 from public.fruidges_memberships m
            where m.user_id=(select auth.uid()) and m.status='active'
              and m.role in ('admin','supplier','buyer')
              and split_part(name,'/',1)=m.organization_id::text
          )
        )
      $policy$;
    end if;
  end if;
end
$do$;

commit;
