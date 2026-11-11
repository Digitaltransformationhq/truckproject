import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from './Icon';
import { friendlyError } from '../lib/supabase';
import { PENDING_ROLE_KEY, type OnboardingDetails } from '../lib/backend';

type Role = 'load_owner' | 'truck_owner';

interface Props {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  onComplete: (role: Role, details: OnboardingDetails) => Promise<void>;
  onSignOut: () => void;
}

const storedRole = (): Role | null => {
  try { const value = localStorage.getItem(PENDING_ROLE_KEY); return value === 'load_owner' || value === 'truck_owner' ? value : null; } catch { return null; }
};

/** Shown once after a first Google sign-in: pick an account type and add the business details email sign-up collects. */
export function OnboardingScreen({ email, firstName, lastName, avatarUrl, onComplete, onSignOut }: Props) {
  const [role, setRole] = useState<Role | null>(storedRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role || busy) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? '').trim();
    const details: Record<string, string> = role === 'load_owner'
      ? { industry: value('industry'), material: value('material'), pickupCity: value('city') }
      : { fleetSize: value('fleetSize'), vehicleType: value('vehicleType'), operatingCities: value('city') };
    setBusy(true); setError('');
    try {
      await onComplete(role, { firstName: value('firstName'), lastName: value('lastName'), business: value('business'), phone: value('phone'), city: value('city'), gstin: value('gstin'), details });
    } catch (problem) {
      setError(friendlyError(problem));
      setBusy(false);
    }
  };

  return <div className="onboarding-page">
    <section className="onboarding-card" aria-labelledby="onboardingTitle">
      <header className="onboarding-head">
        <span className="brand-mark">F24</span>
        <div className="onboarding-account">
          {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer"/> : <span className="onboarding-avatar"><Icon name="building"/></span>}
          <div><strong>{[firstName, lastName].filter(Boolean).join(' ') || 'Welcome'}</strong><small>{email}</small></div>
        </div>
      </header>
      <span className="auth-form-eyebrow">Signed in with Google</span>
      <h1 id="onboardingTitle">Complete your Fares24x7 profile</h1>
      <p className="onboarding-lead">Tell us how you will use Fares24x7. This is a one-time step.</p>

      <div className="role-selection onboarding-roles" role="radiogroup" aria-label="Account type">
        <button type="button" role="radio" aria-checked={role === 'load_owner'} className={role === 'load_owner' ? 'selected' : ''} onClick={() => setRole('load_owner')}><span className="role-icon"><Icon name="package"/></span><span><strong>I need trucks</strong><small>Load owner / shipper</small><em>Post loads and find suitable vehicles</em></span><b>{role === 'load_owner' ? '✓' : '→'}</b></button>
        <button type="button" role="radio" aria-checked={role === 'truck_owner'} className={role === 'truck_owner' ? 'selected' : ''} onClick={() => setRole('truck_owner')}><span className="role-icon"><Icon name="truck"/></span><span><strong>I own or manage trucks</strong><small>Truck owner / transporter</small><em>Add vehicles and find return loads</em></span><b>{role === 'truck_owner' ? '✓' : '→'}</b></button>
      </div>

      {role && <form className="auth-form onboarding-form" onSubmit={submit}>
        <div className="auth-field-row"><label>First name<input name="firstName" defaultValue={firstName} autoComplete="given-name" required/></label><label>Last name<input name="lastName" defaultValue={lastName} autoComplete="family-name" required/></label></div>
        <label>Business name<input name="business" placeholder={role === 'load_owner' ? 'ABC Manufacturing' : 'Sharma Roadways'} minLength={2} autoComplete="organization" required/></label>
        <div className="auth-field-row"><label>Phone number<div className="phone-field"><span>+91</span><input type="tel" name="phone" placeholder="98765 43210" pattern="[6-9][0-9]{4}\s?[0-9]{5}" title="Enter a 10-digit mobile number" autoComplete="tel-national" required/></div></label><label>Primary city<input name="city" placeholder="Ahmedabad" autoComplete="address-level2" required/></label></div>
        {role === 'load_owner'
          ? <div className="auth-field-row"><label>Industry type<select name="industry" required defaultValue=""><option value="" disabled>Select industry</option><option>Manufacturing</option><option>Retail & distribution</option><option>Agriculture</option><option>Construction</option><option>Other</option></select></label><label>Typical material<input name="material" placeholder="Textiles, food, equipment" required/></label></div>
          : <div className="auth-field-row"><label>Fleet size<input name="fleetSize" type="number" min="1" placeholder="12" required/></label><label>Primary vehicle type<select name="vehicleType" required defaultValue=""><option value="" disabled>Select vehicle</option><option>32 ft Multi Axle</option><option>20 ft Container</option><option>24 ft Single Axle</option><option>14 ft LCV</option><option>Mixed fleet</option></select></label></div>}
        <label>GSTIN <span className="optional">Optional</span><input name="gstin" placeholder="22AAAAA0000A1Z5" pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]" maxLength={15} title="Enter a valid 15-character GSTIN"/></label>
        <label className="auth-check terms"><input type="checkbox" required/><span>I agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
        {error && <p className="auth-message error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Setting up…' : 'Continue to workspace'} <Icon name="arrow"/></button>
      </form>}
      <p className="auth-switch">Not you? <button type="button" onClick={onSignOut}>Sign out</button></p>
    </section>
  </div>;
}
