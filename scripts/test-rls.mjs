import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
try {
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
create schema storage; create table storage.buckets(id text primary key);
insert into storage.buckets values ('fruidges-product-images');
create table storage.objects(bucket_id text not null,name text not null);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,delete on storage.objects to authenticated;`);
for(const file of ['01-access.sql','02-catalog.sql','03-isolation-DRAFT.sql','04-service-membership-read.sql'])
  await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));

await db.query('insert into auth.users values ($1)',[id(5)]);
await db.query('insert into public.fruidges_organizations(id,name) values ($1,$2)',[id(5),'Legacy wholesaler']);
await db.query("insert into public.fruidges_memberships(user_id,organization_id,role,status) values ($1,$1,'wholesaler','active')",[id(5)]);
await db.exec(await readFile(new URL('../supabase/06-buyer-wholesaler-role.sql',import.meta.url),'utf8'));
assert.equal((await db.query('select role from public.fruidges_memberships where user_id=$1',[id(5)])).rows[0].role,'buyer');
await db.exec(await readFile(new URL('../supabase/07-admin-organization-directory.sql',import.meta.url),'utf8'));
const currencyMigration=await readFile(new URL('../supabase/11-product-currencies.sql',import.meta.url),'utf8');
await db.exec(currencyMigration);
await db.exec(currencyMigration);

for(const [n,role] of [[1,'admin'],[2,'supplier'],[3,'supplier'],[4,'buyer'],[6,'restaurant']]) {
  await db.query('insert into auth.users values ($1)',[id(n)]);
  await db.query('insert into public.fruidges_organizations(id,name) values ($1,$2)',[id(n),'Company '+n]);
  await db.query("insert into public.fruidges_memberships(user_id,organization_id,role,status) values ($1,$1,$2,'active')",[id(n),role]);
}
const insert=`insert into public.fruidges_products(organization_id,sku,name_en,name_ar,origin_country,packaging,net_weight_kg,price_per_carton,currency,price_term,status,sales_channel) values ($1,$2,'Apple','تفاح','TN','Carton',10,20,'USD','FOB',$3,$4)`;
for(const [org,sku,status,channel] of [
  [2,'source','published','source'],[2,'source-draft','draft','source'],
  [3,'other','draft','source'],[5,'resale','published','resale'],
  [5,'resale-draft','draft','resale'],[4,'buyer-resale','published','resale'],
  [2,'legacy','published',null]
])
  await db.query(insert,[id(org),sku,status,channel]);
await assert.rejects(()=>db.query(
  `insert into public.fruidges_products(organization_id,sku,name_en,name_ar,origin_country,packaging,net_weight_kg,stock_cartons,price_per_carton,currency,price_term,status,sales_channel) values ($1,$2,'Apple','تفاح','TN','Carton',10,0,20,$3,'FOB','draft','source')`,
  [id(2),'unsupported-aud','AUD']
),'USD/KWD source-currency constraint must remain active');
await db.query("update public.fruidges_products set fx_usd=1,fx_kwd=0.31,fx_date='2026-11-20',fx_source='verified source' where sku='source'");
assert.match((await db.query("select fx_usd,fx_kwd,fx_source from public.fruidges_products where sku='source'")).rows[0].fx_kwd,/^0\.31(?:0+)?$/);
await assert.rejects(()=>db.query("update public.fruidges_products set fx_usd=0.9 where sku='source'"),'USD products must store a unit USD rate');
await db.query("update public.fruidges_products set photo_path=$1,photo_status='available' where sku='resale'",[id(5)+'/resale.jpg']);

async function as(n){
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);
  await db.exec('set role authenticated');
}
async function skus(){
  return (await db.query('select sku from public.fruidges_products order by sku')).rows.map(x=>x.sku);
}

await as(4);
assert.deepEqual(await skus(),['buyer-resale','source']);
await assert.rejects(()=>db.query(insert,[id(4),'attack','published','source']));
assert.equal((await db.query("update public.fruidges_products set status='published' where sku='source-draft' returning id")).rows.length,0);
await db.query(insert,[id(4),'buyer-resale-draft','draft','resale']);
assert.equal((await db.query("update public.fruidges_products set status='published' where sku='buyer-resale-draft' and status='draft' returning status")).rows.length,1);
await assert.rejects(()=>db.query("update public.fruidges_products set sales_channel='source' where sku='buyer-resale-draft'"));
await db.query("insert into storage.objects(bucket_id,name) values ('fruidges-product-images',$1)",[id(4)+'/buyer.jpg']);
await assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values ('fruidges-product-images',$1)",[id(5)+'/forbidden.jpg']));

await as(6);
assert.deepEqual(await skus(),['buyer-resale','buyer-resale-draft','resale']);
assert.deepEqual((await db.query('select name from storage.objects')).rows,[]);

await as(5);
assert.deepEqual(await skus(),['resale','resale-draft','source']);
await db.query(insert,[id(5),'buyer5-resale-draft','draft','resale']);
await assert.rejects(()=>db.query(insert,[id(5),'forged-source','draft','source']));
assert.equal((await db.query("update public.fruidges_products set status='published' where sku='buyer-resale-draft' and status='draft' returning status")).rows.length,0);
assert.equal((await db.query("update public.fruidges_products set status='published' where sku='buyer5-resale-draft' and status='draft' returning status")).rows.length,1);
assert.equal((await db.query("update public.fruidges_products set status='published' where sku='resale-draft' and status='draft' returning status")).rows.length,1);
await db.query("insert into storage.objects(bucket_id,name) values ('fruidges-product-images',$1)",[id(5)+'/resale.jpg']);

await as(6);
assert.deepEqual(await skus(),['buyer-resale','buyer-resale-draft','buyer5-resale-draft','resale','resale-draft']);
assert.deepEqual((await db.query('select name from storage.objects order by name')).rows,[{name:id(5)+'/resale.jpg'}]);

await as(2);
assert.deepEqual(await skus(),['legacy','source','source-draft']);
assert.equal((await db.query("update public.fruidges_products set status='published' where sku='source-draft' and status='draft' returning status")).rows.length,1);
assert.equal((await db.query("update public.fruidges_products set status='published' where sku='other' and status='draft' returning id")).rows.length,0);
assert.equal((await db.query("update public.fruidges_products set sku='stolen' where sku='other' returning id")).rows.length,0);
await assert.rejects(()=>db.query("update public.fruidges_products set organization_id=$1 where sku='source'",[id(3)]));
await assert.rejects(()=>db.query("update public.fruidges_products set sales_channel='resale' where sku='source'"));
await db.query("update public.fruidges_products set stock_cartons=5 where sku='source'");

await as(1);
assert.equal((await skus()).length,9);
await assert.rejects(()=>db.query('select public.fruidges_provision_membership($1,$2,$3,$4,null)',[id(1),id(7),'supplier','New']));
await db.exec('reset role');
await db.exec('set role service_role');
assert.equal((await db.query('select count(*)::int as count from public.fruidges_organizations')).rows[0].count,6,'Admin directory service can read organizations');
assert.equal((await db.query('select count(*)::int as count from public.fruidges_memberships')).rows[0].count,6,'Admin directory service can read memberships');
await db.query('select public.fruidges_set_organization_country($1,$2,$3)',[id(1),id(2),'TN']);
await db.exec('reset role');
assert.equal((await db.query('select country_code from public.fruidges_organizations where id=$1',[id(2)])).rows[0].country_code,'TN');
await db.exec('set role service_role');
await assert.rejects(()=>db.query('select public.fruidges_set_organization_country($1,$2,$3)',[id(2),id(3),'US']));
await assert.rejects(()=>db.query('select public.fruidges_set_organization_country($1,$2,$3)',[id(1),id(3),'TUN']));
await db.exec('reset role');
await as(1);
await assert.rejects(()=>db.query("update public.fruidges_organizations set country_code='US' where id=$1",[id(3)]),'Authenticated administrators must use the guarded country RPC');
await assert.rejects(()=>db.query('select public.fruidges_set_organization_country($1,$2,$3)',[id(1),id(3),'US']),'Authenticated administrators cannot invoke the service-only country RPC');
await db.exec('reset role');
await db.query("update public.fruidges_memberships set status='suspended' where user_id=$1",[id(2)]);
await as(2);
assert.deepEqual(await skus(),[]);
await db.exec('reset role');
for(const n of [7,8,9]) await db.query('insert into auth.users values ($1)',[id(n)]);
await db.exec('set role service_role');
assert.equal((await db.query('select role from public.fruidges_memberships where user_id=$1',[id(1)])).rows[0].role,'admin','Provisioning server can read the administrator membership');
await assert.rejects(()=>db.query("update public.fruidges_memberships set role='admin' where user_id=$1",[id(3)]),'Server lookup grant must not grant direct membership writes');
await assert.rejects(()=>db.query('select public.fruidges_provision_membership($1,$2,$3,$4,null)',[id(3),id(7),'supplier','Invalid']));
await assert.rejects(()=>db.query('select public.fruidges_provision_membership($1,$2,$3,$4,null)',[id(1),id(9),'wholesaler','Invalid']));
const provision=n=>db.query('select public.fruidges_provision_membership($1,$2,$3,$4,null) as organization',[id(1),id(n),'supplier','Business '+n]);
const a=(await provision(7)).rows[0].organization;
const b=(await provision(8)).rows[0].organization;
assert.notEqual(a,b);assert.notEqual(a,id(1));
await assert.rejects(()=>provision(7));
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int as count from public.fruidges_organizations')).rows[0].count,8);
await db.exec(await readFile(new URL('../supabase/10-product-business-owner.sql',import.meta.url),'utf8'));
await as(1);
await assert.rejects(()=>db.query(insert,[id(1),'admin-owned','draft','source']));
await assert.rejects(()=>db.query(insert,[id(4),'wrong-owner-role','draft','source']));
await db.query(insert,[id(3),'supplier-linked','draft','source']);
await db.query(insert,[id(4),'buyer-linked','draft','resale']);
await assert.rejects(()=>db.query(insert,[id(2),'suspended-owner','draft','source']));
await db.query("insert into storage.objects values ('fruidges-product-images',$1)",[id(3)+'/admin-added.png']);
await assert.rejects(()=>db.query("insert into storage.objects values ('fruidges-product-images',$1)",[id(6)+'/restaurant.png']));
await db.exec('reset role;set role anon');
await assert.rejects(()=>skus());
console.log('PASS: four-role migration, buyer resale ownership/publication, source and restaurant visibility, Storage isolation, cross-company denial, suspension, service-only provisioning and admin country updates.');
} finally {await db.close();}
