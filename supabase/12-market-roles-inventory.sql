-- STEP 1 / READ ONLY. Run alone. No accounts or products are changed.
-- Group accounts by business before deciding how legacy buyer accounts migrate.
select o.id as organization_id,o.name as organization,
 array_agg(distinct m.role order by m.role) as current_roles,
 count(distinct m.user_id) as accounts,
 count(distinct p.id) as products,
 count(distinct p.id) filter(where p.status='published') as published_products
from public.fruidges_organizations o
left join public.fruidges_memberships m on m.organization_id=o.id
left join public.fruidges_products p on p.organization_id=o.id
group by o.id,o.name order by o.name,o.id;
