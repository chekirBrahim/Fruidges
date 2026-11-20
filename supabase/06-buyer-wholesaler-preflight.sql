-- Read-only. Run before 06-buyer-wholesaler-role.sql.
select role, status, count(*) as memberships
from public.fruidges_memberships
group by role, status
order by role, status;

select sku, status, sales_channel
from public.fruidges_products
order by created_at desc, sku;

select policyname, cmd
from pg_policies
where schemaname='public' and tablename='fruidges_products'
order by policyname;

select to_regclass('storage.buckets') as storage_buckets_table;

select policyname, cmd
from pg_policies
where schemaname='storage' and tablename='objects'
  and policyname like 'fruidges_image_%'
order by policyname;
