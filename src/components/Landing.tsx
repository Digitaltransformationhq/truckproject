import { Icon } from './Icon';
import { HeroWalkthrough } from './ProductMockups';

interface LandingProps {
  onLogin: () => void;
  onSignup: () => void;
}

const features = [
  {
    number: '01', icon: 'package' as const, title: 'Post your load',
    copy: 'Tell us the pickup city, delivery city, type of goods, weight and the date you need the truck.',
    points: ['Full truck or shared (part) load', 'Takes under a minute', 'No phone calls needed'],
  },
  {
    number: '02', icon: 'truck' as const, title: 'Matched with a truck',
    copy: 'Truck owners with an available vehicle on your route are alerted and review your request.',
    points: ['Transporters submit KYC documents', 'Trucks already heading your way', 'Capacity checked automatically'],
  },
  {
    number: '03', icon: 'route' as const, title: 'Confirmed and on the move',
    copy: 'The first owner to accept gets the trip. You are notified instantly and can see the assigned truck and contact.',
    points: ['Instant confirmation', 'Truck and owner details shared', 'Empty return trips become paid trips'],
  },
];

export function Landing({ onLogin, onSignup }: LandingProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#top" aria-label="Fares24x7 home"><span>F24</span><strong>Fares24x7.</strong></a>
        <nav aria-label="Main navigation"><a href="#how">How it works</a><a href="#platform">Platform</a><a href="#about">About</a></nav>
        <div className="landing-auth"><button className="login-link" onClick={onLogin}>Log in</button><button className="signup-button" onClick={onSignup}>Sign up <Icon name="arrow"/></button></div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="landing-eyebrow"><i/> Simple truck booking</span>
            <h1>Need a truck?<br/>Send one <em>request.</em></h1>
            <p>Customers post what they need. Truck owners review the request and either accept or reject it. That is the whole process.</p>
          </div>
          <div className="hero-visual hero-product hero-video" aria-label="Walkthrough: a customer posts a truck request, a truck owner accepts it and the customer tracks the trip">
            <HeroWalkthrough/>
          </div>
          <div className="hero-actions"><button className="hero-primary" onClick={onSignup}>Get started <Icon name="arrow"/></button><button className="hero-login" onClick={onLogin}>Log in</button><a href="#how">See how it works <span>↓</span></a></div>
          <ul className="hero-trust">
              <li><strong>Verified businesses</strong><small>GST &amp; PAN reviewed</small></li>
              <li><strong>Documented trucks</strong><small>RC, insurance &amp; PUC</small></li>
              <li><strong>Direct contact</strong><small>No middlemen</small></li>
            </ul>
        </section>

        <section className="audience-band" aria-label="Who uses Fares24x7">
          <div className="audience-band-inner">
          <p>Built for Indian <br/>transport businesses</p>
          <ul>
            <li><strong>Fleet owners</strong><small>Fill empty return trips</small></li>
            <li><strong>Load owners</strong><small>Book trucks without brokers</small></li>
            <li><strong>Transporters</strong><small>Put spare capacity to work</small></li>
            <li><strong>Logistics teams</strong><small>Track every load in one place</small></li>
          </ul>
          </div>
        </section>

        <section className="how-section" id="how">
          <div className="section-heading"><h2>One request.<br/>One clear answer.</h2></div>
          <p className="section-intro">From posting a load to a confirmed truck in three simple steps, for both customers and truck owners.</p>
          <div className="steps-grid">{features.map((feature) => <article key={feature.number}><div className="step-head"><i className="step-head-icon"><Icon name={feature.icon}/></i><span>{feature.number}</span></div><h3>{feature.title}</h3><p>{feature.copy}</p><ul className="step-points">{feature.points.map((point) => <li key={point}><b aria-hidden="true">✓</b>{point}</li>)}</ul></article>)}</div>
        </section>

        <section className="platform-section" id="platform">
          <div className="platform-phone">
            <div className="phone-top product-phone-top"><button aria-label="Open menu"><Icon name="menu"/></button><div className="phone-brand"><span>F24</span><div><strong>Fares24x7</strong><small>Fleet workspace</small></div></div><button className="phone-bell" aria-label="Notifications"><Icon name="bell"/><b>2</b></button></div>
            <label className="phone-search product-phone-search"><Icon name="search"/><input aria-label="Search workspace" placeholder="Search fleet, loads or locations"/></label>
            <div className="phone-heading product-phone-heading"><h3>Good afternoon, Rajesh</h3><p>Review customer requests and accept the work that suits you.</p></div>
            <div className="phone-quick-heading"><small>Quick actions</small><strong>What would you like to do?</strong></div>
            <div className="phone-quick-actions"><article><span><Icon name="truck"/></span><div><strong>Add vehicle</strong><small>Add a vehicle and its documents</small></div><Icon name="chevron"/></article><article><span><Icon name="inbox"/></span><div><strong>Customer requests</strong><small>Accept or reject incoming work</small></div><Icon name="chevron"/></article></div>
            <div className="phone-metrics"><article className="highlight"><span><Icon name="inbox"/></span><div><small>Pending requests</small><strong>3</strong><em>Need a response</em></div></article><article><span><Icon name="package"/></span><div><small>Accepted requests</small><strong>1</strong><em>Confirmed by owners</em></div></article><article><span><Icon name="truck"/></span><div><small>My vehicles</small><strong>4</strong><em>3 available</em></div></article><article><span><Icon name="route"/></span><div><small>On the road</small><strong>1</strong><em>Currently moving</em></div></article></div>
            <nav className="phone-bottom-nav" aria-label="Preview app navigation"><span className="active"><Icon name="overview"/><small>Home</small></span><span><Icon name="truck"/><small>Vehicles</small></span><span><Icon name="inbox"/><small>Requests</small></span><span><Icon name="building"/><small>Profile</small></span></nav>
          </div>
          <div className="platform-copy"><span className="landing-eyebrow"><i/> One clear workspace</span><h2>Post, review and respond.</h2><p>Fares24x7 keeps truck requests in one simple view so customers and truck owners always know what happens next.</p><ul><li><span>✓</span> Simple truck request form</li><li><span>✓</span> Instant owner notification</li><li><span>✓</span> Clear accept or reject response</li></ul><button className="hero-primary" onClick={onLogin}>Explore the platform <Icon name="arrow"/></button></div>
        </section>

        <section className="about-section" id="about">
          <div className="about-intro">
            <div className="about-head"><span className="landing-eyebrow"><i/> About Fares24x7</span><h2>No truck should<br/>return empty.</h2></div>
            <div className="about-story">
              <article><span className="about-label">The problem</span><p>Across India, thousands of trucks finish a delivery and drive back empty, burning fuel and earning nothing. Businesses on that same route struggle to find a reliable truck at a fair price.</p></article>
              <article><span className="about-label">What we do</span><p>Fares24x7 connects the two. Businesses post their loads, truck owners already heading that way accept them, and an empty return becomes a paid trip.</p></article>
            </div>
          </div>
          <div className="about-pillars">
            <article><span><Icon name="building"/></span><strong>Verified network</strong><p>Businesses pass GST and PAN checks. Every truck carries RC, insurance, fitness and PUC documents.</p></article>
            <article><span><Icon name="route"/></span><strong>Built for return loads</strong><p>Requests reach owners whose trucks are already near the pickup or heading to the destination.</p></article>
            <article><span><Icon name="inbox"/></span><strong>Simple by design</strong><p>One request, one clear answer. No middlemen and no endless phone calls.</p></article>
          </div>
        </section>

        <section className="landing-cta"><div><span>Ready to move your goods?</span><h2>Post your first truck request.</h2></div><div><button className="cta-light" onClick={onSignup}>Create account <Icon name="arrow"/></button><button className="cta-dark" onClick={onLogin}>Log in</button></div></section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-top">
            <div className="site-footer-brand">
              <a className="landing-brand" href="#top" aria-label="Fares24x7 home"><span>F24</span><strong>Fares24x7.</strong></a>
              <p>Simple truck requests for Indian transport businesses. Post a load, get a clear answer, move.</p>
              <a className="site-footer-mail" href="mailto:support@fares24x7.com"><Icon name="inbox"/> support@fares24x7.com</a>
            </div>
            <nav className="site-footer-cols" aria-label="Footer">
              <div><h4>Product</h4><a href="#how">How it works</a><a href="#platform">Platform</a><a href="#about">About</a></div>
              <div><h4>Get started</h4><button type="button" onClick={onSignup}>I need trucks</button><button type="button" onClick={onSignup}>I own trucks</button><button type="button" onClick={onLogin}>Log in</button></div>
              <div><h4>Company</h4><a href="mailto:support@fares24x7.com">Contact</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></div>
            </nav>
          </div>
          <div className="site-footer-bottom">
            <span>© 2026 Fares24x7. All rights reserved.</span>
            <span>Built in India for Indian transport businesses</span>
            <a href="#top" className="site-footer-top-link">Back to top <span>↑</span></a>
          </div>
        </div>
        <div className="site-footer-wordmark" aria-hidden="true">Fares24x7</div>
      </footer>
    </div>
  );
}
