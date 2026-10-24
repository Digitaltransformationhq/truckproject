import { Icon } from './Icon';
import heroArtwork from '../assets/returnrun-logistics-hero-v2.png';

interface LandingProps {
  onLogin: () => void;
  onSignup: () => void;
}

function RouteCard() {
  return (
    <div className="route-demo-card">
      <div className="demo-card-top"><span>Live return match</span><b>92%</b></div>
      <div className="demo-truck"><span><Icon name="truck"/></span><div><strong>TN 01 AB 4521</strong><small>32 ft multi axle · 18T</small></div></div>
      <div className="demo-route"><div><i/><strong>Ahmedabad</strong><small>Available now</small></div><span className="route-dashes"/><div><i/><strong>Chennai</strong><small>Return destination</small></div></div>
      <button type="button">View best load <Icon name="arrow"/></button>
    </div>
  );
}

const features = [
  { number: '01', title: 'Post a load', copy: 'Share pickup, destination, material and capacity requirements in minutes.' },
  { number: '02', title: 'Match the right truck', copy: 'Find available vehicles already travelling your route and compare clear match scores.' },
  { number: '03', title: 'Reduce empty returns', copy: 'Turn return journeys into productive trips and improve fleet utilisation.' },
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
            <span className="landing-eyebrow"><i/> Smarter return logistics</span>
            <h1>Every return trip<br/>should <em>earn.</em></h1>
            <p>Match available trucks with the right loads on their way back. Less empty running, better margins and a stronger transport network.</p>
            <div className="hero-actions"><button className="hero-primary" onClick={onSignup}>Get started <Icon name="arrow"/></button><a href="#how">See how it works <span>↓</span></a></div>
            <div className="hero-proof"><div><strong>24%</strong><span>less empty running</span></div><div><strong>38+</strong><span>active corridors</span></div><div><strong>92%</strong><span>best match score</span></div></div>
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
          <div className="section-heading"><span className="landing-eyebrow"><i/> Simple by design</span><h2>From empty return<br/>to profitable journey.</h2></div>
          <div className="steps-grid">{features.map((feature) => <article key={feature.number}><span>{feature.number}</span><div className="step-icon">{feature.number === '01' ? <Icon name="package"/> : feature.number === '02' ? <Icon name="route"/> : <Icon name="trend"/>}</div><h3>{feature.title}</h3><p>{feature.copy}</p></article>)}</div>
        </section>

        <section className="platform-section" id="platform">
          <div className="platform-phone">
            <div className="phone-top"><button aria-label="Back">‹</button><span>ReturnRun.</span><button aria-label="Notifications"><Icon name="bell"/></button></div>
            <h3>Hello!<br/>Find your return load.</h3>
            <div className="phone-search"><Icon name="search"/><span>Search city or route</span><button><Icon name="route"/></button></div>
            <RouteCard/>
          </div>
          <div className="platform-copy"><span className="landing-eyebrow"><i/> One clear workspace</span><h2>Know what is moving. Find what moves next.</h2><p>ReturnRun brings fleet availability, open loads and route matches into one simple operating view—so your team can act faster without juggling calls and spreadsheets.</p><ul><li><span>✓</span> Live fleet availability</li><li><span>✓</span> Explainable return-load scores</li><li><span>✓</span> Route and capacity filters</li></ul><button className="hero-primary" onClick={onLogin}>Explore the platform <Icon name="arrow"/></button></div>
        </section>

        <section className="about-section" id="about"><div><span className="landing-eyebrow"><i/> Built around your routes</span><h2>More loaded kilometres.<br/>Less wasted potential.</h2></div><p>ReturnRun is a practical operating platform for transport businesses that want to connect truck availability with verified load demand.</p></section>

        <section className="landing-cta"><div><span>Ready to make every kilometre count?</span><h2>Start your next profitable return.</h2></div><div><button className="cta-light" onClick={onSignup}>Create account <Icon name="arrow"/></button><button className="cta-dark" onClick={onLogin}>Log in</button></div></section>
      </main>

      <footer className="landing-footer"><a className="landing-brand" href="#top"><span>RR</span><strong>ReturnRun.</strong></a><p>Smarter return logistics for modern transport businesses.</p><span>© 2026 ReturnRun</span></footer>
    </div>
  );
}
