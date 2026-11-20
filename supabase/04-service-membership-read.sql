-- Prepared locally; apply manually in Supabase SQL Editor.
-- Allows the account provisioning server to verify the acting administrator.
-- No browser grants or RLS policy changes.
begin;
grant select on table public.fruidges_memberships to service_role;
commit;

select has_table_privilege(
  'service_role', 'public.fruidges_memberships', 'SELECT'
) as membership_read;
