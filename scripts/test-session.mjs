import assert from 'node:assert/strict';
import { resolveMembership, signIn, roles } from '../src/session.js';
let cases = 0;
function fake({ role='importer', status='active', rows, dbError=null, authError=null, loginError=null, userId='user-a' } = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({ data:{user:{id:'user-a',user_metadata:{role:'admin'}}},error:authError }),
      signInWithPassword: async () => ({error:loginError}),
      signOut: async () => { calls.push('logout'); return {error:null}; }
    },
    from(table) {
      assert.equal(table,'fruidges_memberships');
      return {select(){return this;},eq(column,id){ assert.equal(column,'user_id');assert.equal(id,'user-a');return this; },
        async limit(n){assert.equal(n,2);return {data:rows ?? [{user_id:userId,organization_id:'org-a',role,status}],error:dbError};}};
    }
  };
  return {client,calls};
}
for (const role of roles) {
  const {client}=fake({role});
  assert.equal((await resolveMembership(client)).membership.role,role); cases++;
}
const legacyWholesale=fake({role:'wholesaler'});
await assert.rejects(()=>resolveMembership(legacyWholesale.client),error=>error.code==='denied');cases++;
for (const [options,code] of [
  [{rows:[]},'pending'], [{rows:[{},{}]},'pending'], [{status:'suspended'},'denied'],
  [{role:'superadmin'},'denied'], [{userId:'user-b'},'denied'],
  [{dbError:{code:'42P01'}},'configuration'], [{authError:{}},'session'],
  [{rows:[{user_id:'user-a',role:'admin',status:'active'}]},'denied']
]) {
  const {client}=fake(options);
  await assert.rejects(()=>resolveMembership(client),error=>error.code===code);cases++;
}
const denied=fake({rows:[]});
await assert.rejects(()=>signIn(denied.client,'person@example.test','fake'),error=>error.code==='pending');
assert.deepEqual(denied.calls,['logout']);cases++;
const bad=fake({loginError:{}});
await assert.rejects(()=>signIn(bad.client,'person@example.test','fake'),error=>error.code==='credentials');cases++;
console.log(`PASS: ${cases} mocked auth/authorization cases. Real Supabase RLS integration still requires schema and test users.`);
