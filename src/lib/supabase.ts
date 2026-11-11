import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/** True when the app is connected to a real Supabase project; otherwise it runs in local demo mode. */
export const isBackendEnabled = Boolean(url && key);

export const supabase: SupabaseClient | null = isBackendEnabled
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}

/** Turns Supabase/Postgres errors into a sentence safe to show to users. */
export function friendlyError(error: unknown): string {
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  if (/Invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/User already registered/i.test(message)) return 'An account with this email already exists. Please log in.';
  if (/Email not confirmed/i.test(message)) return 'Please confirm your email address using the link we sent you.';
  if (/trucks_registration_key|duplicate key/i.test(message)) return 'A vehicle with this registration number already exists.';
  if (/row-level security|permission denied|42501/i.test(message)) return 'Your account is not allowed to do this. It may be suspended.';
  return message || 'Something went wrong. Please try again.';
}
