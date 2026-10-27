import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode, RefObject } from 'react';
import { Landing } from './components/Landing';
import { RoleAuthModal, type AccountRole, type AuthMode, type RegistrationProfile } from './components/RoleAuthModal';
import { KycModal } from './components/KycModal';
import { Icon, type IconName } from './components/Icon';
import { AdminConsole } from './components/AdminConsole';
import { seedData } from './data/seed';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatDate } from './lib/matching';
import type { Load, LoadStatus, LoadType, PortalData, Truck, TruckStatus, ViewName } from './types';

const STORE_KEY = 'returnrun-phase1-v2';
const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase();
const statusClass = (value: string) => value.toLowerCase().replaceAll(' ', '-');
const isPendingRequest = (request: Load) => !['Accepted', 'Rejected'].includes(String(request.status));
const todayLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

interface SidebarProps {
  view: ViewName;
  role?: AccountRole;
  profile?: RegistrationProfile | null;
  counts: { trucks: number; requests: number };
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewName) => void;
  onLogout: () => void;
}

function Sidebar({ view, role, profile, counts, open, onClose, onNavigate, onLogout }: SidebarProps) {
  const storedRole = localStorage.getItem('returnrun-role');
  const activeRole: AccountRole = role ?? (storedRole === 'admin' ? 'admin' : storedRole === 'load_owner' ? 'load_owner' : 'truck_owner');
  const items: Array<{ view?: ViewName; label: string; icon: IconName; count?: number; disabled?: boolean }> = activeRole === 'admin' ? [
    { view: 'dashboard', label: 'Control centre', icon: 'overview' },
    { view: 'admin-users', label: 'User accounts', icon: 'building' },
    { view: 'admin-compliance', label: 'KYC verification', icon: 'inbox', count: 3 },
    { view: 'admin-operations', label: 'Operations', icon: 'route' },
  ] : activeRole === 'load_owner' ? [
    { view: 'dashboard', label: 'Overview', icon: 'overview' },
    { view: 'loads', label: 'My requests', icon: 'inbox', count: counts.requests },
  ] : [
    { view: 'dashboard', label: 'Overview', icon: 'overview' },
    { view: 'trucks', label: 'My vehicles', icon: 'truck', count: counts.trucks },
    { view: 'loads', label: 'Truck requests', icon: 'inbox', count: counts.requests },
  ];
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : activeRole === 'admin' ? 'Mira Kapoor' : activeRole === 'load_owner' ? 'Ananya Mehta' : 'Rajesh Sharma';
  const initials = displayName.split(' ').map((part) => part[0]).slice(0,2).join('').toUpperCase();
  return (
    <>
    <button className={`sidebar-scrim ${open ? 'show' : ''}`} onClick={onClose} aria-label="Close navigation" tabIndex={open ? 0 : -1}/>
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary navigation">
      <button className="brand" type="button" onClick={() => onNavigate('dashboard')} aria-label="Return to dashboard"><span className="brand-mark">RR</span><span>ReturnRun<small>Fleet platform</small></span></button>
      <button className="mobile-close" onClick={onClose} aria-label="Close menu"><Icon name="close" /></button>
      <nav>
        <p className="nav-label">Main menu</p>
        {items.map((item) => (
          <button key={item.label} className={`nav-item ${item.view === view ? 'active' : ''}`} aria-current={item.view === view ? 'page' : undefined} onClick={() => item.view && onNavigate(item.view)}>
            <span><Icon name={item.icon} /></span>{item.label}
            {item.count !== undefined && <b className="accent-count">{item.count}</b>}
          </button>
        ))}
        {activeRole !== 'admin' && <><p className="nav-label">Account</p>
        <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} aria-current={view === 'profile' ? 'page' : undefined} onClick={() => onNavigate('profile')}><span><Icon name="building" /></span>Business profile</button>
        <button className="nav-item disabled" title="Coming soon" disabled><span><Icon name="inbox" /></span>Enquiries <em>Coming soon</em></button></>}
      </nav>
      <div className="sidebar-user"><div className="avatar">{initials}</div><div><strong>{displayName}</strong><span>{activeRole === 'admin' ? 'Platform administrator' : activeRole === 'load_owner' ? 'Customer / shipper' : 'Truck owner / transporter'}</span></div><button onClick={onLogout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button></div>
    </aside>
    </>
  );
}

function MobileBottomNav({ view, role, onNavigate }: { view: ViewName; role: AccountRole; onNavigate: (view: ViewName) => void }) {
  const items: Array<{ view: ViewName; label: string; icon: IconName }> = role === 'admin' ? [
    { view: 'dashboard', label: 'Overview', icon: 'overview' },
    { view: 'admin-users', label: 'Accounts', icon: 'building' },
    { view: 'admin-compliance', label: 'KYC', icon: 'inbox' },
    { view: 'admin-operations', label: 'Operations', icon: 'route' },
  ] : role === 'load_owner' ? [
    { view: 'dashboard', label: 'Home', icon: 'overview' },
    { view: 'loads', label: 'Requests', icon: 'inbox' },
    { view: 'profile', label: 'Profile', icon: 'building' },
  ] : [
    { view: 'dashboard', label: 'Home', icon: 'overview' },
    { view: 'trucks', label: 'Vehicles', icon: 'truck' },
    { view: 'loads', label: 'Requests', icon: 'inbox' },
    { view: 'profile', label: 'Profile', icon: 'building' },
  ];
  return <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{items.map((item) => <button key={item.view} className={view === item.view ? 'active' : ''} aria-current={view === item.view ? 'page' : undefined} onClick={() => onNavigate(item.view)}><span><Icon name={item.icon}/></span><small>{item.label}</small></button>)}</nav>;
}

interface TopbarProps {
  onMenu: () => void;
  onPostLoad?: () => void;
  onSearch: (value: string) => void;
  onNavigate: (view: ViewName) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  role: AccountRole;
}

function Topbar({ onMenu, onSearch, onNavigate, searchRef, role }: TopbarProps) {
  const [openPanel, setOpenPanel] = useState<'support' | 'notifications' | null>(null);
  const [notificationRead, setNotificationRead] = useState([false, false, true]);
  const unread = notificationRead.filter(read => !read).length;
  const actionsRef = useRef<HTMLDivElement>(null);
  const openNotificationTarget = (index: number, destination: ViewName) => {
    setNotificationRead(current => current.map((read, itemIndex) => itemIndex === index ? true : read));
    setOpenPanel(null);
    onNavigate(destination);
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) setOpenPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanel(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <div className="mobile-app-brand"><span>RR</span><div><strong>ReturnRun</strong><small>Fleet workspace</small></div></div>
      <div className="search-box"><span><Icon name="search" /></span><input ref={searchRef} onChange={(event) => onSearch(event.target.value)} placeholder={role === 'admin' ? 'Search users, businesses or account IDs' : 'Search fleet, loads or locations'} aria-label="Global search"/></div>
      <div className="top-actions" ref={actionsRef}>
        <button className={`support-btn ${openPanel === 'support' ? 'active' : ''}`} title="Support" aria-expanded={openPanel === 'support'} aria-haspopup="dialog" onClick={() => setOpenPanel(current => current === 'support' ? null : 'support')}><Icon name="headset"/><span>Support</span></button>
        <button className={`icon-btn ${openPanel === 'notifications' ? 'active' : ''}`} title="Notifications" aria-label={`Notifications, ${unread} unread`} aria-expanded={openPanel === 'notifications'} aria-haspopup="dialog" onClick={() => setOpenPanel(current => current === 'notifications' ? null : 'notifications')}><Icon name="bell"/>{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}</button>

        {openPanel === 'support' && <aside className="header-popover support-popover" role="dialog" aria-label="Support options">
          <div className="popover-head"><div><span>ReturnRun support</span><strong>How can we help?</strong></div><button onClick={() => setOpenPanel(null)} aria-label="Close support"><Icon name="close"/></button></div>
          <a href="mailto:support@returnrun.in?subject=ReturnRun%20support%20request"><span className="popover-action-icon"><Icon name="inbox"/></span><span><strong>Email support</strong><small>Usually replies within 2 hours</small></span><Icon name="chevron"/></a>
          <a href="tel:+919876543210"><span className="popover-action-icon"><Icon name="headset"/></span><span><strong>Call operations desk</strong><small>+91 98765 43210 · 9 AM–7 PM</small></span><Icon name="chevron"/></a>
          <div className="popover-foot"><i/> Support team is online</div>
        </aside>}

        {openPanel === 'notifications' && <aside className="header-popover notifications-popover" role="dialog" aria-label="Notifications">
          <div className="popover-head"><div><span>Updates</span><strong>Notifications</strong></div><button className="mark-read" onClick={() => setNotificationRead(current => current.map(() => true))} disabled={unread === 0}>{unread > 0 ? 'Mark all read' : 'All read'}</button></div>
          <button className={notificationRead[0] ? 'notification-item' : 'notification-item unread'} onClick={() => openNotificationTarget(0, 'loads')}><span className="popover-action-icon"><Icon name="inbox"/></span><span><strong>New truck request received</strong><small>Review the route and accept or reject it.</small><em>Just now</em></span></button>
          <button className={notificationRead[1] ? 'notification-item' : 'notification-item unread'} onClick={() => openNotificationTarget(1, 'trucks')}><span className="popover-action-icon"><Icon name="truck"/></span><span><strong>TN 01 AB 4521 is available</strong><small>Your fleet status was updated successfully.</small><em>35 minutes ago</em></span></button>
          <button className="notification-item" onClick={() => { setOpenPanel(null); onNavigate('trucks'); }}><span className="popover-action-icon"><Icon name="overview"/></span><span><strong>Fleet sync completed</strong><small>All operational data is up to date.</small><em>Today, 09:15</em></span></button>
        </aside>}
      </div>
    </header>
  );
}

interface PageHeadProps { section: string; title: string; description: string; actions?: ReactNode; }
function PageHead({ section, title, description, actions }: PageHeadProps) {
  return <div className="page-head"><div><p className="breadcrumb">{section} <span className="date-separator">/</span> {todayLabel}</p><h1>{title}</h1><p>{description}</p></div>{actions}</div>;
}

function Dashboard({ data, role, profile, onOpenModal, onNavigate, onOpenRequest }: { data: PortalData; role?: AccountRole; profile?: RegistrationProfile | null; onOpenModal: (type: 'truck' | 'load') => void; onNavigate: (view: ViewName) => void; onOpenRequest: (request: Load) => void }) {
  const activeRole: AccountRole = role ?? (localStorage.getItem('returnrun-role') === 'load_owner' ? 'load_owner' : 'truck_owner');
  const [kycOpen, setKycOpen] = useState(false);
  const [kycComplete, setKycComplete] = useState(() => localStorage.getItem('returnrun-kyc') === 'complete');
  const pendingRequests = data.loads.filter(isPendingRequest);
  const acceptedRequests = data.loads.filter(({ status }) => status === 'Accepted');
  const rejectedRequests = data.loads.filter(({ status }) => status === 'Rejected');
  const available = data.trucks.filter(({ status }) => status === 'Available');
  const inTransit = data.trucks.filter(({ status }) => status === 'In transit');
  return <section className="view active">
    <PageHead section="Dashboard" title={`${greeting}, ${profile?.firstName || (activeRole === 'load_owner' ? 'Ananya' : 'Rajesh')}`} description={activeRole === 'load_owner' ? 'Post a truck request and track the owner’s response.' : 'Review customer requests and accept the work that suits you.'}/>
    {!kycComplete && <div className="kyc-banner"><span className="kyc-banner-icon"><Icon name="building"/></span><div><strong>{activeRole === 'load_owner' ? 'Verify your customer account' : 'Complete your business KYC'}</strong><p>{activeRole === 'load_owner' ? 'Confirm your business, GST and billing details before posting truck requests.' : 'Verify identity, company details and GST registration to activate full platform access.'}</p></div><span className="kyc-banner-state">Pending</span><button onClick={() => setKycOpen(true)}>{activeRole === 'load_owner' ? 'Verify business' : 'Complete KYC'} <Icon name="arrow"/></button></div>}
    <section className="dashboard-actions" aria-labelledby="quick-actions-title">
      <div><span className="section-kicker">Quick actions</span><h2 id="quick-actions-title">What would you like to do?</h2></div>
      <div className="dashboard-action-list">
        {activeRole === 'load_owner' ? <button onClick={() => onOpenModal('load')}><span><Icon name="truck"/></span><span><strong>Request a truck</strong><small>Tell truck owners what you need</small></span><Icon name="chevron"/></button> : <button onClick={() => onOpenModal('truck')}><span><Icon name="truck"/></span><span><strong>Add vehicle</strong><small>Add a vehicle and its documents</small></span><Icon name="chevron"/></button>}
        <button onClick={() => onNavigate('loads')}><span><Icon name="inbox"/></span><span><strong>{activeRole === 'load_owner' ? 'My requests' : 'Customer requests'}</strong><small>{activeRole === 'load_owner' ? 'Track accepted and pending requests' : 'Accept or reject incoming work'}</small></span><Icon name="chevron"/></button>
      </div>
    </section>
    <div className="metric-grid">{activeRole === 'load_owner' ? <>
      <button className="metric" onClick={() => onNavigate('loads')}><div className="metric-icon"><Icon name="package"/></div><div><span>Total requests</span><strong>{data.loads.length}</strong><small>All truck requests posted</small></div></button>
      <button className="metric highlight" onClick={() => onNavigate('loads')}><div className="metric-icon"><Icon name="inbox"/></div><div><span>Awaiting response</span><strong>{pendingRequests.length}</strong><small><b>Waiting for truck owners</b></small></div></button>
      <button className="metric" onClick={() => onNavigate('loads')}><div className="metric-icon"><Icon name="truck"/></div><div><span>Accepted</span><strong>{acceptedRequests.length}</strong><small>Truck confirmed</small></div></button>
      <button className="metric" onClick={() => onNavigate('loads')}><div className="metric-icon"><Icon name="close"/></div><div><span>Rejected</span><strong>{rejectedRequests.length}</strong><small>Needs another request</small></div></button>
    </> : <>
      <button className="metric highlight" onClick={() => onNavigate('loads')}><div className="metric-icon"><Icon name="inbox"/></div><div><span>Pending requests</span><strong>{pendingRequests.length}</strong><small><b>Need a response</b></small></div></button>
      <button className="metric" onClick={() => onNavigate('loads')}><div className="metric-icon"><Icon name="package"/></div><div><span>Accepted requests</span><strong>{acceptedRequests.length}</strong><small>Confirmed by truck owners</small></div></button>
      <button className="metric" onClick={() => onNavigate('trucks')}><div className="metric-icon"><Icon name="truck"/></div><div><span>My vehicles</span><strong>{data.trucks.length}</strong><small><b>{available.length} available</b></small></div></button>
      <button className="metric" onClick={() => onNavigate('trucks')}><div className="metric-icon"><Icon name="route"/></div><div><span>On the road</span><strong>{inTransit.length}</strong><small>Trucks currently moving</small></div></button>
    </>}</div>
    <section className="panel request-panel"><div className="panel-head"><div><h2>{activeRole === 'load_owner' ? 'Your recent requests' : 'Incoming truck requests'}</h2><p>{activeRole === 'load_owner' ? 'See whether a truck owner has accepted your request.' : 'Open a request to accept or reject it.'}</p></div><button className="text-link view-all-link" onClick={() => onNavigate('loads')}>View all <Icon name="chevron"/></button></div><div className="request-list">{data.loads.slice(0, 4).map((request) => <button className="request-list-item" key={request.id} onClick={() => activeRole === 'truck_owner' ? onOpenRequest(request) : onNavigate('loads')}><span className="request-route"><strong>{request.origin} → {request.destination}</strong><small>{request.material} · {request.quantity} tonnes · {formatDate(request.date)}</small></span><span className={`status ${statusClass(isPendingRequest(request) ? 'Pending' : request.status)}`}>{isPendingRequest(request) ? 'Pending' : request.status}</span><Icon name="chevron"/></button>)}</div></section>
    {kycOpen && <KycModal role={activeRole} onClose={() => setKycOpen(false)} onComplete={() => { setKycComplete(true); setKycOpen(false); }}/>} 
  </section>;
}

function TrucksView({ trucks, query, setQuery, status, setStatus, onAdd, onOpen }: { trucks: Truck[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void; onOpen: (truck: Truck) => void }) {
  const filtered = trucks.filter((truck) => (status === 'all' || truck.status === status) && (!query || Object.values(truck).some((value) => normalise(value).includes(normalise(query)))));
  return <section className="view active"><PageHead section="Fleet" title="My vehicles" description="Keep your vehicle details, documents and availability up to date." actions={<button className="primary-btn" onClick={onAdd}>Add vehicle</button>}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration, type or city"/></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option>Available</option><option>In transit</option><option>Unavailable</option></select></div><div className="card-grid vehicle-card-grid">{filtered.map((truck) => <article className="truck-card vehicle-card vehicle-card-clickable" key={truck.id} role="button" tabIndex={0} aria-label={`View complete details for ${truck.registration}`} onClick={() => onOpen(truck)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(truck); } }}><header className="vehicle-card-head"><div className="vehicle-identity"><span className="vehicle-card-icon"><Icon name="truck"/></span><div><h3>{truck.registration}</h3><p>{truck.type}</p></div></div><span className={`status ${statusClass(truck.status)}`}>{truck.status}</span></header><div className="vehicle-route"><span><small>From</small><strong>{truck.location}</strong></span><i aria-hidden="true"><svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M2 12H96M88 4L96 12L88 20"/></svg></i><span><small>To</small><strong>{truck.destination}</strong></span></div><div className="vehicle-card-facts"><div><span>Capacity</span><strong>{truck.capacity}<small> tonnes</small></strong></div><div><span>Current location</span><strong>{truck.location}</strong></div><div><span>Documents</span><strong className={truck.chassisNumber ? 'verified' : 'legacy'}>{truck.chassisNumber ? 'Submitted' : 'Not added'}</strong></div></div><footer className="vehicle-card-footer"><span className={`vehicle-request-state ${truck.status === 'Available' ? 'ready' : ''}`}><i/>{truck.status === 'Available' ? 'Receiving requests' : 'Requests paused'}</span><span className="vehicle-details-cue">View details <Icon name="chevron"/></span></footer></article>)}</div></section>;
}

function VehicleDetailsModal({ truck, onClose }: { truck: Truck; onClose: () => void }) {
  const documentsAdded = Boolean(truck.chassisNumber && truck.engineNumber);
  return <div className="modal-backdrop vehicle-details-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal vehicle-details-modal" role="dialog" aria-modal="true" aria-labelledby="vehicleDetailsTitle"><div className="modal-head"><div><span className="eyebrow">Vehicle details</span><h2 id="vehicleDetailsTitle">{truck.registration}</h2></div><button onClick={onClose} aria-label="Close vehicle details"><Icon name="close"/></button></div><div className="vehicle-details-body"><div className="vehicle-details-summary"><span className="vehicle-card-icon"><Icon name="truck"/></span><div><strong>{truck.type}</strong><small>{truck.capacity} tonnes carrying capacity</small></div><span className={`status ${statusClass(truck.status)}`}>{truck.status}</span></div><section><h3>Identification</h3><div className="vehicle-details-grid"><div><span>Registration number</span><strong>{truck.registration}</strong></div><div><span>Engine number</span><strong>{truck.engineNumber || 'Not added'}</strong></div><div><span>Chassis number</span><strong>{truck.chassisNumber || 'Not added'}</strong></div><div><span>Vehicle type</span><strong>{truck.type}</strong></div></div></section><section><h3>Operations</h3><div className="vehicle-details-grid"><div><span>Current location</span><strong>{truck.location}</strong></div><div><span>Typical destination</span><strong>{truck.destination}</strong></div><div><span>Capacity</span><strong>{truck.capacity} tonnes</strong></div><div><span>Request availability</span><strong>{truck.status === 'Available' ? 'Receiving requests' : 'Requests paused'}</strong></div></div></section><section><div className="vehicle-documents-head"><h3>Vehicle documents</h3><span className={documentsAdded ? 'complete' : 'incomplete'}>{documentsAdded ? 'Submitted' : 'Not added'}</span></div><div className="vehicle-document-statuses">{['RC book front', 'RC book back', 'Fitness certificate', 'PUC certificate', 'Valid insurance'].map((document) => <div key={document}><span><Icon name="package"/>{document}</span><strong className={documentsAdded ? 'complete' : 'incomplete'}>{documentsAdded ? 'Submitted' : 'Missing'}</strong></div>)}</div></section></div><div className="vehicle-details-footer"><button className="primary-btn" onClick={onClose}>Done</button></div></div></div>;
}

function RequestsView({ requests, query, setQuery, status, setStatus, role, onAdd, onOpenRequest }: { requests: Load[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; role: AccountRole; onAdd: () => void; onOpenRequest: (request: Load) => void }) {
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const updateLayout = (event: MediaQueryListEvent) => setMobileLayout(event.matches);
    setMobileLayout(media.matches);
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);
  const filtered = requests.filter((request) => (status === 'all' || (status === 'Pending' ? isPendingRequest(request) : request.status === status)) && (!query || Object.values(request).some((value) => normalise(value).includes(normalise(query)))));
  if (mobileLayout) return <section className="view active"><PageHead section="Requests" title={role === 'load_owner' ? 'My truck requests' : 'Customer truck requests'} description={role === 'load_owner' ? 'Post a request and track the owner’s response.' : 'Review each request and choose to accept or reject it.'} actions={role === 'load_owner' ? <button className="primary-btn" onClick={onAdd}>Request a truck</button> : undefined}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pickup, destination or goods"/></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter requests by status"><option value="all">All requests</option><option>Pending</option><option>Accepted</option><option>Rejected</option></select></div><div className="request-mobile-cards">{filtered.map((request) => { const displayStatus = isPendingRequest(request) ? 'Pending' : request.status; return <details className="request-mobile-card" key={request.id}><summary><span className="request-mobile-route"><strong>{request.origin} <i>→</i> {request.destination}</strong><small>Request #RR{request.id}</small></span><span className={`status ${statusClass(displayStatus)}`}>{displayStatus}</span><Icon name="chevron"/></summary><div className="request-mobile-body"><div className="request-mobile-facts"><div><span>Goods</span><strong>{request.material}</strong></div><div><span>Weight</span><strong>{request.quantity} tonnes</strong></div><div><span>Truck needed</span><strong>{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</strong></div><div><span>Pickup date</span><strong>{formatDate(request.date)}</strong></div></div>{role === 'truck_owner' && displayStatus === 'Pending' && <button className="request-mobile-review" onClick={() => onOpenRequest(request)}>Review request <Icon name="chevron"/></button>}</div></details>; })}</div></section>;
  return <section className="view active"><PageHead section="Requests" title={role === 'load_owner' ? 'My truck requests' : 'Customer truck requests'} description={role === 'load_owner' ? 'Post a request and track the truck owner’s response.' : 'Review each request and choose to accept or reject it.'} actions={role === 'load_owner' ? <button className="primary-btn" onClick={onAdd}>Request a truck</button> : undefined}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pickup, destination or goods"/></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter requests by status"><option value="all">All requests</option><option>Pending</option><option>Accepted</option><option>Rejected</option></select></div><div className="table-wrap"><table><thead><tr><th>Route</th><th>Goods</th><th>Truck needed</th><th>Pickup date</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map((request) => { const displayStatus = isPendingRequest(request) ? 'Pending' : request.status; return <tr key={request.id}><td><strong>{request.origin} → {request.destination}</strong><small>Request #RR{request.id}</small></td><td><strong>{request.material}</strong><small>{request.quantity} tonnes</small></td><td><span className="type-pill">{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</span></td><td>{formatDate(request.date)}</td><td><span className={`status ${statusClass(displayStatus)}`}>{displayStatus}</span></td><td>{role === 'truck_owner' && displayStatus === 'Pending' ? <button className="review-request-btn" onClick={() => onOpenRequest(request)}>Review</button> : <span className="request-result">{displayStatus}</span>}</td></tr>; })}</tbody></table></div></section>;
}

function ProfileView({ onSaved, profile, role }: { onSaved: () => void; profile?: RegistrationProfile | null; role: AccountRole }) {
  const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaved(true); onSaved(); };
  const fallback = role === 'load_owner'
    ? { name: 'Ananya Mehta', business: 'Mehta Foods', email: 'customer@returnrun.demo', phone: '+91 98765 41002', city: 'Bengaluru' }
    : { name: 'Rajesh Sharma', business: 'Sharma Roadways', email: 'owner@returnrun.demo', phone: '+91 98765 43210', city: 'Chennai' };
  const name = profile ? `${profile.firstName} ${profile.lastName}` : fallback.name;
  const business = profile?.business || fallback.business;
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const phone = profile?.phone ? `+91 ${profile.phone}` : fallback.phone;
  return <section className="view active"><PageHead section="Manage / Business profile" title="Business profile" description="Contact and business information visible across the portal."/><form className="panel profile-form" onSubmit={submit}><div className="profile-banner"><div className="avatar large">{initials}</div><div><h2>{business}</h2><span>{role === 'load_owner' ? 'Verified customer business' : 'Verified transport operator'}</span></div></div><div className="form-grid"><label>Business name<input name="business" defaultValue={business} required/></label><label>Contact person<input name="contact" defaultValue={name} required/></label><label>Email<input type="email" name="email" defaultValue={profile?.email || fallback.email} required/></label><label>Phone<input name="phone" defaultValue={phone} required/></label><label>Base location<input name="location" defaultValue={profile?.city || fallback.city} required/></label><label>GSTIN<input name="gst" placeholder="Enter business GSTIN"/></label></div><div className="form-footer"><span>{saved ? 'Profile saved just now' : ''}</span><button className="primary-btn" type="submit">Save changes</button></div></form></section>;
}

function RequestDecisionModal({ request, onClose, onDecision }: { request: Load; onClose: () => void; onDecision: (status: Extract<LoadStatus, 'Accepted' | 'Rejected'>) => void }) {
  const [accepted, setAccepted] = useState(false);
  const acceptTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(acceptTimer.current), []);
  const acceptRequest = () => {
    if (accepted) return;
    setAccepted(true);
    acceptTimer.current = window.setTimeout(() => onDecision('Accepted'), 2450);
  };
  return <div className="modal-backdrop request-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !accepted && onClose()}><div className={`modal request-decision-modal${accepted ? ' request-accepted' : ''}`} role="dialog" aria-modal="true" aria-labelledby={accepted ? 'requestAcceptedTitle' : 'requestTitle'}>{accepted ? <div className="request-success" role="status"><span className="request-success-mark"><svg viewBox="0 0 180 170" aria-hidden="true"><defs><linearGradient id="successTruckBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9dde1"/><stop offset=".12" stop-color="#fff"/><stop offset=".82" stop-color="#f8f8f7"/><stop offset="1" stop-color="#c9cdd1"/></linearGradient><linearGradient id="successTruckDoor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f4f4f2"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#e5e7e7"/></linearGradient></defs><path className="success-road" d="M4 168h172"/><path className="success-mirror-stem" d="M35 73 24 88v12m121-27 11 15v12"/><rect className="success-mirror" x="11" y="59" width="15" height="38" rx="6"/><rect className="success-mirror" x="154" y="59" width="15" height="38" rx="6"/><path className="success-rear-roof" d="M35 29q0-17 16-17h78q16 0 16 17v5H35z"/><path className="success-rear-body" d="M35 31q0-7 8-7h94q8 0 8 7v102H35z"/><path className="success-rear-frame" d="M35 33q0-5 7-5h96q7 0 7 5v100H35z"/><g className="success-door success-door-left"><path className="success-door-face" d="M42 32h46v78H42z"/><path className="success-door-rib" d="M49 37v66m11-66v66m11-66v66"/><path className="success-door-lock" d="M82 40v62m-4-47h8m-8 33h8"/><path className="success-door-hinges" d="M41 43h5m-5 24h5m-5 24h5"/><path className="success-gate-ink-shadow" d="M63 66 C70 72 82 84 90 88"/><path className="success-gate-tick" d="M63 66 C70 73 82 84 90 88"/></g><g className="success-door success-door-right"><path className="success-door-face" d="M90 32h48v78H90z"/><path className="success-door-rib" d="M109 37v66m11-66v66m11-66v66"/><path className="success-door-lock" d="M98 40v62m-4-47h8m-8 33h8"/><path className="success-door-hinges" d="M135 43h5m-5 24h5m-5 24h5"/><path className="success-gate-ink-shadow" d="M90 88 C102 78 115 64 124 58"/><path className="success-gate-tick" d="M90 88 C102 78 115 64 124 58"/></g><path className="success-crossbar" d="M42 108h96v15H42z"/><path className="success-crossbar-detail" d="M47 112h19v7H47zm23 0h17v7H70zm23 0h17v7H93zm21 0h19v7h-19z"/><rect className="success-tail-light" x="38" y="123" width="17" height="10" rx="2"/><rect className="success-tail-light" x="125" y="123" width="17" height="10" rx="2"/><path className="success-undercarriage" d="M39 135h102l-4 7H43z"/><path className="success-rear-axle" d="M31 148h118"/><path className="success-mudflap" d="M24 148h17v17H28q-4 0-4-5zm115 0h17v12q0 5-4 5h-13z"/><g className="success-rear-wheel"><path className="success-rear-tire" d="M24 143q0-7 6-7h5q6 0 6 7v18q0 6-6 6h-5q-6 0-6-6z"/><path className="success-rear-sidewall" d="M27 144q0-4 4-4h3q4 0 4 4v16q0 4-4 4h-3q-4 0-4-4z"/><path className="success-rear-tread" d="m25 141 4 3m-4 4 4 3m-4 4 4 3m-4 3 4 3m10-22-4 3m4 4-4 3m4 4-4 3m4 3-4 3"/></g><g className="success-rear-wheel"><path className="success-rear-tire" d="M139 143q0-7 6-7h5q6 0 6 7v18q0 6-6 6h-5q-6 0-6-6z"/><path className="success-rear-sidewall" d="M142 144q0-4 4-4h3q4 0 4 4v16q0 4-4 4h-3q-4 0-4-4z"/><path className="success-rear-tread" d="m140 144 4-3m-4 7 4-3m-4 7 4-3m-4 7 4-3m10-11-4-3m4 7-4-3m4 7-4-3m4 7-4-3"/></g><path className="success-rear-bumper" d="M22 143h136l-3 8H25z"/><rect className="success-plate" x="77" y="144" width="26" height="6" rx="1"/><rect className="success-amber-light" x="29" y="144" width="14" height="6" rx="1"/><rect className="success-amber-light" x="137" y="144" width="14" height="6" rx="1"/></svg></span><span className="eyebrow">Request confirmed</span><h2 id="requestAcceptedTitle">You’ve accepted the trip</h2><p>The customer will be notified and can see your response in their requests.</p></div> : <><div className="modal-head"><div><span className="eyebrow">New truck request</span><h2 id="requestTitle">Can you take this trip?</h2></div><button onClick={onClose} aria-label="Close request"><Icon name="close"/></button></div><div className="request-decision-body"><div className="request-route-hero"><div className="request-route-point request-route-pickup"><span className="request-route-pin"><Icon name="pin"/></span><div><small>Pickup</small><strong>{request.origin}</strong></div></div><i className="route-journey" aria-hidden="true"><svg viewBox="0 0 150 38"><path d="M16 19 H134 L123 9 M134 19 L123 29"/></svg></i><div className="request-route-point request-route-delivery"><div><small>Delivery</small><strong>{request.destination}</strong></div></div></div><div className="request-detail-grid"><div><span>Goods</span><strong>{request.material}</strong></div><div><span>Weight</span><strong>{request.quantity} tonnes</strong></div><div><span>Truck needed</span><strong>{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</strong></div><div><span>Pickup date</span><strong>{formatDate(request.date)}</strong></div></div><p className="request-help">Accept if you can provide a truck for this request. The customer will be notified immediately.</p></div><div className="request-decision-actions"><button className="reject-request-btn" onClick={() => onDecision('Rejected')}>Reject</button><button className="accept-request-btn" onClick={acceptRequest}>Accept request <Icon name="arrow"/></button></div></>}</div></div>;
}

interface ModalProps { type: 'truck' | 'load'; onClose: () => void; onAddTruck: (truck: Truck) => void; onAddLoad: (load: Load) => void; }
function VehicleDocumentUpload({ label, name }: { label: string; name: string }) {
  const [fileName, setFileName] = useState('');
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => setFileName(event.target.files?.[0]?.name || '');
  return <label className={`vehicle-upload-field ${fileName ? 'has-file' : ''}`}><span><Icon name="package"/></span><span><strong>{label}</strong><small>PDF, JPG or PNG · Maximum 10 MB</small></span><input type="file" name={name} accept=".pdf,image/*" onChange={selectFile} required/><b title={fileName || undefined}>{fileName || 'Choose file'}<i>{fileName ? 'Selected' : 'Browse'}</i></b></label>;
}

function EntryModal({ type, onClose, onAddTruck, onAddLoad }: ModalProps) {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const submitTruck = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); onAddTruck({ id: crypto.randomUUID(), registration: String(data.get('registration')), type: String(data.get('type')), capacity: Number(data.get('capacity')), location: String(data.get('location')), destination: String(data.get('destination')), status: data.get('status') as TruckStatus, engineNumber: String(data.get('engineNumber')), chassisNumber: String(data.get('chassisNumber')) }); };
  const submitLoad = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); onAddLoad({ id: crypto.randomUUID(), origin: String(data.get('origin')), destination: String(data.get('destination')), material: String(data.get('material')), quantity: Number(data.get('quantity')), type: data.get('type') as LoadType, date: String(data.get('date')), status: 'Pending' }); };
  return <div className={`modal-backdrop ${type === 'truck' ? 'vehicle-entry-backdrop' : ''}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal ${type === 'truck' ? 'vehicle-entry-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div className="modal-head"><div><span className="eyebrow">{type === 'truck' ? 'Fleet' : 'Truck request'}</span><h2 id="modalTitle">{type === 'truck' ? 'Add vehicle' : 'Request a truck'}</h2></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></div>{type === 'truck' ? <form className="modal-form vehicle-entry-form" onSubmit={submitTruck}><div className="vehicle-form-heading"><span>Vehicle details</span><p>Enter the vehicle's operating and identification details.</p></div><div className="form-grid"><label>Registration number<input name="registration" placeholder="TN 01 AB 1234" required autoFocus/></label><label>Vehicle type<select name="type"><option>32 ft Multi Axle</option><option>20 ft Container</option><option>24 ft Single Axle</option><option>14 ft LCV</option></select></label><label>Engine number<input name="engineNumber" placeholder="Enter engine number" required/></label><label>Chassis number<input name="chassisNumber" placeholder="Enter chassis number" required/></label><label>Capacity (tonnes)<input name="capacity" type="number" min="1" max="50" defaultValue="16" required/></label><label>Current location<input name="location" placeholder="Chennai" required/></label><label>Typical destination<input name="destination" placeholder="Ahmedabad" required/></label><label>Availability<select name="status"><option>Available</option><option>In transit</option><option>Unavailable</option></select></label></div><div className="vehicle-form-heading documents-heading"><span>Vehicle documents</span><p>Upload clear and valid copies for verification.</p></div><div className="vehicle-document-grid"><VehicleDocumentUpload label="RC book front" name="rcFront"/><VehicleDocumentUpload label="RC book back" name="rcBack"/><VehicleDocumentUpload label="Fitness certificate" name="fitness"/><VehicleDocumentUpload label="PUC certificate" name="puc"/><VehicleDocumentUpload label="Valid insurance" name="insurance"/></div><div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit">Add vehicle</button></div></form> : <form className="modal-form" onSubmit={submitLoad}><div className="form-grid"><label>Pickup location<input name="origin" placeholder="Ahmedabad" required autoFocus/></label><label>Delivery destination<input name="destination" placeholder="Chennai" required/></label><label>Goods description<input name="material" placeholder="Textiles" required/></label><label>Approx. weight (tonnes)<input name="quantity" type="number" min="1" max="50" defaultValue="12" required/></label><label>Truck requirement<select name="type"><option value="FTL">Full truck</option><option value="PTL">Shared truck</option></select></label><label>Pickup date<input name="date" type="date" defaultValue={tomorrow} required/></label></div><div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit">Post request</button></div></form>}</div></div>;
}

export default function App() {
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('returnrun-auth') === '1' || demo);
  const [authModal, setAuthModal] = useState<AuthMode | null>(() => {
    const requested = new URLSearchParams(location.search).get('auth');
    return requested === 'login' || requested === 'signup' ? requested : null;
  });
  const [data, setData] = useLocalStorage<PortalData>(STORE_KEY, seedData);
  const storedRole = localStorage.getItem('returnrun-role');
  const activeRole: AccountRole = storedRole === 'admin' ? 'admin' : storedRole === 'load_owner' ? 'load_owner' : 'truck_owner';
  const activeProfile = (() => { try { const value = localStorage.getItem('returnrun-profile'); return value ? JSON.parse(value) as RegistrationProfile : null; } catch { return null; } })();
  const [view, setView] = useState<ViewName>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<'truck' | 'load' | null>(null);
  const [truckQuery, setTruckQuery] = useState('');
  const [truckStatus, setTruckStatus] = useState('all');
  const [loadQuery, setLoadQuery] = useState('');
  const [adminQuery, setAdminQuery] = useState('');
  const [requestStatus, setRequestStatus] = useState('all');
  const [requestModal, setRequestModal] = useState<Load | null>(() => activeRole === 'truck_owner' ? data.loads.find(isPendingRequest) ?? null : null);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const counts = { trucks: data.trucks.length, requests: data.loads.filter(isPendingRequest).length };

  const notify = (message: string) => { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 2500); };
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') { setModal(null); setRequestModal(null); setSelectedTruck(null); } }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, []);

  if (!authenticated) {
    const enterWorkspace = (profile?: RegistrationProfile) => { if (profile) { localStorage.setItem('returnrun-role', profile.role); localStorage.setItem('returnrun-profile', JSON.stringify(profile)); localStorage.setItem('returnrun-kyc', 'pending'); } localStorage.setItem('returnrun-auth', '1'); setAuthModal(null); setAuthenticated(true); };
    return <><Landing onLogin={() => setAuthModal('login')} onSignup={() => setAuthModal('signup')} />{authModal && <RoleAuthModal mode={authModal} onClose={() => setAuthModal(null)} onModeChange={setAuthModal} onComplete={enterWorkspace}/>}</>;
  }
  const navigate = (next: ViewName) => { setView(next); setMenuOpen(false); if (next === 'dashboard' && activeRole === 'truck_owner') setRequestModal(data.loads.find(isPendingRequest) ?? null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const globalSearch = (value: string) => {
    if (activeRole === 'admin') {
      setAdminQuery(value);
      if (value.trim().length > 1) navigate('admin-users');
      return;
    }
    setLoadQuery(value);
    if (value.trim().length > 1) navigate('loads');
  };
  const addTruck = (truck: Truck) => { setData((current) => ({ ...current, trucks: [truck, ...current.trucks] })); setModal(null); notify('Vehicle added successfully'); };
  const addLoad = (load: Load) => { setData((current) => ({ ...current, loads: [load, ...current.loads] })); setModal(null); notify('Truck request posted'); };
  const decideRequest = (status: Extract<LoadStatus, 'Accepted' | 'Rejected'>) => { if (!requestModal) return; setData((current) => ({ ...current, loads: current.loads.map((request) => request.id === requestModal.id ? { ...request, status } : request) })); setRequestModal(null); notify(status === 'Accepted' ? 'Request accepted — the customer has been notified' : 'Request rejected'); };

  return <div className={`app-shell ${activeRole === 'admin' ? 'admin-shell' : ''}`}><Sidebar view={view} role={activeRole} profile={activeProfile} counts={counts} open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} onLogout={() => { localStorage.removeItem('returnrun-auth'); setAuthenticated(false); }}/><main className="main"><Topbar role={activeRole} onMenu={() => setMenuOpen(true)} onSearch={globalSearch} onNavigate={navigate} searchRef={searchRef}/><div className="content">{activeRole === 'admin' ? <AdminConsole view={view} data={data} globalQuery={adminQuery} onNavigate={navigate} notify={notify}/> : <>{view === 'dashboard' && <Dashboard data={data} role={activeRole} profile={activeProfile} onOpenModal={setModal} onNavigate={navigate} onOpenRequest={setRequestModal}/>} {view === 'trucks' && <TrucksView trucks={data.trucks} query={truckQuery} setQuery={setTruckQuery} status={truckStatus} setStatus={setTruckStatus} onAdd={() => setModal('truck')} onOpen={setSelectedTruck}/>} {view === 'loads' && <RequestsView requests={data.loads} query={loadQuery} setQuery={setLoadQuery} status={requestStatus} setStatus={setRequestStatus} role={activeRole} onAdd={() => setModal('load')} onOpenRequest={setRequestModal}/>} {view === 'profile' && <ProfileView profile={activeProfile} role={activeRole} onSaved={() => notify('Business profile updated')}/>}</>}</div></main><MobileBottomNav view={view} role={activeRole} onNavigate={navigate}/>{modal && activeRole !== 'admin' && <EntryModal type={modal} onClose={() => setModal(null)} onAddTruck={addTruck} onAddLoad={addLoad}/>} {requestModal && activeRole === 'truck_owner' && <RequestDecisionModal request={requestModal} onClose={() => setRequestModal(null)} onDecision={decideRequest}/>} {selectedTruck && activeRole !== 'admin' && <VehicleDetailsModal truck={selectedTruck} onClose={() => setSelectedTruck(null)}/>}<div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div></div>;
}
