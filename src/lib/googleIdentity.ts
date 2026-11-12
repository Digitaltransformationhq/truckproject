/**
 * Google Identity Services ("Sign in with Google" button).
 *
 * The sign-in happens on our own domain (fares24x7.com), so Google's account chooser shows our
 * site instead of the Supabase project URL. Google returns an ID token, which Supabase verifies
 * with `signInWithIdToken`. Without VITE_GOOGLE_CLIENT_ID the app falls back to the redirect flow.
 */

export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void; nonce?: string; ux_mode?: 'popup' | 'redirect'; auto_select?: boolean; cancel_on_tap_outside?: boolean; use_fedcm_for_button?: boolean; use_fedcm_for_prompt?: boolean; itp_support?: boolean; context?: 'signin' | 'signup' | 'use' }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  prompt(): void;
  cancel(): void;
}

declare global {
  interface Window { google?: { accounts: { id: GoogleAccountsId } } }
}

let loader: Promise<GoogleAccountsId> | null = null;

/** Loads Google's client script once. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in could not load.'));
      script.onerror = () => { loader = null; reject(new Error('Google sign-in could not load. Check your connection and try again.')); };
      document.head.appendChild(script);
    });
  }
  return loader;
}

/** A random nonce: the SHA-256 hash goes to Google, the raw value to Supabase for verification. */
export async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

/**
 * Google One Tap: a small "Continue as …" prompt for visitors already signed in to Google.
 * Uses the browser's FedCM sign-in where available. Returns a cleanup that dismisses the prompt.
 */
export function startGoogleOneTap(onCredential: (token: string, nonce: string) => void): () => void {
  if (!googleClientId) return () => undefined;
  let cancelled = false;
  void (async () => {
    try {
      const [gis, nonce] = await Promise.all([loadGoogleIdentity(), createNonce()]);
      if (cancelled) return;
      gis.initialize({
        client_id: googleClientId,
        nonce: nonce.hashed,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        itp_support: true,
        context: 'signin',
        callback: (response) => onCredential(response.credential, nonce.raw),
      });
      gis.prompt();
    } catch { /* One Tap is optional */ }
  })();
  return () => { cancelled = true; try { window.google?.accounts?.id?.cancel(); } catch { /* ignore */ } };
}
