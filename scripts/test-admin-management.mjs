import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const db=new PGlite();
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;`);
 for(const f of ['01-access.sql','08-admin-list-users.sql','09-admin-user-status.sql'])await db.exec(await readFile(new URL('../supabase/'+f,import.meta.url),'utf8'));
 for(const [n,role] of [[1,'admin'],[2,'supplier'],[3,'admin']]){
  await db.query('insert into auth.users values($1,$2)',[id(n),`test${n}@example.test`]);
  await db.query('insert into public.fruidges_organizations(id,name) values($1,$2)',[id(n),'Company '+n]);
  await db.query("insert into public.fruidges_memberships(user_id,organization_id,role,status) values($1,$1,$2,'active')",[id(n),role]);
 }
 async function as(n){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await db.exec('set role authenticated');}
 const list=()=>db.query("select public.fruidges_admin_list_users('','',0) as result");
 const set=(n,status)=>db.query('select public.fruidges_admin_set_user_status($1,$2)',[id(n),status]);
 await as(2);await assert.rejects(list);await assert.rejects(()=>set(1,'suspended'));
 await as(1);assert.equal((await list()).rows[0].result.total,3);
 await assert.rejects(()=>set(1,'suspended'));await assert.rejects(()=>set(3,'suspended'));
 await assert.rejects(()=>set(2,'invalid'));
 await set(2,'suspended');
 assert.equal((await db.query("select public.fruidges_admin_list_users('Company 2','suspended',0) as result")).rows[0].result.total,1);
 await set(2,'active');
 await db.exec('reset role');await db.query("update public.fruidges_memberships set status='suspended' where user_id=$1",[id(1)]);
 await as(1);await assert.rejects(list);await assert.rejects(()=>set(2,'suspended'));
 await db.exec('reset role;set role anon');await assert.rejects(list);
 console.log('PASS: admin-only directory, search, activation/suspension, self/admin protection, revoked admin and anonymous denial.');
}finally{await db.close();}
