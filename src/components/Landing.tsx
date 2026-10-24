import { Icon } from './Icon';

interface LandingProps {
  onLogin: () => void;
  onSignup: () => void;
}

function TruckIllustration() {
  return (
    <svg className="hero-illustration" viewBox="0 0 620 420" role="img" aria-label="Truck and cargo loading illustration">
      <circle cx="312" cy="214" r="176" fill="#fff4df"/>
      <g fill="none" stroke="#171717" strokeLinecap="round" strokeLinejoin="round">
        <path d="M90 118c20-21 39-10 45 4 22-8 36 2 40 15H78c1-8 5-14 12-19ZM427 84c16-19 34-8 38 3 25-12 49 3 54 19h-105c2-9 6-16 13-22Z"/>
        <path d="M160 167h342v146H160z" fill="#faf8f2"/><path d="M170 175v138M252 175v138M344 175v138M430 175v138" stroke="#d4d2cd"/>
        <path d="M202 194h64v119h-64z" fill="#ffab27" strokeWidth="2"/><path d="M213 194v119M226 194v119M239 194v119M252 194v119"/>
        <path d="M266 222h86v91h-86z" fill="#7a7d80"/><path d="M352 250h92v63h-92z" fill="#45484b"/>
        <path d="M245 309h147l38 36h82v38H230v-49z" fill="#f9fafb" strokeWidth="2"/><path d="M268 319h61v39h-71zM403 320h28l24 25h-52z"/>
        <path d="M258 383h231M291 383a24 24 0 1 0 0 .1M452 383a24 24 0 1 0 0 .1" fill="#222"/>
        <circle cx="291" cy="383" r="9" fill="#fff"/><circle cx="452" cy="383" r="9" fill="#fff"/>
        <path d="M118 212c22-24 49-20 64 2M92 262c30-20 52-14 66 4"/>
        <path d="M121 248c-12-23-6-55 17-65 19-8 41 1 48 19-17 3-32 14-41 30l-24 16Z" fill="#fff" strokeWidth="2"/>
        <path d="M143 223c-11 20-14 48-10 78l-12 73M151 252l35 25 18 52M130 293l34 1 7 80" strokeWidth="3"/>
        <path d="M122 242h50v91h-50z" fill="#ff9717" strokeWidth="2"/><path d="M131 266h30M131 285h30" stroke="#fff" strokeWidth="4"/>
        <path d="M140 182c4-22 7-35 20-47l25 8c-8 11-8 26-3 39M161 135l14-25M178 112l19 8" strokeWidth="2"/>
        <path d="M199 34v73M190 35l7 73M208 35l-7 73M197 107l-11 19 13 18 13-18-13-19Z" strokeWidth="3"/>
        <path d="M199 144l34 50" strokeWidth="2"/>
      </g>
    </svg>
  );
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
            <TruckIllustration/>
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
