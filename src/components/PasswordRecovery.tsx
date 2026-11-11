import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from './Icon';
import { friendlyError } from '../lib/supabase';

/** Shown after opening a password-reset link: choose a new password. */
export function PasswordRecovery({ onSave, onCancel }: { onSave: (password: string) => Promise<void>; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true); setError('');
    try { await onSave(password); } catch (problem) { setError(friendlyError(problem)); setBusy(false); }
  };
  return <div className="onboarding-page">
    <section className="onboarding-card" aria-labelledby="recoveryTitle">
      <header className="onboarding-head"><span className="brand-mark">F24</span></header>
      <span className="auth-form-eyebrow">Password reset</span>
      <h1 id="recoveryTitle">Choose a new password</h1>
      <p className="onboarding-lead">Use at least 8 characters. You will stay signed in after saving.</p>
      <form className="auth-form onboarding-form" onSubmit={submit}>
        <label>New password<div className="password-field"><input type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required autoFocus/><button type="button" onClick={() => setShow((value) => !value)}>{show ? 'Hide' : 'Show'}</button></div></label>
        <label>Confirm new password<input type={show ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} autoComplete="new-password" required/></label>
        {error && <p className="auth-message error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'} <Icon name="arrow"/></button>
      </form>
      <p className="auth-switch"><button type="button" onClick={onCancel}>Cancel</button></p>
    </section>
  </div>;
}
