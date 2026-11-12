import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createNonce, googleClientId, loadGoogleIdentity } from '../lib/googleIdentity';

interface Props {
  text: 'continue_with' | 'signup_with';
  /** Called with Google's ID token and the raw nonce, to finish sign-in with Supabase. */
  onCredential: (token: string, nonce: string) => void;
  /** Shown when no Google client ID is configured or Google's script cannot load. */
  fallback: ReactNode;
}

/** Google's own sign-in button: the account chooser shows fares24x7.com, not the Supabase URL. */
export function GoogleSignInButton({ text, onCredential, fallback }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [failed, setFailed] = useState(!googleClientId);

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [gis, nonce] = await Promise.all([loadGoogleIdentity(), createNonce()]);
        if (cancelled || !host.current) return;
        gis.initialize({
          client_id: googleClientId,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          callback: (response) => callback.current(response.credential, nonce.raw),
        });
        const width = Math.round(Math.min(400, Math.max(200, host.current.clientWidth || 320)));
        host.current.innerHTML = '';
        gis.renderButton(host.current, { type: 'standard', theme: 'outline', size: 'large', text, shape: 'pill', logo_alignment: 'center', width });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [text]);

  if (failed) return <>{fallback}</>;
  return <div className="google-identity-button" ref={host} aria-label="Sign in with Google"/>;
}
