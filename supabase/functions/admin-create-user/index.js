import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseCreateUserRequest } from '../_shared/admin-users.js';
import { requireActiveAdmin } from '../_shared/admin-access.js';

const defaultOrigins = ['http://127.0.0.1:4173', 'http://localhost:4173'];
const configuredOrigins = Deno.env.get('APP_ORIGINS');
const allowedOrigins = new Set((configuredOrigins
  ? configuredOrigins.split(',')
  : defaultOrigins).map(origin => origin.trim()).filter(Boolean));

function headers(origin) {
  const result = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

Deno.serve(async request => {
  const origin = request.headers.get('Origin') || '';
  if (!allowedOrigins.has(origin)) return respond(origin, 403, { code: 'origin_denied' });
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(origin) });
  if (request.method !== 'POST') return respond(origin, 405, { code: 'method_not_allowed' });

  const authorization = request.headers.get('Authorization') || '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return respond(origin, 401, { code: 'session' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  let serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const secretKeysValue = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeysValue) {
    try {
      const secretKeys = JSON.parse(secretKeysValue);
      if (typeof secretKeys.default === 'string') serviceRoleKey = secretKeys.default;
    } catch {
      return respond(origin, 500, { code: 'service_configuration' });
    }
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return respond(origin, 500, { code: 'service_configuration' });
  }

  let input;
  try {
    input = parseCreateUserRequest(await request.json());
  } catch (error) {
    const code = error.message === 'invalid_email' ? 'invalid_email'
      : error.message === 'invalid_role' ? 'invalid_role'
      : 'invalid_request';
    return respond(origin, 400, { code });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let actor;
  try {
    actor = await requireActiveAdmin(supabase, authorization);
  } catch (error) {
    const code = ['session', 'membership_lookup_failed', 'admin_required'].includes(error?.message)
      ? error.message
      : 'membership_lookup_failed';
    const status = code === 'session' ? 401 : code === 'admin_required' ? 403 : 500;
    return respond(origin, status, { code });
  }

  const { data: invitation, error: invitationError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: input.email,
    options: { redirectTo: `${origin}/` }
  });
  if (invitationError) {
    if (invitationError.status === 429) return respond(origin, 429, { code: 'link_rate_limited' });
    if (invitationError.status === 409 ||
        ['email_exists', 'user_already_exists'].includes(invitationError.code)) {
      return respond(origin, 409, { code: 'email_exists' });
    }
    return respond(origin, 500, { code: 'account_create_failed' });
  }
  const newUserId = invitation.user?.id;
  const actionLink = invitation.properties?.action_link;
  if (!newUserId || !actionLink) {
    return respond(origin, 500, { code: 'account_create_failed' });
  }

  const { error: insertError } = await supabase.rpc('fruidges_provision_membership', {
    p_actor: actor.id,
    p_user: newUserId,
    p_role: input.role,
    p_organization_name: input.organizationName,
    p_organization_id: input.organizationId
  });
  if (insertError) {
    // Auth and Postgres are separate transactions. Never delete a possibly existing
    // Auth identity or overwrite an existing membership when provisioning fails.
    return respond(origin, 500, { code: 'membership_create_failed' });
  }

  return respond(origin, 200, { ok: true, actionLink });
});
