import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireActiveAdmin } from '../_shared/admin-access.js';
import { buildOrganizationDirectory } from '../_shared/admin-directory.js';

const defaultOrigins = ['http://127.0.0.1:4173', 'http://localhost:4173'];
const configuredOrigins = Deno.env.get('APP_ORIGINS');
const allowedOrigins = new Set((configuredOrigins
  ? configuredOrigins.split(',')
  : defaultOrigins).map(origin => origin.trim()).filter(Boolean));
const pageSize = 500;
const maxRows = 10000;

function headers(origin) {
  const result = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
  if (allowedOrigins.has(origin)) result['Access-Control-Allow-Origin'] = origin;
  return result;
}

function respond(origin, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), 'Content-Type': 'application/json' }
  });
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  let serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const secretKeysValue = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeysValue) {
    try {
      const secretKeys = JSON.parse(secretKeysValue);
      if (typeof secretKeys.default === 'string') serviceRoleKey = secretKeys.default;
    } catch {
      throw new Error('service_configuration');
    }
  }
  if (!supabaseUrl || !serviceRoleKey) throw new Error('service_configuration');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function readAll(client, table, columns, orderBy) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from(table).select(columns);
    for (const column of orderBy) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error || !Array.isArray(data)) throw new Error('directory_load_failed');
    rows.push(...data);
    if (data.length < pageSize) return rows;
    if (rows.length >= maxRows) throw new Error('directory_too_large');
  }
}

async function loadDirectory(client) {
  const organizations = await readAll(
    client,
    'fruidges_organizations',
    'id,name,country_code,created_at',
    ['created_at', 'id']
  );
  const memberships = await readAll(
    client,
    'fruidges_memberships',
    'organization_id,role,status',
    ['organization_id', 'user_id']
  );
  return buildOrganizationDirectory(organizations, memberships);
}

function rpcErrorResponse(origin, error) {
  const message = String(error?.message || '');
  if (message.includes('admin_required')) return respond(origin, 403, { code: 'admin_required' });
  if (message.includes('invalid_country')) return respond(origin, 400, { code: 'invalid_country' });
  if (message.includes('organization_not_found')) return respond(origin, 404, { code: 'organization_not_found' });
  return respond(origin, 500, { code: 'country_update_failed' });
}

Deno.serve(async request => {
  const origin = request.headers.get('Origin') || '';
  if (!allowedOrigins.has(origin)) return respond(origin, 403, { code: 'origin_denied' });
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(origin) });
  if (request.method !== 'POST') return respond(origin, 405, { code: 'method_not_allowed' });

  let client;
  try {
    client = createServiceClient();
  } catch {
    return respond(origin, 500, { code: 'service_configuration' });
  }

  let actor;
  try {
    actor = await requireActiveAdmin(client, request.headers.get('Authorization'));
  } catch (error) {
    const code = ['session', 'membership_lookup_failed', 'admin_required'].includes(error?.message)
      ? error.message
      : 'membership_lookup_failed';
    const status = code === 'session' ? 401 : code === 'admin_required' ? 403 : 500;
    return respond(origin, status, { code });
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return respond(origin, 400, { code: 'invalid_request' });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return respond(origin, 400, { code: 'invalid_request' });
  }

  if (input.action === 'list') {
    try {
      const organizations = await loadDirectory(client);
      return respond(origin, 200, { organizations });
    } catch (error) {
      const code = error?.message === 'directory_too_large'
        ? 'directory_too_large'
        : 'directory_load_failed';
      return respond(origin, 500, { code });
    }
  }

  if (input.action !== 'set_country' ||
      typeof input.organizationId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.organizationId)) {
    return respond(origin, 400, { code: 'invalid_request' });
  }
  const countryCode = typeof input.countryCode === 'string'
    ? input.countryCode.trim().toUpperCase()
    : '';
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return respond(origin, 400, { code: 'invalid_country' });
  }

  const { error } = await client.rpc('fruidges_set_organization_country', {
    p_actor: actor.id,
    p_organization_id: input.organizationId,
    p_country_code: countryCode
  });
  if (error) return rpcErrorResponse(origin, error);
  return respond(origin, 200, {
    ok: true,
    organizationId: input.organizationId,
    countryCode
  });
});
