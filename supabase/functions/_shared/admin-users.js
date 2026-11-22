export const assignableRoles = Object.freeze([
  'supplier', 'importer', 'distributor', 'horeca', 'admin'
]);

export function parseCreateUserRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('invalid_request');
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('invalid_email');
  }
  if (!assignableRoles.includes(role)) throw new Error('invalid_role');
  const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : '';
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : '';
  if (Boolean(organizationName) === Boolean(organizationId) || organizationName.length > 200 ||
      (organizationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId))) {
    throw new Error('invalid_organization');
  }
  return { email, role, organizationName: organizationName || null, organizationId: organizationId || null };
}

export function canManageUsers(membership, userId) {
  return Boolean(membership &&
    membership.user_id === userId &&
    membership.status === 'active' &&
    membership.role === 'admin' &&
    membership.organization_id);
}
