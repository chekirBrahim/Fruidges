-- Add business country metadata and an admin-only country update RPC.
begin;

alter table public.fruidges_organizations
  add column if not exists country_code char(2);

grant select on public.fruidges_organizations, public.fruidges_memberships to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname='fruidges_organizations_country_code_check'
      and conrelid='public.fruidges_organizations'::regclass
  ) then
    alter table public.fruidges_organizations
      add constraint fruidges_organizations_country_code_check
      check (country_code is null or country_code ~ '^[A-Z]{2}$');
  end if;
end
$$;

create or replace function public.fruidges_set_organization_country(
  p_actor uuid,
  p_organization_id uuid,
  p_country_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_country_code is null or p_country_code !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country';
  end if;
  perform 1
    from public.fruidges_memberships
    where user_id=p_actor and role='admin' and status='active'
    for update;
  if not found then raise exception 'admin_required'; end if;

  update public.fruidges_organizations
    set country_code=p_country_code
    where id=p_organization_id;
  if not found then raise exception 'organization_not_found'; end if;
end
$$;

revoke all on function public.fruidges_set_organization_country(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.fruidges_set_organization_country(uuid,uuid,text)
  to service_role;

commit;
