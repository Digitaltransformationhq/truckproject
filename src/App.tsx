import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { Landing } from './components/Landing';
import { AuthModal, type AuthMode } from './components/AuthModal';
import { Icon, type IconName } from './components/Icon';
import { MatchRow } from './components/MatchRow';
import { seedData } from './data/seed';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateMatches, formatDate } from './lib/matching';
import type { Load, LoadType, PortalData, ReturnMatch, Truck, TruckStatus, ViewName } from './types';

const STORE_KEY = 'returnrun-phase1-v2';
const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase();
const statusClass = (value: string) => value.toLowerCase().replaceAll(' ', '-');
const todayLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

interface SidebarProps {
  view: ViewName;
  counts: { trucks: number; loads: number; matches: number };
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewName) => void;
  onLogout: () => void;
}

function Sidebar({ view, counts, open, onClose, onNavigate, onLogout }: SidebarProps) {
  const items: Array<{ view?: ViewName; label: string; icon: IconName; count?: number; disabled?: boolean }> = [
    { view: 'dashboard', label: 'Overview', icon: 'overview' },
    { view: 'trucks', label: 'My trucks', icon: 'truck', count: counts.trucks },
    { view: 'loads', label: 'Loads', icon: 'package', count: counts.loads },
    { view: 'matches', label: 'Return matches', icon: 'route', count: counts.matches },
  ];
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark">RR</span><span>ReturnRun<small>Fleet platform</small></span></div>
      <button className="mobile-close" onClick={onClose} aria-label="Close menu"><Icon name="close" /></button>
      <nav>
        <p className="nav-label">Fleet operations</p>
        {items.map((item) => (
          <button key={item.label} className={`nav-item ${item.view === view ? 'active' : ''}`} onClick={() => item.view && onNavigate(item.view)}>
            <span><Icon name={item.icon} /></span>{item.label}
            {item.count !== undefined && <b className={item.view === 'matches' ? 'accent-count' : ''}>{item.count}</b>}
          </button>
        ))}
        <p className="nav-label">Business</p>
        <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}><span><Icon name="building" /></span>Business profile</button>
        <button className="nav-item disabled" title="Planned for Phase 2" disabled><span><Icon name="inbox" /></span>Enquiries <em>Phase 2</em></button>
      </nav>
      <div className="phase-card"><span>Network status</span><strong>All systems operational</strong><div><i/></div><small><b/> Last synced just now</small></div>
      <div className="sidebar-user"><div className="avatar">RS</div><div><strong>Rajesh Sharma</strong><span>Transport owner</span></div><button onClick={onLogout} title="Sign out"><Icon name="logout" /></button></div>
    </aside>
  );
}

interface TopbarProps {
  onMenu: () => void;
  onPostLoad?: () => void;
  onSearch: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

function Topbar({ onMenu, onSearch, searchRef }: TopbarProps) {
  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <div className="search-box"><span><Icon name="search" /></span><input ref={searchRef} onChange={(event) => onSearch(event.target.value)} placeholder="Search fleet, loads or locations" aria-label="Global search"/><kbd>Ctrl K</kbd></div>
      <div className="top-actions"><button className="support-btn" title="Support"><Icon name="headset"/><span>Support</span></button><button className="icon-btn" title="Notifications"><Icon name="bell"/><i/></button></div>
    </header>
  );
}

interface PageHeadProps { section: string; title: string; description: string; actions?: ReactNode; }
function PageHead({ section, title, description, actions }: PageHeadProps) {
  return <div className="page-head"><div><p className="breadcrumb">{section} <span className="date-separator">/</span> {todayLabel}</p><h1>{title}</h1><p>{description}</p></div>{actions}</div>;
}

function Dashboard({ data, matches, onOpenModal, onNavigate }: { data: PortalData; matches: ReturnMatch[]; onOpenModal: (type: 'truck' | 'load') => void; onNavigate: (view: ViewName) => void }) {
  const openLoads = data.loads.filter(({ status }) => status === 'Open');
  const available = data.trucks.filter(({ status }) => status === 'Available');
  const cities = new Set(openLoads.flatMap(({ origin, destination }) => [origin, destination])).size;
  const savings = (matches.reduce((total, match) => total + match.score * 620, 0) / 1000).toFixed(1);
  const activities: Array<[IconName, string, string]> = [
    ['route', `${matches.length} return matches identified`, 'Just now'],
    ['package', `${openLoads[0]?.material ?? 'New load'} available on ${openLoads[0]?.origin ?? 'the network'} route`, '12 minutes ago'],
    ['truck', `${available[0]?.registration ?? 'Fleet'} marked available`, '35 minutes ago'],
    ['overview', 'Fleet data synced successfully', 'Today, 09:15'],
  ];
  const corridors: Array<[string, number]> = [['Ahmedabad → Chennai', 82], ['Chennai → Ahmedabad', 71], ['Bengaluru → Chennai', 58]];

  return <section className="view active">
    <PageHead section="Operations control room" title={`${greeting}, Rajesh`} description="Here is what is happening across your transport network today." actions={<div className="head-actions"><button className="secondary-btn" onClick={() => onOpenModal('truck')}>+ Add truck</button><button className="primary-btn" onClick={() => onOpenModal('load')}>Post a load</button></div>}/>
    <div className="metric-grid">
      <article className="metric"><div className="metric-icon"><Icon name="truck"/></div><div><span>Available trucks</span><strong>{available.length}</strong><small><b>1 added</b> since yesterday</small></div></article>
      <article className="metric"><div className="metric-icon"><Icon name="package"/></div><div><span>Open loads</span><strong>{openLoads.length}</strong><small>Across <b>{cities} cities</b></small></div></article>
      <article className="metric highlight"><div className="metric-icon"><Icon name="route"/></div><div><span>Return matches</span><strong>{matches.length}</strong><small><b>High potential</b> right now</small></div><span className="metric-arrow"><Icon name="arrow"/></span></article>
      <article className="metric"><div className="metric-icon"><Icon name="wallet"/></div><div><span>Potential saving</span><strong>₹{savings}K</strong><small>Estimated this week</small></div></article>
    </div>
    <section className="fleet-map-panel">
      <div className="fleet-map-copy">
        <div className="panel-title-row"><div><span className="section-kicker">Live fleet view</span><h2>Vehicles across your network</h2></div><button className="map-link" onClick={() => onNavigate('trucks')}>View all vehicles <Icon name="chevron"/></button></div>
        <div className="vehicle-statuses">
          <button className="vehicle-status active"><i className="running"/><span><strong>{available.length}</strong>Available</span></button>
          <button className="vehicle-status"><i className="moving"/><span><strong>{data.trucks.filter(({ status }) => status === 'In transit').length}</strong>In transit</span></button>
          <button className="vehicle-status"><i className="offline"/><span><strong>{data.trucks.filter(({ status }) => status === 'Unavailable').length}</strong>Unavailable</span></button>
        </div>
        <div className="vehicle-quick-list">{data.trucks.slice(0, 3).map((truck) => <button key={truck.id} onClick={() => onNavigate('trucks')}><span className="vehicle-icon"><Icon name="truck"/></span><span><strong>{truck.registration}</strong><small><Icon name="pin"/>{truck.location} · {truck.status}</small></span><Icon name="chevron"/></button>)}</div>
      </div>
      <div className="network-map" aria-label="Illustrated fleet route map">
        <div className="map-grid"/><div className="india-shape">INDIA</div>
        <svg className="route-lines" viewBox="0 0 620 280" preserveAspectRatio="none"><path d="M100 80 C220 30 310 210 510 175"/><path d="M155 220 C260 130 340 95 475 60"/><path d="M100 80 C210 150 340 165 510 175"/></svg>
        <span className="map-pin pin-a"><Icon name="truck"/><b>2</b></span><span className="map-pin pin-b"><Icon name="truck"/></span><span className="map-pin pin-c"><Icon name="truck"/></span><span className="map-pin pin-d"><Icon name="truck"/></span>
        <div className="map-legend"><span><i/> Available</span><span><i/> In transit</span></div>
      </div>
    </section>
    <div className="dashboard-grid">
      <section className="panel matches-panel"><div className="panel-head"><div><h2>Best return-load matches</h2><p>Prioritised by route fit, date and vehicle capacity</p></div><button className="text-link" onClick={() => onNavigate('matches')}>View all →</button></div><div className="match-list">{matches.slice(0, 3).map((match) => <MatchRow key={`${match.truck.id}-${match.load.id}`} match={match} onOpen={() => onNavigate('matches')}/>)}</div></section>
      <aside className="panel activity-panel"><div className="panel-head"><div><h2>Live activity</h2><p>Latest updates</p></div><span className="live-dot">Live</span></div><div className="timeline">{activities.map(([icon, label, time]) => <div className="timeline-item" key={label}><div className="timeline-icon"><Icon name={icon}/></div><div><strong>{label}</strong><span>{time}</span></div></div>)}</div></aside>
    </div>
    <section className="panel route-panel"><div className="panel-head"><div><h2>Active route corridors</h2><p>Where supply and demand are strongest</p></div><button className="filter-chip">Last 7 days⌄</button></div><div className="corridor-list">{corridors.map(([route, demand]) => <div className="corridor" key={route}><div><strong>{route}</strong><span>{Math.round(demand / 8)} loads</span></div><span>{demand}% demand</span><div className="corridor-bar"><i style={{ width: `${demand}%` }}/></div></div>)}</div></section>
  </section>;
}

function TrucksView({ trucks, matches, query, setQuery, status, setStatus, onAdd }: { trucks: Truck[]; matches: ReturnMatch[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void }) {
  const filtered = trucks.filter((truck) => (status === 'all' || truck.status === status) && (!query || Object.values(truck).some((value) => normalise(value).includes(normalise(query)))));
  return <section className="view active"><PageHead section="Workspace / Fleet" title="Truck fleet" description="Manage availability, capacity and preferred return routes." actions={<button className="primary-btn" onClick={onAdd}>Add truck</button>}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration, type or city"/></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option>Available</option><option>In transit</option><option>Unavailable</option></select></div><div className="card-grid">{filtered.map((truck) => <article className="truck-card" key={truck.id}><div className="truck-card-head"><div><div className="truck-badge"><Icon name="truck"/></div><div><h3>{truck.registration}</h3><p>{truck.type}</p></div></div><span className={`status ${statusClass(truck.status)}`}>{truck.status}</span></div><div className="truck-details"><div><span>Capacity</span><strong>{truck.capacity} tonnes</strong></div><div><span>Current location</span><strong>{truck.location}</strong></div><div><span>Preferred return</span><strong>{truck.destination}</strong></div><div><span>Suitable loads</span><strong>{matches.filter((match) => match.truck.id === truck.id).length} matches</strong></div></div><div className="truck-card-foot"><span>Updated today</span><button className="card-menu" title="More options">•••</button></div></article>)}</div></section>;
}

function LoadsView({ loads, query, setQuery, type, setType, onAdd }: { loads: Load[]; query: string; setQuery: (value: string) => void; type: string; setType: (value: string) => void; onAdd: () => void }) {
  const filtered = loads.filter((load) => (type === 'all' || load.type === type) && (!query || Object.values(load).some((value) => normalise(value).includes(normalise(query)))));
  return <section className="view active"><PageHead section="Workspace / Loads" title="Transport requirements" description="Publish and manage loads across your network." actions={<button className="primary-btn" onClick={onAdd}>Post load</button>}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search origin, destination or material"/></div><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">FTL & PTL</option><option>FTL</option><option>PTL</option></select></div><div className="table-wrap"><table><thead><tr><th>Route</th><th>Load</th><th>Type</th><th>Required date</th><th>Status</th><th/></tr></thead><tbody>{filtered.map((load) => <tr key={load.id}><td><strong>{load.origin} → {load.destination}</strong><small>Load #RR{load.id}</small></td><td><strong>{load.material}</strong><small>{load.quantity} tonnes</small></td><td><span className="type-pill">{load.type}</span></td><td>{formatDate(load.date)}</td><td><span className={`status ${statusClass(load.status)}`}>{load.status}</span></td><td><button className="row-action" title="More options">•••</button></td></tr>)}</tbody></table></div></section>;
}

function MatchesView({ matches }: { matches: ReturnMatch[] }) {
  return <section className="view active"><PageHead section="Workspace / Return matches" title="Smart return matches" description="Loads scored against your available trucks and preferred routes."/><div className="match-summary"><div><span>How matching works</span><strong>Origin + destination + capacity + date</strong></div><p>Scores are explainable and refreshed whenever fleet or load details change.</p></div><div className="match-list expanded">{matches.map((match) => <MatchRow key={`${match.truck.id}-${match.load.id}`} match={match} onOpen={() => undefined}/>)}</div></section>;
}

function ProfileView({ onSaved }: { onSaved: () => void }) {
  const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaved(true); onSaved(); };
  return <section className="view active"><PageHead section="Manage / Business profile" title="Business profile" description="Contact and operating information visible across the portal."/><form className="panel profile-form" onSubmit={submit}><div className="profile-banner"><div className="avatar large">RS</div><div><h2>Sharma Roadways</h2><span>Verified transport operator</span></div></div><div className="form-grid"><label>Business name<input name="business" defaultValue="Sharma Roadways" required/></label><label>Contact person<input name="contact" defaultValue="Rajesh Sharma" required/></label><label>Email<input type="email" name="email" defaultValue="rajesh@sharmaroadways.in" required/></label><label>Phone<input name="phone" defaultValue="+91 98765 43210" required/></label><label>Base location<input name="location" defaultValue="Chennai, Tamil Nadu" required/></label><label>GSTIN<input name="gst" defaultValue="33ABCDE1234F1Z5"/></label></div><div className="form-footer"><span>{saved ? 'Profile saved just now' : ''}</span><button className="primary-btn" type="submit">Save changes</button></div></form></section>;
}

interface ModalProps { type: 'truck' | 'load'; onClose: () => void; onAddTruck: (truck: Truck) => void; onAddLoad: (load: Load) => void; }
function EntryModal({ type, onClose, onAddTruck, onAddLoad }: ModalProps) {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const submitTruck = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); onAddTruck({ id: crypto.randomUUID(), registration: String(data.get('registration')), type: String(data.get('type')), capacity: Number(data.get('capacity')), location: String(data.get('location')), destination: String(data.get('destination')), status: data.get('status') as TruckStatus }); };
  const submitLoad = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); onAddLoad({ id: crypto.randomUUID(), origin: String(data.get('origin')), destination: String(data.get('destination')), material: String(data.get('material')), quantity: Number(data.get('quantity')), type: data.get('type') as LoadType, date: String(data.get('date')), status: 'Open' }); };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div className="modal-head"><div><span className="eyebrow">{type === 'truck' ? 'Fleet management' : 'Load marketplace'}</span><h2 id="modalTitle">{type === 'truck' ? 'Add a new truck' : 'Post a transport load'}</h2></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></div>{type === 'truck' ? <form className="modal-form" onSubmit={submitTruck}><div className="form-grid"><label>Registration number<input name="registration" placeholder="TN 01 AB 1234" required autoFocus/></label><label>Vehicle type<select name="type"><option>32 ft Multi Axle</option><option>20 ft Container</option><option>24 ft Single Axle</option><option>14 ft LCV</option></select></label><label>Capacity (tonnes)<input name="capacity" type="number" min="1" max="50" defaultValue="16" required/></label><label>Current location<input name="location" placeholder="Chennai" required/></label><label>Preferred destination<input name="destination" placeholder="Ahmedabad" required/></label><label>Availability<select name="status"><option>Available</option><option>In transit</option><option>Unavailable</option></select></label></div><div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit">Add truck</button></div></form> : <form className="modal-form" onSubmit={submitLoad}><div className="form-grid"><label>Pickup location<input name="origin" placeholder="Ahmedabad" required autoFocus/></label><label>Delivery destination<input name="destination" placeholder="Chennai" required/></label><label>Load / material<input name="material" placeholder="Textiles" required/></label><label>Approx. quantity (tonnes)<input name="quantity" type="number" min="1" max="50" defaultValue="12" required/></label><label>Requirement type<select name="type"><option>FTL</option><option>PTL</option></select></label><label>Required date<input name="date" type="date" defaultValue={tomorrow} required/></label></div><div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit">Publish load</button></div></form>}</div></div>;
}

export default function App() {
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('returnrun-auth') === '1' || demo);
  const [authModal, setAuthModal] = useState<AuthMode | null>(() => {
    const requested = new URLSearchParams(location.search).get('auth');
    return requested === 'login' || requested === 'signup' ? requested : null;
  });
  const [data, setData] = useLocalStorage<PortalData>(STORE_KEY, seedData);
  const [view, setView] = useState<ViewName>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<'truck' | 'load' | null>(null);
  const [truckQuery, setTruckQuery] = useState('');
  const [truckStatus, setTruckStatus] = useState('all');
  const [loadQuery, setLoadQuery] = useState('');
  const [loadType, setLoadType] = useState('all');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => calculateMatches(data.trucks, data.loads), [data]);
  const counts = { trucks: data.trucks.length, loads: data.loads.filter(({ status }) => status === 'Open').length, matches: matches.length };

  const notify = (message: string) => { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 2500); };
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') setModal(null); if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); } }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, []);

  if (!authenticated) {
    const enterWorkspace = () => { localStorage.setItem('returnrun-auth', '1'); setAuthModal(null); setAuthenticated(true); };
    return <><Landing onLogin={() => setAuthModal('login')} onSignup={() => setAuthModal('signup')} />{authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onModeChange={setAuthModal} onComplete={enterWorkspace}/>}</>;
  }
  const navigate = (next: ViewName) => { setView(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const globalSearch = (value: string) => { if (value.length > 1) { setLoadQuery(value); navigate('loads'); } };
  const addTruck = (truck: Truck) => { setData((current) => ({ ...current, trucks: [truck, ...current.trucks] })); setModal(null); notify('Truck added and matching refreshed'); };
  const addLoad = (load: Load) => { setData((current) => ({ ...current, loads: [load, ...current.loads] })); setModal(null); notify('Load published successfully'); };

  return <div className="app-shell"><Sidebar view={view} counts={counts} open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} onLogout={() => { localStorage.removeItem('returnrun-auth'); setAuthenticated(false); }}/><main className="main"><Topbar onMenu={() => setMenuOpen(true)} onPostLoad={() => setModal('load')} onSearch={globalSearch} searchRef={searchRef}/><div className="content">{view === 'dashboard' && <Dashboard data={data} matches={matches} onOpenModal={setModal} onNavigate={navigate}/>} {view === 'trucks' && <TrucksView trucks={data.trucks} matches={matches} query={truckQuery} setQuery={setTruckQuery} status={truckStatus} setStatus={setTruckStatus} onAdd={() => setModal('truck')}/>} {view === 'loads' && <LoadsView loads={data.loads} query={loadQuery} setQuery={setLoadQuery} type={loadType} setType={setLoadType} onAdd={() => setModal('load')}/>} {view === 'matches' && <MatchesView matches={matches}/>} {view === 'profile' && <ProfileView onSaved={() => notify('Business profile updated')}/>}</div></main>{modal && <EntryModal type={modal} onClose={() => setModal(null)} onAddTruck={addTruck} onAddLoad={addLoad}/>}<div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div></div>;
}
