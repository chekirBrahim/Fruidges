import assert from 'node:assert/strict';
import { buildOrganizationDirectory } from '../supabase/functions/_shared/admin-directory.js';
import { requireActiveAdmin } from '../supabase/functions/_shared/admin-access.js';

const organizations = [
  {id:'org-supplier',name:'Supplier Co',country_code:'TN',created_at:'2026-01-01'},
  {id:'org-buyer',name:'Buyer Co',country_code:null,created_at:'2026-01-02'},
  {id:'org-restaurant',name:'Restaurant Co',country_code:'KW',created_at:'2026-01-03'},
  {id:'org-admin',name:'Platform Co',country_code:null,created_at:'2026-01-04'}
];
const memberships = [
  {organization_id:'org-supplier',role:'supplier',status:'active'},
  {organization_id:'org-supplier',role:'supplier',status:'pending'},
  {organization_id:'org-buyer',role:'importer',status:'active'},
  {organization_id:'org-restaurant',role:'horeca',status:'suspended'},
  {organization_id:'org-admin',role:'admin',status:'active'}
];
const directory = buildOrganizationDirectory(organizations, memberships);
assert.equal(directory.length, 3, 'admin-only organizations are not business listings');
assert.equal(directory.find(row => row.id === 'org-supplier').membership_counts.supplier.pending, 1);
assert.equal(directory.find(row => row.id === 'org-buyer').membership_counts.importer.active, 1,
  'legacy wholesaler membership is grouped with buyers');
assert.equal(directory.find(row => row.id === 'org-restaurant').membership_counts.horeca.suspended, 1);
assert.equal(directory.find(row => row.id === 'org-buyer').country_code, null);
assert.equal(JSON.stringify(directory).includes('email'), false, 'directory does not return account emails');
assert.throws(() => buildOrganizationDirectory(organizations, [
  {organization_id:'missing',role:'supplier',status:'active'}
]), /directory_invalid/);

function clientFor({ user, membership, authError = null, membershipError = null }) {
  return {
    auth: { async getUser(token) {
      assert.equal(token, 'valid-token');
      return {data:{user},error:authError};
    }},
    from(table) {
      assert.equal(table, 'fruidges_memberships');
      return {
        select(fields) {
          assert.equal(fields, 'user_id,organization_id,role,status');
          return this;
        },
        eq(column, value) {
          assert.equal(column, 'user_id');
          assert.equal(value, user.id);
          return this;
        },
        async maybeSingle() {
          return {data:membership,error:membershipError};
        }
      };
    }
  };
}

const admin = {id:'admin-a'};
assert.deepEqual(
  await requireActiveAdmin(clientFor({
    user:admin,
    membership:{user_id:'admin-a',organization_id:'org-admin',role:'admin',status:'active'}
  }), 'Bearer valid-token'),
  admin
);
await assert.rejects(() => requireActiveAdmin(clientFor({
  user:admin,
  membership:{user_id:'admin-a',organization_id:'org-admin',role:'admin',status:'suspended'}
}), 'Bearer valid-token'), /admin_required/);
await assert.rejects(() => requireActiveAdmin(clientFor({
  user:admin,
  membership:{user_id:'other-user',organization_id:'org-admin',role:'admin',status:'active'}
}), 'Bearer valid-token'), /admin_required/);
await assert.rejects(() => requireActiveAdmin(clientFor({
  user:admin,
  membership:null,
  membershipError:{message:'unavailable'}
}), 'Bearer valid-token'), /membership_lookup_failed/);
await assert.rejects(() => requireActiveAdmin(clientFor({
  user:admin,
  membership:null,
  authError:{message:'invalid token'}
}), 'Bearer valid-token'), /session/);
await assert.rejects(() => requireActiveAdmin(clientFor({
  user:admin,
  membership:null
}), 'Basic invalid'), /session/);

console.log('PASS: admin directory grouping, country state, no login-email exposure, and active-admin server guard.');
