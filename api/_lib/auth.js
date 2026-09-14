import { createAnonClient } from './supabase.js';
import { createServiceClient } from './supabase.js';

/**
 * Verify a Supabase access token from the Authorization header.
 * @returns {Promise<{ user: object } | { error: string, status: number }>}
 */
export async function requireAdmin(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header?.startsWith('Bearer ')) {
    return { error: 'Missing authorization token', status: 401 };
  }

  const token = header.slice(7);
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const service = createServiceClient();
  const requestedOrganizationId = req.headers['x-organization-id'];
  let membershipQuery = service
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', data.user.id);
  if (requestedOrganizationId) membershipQuery = membershipQuery.eq('organization_id', requestedOrganizationId);
  const { data: memberships, error: membershipError } = await membershipQuery.order('created_at', { ascending: true });
  if (membershipError) return { error: 'Unable to load organization', status: 500 };
  if (!memberships?.length) return { error: 'Admin is not assigned to this organization', status: 403 };
  const membership = memberships[0];

  return { user: data.user, organizationId: membership.organization_id, role: membership.role };
}
