import { createAnonClient } from './supabase.js';

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

  return { user: data.user };
}
