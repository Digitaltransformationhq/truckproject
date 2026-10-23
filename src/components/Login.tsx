import type { FormEvent } from 'react';

interface LoginProps { onLogin: () => void; }

export function Login({ onLogin }: LoginProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onLogin(); };
  return (
    <div className="login-shell">
      <section className="login-story">
        <a className="brand brand-light" href="#" aria-label="ReturnRun home"><span className="brand-mark">R</span><span>ReturnRun</span></a>
        <div className="story-copy">
          <span className="eyebrow">Make every kilometre count</span>
          <h1>Turn empty returns into profitable journeys.</h1>
          <p>Match available trucks with the right loads, right along their return route.</p>
          <div className="story-stats"><div><strong>24%</strong><span>less empty running</span></div><div><strong>38</strong><span>active route corridors</span></div></div>
        </div>
        <p className="story-note">Phase 1 review build · Data is stored in this browser</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-brand"><span className="brand-mark">R</span><strong>ReturnRun</strong></div>
          <span className="status-pill"><i/> Review environment</span>
          <h2>Welcome back</h2><p>Access the transport operations workspace.</p>
          <label>Email address<input type="email" defaultValue="demo@batra.co.in" required /></label>
          <label>Password<input type="password" defaultValue="demo123" required /></label>
          <div className="form-row"><label className="check"><input type="checkbox" defaultChecked /> Keep me signed in</label><button className="text-btn" type="button">Forgot password?</button></div>
          <button className="primary-btn full" type="submit">Sign in to workspace <span>→</span></button>
          <button className="demo-btn" type="button" onClick={onLogin}>Continue with demo account</button>
          <p className="secure-note">Secure portal · Phase 1 prototype</p>
        </form>
      </section>
    </div>
  );
}
