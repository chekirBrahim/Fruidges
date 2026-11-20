const roles = ['supplier', 'buyer', 'restaurant', 'admin'];
const statuses = ['active', 'pending', 'suspended'];

export function buildOrganizationDirectory(organizations, memberships) {
  if (!Array.isArray(organizations) || !Array.isArray(memberships)) {
    throw new Error('directory_invalid');
  }

  const directory = new Map();
  for (const organization of organizations) {
    if (!organization?.id || typeof organization.name !== 'string' || !organization.name.trim()) {
      throw new Error('directory_invalid');
    }
    if (organization.country_code != null && !/^[A-Z]{2}$/.test(organization.country_code)) {
      throw new Error('directory_invalid');
    }
    directory.set(organization.id, {
      id: organization.id,
      name: organization.name,
      country_code: organization.country_code,
      created_at: organization.created_at,
      member_count: 0,
      membership_counts: Object.fromEntries(roles.map(role => [
        role,
        { total: 0, active: 0, pending: 0, suspended: 0 }
      ]))
    });
  }

  for (const membership of memberships) {
    const organization = directory.get(membership.organization_id);
    if (!organization) throw new Error('directory_invalid');
    const role = membership.role === 'wholesaler' ? 'buyer' : membership.role;
    if (!roles.includes(role) || !statuses.includes(membership.status)) {
      throw new Error('directory_invalid');
    }
    const counts = organization.membership_counts[role];
    counts.total++;
    counts[membership.status]++;
    organization.member_count++;
  }

  return [...directory.values()].filter(organization =>
    ['supplier', 'buyer', 'restaurant'].some(role =>
      organization.membership_counts[role].total > 0));
}
