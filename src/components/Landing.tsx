import { Icon } from './Icon';
import { HeroWalkthrough } from './ProductMockups';
import { LanguageSwitcher, useT } from '../lib/i18n';

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


const faqs = [
  ['How do I book a truck on Fares24x7?', 'Create a free account, post your load with the pickup city, delivery city, goods, weight and date. Truck owners with an available truck on that route are alerted and can accept it. You are notified as soon as one does, with the truck and owner details.'],
  ['Is Fares24x7 a transport broker?', "No. Fares24x7 connects businesses that need trucks directly with truck owners and transporters. You see each other's contact details once a trip is accepted and agree the final price directly, without middlemen."],
  ['How are truck owners and businesses verified?', 'Businesses submit GST and PAN details for review, and every truck carries RC, insurance, fitness and PUC documents. Trading opens only after the KYC review is approved.'],
  ['What are return loads?', 'After a delivery many trucks drive back empty. Return loads are bookings on that way back, so the truck owner earns on both legs and the customer gets a truck that is already heading their way.'],
  ['Can I book a full truck or a part load?', 'Yes. When posting a request you can choose a full truck (FTL) or a shared, part truck load (PTL).'],
  ['How do I know my goods were delivered?', 'Every trip shows Confirmed, Picked up, In transit and Delivered. The transporter needs your 4-digit delivery code to mark it delivered, and you can also confirm receipt yourself.'],
] as const;

export function Landing({ onLogin, onSignup }: LandingProps) {
  const { t } = useT();
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#top" aria-label="Fares24x7 home"><span>F24</span><strong>Fares24x7.</strong></a>
        <nav aria-label="Main navigation"><a href="#how">{t('How it works')}</a><a href="#platform">{t('Platform')}</a><a href="#about">{t('About')}</a></nav>
        <div className="landing-auth"><LanguageSwitcher/><button className="login-link" onClick={onLogin}>{t('Log in')}</button><button className="signup-button" onClick={onSignup}>{t('Sign up')} <Icon name="arrow"/></button></div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="landing-eyebrow"><i/> {t('Simple truck booking')}</span>
            <h1>{t('Need a truck?')}<br/>{t('Send one')} <em>{t('request.')}</em></h1>
            <p>{t('Customers post what they need. Truck owners review the request and either accept or reject it. That is the whole process.')}</p>
          </div>
          <div className="hero-visual hero-product hero-video" aria-label="Walkthrough: a customer posts a truck request, a truck owner accepts it and the customer tracks the trip">
            <HeroWalkthrough/>
          </div>
          <div className="hero-actions"><button className="hero-primary" onClick={onSignup}>{t('Get started')} <Icon name="arrow"/></button><button className="hero-login" onClick={onLogin}>{t('Log in')}</button><a href="#how">{t('See how it works')} <span>↓</span></a></div>
          <ul className="hero-trust">
              <li><strong>{t('Verified businesses')}</strong><small>{t('GST & PAN reviewed')}</small></li>
              <li><strong>{t('Documented trucks')}</strong><small>{t('RC, insurance & PUC')}</small></li>
              <li><strong>{t('Direct contact')}</strong><small>{t('No middlemen')}</small></li>
            </ul>
        </section>

        <section className="audience-band" aria-label="Who uses Fares24x7">
          <div className="audience-band-inner">
          <p>{t('Built for Indian transport businesses')}</p>
          <ul>
            <li><strong>{t('Fleet owners')}</strong><small>{t('Fill empty return trips')}</small></li>
            <li><strong>{t('Load owners')}</strong><small>{t('Book trucks without brokers')}</small></li>
            <li><strong>{t('Transporters')}</strong><small>{t('Put spare capacity to work')}</small></li>
            <li><strong>{t('Logistics teams')}</strong><small>{t('Track every load in one place')}</small></li>
          </ul>
          </div>
        </section>

        <section className="how-section" id="how">
          <div className="section-heading"><h2>{t('One request.')}<br/>{t('One clear answer.')}</h2></div>
          <p className="section-intro">{t('From posting a load to a confirmed truck in three simple steps, for both customers and truck owners.')}</p>
          <div className="steps-grid">{features.map((feature) => <article key={feature.number}><div className="step-head"><i className="step-head-icon"><Icon name={feature.icon}/></i><span>{feature.number}</span></div><h3>{t(feature.title)}</h3><p>{t(feature.copy)}</p><ul className="step-points">{feature.points.map((point) => <li key={point}><b aria-hidden="true">✓</b>{t(point)}</li>)}</ul></article>)}</div>
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
          <div className="platform-copy"><span className="landing-eyebrow"><i/> {t('One clear workspace')}</span><h2>{t('Post, review and respond.')}</h2><p>{t('Fares24x7 keeps truck requests in one simple view so customers and truck owners always know what happens next.')}</p><ul><li><span>✓</span> {t('Simple truck request form')}</li><li><span>✓</span> {t('Instant owner notification')}</li><li><span>✓</span> {t('Clear accept or reject response')}</li></ul><button className="hero-primary" onClick={onLogin}>{t('Explore the platform')} <Icon name="arrow"/></button></div>
        </section>

        <section className="about-section" id="about">
          <div className="about-intro">
            <div className="about-head"><span className="landing-eyebrow"><i/> {t('About Fares24x7')}</span><h2>{t('No truck should')}<br/>{t('return empty.')}</h2></div>
            <div className="about-story">
              <article><span className="about-label">{t('The problem')}</span><p>{t('Across India, thousands of trucks finish a delivery and drive back empty, burning fuel and earning nothing. Businesses on that same route struggle to find a reliable truck at a fair price.')}</p></article>
              <article><span className="about-label">{t('What we do')}</span><p>{t('Fares24x7 connects the two. Businesses post their loads, truck owners already heading that way accept them, and an empty return becomes a paid trip.')}</p></article>
            </div>
          </div>
          <div className="about-pillars">
            <article><span><Icon name="building"/></span><strong>{t('Verified network')}</strong><p>{t('Businesses pass GST and PAN checks. Every truck carries RC, insurance, fitness and PUC documents.')}</p></article>
            <article><span><Icon name="route"/></span><strong>{t('Built for return loads')}</strong><p>{t('Requests reach owners whose trucks are already near the pickup or heading to the destination.')}</p></article>
            <article><span><Icon name="inbox"/></span><strong>{t('Simple by design')}</strong><p>{t('One request, one clear answer. No middlemen and no endless phone calls.')}</p></article>
          </div>
        </section>

        <section className="faq-section" id="faq" aria-labelledby="faqTitle">
          <div className="faq-head"><span className="landing-eyebrow"><i/> {t('Questions')}</span><h2 id="faqTitle">{t('Frequently asked questions')}</h2><p>{t('Everything about booking trucks and finding return loads on Fares24x7.')} <a href="/truck-booking">{t('See popular truck routes')} →</a></p></div>
          <div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{t(question)}</summary><p>{t(answer)}</p></details>)}</div>
        </section>

        <section className="landing-cta"><div><span>{t('Ready to move your goods?')}</span><h2>{t('Post your first truck request.')}</h2></div><div><button className="cta-light" onClick={onSignup}>{t('Create account')} <Icon name="arrow"/></button><button className="cta-dark" onClick={onLogin}>{t('Log in')}</button></div></section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-top">
            <div className="site-footer-brand">
              <a className="landing-brand" href="#top" aria-label="Fares24x7 home"><span>F24</span><strong>Fares24x7.</strong></a>
              <p>{t('Simple truck requests for Indian transport businesses. Post a load, get a clear answer, move.')}</p>
              <a className="site-footer-mail" href="mailto:support@fares24x7.com"><Icon name="inbox"/> support@fares24x7.com</a>
            </div>
            <nav className="site-footer-cols" aria-label="Footer">
              <div><h4>{t('Product')}</h4><a href="#how">{t('How it works')}</a><a href="/truck-booking">{t('Truck routes')}</a><a href="#faq">{t('FAQ')}</a><a href="#about">{t('About')}</a></div>
              <div><h4>{t('Get started')}</h4><button type="button" onClick={onSignup}>{t('I need trucks')}</button><button type="button" onClick={onSignup}>{t('I own trucks')}</button><button type="button" onClick={onLogin}>{t('Log in')}</button></div>
              <div><h4>{t('Company')}</h4><a href="mailto:support@fares24x7.com">{t('Contact')}</a><a href="/privacy">{t('Privacy Policy')}</a><a href="/terms">{t('Terms of Service')}</a></div>
            </nav>
          </div>
          <div className="site-footer-bottom">
            <span>{t('© 2026 Fares24x7. All rights reserved.')}</span>
            <span>{t('Built in India for Indian transport businesses')}</span>
            <a href="#top" className="site-footer-top-link">{t('Back to top')} <span>↑</span></a>
          </div>
        </div>
        <div className="site-footer-wordmark" aria-hidden="true">Fares24x7</div>
      </footer>
    </div>
  );
}
