-- Read-only inventory before 03-isolation-DRAFT.sql. No personal identifiers.
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' and table_name in
  ('fruidges_organizations','fruidges_memberships','fruidges_products')
order by table_name,ordinal_position;

select role,status,count(*) as memberships
from public.fruidges_memberships group by role,status order by role,status;

select count(*) as organizations_with_multiple_members
from (select organization_id from public.fruidges_memberships
      group by organization_id having count(*)>1) shared;

select status,count(*) as products from public.fruidges_products group by status;

select tablename,policyname,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename like 'fruidges_%'
order by tablename,policyname;

select proname from pg_proc join pg_namespace n on n.oid=pronamespace
where n.nspname='public' and proname='fruidges_provision_membership';
