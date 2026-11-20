-- DRAFT ONLY. NOT APPLIED. Reconcile with 00-inspect.sql results first.
-- No existing table is altered. A name collision intentionally aborts the transaction.
begin;
create table public.fruidges_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create table public.fruidges_memberships (
  user_id uuid primary key references auth.users(id),
  organization_id uuid not null references public.fruidges_organizations(id),
  role text not null check (role in ('supplier','buyer','wholesaler','restaurant','admin')),
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now()
);
alter table public.fruidges_organizations enable row level security;
alter table public.fruidges_memberships enable row level security;
revoke all on public.fruidges_organizations from anon, authenticated;
revoke all on public.fruidges_memberships from anon, authenticated;
grant select on public.fruidges_organizations to authenticated;
grant select on public.fruidges_memberships to authenticated;
create policy own_membership on public.fruidges_memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy own_active_organization on public.fruidges_organizations
  for select to authenticated using (exists (
    select 1 from public.fruidges_memberships m
    where m.organization_id = id and m.user_id = (select auth.uid()) and m.status = 'active'
  ));
-- No browser INSERT/UPDATE/DELETE grants or policies. Users cannot grant themselves roles.
-- Provisioning remains an owner-controlled server/dashboard operation, not implemented here.
commit;
