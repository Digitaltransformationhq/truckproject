import { Icon } from './Icon';
import heroArtwork from '../assets/returnrun-logistics-hero-v2.png';

interface LandingProps {
  onLogin: () => void;
  onSignup: () => void;
}

function RouteCard() {
  return (
    <div className="route-demo-card">
      <div className="demo-card-top"><span>New truck request</span><b>Pending</b></div>
      <div className="demo-truck"><span><Icon name="truck"/></span><div><strong>Truck needed</strong><small>Full truck · 14 tonnes</small></div></div>
      <div className="demo-route"><div><i/><strong>Ahmedabad</strong><small>Pickup</small></div><span className="route-dashes"/><div><i/><strong>Chennai</strong><small>Delivery</small></div></div>
      <button type="button">Review request <Icon name="arrow"/></button>
    </div>
  );
}

const features = [
  { number: '01', title: 'Request a truck', copy: 'Share the pickup, destination, goods, weight and date.' },
  { number: '02', title: 'Owner reviews it', copy: 'Truck owners see the request clearly on their dashboard.' },
  { number: '03', title: 'Accept or reject', copy: 'The truck owner gives a simple answer and the customer is notified.' },
];

export function Landing({ onLogin, onSignup }: LandingProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#top" aria-label="ReturnRun home"><span>RR</span><strong>ReturnRun.</strong></a>
        <nav aria-label="Main navigation"><a href="#how">How it works</a><a href="#platform">Platform</a><a href="#about">About</a></nav>
        <div className="landing-auth"><button className="login-link" onClick={onLogin}>Log in</button><button className="signup-button" onClick={onSignup}>Sign up <Icon name="arrow"/></button></div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="landing-eyebrow"><i/> Simple truck booking</span>
            <h1>Need a truck?<br/>Send one <em>request.</em></h1>
            <p>Customers post what they need. Truck owners review the request and either accept or reject it. That is the whole process.</p>
            <div className="hero-actions"><button className="hero-primary" onClick={onSignup}>Get started <Icon name="arrow"/></button><a href="#how">See how it works <span>↓</span></a></div>
            <div className="hero-proof"><div><strong>1</strong><span>clear request</span></div><div><strong>2</strong><span>simple choices</span></div><div><strong>Fast</strong><span>owner response</span></div></div>
          </div>
          <div className="hero-visual">
            <div className="visual-label">Live network <span><i/> Updated now</span></div>
            <img className="hero-illustration generated" src={heroArtwork} alt="Logistics worker beside a cargo truck and shipping containers"/>
            <RouteCard/>
            <div className="floating-note"><span>₹</span><div><strong>Save every trip</strong><small>Better fleet utilisation</small></div></div>
          </div>
        </section>

        <section className="logo-strip" aria-label="Platform capabilities"><span>Built for Indian transport businesses</span><div><b>Fleet owners</b><i/> <b>Load owners</b><i/> <b>Transporters</b><i/> <b>Logistics teams</b></div></section>

        <section className="how-section" id="how">
          <div className="section-heading"><h2>One request.<br/>One clear answer.</h2></div>
          <div className="steps-grid">{features.map((feature) => <article key={feature.number}><span>{feature.number}</span><div className="step-icon">{feature.number === '01' ? <Icon name="package"/> : feature.number === '02' ? <Icon name="route"/> : <Icon name="trend"/>}</div><h3>{feature.title}</h3><p>{feature.copy}</p></article>)}</div>
        </section>

        <section className="platform-section" id="platform">
          <div className="platform-phone">
            <div className="phone-top"><button aria-label="Back"><Icon name="chevron"/></button><span>ReturnRun.</span><button className="phone-bell" aria-label="Notifications"><Icon name="bell"/><b>2</b></button></div>
            <div className="phone-heading"><small>Truck owner workspace</small><h3>Hello!<br/>Review truck requests.</h3><p>Respond to new customer requests from one place.</p></div>
            <label className="phone-search"><Icon name="search"/><input aria-label="Search requests" placeholder="Search requests"/><button type="button" aria-label="Filter requests"><Icon name="inbox"/></button></label>
            <div className="phone-list-heading"><div><strong>New requests</strong><small>2 waiting for your response</small></div><button type="button">View all</button></div>
            <RouteCard/>
            <nav className="phone-bottom-nav" aria-label="Preview app navigation"><span className="active"><Icon name="overview"/><small>Home</small></span><span><Icon name="inbox"/><small>Requests</small></span><span><Icon name="truck"/><small>Vehicles</small></span><span><Icon name="building"/><small>Profile</small></span></nav>
          </div>
          <div className="platform-copy"><span className="landing-eyebrow"><i/> One clear workspace</span><h2>Post, review and respond.</h2><p>ReturnRun keeps truck requests in one simple view so customers and truck owners always know what happens next.</p><ul><li><span>✓</span> Simple truck request form</li><li><span>✓</span> Instant owner notification</li><li><span>✓</span> Clear accept or reject response</li></ul><button className="hero-primary" onClick={onLogin}>Explore the platform <Icon name="arrow"/></button></div>
        </section>

        <section className="about-section" id="about"><div><span className="landing-eyebrow"><i/> Built for clarity</span><h2>Truck requests<br/>without the confusion.</h2></div><p>ReturnRun gives customers a simple way to ask for a truck and gives truck owners a simple way to respond.</p></section>

        <section className="landing-cta"><div><span>Ready to move your goods?</span><h2>Post your first truck request.</h2></div><div><button className="cta-light" onClick={onSignup}>Create account <Icon name="arrow"/></button><button className="cta-dark" onClick={onLogin}>Log in</button></div></section>
      </main>

      <footer className="landing-footer"><a className="landing-brand" href="#top"><span>RR</span><strong>ReturnRun.</strong></a><p>Simple truck requests for modern transport businesses.</p><span>© 2026 ReturnRun</span></footer>
    </div>
  );
}
