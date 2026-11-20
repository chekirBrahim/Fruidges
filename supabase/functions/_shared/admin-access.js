import { canManageUsers } from './admin-users.js';

export async function requireActiveAdmin(client, authorization) {
  const tokenMatch = String(authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) throw new Error('session');

  const { data: userResult, error: userError } = await client.auth.getUser(tokenMatch[1]);
  if (userError || !userResult?.user?.id) throw new Error('session');

  const { data: membership, error: membershipError } = await client
    .from('fruidges_memberships')
    .select('user_id,organization_id,role,status')
    .eq('user_id', userResult.user.id)
    .maybeSingle();
  if (membershipError) throw new Error('membership_lookup_failed');
  if (!canManageUsers(membership, userResult.user.id)) throw new Error('admin_required');

  return userResult.user;
}
