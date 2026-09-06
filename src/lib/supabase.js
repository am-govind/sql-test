import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey)
  : null;

export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function requireAdminSession() {
  if (!supabase) return { session: null, error: 'Supabase is not configured' };
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return { session: null, error: 'Not signed in' };
  return { session: data.session };
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function adminFetch(path, options = {}) {
  const token = await getAccessToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}
