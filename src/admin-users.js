export const assignableRoles = Object.freeze([
  'supplier', 'buyer', 'restaurant', 'admin'
]);

export class AdminUserError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export async function createUserWithSetupLink(client, email, role, organization = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      normalizedEmail.length > 254 || !assignableRoles.includes(role)) {
    throw new AdminUserError('invalidAccount');
  }

  const organizationName = String(organization.organizationName || '').trim();
  const organizationId = String(organization.organizationId || '').trim();
  if (Boolean(organizationName) === Boolean(organizationId) || organizationName.length > 200 ||
      (organizationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId))) {
    throw new AdminUserError('invalidAccount');
  }
  const { data, error } = await client.functions.invoke('admin-create-user', {
    body: { email: normalizedEmail, role, organizationName: organizationName || null, organizationId: organizationId || null }
  });
  if (error) {
    const status = error.context?.status;
    const code = status === 401 ? 'session'
      : status === 403 ? 'adminDenied'
      : status === 409 ? 'emailExists'
      : status === 429 ? 'linkRateLimited'
      : 'createUserError';
    throw new AdminUserError(code);
  }
  if (data?.ok !== true || typeof data.actionLink !== 'string' || !data.actionLink) {
    throw new AdminUserError('createUserError');
  }
  return data.actionLink;
}
