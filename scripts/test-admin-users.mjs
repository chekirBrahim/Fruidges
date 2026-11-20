import assert from 'node:assert/strict';
import { AdminUserError, assignableRoles, createUserWithSetupLink } from '../src/admin-users.js';
import { canManageUsers, parseCreateUserRequest } from '../supabase/functions/_shared/admin-users.js';

let calls = 0;
const setupLink = 'https://otaodwohbksacvbheshd.supabase.co/auth/v1/verify?token=single-use&type=invite';
const client = {
  functions: {
    async invoke(name, options) {
      calls++;
      assert.equal(name, 'admin-create-user');
      assert.deepEqual(options.body, { email: 'person@example.com', role: 'supplier', organizationName: 'Company', organizationId: null });
      return { data: { ok: true, actionLink: setupLink }, error: null };
    }
  }
};

assert.deepEqual(assignableRoles, ['supplier', 'buyer', 'restaurant', 'admin']);
assert.equal(await createUserWithSetupLink(client, ' Person@Example.com ', 'supplier', {organizationName:'Company'}), setupLink);
assert.equal(calls, 1);
await assert.rejects(() => createUserWithSetupLink(client, 'not-an-email', 'supplier'),
  error => error instanceof AdminUserError && error.code === 'invalidAccount');
await assert.rejects(() => createUserWithSetupLink(client, 'person@example.com', 'owner'),
  error => error instanceof AdminUserError && error.code === 'invalidAccount');
await assert.rejects(() => createUserWithSetupLink(client, 'person@example.com', 'wholesaler'),
  error => error instanceof AdminUserError && error.code === 'invalidAccount');
assert.equal(calls, 1);

assert.deepEqual(parseCreateUserRequest({
  email: ' Person@Example.com ',
  role: 'buyer',
  organizationName: 'Company',
  user_metadata: { role: 'admin' }
}), { email: 'person@example.com', role: 'buyer', organizationName:'Company', organizationId:null });
assert.throws(() => parseCreateUserRequest({ email: 'person@example.com', role: 'owner' }));
assert.throws(() => parseCreateUserRequest({ email: 'person@example.com', role: 'wholesaler', organizationName:'Company' }));
assert.deepEqual(parseCreateUserRequest({
  email: 'person@example.com',
  role: 'admin',
  organizationName: 'Company'
}), { email: 'person@example.com', role: 'admin', organizationName:'Company', organizationId:null });

assert.equal(canManageUsers({
  user_id: 'admin-a', organization_id: 'org-a', role: 'admin', status: 'active'
}, 'admin-a'), true);
assert.equal(canManageUsers({
  user_id: 'supplier-a', organization_id: 'org-a', role: 'supplier', status: 'active'
}, 'supplier-a'), false);
assert.equal(canManageUsers({
  user_id: 'admin-a', organization_id: 'org-a', role: 'admin', status: 'pending'
}, 'admin-a'), false);
assert.equal(canManageUsers({
  user_id: 'admin-a', organization_id: 'org-a', role: 'admin', status: 'active'
}, 'admin-b'), false);

console.log('PASS: account setup-link payloads, role allowlist and server authorization rules.');

assert.throws(()=>parseCreateUserRequest({email:'a@example.com',role:'supplier'}));
