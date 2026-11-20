-- Run this file alone in SQL Editor. No data is changed.
begin;
create or replace function public.fruidges_admin_list_users(
 p_search text default '', p_status text default '', p_page integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.fruidges_memberships where user_id=auth.uid()
   and role='admin' and status='active') then raise exception 'admin_required'; end if;
 if p_page is null or p_page<0 or p_page>100000 or p_status is null
   or p_status not in ('','active','pending','suspended') then raise exception 'invalid_filter'; end if;
 with matching as (
 select m.user_id,u.email,m.role,m.status,m.organization_id,o.name as organization_name,m.created_at
 from public.fruidges_memberships m join auth.users u on u.id=m.user_id
 join public.fruidges_organizations o on o.id=m.organization_id
 where (p_status='' or m.status=p_status)
 and (coalesce(p_search,'')='' or position(lower(left(p_search,200)) in lower(coalesce(u.email,'')||' '||o.name))>0)
 ), page as (select * from matching order by created_at desc,user_id limit 50 offset p_page*50)
 select jsonb_build_object('total',(select count(*) from matching),'users',coalesce((select jsonb_agg(page) from page),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.fruidges_admin_list_users(text,text,integer) from public,anon;
grant execute on function public.fruidges_admin_list_users(text,text,integer) to authenticated;
commit;
