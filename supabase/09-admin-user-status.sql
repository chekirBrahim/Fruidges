-- Run separately, after 08. No existing account is modified by this script.
begin;
create or replace function public.fruidges_admin_set_user_status(p_user uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.fruidges_memberships where user_id=auth.uid()
 and role='admin' and status='active' for update;
 if not found then raise exception 'admin_required'; end if;
 if p_status is null or p_status not in ('active','suspended') then raise exception 'invalid_status'; end if;
 if p_user=auth.uid() then raise exception 'self_change_denied'; end if;
 -- Protect administrator accounts against accidental lockout.
 update public.fruidges_memberships set status=p_status where user_id=p_user and role<>'admin';
 if not found then raise exception 'protected_or_missing_user'; end if;
end $$;
revoke all on function public.fruidges_admin_set_user_status(uuid,text) from public,anon;
grant execute on function public.fruidges_admin_set_user_status(uuid,text) to authenticated;
commit;
