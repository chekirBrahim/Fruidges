import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const original = await readFile(new URL('../reference/agri_connect_prototype_v16.html', import.meta.url));
assert.equal(createHash('sha256').update(original).digest('hex'), (await read('reference/sha256.txt')).split(' ')[0]);
const source = original.toString('utf8');
const embedded = Buffer.from(source.match(/data:text\/html;base64,([A-Za-z0-9+/=]+)/)[1], 'base64').toString('utf8');
let count = 0;
for (const [name, baseline] of [['demo.html', source], ['buyer.html', embedded]]) {
  const html = await read(`src/${name}`);
  assert.match(html, /fruidges-demo/);
  assert.match(html, /Fruidges/);
  assert.doesNotMatch(html, /data:text\/html;base64,/);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [, attrs, js] of scripts) {
    if (!/\bsrc\s*=/.test(attrs)) { new Script(js, { filename: name }); count++; }
  }

}
assert.match(await read('src/demo.html'), /src="buyer.html#demo-buyer"/);
console.log(`PASS: reference integrity, ${count} inline scripts parse, buyer link and demo labels.`);

new Script(await read("src/auth-demo.js"));
assert.doesNotMatch(await read("src/demo.html"), /id="roleSwitch"/);
for (const name of ["admin", "supplier", "restaurant", "requests"]) assert.doesNotMatch(await read("src/buyer.html"), new RegExp(`id="nav-${name}"`));
await import("./test-auth.mjs");

await import("./test-session.mjs");
await import("./test-market-access.mjs");
await import("./test-catalog.mjs");
await import("./test-excel-import.mjs");
await import("./test-admin-users.mjs");
await import("./test-admin-management.mjs");
await import("./test-admin-directory.mjs");
await import("./test-live-state.mjs");
await import("./test-buyer-order.mjs");
await import("./test-images.mjs");
await import("./test-rls.mjs");
assert.doesNotMatch(await read("src/index.html"), /auth-demo|roleSwitch/);
assert.doesNotMatch(await read("src/auth-live.js"), /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
const accountFunction = await read("supabase/functions/admin-create-user/index.js");
assert.match(accountFunction, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(accountFunction, /SUPABASE_SECRET_KEYS/);
assert.match(accountFunction, /auth\.admin\.generateLink/);
assert.doesNotMatch(accountFunction, /inviteUserByEmail/);
const directoryFunction = await read("supabase/functions/admin-organizations/index.js");
assert.match(directoryFunction, /requireActiveAdmin/);
assert.match(directoryFunction, /fruidges_set_organization_country/);
assert.match(directoryFunction, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(directoryFunction, /auth\.admin|user_id,email/);
assert.doesNotMatch(await read("src/auth-live.js"), /\.from\(['"]fruidges_(organizations|memberships)['"]\)/);
const edgeConfig = await read("supabase/config.toml");
const adminAccess = await read("supabase/functions/_shared/admin-access.js");
for (const [name, source] of [
  ["admin-create-user", accountFunction],
  ["admin-organizations", directoryFunction]
]) {
  assert.match(edgeConfig, new RegExp(`\\[functions\\.${name}\\][\\s\\S]*?verify_jwt = false`));
  assert.match(source, /requireActiveAdmin/);
}
assert.match(adminAccess, /client\.auth\.getUser/);
