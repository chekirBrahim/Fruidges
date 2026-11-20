-- Apply manually once in Supabase SQL Editor. Private images; 5 MiB maximum.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('fruidges-product-images','fruidges-product-images',false,5242880,
array['image/jpeg','image/png','image/webp']);

create policy fruidges_image_upload on storage.objects for insert to authenticated
with check (bucket_id='fruidges-product-images' and exists (
 select 1 from public.fruidges_memberships m where m.user_id=(select auth.uid())
 and m.status='active' and m.role in ('admin','supplier','buyer')
 and split_part(name,'/',1)=m.organization_id::text));

create policy fruidges_image_read on storage.objects for select to authenticated
using (bucket_id='fruidges-product-images' and (
 exists (select 1 from public.fruidges_products p where p.photo_path=name)
 or exists (select 1 from public.fruidges_memberships m where m.user_id=(select auth.uid())
 and m.status='active' and m.role in ('admin','supplier','buyer')
 and split_part(name,'/',1)=m.organization_id::text)));

create policy fruidges_image_cleanup on storage.objects for delete to authenticated
using (bucket_id='fruidges-product-images' and exists (
 select 1 from public.fruidges_memberships m where m.user_id=(select auth.uid())
 and m.status='active' and m.role in ('admin','supplier','buyer')
 and split_part(name,'/',1)=m.organization_id::text));

alter table public.fruidges_products add constraint fruidges_photo_organization
check (photo_path is null or split_part(photo_path,'/',1)=organization_id::text) not valid;
commit;
