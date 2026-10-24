import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from './Icon';

export type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onComplete: () => void;
}

function AuthIllustration({ mode }: { mode: AuthMode }) {
  return (
    <div className="auth-art">
      <div className="auth-art-brand"><span>RR</span><strong>ReturnRun.</strong></div>
      <div className="auth-art-copy">
        <span className="auth-kicker"><i/> Return logistics, simplified</span>
        <h2>{mode === 'login' ? <>Welcome<br/>back on route.</> : <>Start earning<br/>on every return.</>}</h2>
        <p>{mode === 'login' ? 'Your fleet, loads and best route matches are ready.' : 'Create your workspace and turn empty kilometres into productive journeys.'}</p>
      </div>
      <svg className="auth-truck-art" viewBox="0 0 520 280" aria-hidden="true">
        <circle cx="266" cy="148" r="112" fill="#fff2d9"/>
        <g fill="none" stroke="#171717" strokeLinecap="round" strokeLinejoin="round">
          <path d="M54 78c16-17 32-8 37 4 18-7 31 2 34 13H45c1-7 4-12 9-17ZM375 58c14-15 28-7 32 3 21-9 41 3 45 16h-87c2-8 5-13 10-19Z"/>
          <path d="M153 109h257v101H153z" fill="#faf8f3"/><path d="M202 109v101M264 109v101M329 109v101" stroke="#d2d0ca"/>
          <path d="M182 124h60v86h-60z" fill="#ffa51f" strokeWidth="2"/><path d="M194 124v86M207 124v86M220 124v86"/>
          <path d="M242 146h75v64h-75z" fill="#7c7f82"/><path d="M317 161h69v49h-69z" fill="#44474a"/>
          <path d="M218 207h133l31 29h66v31H205v-39z" fill="#fff" strokeWidth="2"/><path d="M235 215h55v32h-63zM361 216h24l20 20h-44z"/>
          <path d="M224 267h205M255 267a20 20 0 1 0 0 .1M399 267a20 20 0 1 0 0 .1" fill="#222"/>
          <circle cx="255" cy="267" r="7" fill="#fff"/><circle cx="399" cy="267" r="7" fill="#fff"/>
          <path d="M117 184c-9-21-3-45 16-54 16-7 34 1 40 16-15 3-27 12-34 25l-22 13Z" fill="#fff" strokeWidth="2"/>
          <path d="M126 176h43v72h-43z" fill="#ff9314" strokeWidth="2"/><path d="M134 195h27M134 211h27" stroke="#fff" strokeWidth="4"/>
          <path d="M137 166c-9 19-10 40-7 65l-9 36M143 177l30 21 13 41M130 219l30 2 7 46" strokeWidth="3"/>
        </g>
      </svg>
      <div className="auth-art-stat"><strong>24%</strong><span>less empty running</span></div>
    </div>
  );
}

export function AuthModal({ mode, onClose, onModeChange, onComplete }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const isLogin = mode === 'login';

  useEffect(() => {
    setShowPassword(false);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); };
  }, [mode, onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onComplete(); };

  return (
    <div className="auth-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" onClick={onClose} aria-label="Close"><Icon name="close"/></button>
        <AuthIllustration mode={mode}/>
        <div className="auth-form-panel">
          <div className="auth-mobile-brand"><span>RR</span><strong>ReturnRun.</strong></div>
          <span className="auth-form-eyebrow">{isLogin ? 'Welcome back' : 'Join the network'}</span>
          <h1 id="auth-title">{isLogin ? 'Log in to ReturnRun' : 'Create your account'}</h1>
          <p>{isLogin ? 'Enter your details to access your operations workspace.' : 'Set up your business profile. It only takes a minute.'}</p>

          <form className="auth-form" onSubmit={submit}>
            {!isLogin && <div className="auth-field-row"><label>First name<input name="firstName" placeholder="Rajesh" autoComplete="given-name" required autoFocus/></label><label>Last name<input name="lastName" placeholder="Sharma" autoComplete="family-name" required/></label></div>}
            {!isLogin && <label>Business name<input name="business" placeholder="Sharma Roadways" autoComplete="organization" required/></label>}
            <label>Email address<input type="email" name="email" placeholder="you@company.com" defaultValue={isLogin ? 'demo@batra.co.in' : ''} autoComplete="email" required autoFocus={isLogin}/></label>
            {!isLogin && <label>Phone number<div className="phone-field"><span>+91</span><input type="tel" name="phone" placeholder="98765 43210" autoComplete="tel" required/></div></label>}
            <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" placeholder={isLogin ? 'Enter your password' : 'Minimum 8 characters'} defaultValue={isLogin ? 'demo123' : ''} minLength={isLogin ? undefined : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} required/><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>

            {isLogin ? <div className="auth-options"><label className="auth-check"><input type="checkbox" defaultChecked/><span>Keep me signed in</span></label><button type="button" className="auth-text-button">Forgot password?</button></div> : <label className="auth-check terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required/><span>I agree to the <button type="button">Terms</button> and <button type="button">Privacy Policy</button>.</span></label>}

            <button className="auth-submit" type="submit" disabled={!isLogin && !accepted}>{isLogin ? 'Log in to workspace' : 'Create account'} <Icon name="arrow"/></button>
          </form>

          <div className="auth-divider"><span>or continue with</span></div>
          <button className="google-button" type="button" onClick={onComplete}><b>G</b> Google</button>
          <p className="auth-switch">{isLogin ? 'New to ReturnRun?' : 'Already have an account?'} <button onClick={() => onModeChange(isLogin ? 'signup' : 'login')}>{isLogin ? 'Create an account' : 'Log in'}</button></p>
          <span className="auth-secure">Secure access · Review environment</span>
        </div>
      </section>
    </div>
  );
}
