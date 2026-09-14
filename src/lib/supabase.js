import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ORG_KEY = 'sqlproctor_admin_organization_v1';

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey)
  : null;

export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  // Refresh before expiry; serverless requests can otherwise receive a token
  // that expired while the admin tab was left open.
  const expiresAt = data.session.expires_at || 0;
  if (expiresAt * 1000 - Date.now() < 60_000) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? null;
  }
  return data.session.access_token;
}

export async function requireAdminSession() {
  if (!supabase) return { session: null, error: 'Supabase is not configured' };
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return { session: null, error: 'Not signed in' };
  return { session: data.session };
}

export async function getOrganizations() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => row.organizations).filter(Boolean);
}

export async function getCurrentOrganization() {
  const organizations = await getOrganizations();
  const selected = sessionStorage.getItem(ORG_KEY);
  return organizations.find((org) => org.id === selected) || organizations[0] || null;
}

export function setCurrentOrganization(id) {
  sessionStorage.setItem(ORG_KEY, id);
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function adminFetch(path, options = {}) {
  async function sendRequest() {
    const token = await getAccessToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const organizationId = sessionStorage.getItem(ORG_KEY);
    if (organizationId) headers['X-Organization-Id'] = organizationId;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    return fetch(apiUrl(path), { ...options, headers });
  }

  let response = await sendRequest();
  if (response.status === 401 && supabase) {
    await supabase.auth.refreshSession();
    response = await sendRequest();
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}
