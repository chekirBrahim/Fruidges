export const roles = Object.freeze(['supplier', 'buyer', 'restaurant', 'admin']);
export class AccessError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// Never derive authorization from user-editable Auth metadata.
export async function resolveMembership(client) {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user?.id) throw new AccessError('session');
  const result = await client.from('fruidges_memberships')
    .select('user_id,organization_id,role,status')
    .eq('user_id', data.user.id).limit(2);
  if (result.error) throw new AccessError('configuration');
  if (!Array.isArray(result.data) || result.data.length !== 1) throw new AccessError('pending');
  const membership = result.data[0];
  const role = membership.role === 'wholesaler' ? 'buyer' : membership.role;
  if (membership.user_id !== data.user.id || !membership.organization_id ||
      membership.status !== 'active' || !roles.includes(role)) {
    throw new AccessError('denied');
  }
  return { user: data.user, membership: { ...membership, role } };
}

export async function signIn(client, email, password) {
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AccessError('credentials');
  try { return await resolveMembership(client); }
  catch (error) {
    // Clear local SDK session on failed authorization, never fall back to demo.
    await client.auth.signOut({ scope: 'local' });
    throw error;
  }
}
