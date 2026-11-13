import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

// "Keep me signed in" unticked: the session lasts only until the browser is closed. A cookie without an
// expiry date disappears when the browser closes (and is shared by all tabs); if it is gone on the next start,
// the saved session is cleared before Supabase reads it.
const SESSION_ONLY = 'fares24x7-session-only';
const ALIVE_COOKIE = 'f24_session_alive';
if (typeof window !== 'undefined') {
  try {
    const alive = document.cookie.split('; ').some((part) => part.startsWith(`${ALIVE_COOKIE}=`));
    if (localStorage.getItem(SESSION_ONLY) && !alive) {
      localStorage.removeItem(SESSION_ONLY);
      Object.keys(localStorage).filter((name) => name.startsWith('sb-') && name.endsWith('-auth-token')).forEach((name) => localStorage.removeItem(name));
    }
    document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax`;
  } catch { /* storage unavailable */ }
}

/** Remembers the "Keep me signed in" choice for the next sign-in. */
export function rememberSession(keep: boolean) {
  try { if (keep) localStorage.removeItem(SESSION_ONLY); else localStorage.setItem(SESSION_ONLY, '1'); } catch { /* storage unavailable */ }
}

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
