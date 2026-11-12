import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useT } from '../lib/i18n';

/** Renders children at a fixed design size and scales them to fit the container. */
function Scaled({ width, height, children, className }: { width: number; height: number; children: ReactNode; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const fit = () => setScale(Math.min(element.clientWidth / width, element.clientHeight / height));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);
  return <div ref={host} className={`pm-scaled ${className ?? ''}`} aria-hidden="true">
    <div className="pm-scaled-inner" style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}>{children}</div>
  </div>;
}

/** Scene timeline (milliseconds). Scenes are drawn at 680 x 380 and scaled. */
const SCENES = [
  { caption: 'Customer posts a truck request', who: 'Customer', duration: 11500 },
  { caption: 'Truck owners on the route are alerted', who: 'Truck owner', duration: 7600 },
  { caption: 'An owner reviews and accepts the trip', who: 'Truck owner', duration: 8400 },
  { caption: 'Customer sees the confirmed truck and tracks the trip', who: 'Customer', duration: 9000 },
] as const;
const TOTAL = SCENES.reduce((sum, scene) => sum + scene.duration, 0);
const TICK = 50;

/** Phones get a narrower scene layout so text stays readable. */
function useNarrow() {
  const query = '(max-width: 700px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const change = () => setNarrow(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return narrow;
}

function useReducedMotion() {
  const [reduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  return reduced;
}

const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const typed = (text: string, t: number, start: number, perChar = 60) => text.slice(0, Math.max(0, Math.floor((t - start) / perChar)));

/** Hero: a short, looping "video" of the product flow with play/pause, captions and chapter progress. */
export function HeroWalkthrough() {
  const reduced = useReducedMotion();
  const narrow = useNarrow();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);

  // Pause while scrolled out of view.
  useEffect(() => {
    const element = host.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    const id = window.setInterval(() => setTime((current) => (current + TICK) % TOTAL), TICK);
    return () => window.clearInterval(id);
  }, [playing, visible]);

  let start = 0;
  let index = 0;
  for (let i = 0; i < SCENES.length; i++) {
    if (time < start + SCENES[i]!.duration) { index = i; break; }
    start += SCENES[i]!.duration;
  }
  const t = time - start;
  const scene = SCENES[index]!;
  const sceneStart = (i: number) => SCENES.slice(0, i).reduce((sum, s) => sum + s.duration, 0);

  return <div className={`wt-window ${narrow ? 'phone' : ''}`} ref={host}>
    {narrow && <div className="wt-statusbar"><span>9:41</span><i className="wt-notch"/><span className="wt-status-icons"><b/><b/><b/><b/><em/></span></div>}
    <div className="wt-titlebar">{!narrow && <><i/><i/><i/></>}<p className="wt-caption" aria-live="polite"><span>{index + 1}/{SCENES.length}</span><b>{scene.caption}</b></p><em><b/> {scene.who} view</em></div>
    <div className="wt-stage">
      <Scaled width={narrow ? 300 : 680} height={narrow ? 470 : 380} className={`wt-scaled ${narrow ? 'narrow' : ''}`}>
        <div key={index} className="wt-scene">
          {index === 0 && <ScenePost t={t}/>}
          {index === 1 && <SceneAlert t={t}/>}
          {index === 2 && <SceneAccept t={t}/>}
          {index === 3 && <SceneTrack t={t}/>}
        </div>
      </Scaled>
    </div>
    <div className="wt-controls">
      <button type="button" className="wt-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}>
        {playing ? <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          : <svg viewBox="0 0 24 24"><path d="M7 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L8.5 4.64A1 1 0 0 0 7 5.5z"/></svg>}
      </button>
      <div className="wt-chapters">{SCENES.map((s, i) => {
        const fill = i < index ? 1 : i > index ? 0 : t / s.duration;
        return <button key={s.caption} type="button" onClick={() => setTime(sceneStart(i))} aria-label={`Step ${i + 1}: ${s.caption}`} title={s.caption}>
          <span style={{ transform: `scaleX(${fill})` }}/>
        </button>;
      })}</div>
      <span className="wt-time">{clock(time)} / {clock(TOTAL)}</span>
    </div>
  </div>;
}

/** Check mark that draws itself. */
function DrawCheck({ className }: { className?: string }) {
  return <svg className={`wt-draw-check ${className ?? ''}`} viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>;
}

const BURST_COLORS = ['#ffa51f', '#16a36f', '#2859c5', '#ffcf5c', '#ff7a45', '#7c5cff'];
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  angle: i * 22.5 + (i % 2 ? 8 : 0),
  distance: 118 + (i % 3) * 26,
  color: BURST_COLORS[i % BURST_COLORS.length]!,
  shape: i % 3 === 0 ? 'bar' : i % 3 === 1 ? 'dot' : 'spark',
  delay: (i % 4) * 40,
}));

const CELEBRATE_ICONS = {
  thumb: <svg viewBox="0 0 24 24"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>,
  bell: <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  check: <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>,
};

/** Full-screen success moment: bouncy icon, particle burst and a message. */
function Celebrate({ show, icon, tone, title, sub }: { show: boolean; icon: keyof typeof CELEBRATE_ICONS; tone: 'orange' | 'green'; title: string; sub: string }) {
  if (!show) return null;
  return <div className={`wt-celebrate ${tone}`}>
    <div className="wt-celebrate-core">
      <i className="wt-celebrate-ring"/><i className="wt-celebrate-ring r2"/>
      {PARTICLES.map((p, i) => <i key={i} className={`wt-particle ${p.shape}`} style={{ ['--a' as string]: `${p.angle}deg`, ['--d' as string]: `${p.distance}px`, ['--c' as string]: p.color, animationDelay: `${120 + p.delay}ms` }}/>)}
      <span className="wt-celebrate-icon">{CELEBRATE_ICONS[icon]}</span>
    </div>
    <strong>{title}</strong>
    <small>{sub}</small>
  </div>;
}

/**
 * Pointer that glides to a real element in the scene (matched by data-cursor="name"),
 * so it lands accurately whatever the layout or screen size. "rest" parks it bottom-right.
 */
function Cursor({ target, pressed }: { target: string; pressed?: boolean }) {
  const self = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [placed, setPlaced] = useState(false);
  useEffect(() => { if (pos && !placed) { const id = requestAnimationFrame(() => setPlaced(true)); return () => cancelAnimationFrame(id); } }, [pos, placed]);
  useLayoutEffect(() => {
    const scene = self.current?.closest('.wt-scene') as HTMLElement | null;
    if (!scene) return;
    const sceneRect = scene.getBoundingClientRect();
    const scale = sceneRect.width / scene.offsetWidth || 1;
    const element = target === 'rest' ? null : scene.querySelector(`[data-cursor="${target}"]`);
    if (!element) { setPos({ x: scene.offsetWidth - 70, y: scene.offsetHeight - 54 }); return; }
    const rect = element.getBoundingClientRect();
    setPos({ x: (rect.left + rect.width * 0.62 - sceneRect.left) / scale, y: (rect.top + rect.height * 0.55 - sceneRect.top) / scale });
  }, [target]);
  return <div ref={self} className={`wt-cursor ${pressed ? 'pressed' : ''} ${pos ? '' : 'hidden'}`} style={pos ? { transform: `translate(${pos.x}px, ${pos.y}px)`, transition: placed ? undefined : 'none' } : undefined}>
    <svg viewBox="0 0 24 24"><path d="M5 3l14 7.5-6.2 1.6L9.6 18z"/></svg>
  </div>;
}

/** 1 · Customer clicks the first field, tabs through the form, then posts it. */
const FORM_FIELDS: Array<[string, string]> = [
  ['Pickup city', 'Vadodara'], ['Delivery city', 'Pune'], ['Goods', 'Textiles'],
  ['Weight', '12 tonnes'], ['Truck needed', 'Full truck'], ['Pickup date', '14 Nov 2026'],
];
const FIELD_START = 1700;
const FIELD_STEP = 800;

function ScenePost({ t }: { t: number }) {
  const formDone = FIELD_START + FORM_FIELDS.length * FIELD_STEP;
  const hoverPost = t > 7300;
  const pressed = t > 7700 && t < 7950;
  const sending = t >= 7950 && t < 8700;
  const posted = t >= 8700;
  const target = t < 600 ? 'rest' : t < formDone ? 'field-0' : t < 9000 ? 'post' : 'rest';
  return <div className="wt-center">
    <div className="pm-card wt-card wt-form">
      <header><strong>Request a truck</strong><small>Customer · Mehta Textiles</small></header>
      <div className="pm-form-grid">{FORM_FIELDS.map(([label, value], index) => {
        const at = FIELD_START + index * FIELD_STEP;
        const shown = typed(value, t, at);
        const active = t >= at - 150 && t < at + FIELD_STEP - 100 && t < formDone;
        return <label key={label} data-cursor={`field-${index}`} className={active ? 'active' : ''}><small>{label}</small><span>{shown || ' '}{active && <i className="wt-caret"/>}</span></label>;
      })}</div>
      <div className="wt-submit-wrap">
        {posted && <><i className="wt-ripple"/><i className="wt-ripple r2"/><i className="wt-ripple r3"/></>}
        <div data-cursor="post" className={`pm-form-submit ${hoverPost && !sending && !posted ? 'hover' : ''} ${pressed ? 'pressed' : ''} ${sending ? 'sending' : ''} ${posted ? 'posted' : ''}`}>
          {posted ? <><DrawCheck/> Request #F24-1008 posted</> : sending ? <><i className="wt-spinner"/> Posting…</> : <>Post request <Icon name="arrow"/></>}
        </div>
      </div>
      <p className={`wt-broadcast ${posted ? 'show' : ''}`}><span className="wt-live-dot"/> Alerting truck owners on this route<b className="wt-dots"><i/><i/><i/></b></p>
    </div>
    <Cursor target={target} pressed={(t > 1350 && t < 1600) || pressed}/>
    <Celebrate show={t > 9200 && t < 11300} icon="thumb" tone="orange" title="Request posted!" sub="Truck owners on this route are being alerted"/>
  </div>;
}

/** 2 · The owner is alerted, the request appears and the owner opens it. */
function SceneAlert({ t }: { t: number }) {
  const ringing = t > 900;
  const arrived = t > 3700;
  const hoverRow = t > 5600;
  const pressed = t > 6500 && t < 6750;
  const rows = [
    { route: 'Surat → Nashik', date: '15 Nov', load: '8 t', goods: 'Machinery', budget: '₹28,500', status: 'new', label: 'Awaiting reply' },
    { route: 'Ahmedabad → Mumbai', date: '15 Nov', load: '16 t', goods: 'FMCG cartons', budget: '₹38,000', status: 'transit', label: 'In transit' },
  ];
  return <div className="wt-center">
    <div className="pm-card wt-card wt-list">
      <header><div><small>Sharma Roadways · Truck owner</small><strong>Customer requests</strong></div>
        <div className="wt-head-actions"><span key={arrived ? 'b' : 'a'} className={`pm-pill-muted ${arrived ? 'wt-bump' : ''}`}>{arrived ? '2' : '1'} need a reply</span>
          <span className={`wt-bell ${ringing ? 'ring' : ''}`}><Icon name="bell"/>{ringing && <b/>}</span></div></header>
      <div className="pm-table">
        <div className="pm-row pm-head"><span>Route</span><span>Load</span><span>Budget</span><span>Status</span></div>
        {arrived && <div data-cursor="row" className={`pm-row selected wt-row-in wt-sweep ${hoverRow ? 'hover' : ''} ${pressed ? 'pressed-row' : ''}`}>
          <span><strong>Vadodara → Pune</strong><small>Pickup 14 Nov</small></span><span><strong>12 t</strong><small>Textiles</small></span>
          <span><strong>₹45,000</strong><small>Full truck</small></span><span><em className="pm-status new">New</em></span>
        </div>}
        {rows.map((row) => <div key={row.route} className="pm-row">
          <span><strong>{row.route}</strong><small>Pickup {row.date}</small></span><span><strong>{row.load}</strong><small>{row.goods}</small></span>
          <span><strong>{row.budget}</strong><small>Full truck</small></span><span><em className={`pm-status ${row.status}`}>{row.label}</em></span>
        </div>)}
      </div>
    </div>
    <Cursor target={t > 4800 ? 'row' : 'rest'} pressed={pressed}/>
    <Celebrate show={t > 1300 && t < 3400} icon="bell" tone="orange" title="New request on your route!" sub="Vadodara → Pune · 12 t · ₹45,000"/>
  </div>;
}

/** 3 · The owner picks a truck and accepts. */
function SceneAccept({ t }: { t: number }) {
  const choosePress = t > 2000 && t < 2250;
  const chosen = t >= 2250;
  const hoverAccept = t > 3700;
  const pressed = t > 4300 && t < 4550;
  const done = t >= 4550;
  const target = t < 900 ? 'rest' : t < 3000 ? 'truck' : 'accept';
  return <div className="wt-center">
    <div className="pm-card wt-card wt-accept">
      {!done ? <>
        <small className="pm-eyebrow">Request #F24-1008</small>
        <h4>Can you take this trip?</h4>
        <div className="wt-accept-grid">
          <div>
            <div className="pm-route"><div><small>Pickup</small><strong>Vadodara</strong></div><Icon name="arrow"/><div><small>Delivery</small><strong>Pune</strong></div></div>
            <div className="pm-facts">
              <div><small>Goods</small><strong>Textiles</strong></div><div><small>Weight</small><strong>12 tonnes</strong></div>
              <div><small>Pickup</small><strong>14 Nov</strong></div><div><small>Budget</small><strong>₹45,000</strong></div>
            </div>
          </div>
          <div>
            <small className="pm-label">Choose a truck</small>
            <div data-cursor="truck" className={`pm-truck-choice ${chosen ? '' : 'idle'} ${choosePress ? 'pressed' : ''}`}><i/><div><strong>GJ06 CE 2478</strong><small>32 ft · Multi axle · 16 t</small></div><em>Best match</em></div>
            <div className="pm-phone-actions"><span>Not for me</span><span data-cursor="accept" className={`primary ${hoverAccept ? 'hover' : ''} ${pressed ? 'pressed' : ''}`}>Accept request</span></div>
          </div>
        </div>
      </> : <div className="wt-success">
        <span><i className="wt-burst"/><DrawCheck/></span>
        <small className="pm-eyebrow">Request confirmed</small>
        <h4>You’ve accepted the trip</h4>
        <p>Vadodara → Pune with GJ06 CE 2478. The customer has been notified and can now see your contact details.</p>
      </div>}
    </div>
    {!done && <Cursor target={target} pressed={choosePress || pressed}/>}
    <Celebrate show={t > 5200 && t < 7300} icon="thumb" tone="green" title="Trip accepted!" sub="The customer is notified instantly"/>
  </div>;
}

/** 4 · The customer sees the truck, driver and live trip status. */
function SceneTrack({ t }: { t: number }) {
  const stage = t < 4800 ? 0 : t < 6800 ? 1 : 2;
  const steps = ['Confirmed', 'Picked up', 'In transit', 'Delivered'];
  return <div className="wt-center">
    <div className="pm-card wt-card pm-trip wt-track">
      <header><div><small>Trip #F24-1008 · Customer</small><strong>Vadodara → Pune</strong></div><em key={stage} className={`pm-status wt-bump ${stage === 2 ? 'transit' : 'accepted'}`}>{steps[stage]}</em></header>
      <div className="pm-carrier wt-reveal"><span><Icon name="truck"/></span><div><strong>GJ06 CE 2478 · Sharma Roadways</strong><small>Driver: Ramesh Patel · +91 98765 43210</small></div></div>
      <ol className="pm-timeline">{steps.map((label, i) => <li key={label} className={i < stage ? 'done' : i === stage ? 'current' : ''}><i>{i === stage && <b key={stage} className="wt-dot-pulse"/>}</i><span>{label}</span></li>)}</ol>
      <div className="wt-eta"><span><small>Picked up</small><strong>{stage >= 1 ? '14 Nov, 9:40 am' : '—'}</strong></span><span><small>Agreed price</small><strong>₹44,000</strong></span><span><small>Expected delivery</small><strong>15 Nov</strong></span></div>
    </div>
    <Celebrate show={t > 1200 && t < 3300} icon="check" tone="green" title="Truck confirmed!" sub="Sharma Roadways will carry your load"/>
  </div>;
}

// ---------------------------------------------------------------------------
// Login / sign-up panel: looping "button pressed → thumbs up" animation
// ---------------------------------------------------------------------------

function useLoop(length: number, playing: boolean) {
  const [state, setState] = useState({ t: 0, round: 0 });
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setState((current) => current.t + TICK >= length ? { t: 0, round: current.round + 1 } : { t: current.t + TICK, round: current.round }), TICK);
    return () => window.clearInterval(id);
  }, [playing, length]);
  return state;
}

const AUTH_PHRASES = {
  login: [['Log in to your', 'dashboard.'], ['Your trips are', 'waiting.'], ['Welcome back,', 'partner.']],
  signup: [['Create your', 'account.'], ['Start getting', 'return loads.'], ['Your trucks,', 'always earning.']],
} as const;
const TYPE_MS = 55;

/** One round: a phrase writes itself, the button is pressed, a thumbs-up bursts out, the phrase erases. */
function AuthRound({ mode, phrase, t }: { mode: 'login' | 'signup'; phrase: readonly [string, string]; t: number }) {
  const { t: tr } = useT();
  const full = `${tr(phrase[0])}\n${tr(phrase[1])}`;
  const typedEnd = 250 + full.length * TYPE_MS;
  const eraseStart = 7000;
  const count = t < eraseStart ? Math.max(0, Math.min(full.length, Math.floor((t - 250) / TYPE_MS))) : Math.max(0, full.length - Math.floor((t - eraseStart) / 22));
  const shown = full.slice(0, count);
  const [line1, line2 = ''] = shown.split('\n');
  const hover = t > 3200 && t < 3700;
  const pressed = t >= 3700 && t < 3950;
  const sending = t >= 3950 && t < 4650;
  const done = t >= 4650 && t < eraseStart;
  const label = mode === 'login' ? 'Log in' : 'Create account';
  return <div className="al-round">
    <p className="al-text">{line1}{shown.includes('\n') && <><br/><em>{line2}</em></>}<i className={`al-caret ${count >= full.length && t < eraseStart ? 'idle' : ''}`}/></p>
    <div className="al-action">
      <div data-cursor="button" className={`al-button ${hover ? 'hover' : ''} ${pressed ? 'pressed' : ''} ${sending ? 'sending' : ''} ${done ? 'done' : ''}`}>
        {done ? <><DrawCheck/> {tr(mode === 'login' ? 'Signed in' : 'Created')}</> : sending ? <><i className="wt-spinner"/> {tr(mode === 'login' ? 'Signing in' : 'Creating')}</> : <>{tr(label)} <Icon name="arrow"/></>}
      </div>
      {t > 4700 && t < 6900 && <div className={`al-burst ${mode === 'login' ? 'green' : 'orange'}`}>
        <i className="wt-celebrate-ring"/><i className="wt-celebrate-ring r2"/>
        {PARTICLES.map((p, index) => <i key={index} className={`wt-particle ${p.shape}`} style={{ ['--a' as string]: `${p.angle}deg`, ['--d' as string]: `${p.distance * 0.72}px`, ['--c' as string]: p.color, animationDelay: `${80 + p.delay}ms` }}/>)}
        <span className="al-thumb">{CELEBRATE_ICONS.thumb}</span>
      </div>}
    </div>
    <Cursor target={t > typedEnd - 400 && t < 5200 ? 'button' : 'rest'} pressed={pressed}/>
  </div>;
}

/** Login / sign-up panel animation: writing, a button press and a thumbs-up, looping through phrases. */
export function AuthLoop({ mode }: { mode: 'login' | 'signup' }) {
  const reduced = useReducedMotion();
  const { t, round } = useLoop(7800, !reduced);
  const phrases = AUTH_PHRASES[mode];
  const phrase = phrases[round % phrases.length]!;
  return <div className="auth-loop" aria-hidden="true">
    <div key={`${mode}-${round}`} className="wt-scene al-scene"><AuthRound mode={mode} phrase={phrase} t={reduced ? 6000 : t}/></div>
  </div>;
}
