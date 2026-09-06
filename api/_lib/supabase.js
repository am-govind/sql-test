import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/** Service-role client for trusted server writes (submissions). */
export function createServiceClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anon client for verifying admin JWTs. */
export function createAnonClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
