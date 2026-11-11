import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode, RefObject } from 'react';
import { Landing } from './components/Landing';
import { RoleAuthModal, type AccountRole, type AuthMode, type RegistrationProfile } from './components/RoleAuthModal';
import { KycModal } from './components/KycModal';
import { Icon, type IconName } from './components/Icon';
import { AdminConsole } from './components/AdminConsole';
import { SupportQueryModal } from './components/SupportQueryModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { seedData, seedDrivers } from './data/seed';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatDate } from './lib/matching';
import { friendlyError, isBackendEnabled } from './lib/supabase';
import * as api from './lib/backend';
import { filesFromForm, type UploadItem } from './lib/backend';
import { useSession, useWorkspace } from './hooks/useBackend';
import type { AppNotification, Driver, DriverStatus, Load, LoadStatus, LoadType, PortalData, SupportTicket, Truck, TruckStatus, VerificationStatus, ViewName } from './types';

const STORE_KEY = 'fares24x7-phase1-v2';
const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase();
const statusClass = (value: string) => value.toLowerCase().replaceAll(' ', '-');
const isPendingRequest = (request: Load) => !['Accepted', 'Rejected'].includes(String(request.status));
const todayLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

interface SidebarProps {
  view: ViewName;
  role?: AccountRole;
  profile?: RegistrationProfile | null;
  counts: { trucks: number; drivers: number; requests: number; approvals: number; support: number };
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewName) => void;
  onLogout: () => void;
}

function Sidebar({ view, role, profile, counts, open, onClose, onNavigate, onLogout }: SidebarProps) {
  const storedRole = localStorage.getItem('fares24x7-role');
  const activeRole: AccountRole = role ?? (storedRole === 'admin' ? 'admin' : storedRole === 'load_owner' ? 'load_owner' : 'truck_owner');
  const items: Array<{ view?: ViewName; label: string; icon: IconName; count?: number; disabled?: boolean }> = activeRole === 'admin' ? [
    { view: 'dashboard', label: 'Control centre', icon: 'overview' },
    { view: 'admin-users', label: 'User accounts', icon: 'building' },
    { view: 'admin-compliance', label: 'KYC verification', icon: 'inbox', count: counts.approvals > 0 ? counts.approvals : undefined },
    { view: 'admin-operations', label: 'Operations', icon: 'route' },
    { view: 'admin-support', label: 'Support requests', icon: 'headset', count: counts.support > 0 ? counts.support : undefined },
  ] : activeRole === 'load_owner' ? [
    { view: 'dashboard', label: 'Overview', icon: 'overview' },
    { view: 'loads', label: 'My requests', icon: 'inbox', count: counts.requests },
  ] : [
    { view: 'dashboard', label: 'Overview', icon: 'overview' },
    { view: 'trucks', label: 'My vehicles', icon: 'truck', count: counts.trucks },
    { view: 'drivers', label: 'My drivers', icon: 'driver', count: counts.drivers },
    { view: 'loads', label: 'Truck requests', icon: 'inbox', count: counts.requests },
  ];
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : activeRole === 'admin' ? 'Mira Kapoor' : activeRole === 'load_owner' ? 'Ananya Mehta' : 'Rajesh Sharma';
  const initials = displayName.split(' ').map((part) => part[0]).slice(0,2).join('').toUpperCase();
  return (
    <>
    <button className={`sidebar-scrim ${open ? 'show' : ''}`} onClick={onClose} aria-label="Close navigation" tabIndex={open ? 0 : -1}/>
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary navigation">
      <button className="brand" type="button" onClick={() => onNavigate('dashboard')} aria-label="Return to dashboard"><span className="brand-mark">F24</span><span>Fares24x7<small>Fleet platform</small></span></button>
      <button className="mobile-close" onClick={onClose} aria-label="Close menu"><Icon name="close" /></button>
      <nav>
        <p className="nav-label">Main menu</p>
        {items.map((item) => (
          <button key={item.label} className={`nav-item ${item.view === view ? 'active' : ''}`} aria-current={item.view === view ? 'page' : undefined} onClick={() => item.view && onNavigate(item.view)}>
            <span><Icon name={item.icon} /></span>{item.label}
            {(item.count ?? 0) > 0 && <b className="accent-count">{item.count}</b>}
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
    { view: 'admin-support', label: 'Support', icon: 'headset' },
  ] : role === 'load_owner' ? [
    { view: 'dashboard', label: 'Home', icon: 'overview' },
    { view: 'loads', label: 'Requests', icon: 'inbox' },
    { view: 'profile', label: 'Profile', icon: 'building' },
  ] : [
    { view: 'dashboard', label: 'Home', icon: 'overview' },
    { view: 'trucks', label: 'Vehicles', icon: 'truck' },
    { view: 'drivers', label: 'Drivers', icon: 'driver' },
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
  onOpenSupport: () => void;
  /** Backend mode: real notifications for the signed-in user. */
  notifications?: AppNotification[];
  onMarkRead?: (ids: string[]) => void;
}
const notificationTime = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));

function Topbar({ onMenu, onSearch, onNavigate, searchRef, role, onOpenSupport, notifications, onMarkRead }: TopbarProps) {
  const [openPanel, setOpenPanel] = useState<'support' | 'notifications' | null>(null);
  const [notificationRead, setNotificationRead] = useState([false, false, true]);
  const unread = notifications ? notifications.filter(item => !item.read).length : notificationRead.filter(read => !read).length;
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
      <div className="mobile-app-brand"><span>F24</span><div><strong>Fares24x7</strong><small>Fleet workspace</small></div></div>
      <div className="search-box"><span><Icon name="search" /></span><input ref={searchRef} onChange={(event) => onSearch(event.target.value)} placeholder={role === 'admin' ? 'Search users, businesses or account IDs' : 'Search fleet, loads or locations'} aria-label="Global search"/></div>
      <div className="top-actions" ref={actionsRef}>
        {role !== 'admin' && <button className={`support-btn ${openPanel === 'support' ? 'active' : ''}`} title="Support" aria-expanded={openPanel === 'support'} aria-haspopup="dialog" onClick={() => setOpenPanel(current => current === 'support' ? null : 'support')}><Icon name="headset"/><span>Support</span></button>}
        <button className={`icon-btn ${openPanel === 'notifications' ? 'active' : ''}`} title="Notifications" aria-label={`Notifications, ${unread} unread`} aria-expanded={openPanel === 'notifications'} aria-haspopup="dialog" onClick={() => setOpenPanel(current => current === 'notifications' ? null : 'notifications')}><Icon name="bell"/>{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}</button>

        {openPanel === 'support' && <aside className="header-popover support-popover" role="dialog" aria-label="Support options">
          <div className="popover-head"><div><span>Fares24x7 support</span><strong>How can we help?</strong></div><button onClick={() => setOpenPanel(null)} aria-label="Close support"><Icon name="close"/></button></div>
          <a href="mailto:support@fares24x7.com?subject=Fares24x7%20support%20request"><span className="popover-action-icon"><Icon name="inbox"/></span><span><strong>Email support</strong><small>Usually replies within 2 hours</small></span><Icon name="chevron"/></a>
          <a href="tel:+919876543210"><span className="popover-action-icon"><Icon name="headset"/></span><span><strong>Call operations desk</strong><small>+91 98765 43210 · 9 AM–7 PM</small></span><Icon name="chevron"/></a>
          <button className="support-query-trigger" onClick={() => { setOpenPanel(null); onOpenSupport(); }}><span className="popover-action-icon"><Icon name="building"/></span><span><strong>Submit your query</strong><small>Send full details to the admin team</small></span><Icon name="chevron"/></button>
          <div className="popover-foot"><i/> Support team is online</div>
        </aside>}

        {openPanel === 'notifications' && <aside className="header-popover notifications-popover" role="dialog" aria-label="Notifications">
          <div className="popover-head"><div><span>Updates</span><strong>Notifications</strong></div><button className="mark-read" onClick={() => notifications ? onMarkRead?.(notifications.filter(item => !item.read).map(item => item.id)) : setNotificationRead(current => current.map(() => true))} disabled={unread === 0}>{unread > 0 ? 'Mark all read' : 'All read'}</button></div>
          {notifications ? (notifications.length ? notifications.map(item => <button key={item.id} className={item.read ? 'notification-item' : 'notification-item unread'} onClick={() => { if (!item.read) onMarkRead?.([item.id]); setOpenPanel(null); if (item.view) onNavigate(item.view); }}><span className="popover-action-icon"><Icon name="bell"/></span><span><strong>{item.title}</strong><small>{item.body}</small><em>{notificationTime(item.createdAt)}</em></span></button>) : <p className="notification-empty">You’re all caught up.</p>) : role === 'admin' ? <>
            <button className={notificationRead[0] ? 'notification-item' : 'notification-item unread'} onClick={() => openNotificationTarget(0, 'admin-compliance')}><span className="popover-action-icon"><Icon name="inbox"/></span><span><strong>New KYC submission</strong><small>A business is waiting for verification.</small><em>Just now</em></span></button>
            <button className={notificationRead[1] ? 'notification-item' : 'notification-item unread'} onClick={() => openNotificationTarget(1, 'admin-operations')}><span className="popover-action-icon"><Icon name="truck"/></span><span><strong>Vehicle document expiring</strong><small>Review upcoming compliance exceptions.</small><em>35 minutes ago</em></span></button>
            <button className="notification-item" onClick={() => { setOpenPanel(null); onNavigate('admin-users'); }}><span className="popover-action-icon"><Icon name="building"/></span><span><strong>Account review completed</strong><small>Platform access records are up to date.</small><em>Today, 09:15</em></span></button>
          </> : <>
            <button className={notificationRead[0] ? 'notification-item' : 'notification-item unread'} onClick={() => openNotificationTarget(0, 'loads')}><span className="popover-action-icon"><Icon name="inbox"/></span><span><strong>New truck request received</strong><small>Review the route and accept or reject it.</small><em>Just now</em></span></button>
            <button className={notificationRead[1] ? 'notification-item' : 'notification-item unread'} onClick={() => openNotificationTarget(1, 'trucks')}><span className="popover-action-icon"><Icon name="truck"/></span><span><strong>TN 01 AB 4521 is available</strong><small>Your fleet status was updated successfully.</small><em>35 minutes ago</em></span></button>
            <button className="notification-item" onClick={() => { setOpenPanel(null); onNavigate('trucks'); }}><span className="popover-action-icon"><Icon name="overview"/></span><span><strong>Fleet sync completed</strong><small>All operational data is up to date.</small><em>Today, 09:15</em></span></button>
          </>}
        </aside>}
      </div>
    </header>
  );
}

interface PageHeadProps { section: string; title: string; description: string; actions?: ReactNode; }
function PageHead({ section, title, description, actions }: PageHeadProps) {
  return <div className="page-head"><div><p className="breadcrumb">{section} <span className="date-separator">/</span> {todayLabel}</p><h1>{title}</h1><p>{description}</p></div>{actions}</div>;
}

function Dashboard({ data, role, profile, onOpenModal, onNavigate, onOpenRequest, onViewRequest, onOpenRequests, onOpenTrucks, kycStatus, onSubmitKyc }: { data: PortalData; role?: AccountRole; profile?: RegistrationProfile | null; onOpenModal: (type: 'truck' | 'load') => void; onNavigate: (view: ViewName) => void; onOpenRequest: (request: Load) => void; onViewRequest: (request: Load) => void; onOpenRequests: (status: string) => void; onOpenTrucks: (status: string) => void; kycStatus?: VerificationStatus; onSubmitKyc?: (details: Record<string, string>, documents: UploadItem[]) => Promise<void> }) {
  const activeRole: AccountRole = role ?? (localStorage.getItem('fares24x7-role') === 'load_owner' ? 'load_owner' : 'truck_owner');
  const [kycOpen, setKycOpen] = useState(false);
  const [kycComplete, setKycComplete] = useState(() => localStorage.getItem('fares24x7-kyc') === 'complete');
  const pendingRequests = data.loads.filter(isPendingRequest);
  const acceptedRequests = data.loads.filter(({ status }) => status === 'Accepted');
  const rejectedRequests = data.loads.filter(({ status }) => status === 'Rejected');
  const kycState: VerificationStatus = kycStatus ?? (kycComplete ? 'Verified' : 'Not submitted');
  const kycCopy = kycState === 'Pending' ? { title: 'Verification under review', text: 'Our team is checking your documents. We will notify you once it is complete.', badge: 'In review', action: false, button: '' }
    : kycState === 'Needs information' ? { title: 'More information needed', text: 'Some KYC details could not be verified. Please review them and submit again.', badge: 'Action needed', action: true, button: 'Update KYC' }
    : kycState === 'Rejected' ? { title: 'Verification was not approved', text: 'Contact support if you believe this is a mistake.', badge: 'Rejected', action: false, button: '' }
    : { title: activeRole === 'load_owner' ? 'Verify your customer account' : 'Complete your business KYC', text: activeRole === 'load_owner' ? 'Confirm your business, GST and billing details before posting truck requests.' : 'Verify identity, company details and GST registration to activate full platform access.', badge: 'Pending', action: true, button: activeRole === 'load_owner' ? 'Verify business' : 'Complete KYC' };
  const available = data.trucks.filter(({ status }) => status === 'Available');
  const inTransit = data.trucks.filter(({ status }) => status === 'In transit');
  return <section className="view active">
    <PageHead section="Dashboard" title={`${greeting}, ${profile?.firstName || (activeRole === 'load_owner' ? 'Ananya' : 'Rajesh')}`} description={activeRole === 'load_owner' ? 'Post a truck request and track the owner’s response.' : 'Review customer requests and accept the work that suits you.'}/>
    {kycState !== 'Verified' && <div className="kyc-banner"><span className="kyc-banner-icon"><Icon name="building"/></span><div><strong>{kycCopy.title}</strong><p>{kycCopy.text}</p></div><span className="kyc-banner-state">{kycCopy.badge}</span>{kycCopy.action && <button onClick={() => setKycOpen(true)}>{kycCopy.button} <Icon name="arrow"/></button>}</div>}
    <section className="dashboard-actions" aria-labelledby="quick-actions-title">
      <div><span className="section-kicker">Quick actions</span><h2 id="quick-actions-title">What would you like to do?</h2></div>
      <div className="dashboard-action-list">
        {activeRole === 'load_owner' ? <button onClick={() => onOpenModal('load')}><span><Icon name="truck"/></span><span><strong>Request a truck</strong><small>Tell truck owners what you need</small></span><Icon name="chevron"/></button> : <button onClick={() => onOpenModal('truck')}><span><Icon name="truck"/></span><span><strong>Add vehicle</strong><small>Add a vehicle and its documents</small></span><Icon name="chevron"/></button>}
        <button onClick={() => onNavigate('loads')}><span><Icon name="inbox"/></span><span><strong>{activeRole === 'load_owner' ? 'My requests' : 'Customer requests'}</strong><small>{activeRole === 'load_owner' ? 'Track accepted and pending requests' : 'Accept or reject incoming work'}</small></span><Icon name="chevron"/></button>
      </div>
    </section>
    <div className="metric-grid">{activeRole === 'load_owner' ? <>
      <button className="metric" onClick={() => onOpenRequests('all')}><div className="metric-icon"><Icon name="package"/></div><div><span>Total requests</span><strong>{data.loads.length}</strong><small>All truck requests posted</small></div></button>
      <button className="metric highlight" onClick={() => onOpenRequests('Pending')}><div className="metric-icon"><Icon name="inbox"/></div><div><span>Awaiting response</span><strong>{pendingRequests.length}</strong><small><b>Waiting for truck owners</b></small></div></button>
      <button className="metric" onClick={() => onOpenRequests('Accepted')}><div className="metric-icon"><Icon name="truck"/></div><div><span>Accepted</span><strong>{acceptedRequests.length}</strong><small>Truck confirmed</small></div></button>
      <button className="metric" onClick={() => onOpenRequests('Rejected')}><div className="metric-icon"><Icon name="close"/></div><div><span>Rejected</span><strong>{rejectedRequests.length}</strong><small>Needs another request</small></div></button>
    </> : <>
      <button className="metric highlight" onClick={() => onOpenRequests('Pending')}><div className="metric-icon"><Icon name="inbox"/></div><div><span>Pending requests</span><strong>{pendingRequests.length}</strong><small><b>Need a response</b></small></div></button>
      <button className="metric" onClick={() => onOpenRequests('Accepted')}><div className="metric-icon"><Icon name="package"/></div><div><span>Accepted requests</span><strong>{acceptedRequests.length}</strong><small>Confirmed by truck owners</small></div></button>
      <button className="metric" onClick={() => onOpenTrucks('all')}><div className="metric-icon"><Icon name="truck"/></div><div><span>My vehicles</span><strong>{data.trucks.length}</strong><small><b>{available.length} available</b></small></div></button>
      <button className="metric" onClick={() => onOpenTrucks('In transit')}><div className="metric-icon"><Icon name="route"/></div><div><span>On the road</span><strong>{inTransit.length}</strong><small>Trucks currently moving</small></div></button>
    </>}</div>
    <section className="panel request-panel"><div className="panel-head"><div><h2>{activeRole === 'load_owner' ? 'Your recent requests' : 'Incoming truck requests'}</h2><p>{activeRole === 'load_owner' ? 'See whether a truck owner has accepted your request.' : 'Open a request to accept or reject it.'}</p></div><button className="text-link view-all-link" onClick={() => onNavigate('loads')}>View all <Icon name="chevron"/></button></div><div className="request-list">{data.loads.slice(0, 4).map((request) => <button className="request-list-item" key={request.id} onClick={() => activeRole === 'truck_owner' && isPendingRequest(request) ? onOpenRequest(request) : onViewRequest(request)}><span className="request-route"><strong>{request.origin} → {request.destination}</strong><small>{request.material} · {request.quantity} tonnes · {formatDate(request.date)}</small></span><span className={`status ${statusClass(isPendingRequest(request) ? 'Pending' : request.status)}`}>{isPendingRequest(request) ? 'Pending' : request.status}</span><Icon name="chevron"/></button>)}</div></section>
    {kycOpen && <KycModal role={activeRole} onSubmit={onSubmitKyc} onClose={() => setKycOpen(false)} onComplete={() => { if (!onSubmitKyc) setKycComplete(true); setKycOpen(false); }}/>} 
  </section>;
}

function TrucksView({ trucks, drivers, query, setQuery, status, setStatus, onAdd, onOpen }: { trucks: Truck[]; drivers: Driver[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void; onOpen: (truck: Truck) => void }) {
  const filtered = trucks.filter((truck) => (status === 'all' || truck.status === status) && (!query || Object.values(truck).some((value) => normalise(value).includes(normalise(query)))));
  return <section className="view active"><PageHead section="Fleet" title="My vehicles" description="Keep your vehicle details, documents and availability up to date." actions={<button className="primary-btn" onClick={onAdd}>Add vehicle</button>}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration, type or city"/></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option>Available</option><option>In transit</option><option>Unavailable</option></select></div><div className="card-grid vehicle-card-grid">{filtered.map((truck) => { const assignedDriver = drivers.find(driver=>driver.assignedVehicle===truck.registration); return <article className="truck-card vehicle-card vehicle-card-clickable" key={truck.id} role="button" tabIndex={0} aria-label={`View complete details for ${truck.registration}`} onClick={() => onOpen(truck)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(truck); } }}><header className="vehicle-card-head"><div className="vehicle-identity"><span className="vehicle-card-icon"><Icon name="truck"/></span><div><h3>{truck.registration}</h3><p>{truck.type}</p></div></div><span className={`status ${statusClass(truck.status)}`}>{truck.status}</span></header><div className="vehicle-route"><span><small>From</small><strong>{truck.location}</strong></span><i aria-hidden="true"><svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M2 12H96M88 4L96 12L88 20"/></svg></i><span><small>To</small><strong>{truck.destination}</strong></span></div><div className="vehicle-card-facts"><div><span>Capacity</span><strong>{truck.capacity}<small> tonnes</small></strong></div><div><span>Current location</span><strong>{truck.location}</strong></div><div><span>Documents</span><strong className={truck.chassisNumber ? 'verified' : 'legacy'}>{truck.chassisNumber ? 'Submitted' : 'Not added'}</strong></div><div><span>Assigned driver</span><strong className={assignedDriver?'verified':'legacy'}>{assignedDriver?.name||'Not assigned'}</strong></div></div><footer className="vehicle-card-footer"><span className={`vehicle-request-state ${truck.status === 'Available' ? 'ready' : ''}`}><i/>{truck.status === 'Available' ? 'Receiving requests' : 'Requests paused'}</span><span className="vehicle-details-cue">View details <Icon name="chevron"/></span></footer></article>; })}</div></section>;
}

function VehicleDetailsModal({ truck, driver, onClose }: { truck: Truck; driver?: Driver; onClose: () => void }) {
  const documentNames = ['RC book front', 'RC book back', 'Fitness certificate', 'PUC certificate', 'Valid insurance'];
  const documentsAdded = Boolean(truck.chassisNumber && truck.engineNumber);
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string>>({});
  const submittedCount = documentsAdded ? documentNames.length : Object.keys(uploadedDocuments).length;
  const allDocumentsSubmitted = submittedCount === documentNames.length;
  const uploadDocument = (document: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedDocuments((current) => ({ ...current, [document]: file.name }));
  };

  return <div className="modal-backdrop vehicle-details-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal vehicle-details-modal" role="dialog" aria-modal="true" aria-labelledby="vehicleDetailsTitle"><div className="modal-head"><div><span className="eyebrow">Vehicle details</span><h2 id="vehicleDetailsTitle">{truck.registration}</h2></div><button onClick={onClose} aria-label="Close vehicle details"><Icon name="close"/></button></div><div className="vehicle-details-body"><div className="vehicle-details-summary"><span className="vehicle-card-icon"><Icon name="truck"/></span><div><strong>{truck.type}</strong><small>{truck.capacity} tonnes carrying capacity</small></div><span className={`status ${statusClass(truck.status)}`}>{truck.status}</span></div><section><h3>Identification</h3><div className="vehicle-details-grid"><div><span>Registration number</span><strong>{truck.registration}</strong></div><div><span>Engine number</span><strong>{truck.engineNumber || 'Not added'}</strong></div><div><span>Chassis number</span><strong>{truck.chassisNumber || 'Not added'}</strong></div><div><span>Vehicle type</span><strong>{truck.type}</strong></div></div></section><section><h3>Operations</h3><div className="vehicle-details-grid"><div><span>Current location</span><strong>{truck.location}</strong></div><div><span>Typical destination</span><strong>{truck.destination}</strong></div><div><span>Capacity</span><strong>{truck.capacity} tonnes</strong></div><div><span>Request availability</span><strong>{truck.status === 'Available' ? 'Receiving requests' : 'Requests paused'}</strong></div></div></section><section><div className="vehicle-driver-head"><h3>Assigned driver</h3>{driver&&<span className={`status ${statusClass(driver.status)}`}>{driver.status}</span>}</div>{driver?<div className="vehicle-assigned-driver"><span className="driver-avatar">{driver.name.split(' ').map(part=>part[0]).slice(0,2).join('')}</span><div><strong>{driver.name}</strong><small>{driver.phone}</small></div><dl><div><dt>Licence number</dt><dd>{driver.licenceNumber}</dd></div><div><dt>Licence expiry</dt><dd>{formatDate(driver.licenceExpiry)}</dd></div></dl></div>:<div className="vehicle-no-driver"><Icon name="driver"/><div><strong>No driver assigned</strong><small>Assign a driver from the Drivers module.</small></div></div>}</section><section><div className="vehicle-documents-head"><h3>Vehicle documents</h3><span className={allDocumentsSubmitted ? 'complete' : 'incomplete'}>{allDocumentsSubmitted ? 'Submitted' : submittedCount ? `${submittedCount} of ${documentNames.length} added` : 'Not added'}</span></div><div className="vehicle-document-statuses">{documentNames.map((document) => { const uploadedFile = uploadedDocuments[document]; const submitted = documentsAdded || Boolean(uploadedFile); return <div key={document}><span><Icon name="package"/><span className="vehicle-document-name">{document}{uploadedFile && <small title={uploadedFile}>{uploadedFile}</small>}</span></span><span className="vehicle-document-row-action"><strong className={submitted ? 'complete' : 'incomplete'}>{submitted ? 'Submitted' : 'Missing'}</strong>{!documentsAdded && <label className="vehicle-document-upload"><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => uploadDocument(document, event)}/>{uploadedFile ? 'Replace' : 'Upload'}</label>}</span></div>; })}</div><p className="vehicle-document-help">Upload PDF, JPG or PNG files. Each file can be replaced before verification.</p></section></div><div className="vehicle-details-footer"><button className="primary-btn" onClick={onClose}>Done</button></div></div></div>;
}

function DriversView({ drivers, query, setQuery, status, setStatus, onAdd }: { drivers: Driver[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void }) {
  const filtered = drivers.filter(driver => (status === 'all' || driver.status === status) && (!query || Object.values(driver).some(value => normalise(value).includes(normalise(query)))));
  return <section className="view active"><PageHead section="Fleet" title="My drivers" description="Manage driver availability, assignments and compliance documents." actions={<button className="primary-btn" onClick={onAdd}>Add driver</button>}/><div className="driver-summary"><article><span><Icon name="driver"/></span><div><small>Total drivers</small><strong>{drivers.length}</strong></div></article><article><span><Icon name="overview"/></span><div><small>Available</small><strong>{drivers.filter(driver=>driver.status==='Available').length}</strong></div></article><article><span><Icon name="truck"/></span><div><small>Assigned or on trip</small><strong>{drivers.filter(driver=>driver.status==='Assigned'||driver.status==='On trip').length}</strong></div></article></div><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search driver, licence or city"/></div><select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Filter drivers by status"><option value="all">All statuses</option><option>Available</option><option>Assigned</option><option>On trip</option><option>Inactive</option></select></div><div className="driver-card-grid">{filtered.map(driver=><article className="driver-card" key={driver.id}><header><span className="driver-avatar">{driver.name.split(' ').map(part=>part[0]).slice(0,2).join('')}</span><div><h3>{driver.name}</h3><p>{driver.phone}</p></div><em className={`status ${statusClass(driver.status)}`}>{driver.status}</em></header><div className="driver-facts"><div><span>Licence number</span><strong>{driver.licenceNumber}</strong></div><div><span>Licence expiry</span><strong>{formatDate(driver.licenceExpiry)}</strong></div><div><span>Base city</span><strong>{driver.city}</strong></div><div><span>Assigned vehicle</span><strong>{driver.assignedVehicle || 'Not assigned'}</strong></div></div><div className="driver-documents"><span><Icon name="driver"/> Photo</span><span><Icon name="package"/> Licence</span><span><Icon name="building"/> Aadhaar/PAN</span></div></article>)}</div>{filtered.length===0&&<div className="empty">No drivers match this filter.</div>}</section>;
}

function DriverUploadField({ label, name, accept = '.pdf,image/*' }: { label: string; name: string; accept?: string }) {
  const [fileName,setFileName] = useState('');
  return <label className={`driver-upload-field ${fileName?'has-file':''}`}><span><Icon name={name==='photo'?'driver':'package'}/></span><span><strong>{label}</strong><small>{name==='photo'?'JPG or PNG · Maximum 10 MB':'PDF, JPG or PNG · Maximum 10 MB'}</small></span><input type="file" name={name} accept={accept} required onChange={event=>setFileName(event.target.files?.[0]?.name||'')}/><b title={fileName||undefined}>{fileName||'Upload'}<small>{fileName?'Selected':'Browse'}</small></b></label>;
}

function DriverEntryModal({ trucks, onClose, onAdd }: { trucks: Truck[]; onClose: () => void; onAdd: (driver: Driver, documents: UploadItem[]) => Promise<void> }) {
  const today = new Date().toISOString().slice(0,10);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (busy) return; const form = new FormData(event.currentTarget); const fileName = (name:string) => (form.get(name) as File)?.name || ''; const assigned = String(form.get('assignedVehicle')||''); const driver: Driver = { id:`DRV-${Date.now().toString().slice(-6)}`, assignedTruckId: trucks.find(truck => truck.registration === assigned)?.id, name:String(form.get('name')), phone:String(form.get('phone')), licenceNumber:String(form.get('licenceNumber')), licenceExpiry:String(form.get('licenceExpiry')), city:String(form.get('city')), status:form.get('status') as DriverStatus, assignedVehicle:String(form.get('assignedVehicle')||'')||undefined, photoName:fileName('photo'), licenceFrontName:fileName('licenceFront'), licenceBackName:fileName('licenceBack'), identityProofName:fileName('identityProof') }; setBusy(true); try { await onAdd(driver, filesFromForm(form)); } finally { setBusy(false); } };
  return <div className="modal-backdrop driver-entry-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><div className="modal driver-entry-modal" role="dialog" aria-modal="true" aria-labelledby="driverModalTitle"><div className="modal-head"><div><span className="eyebrow">Driver management</span><h2 id="driverModalTitle">Add driver</h2><p>Add profile, licence and availability details.</p></div><button onClick={onClose} aria-label="Close add driver form"><Icon name="close"/></button></div><form onSubmit={submit} className="driver-entry-form"><section><h3>Driver details</h3><div className="form-grid"><label>Full name<input name="name" placeholder="Enter driver's full name" required autoFocus/></label><label>Phone number<input name="phone" placeholder="+91 98765 43210" required/></label><label>Driving licence number<input name="licenceNumber" placeholder="TN01 20210004567" required/></label><label>Licence expiry date<input name="licenceExpiry" type="date" min={today} required/></label><label>Base city<input name="city" placeholder="Chennai" required/></label><label>Driver status<select name="status"><option>Available</option><option>Assigned</option><option>On trip</option><option>Inactive</option></select></label><label className="driver-vehicle-field">Assign vehicle (optional)<select name="assignedVehicle"><option value="">Not assigned</option>{trucks.map(truck=><option key={truck.id} value={truck.registration}>{truck.registration} · {truck.type}</option>)}</select></label></div></section><section><h3>Photo and documents</h3><p className="driver-form-helper">Upload a clear driver photo, licence copies and either an Aadhaar card or PAN card. All four uploads are required.</p><div className="driver-upload-grid"><DriverUploadField label="Driver photo" name="photo" accept="image/*"/><DriverUploadField label="Licence front" name="licenceFront"/><DriverUploadField label="Licence back" name="licenceBack"/><DriverUploadField label="Aadhaar card or PAN card" name="identityProof"/></div></section><footer><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Add driver'}</button></footer></form></div></div>;
}

function RequestsView({ requests, query, setQuery, status, setStatus, role, onAdd, onOpenRequest, onViewRequest }: { requests: Load[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; role: AccountRole; onAdd: () => void; onOpenRequest: (request: Load) => void; onViewRequest: (request: Load) => void }) {
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const updateLayout = (event: MediaQueryListEvent) => setMobileLayout(event.matches);
    setMobileLayout(media.matches);
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);
  const filtered = requests.filter((request) => (status === 'all' || (status === 'Pending' ? isPendingRequest(request) : request.status === status)) && (!query || Object.values(request).some((value) => normalise(value).includes(normalise(query)))));
  if (mobileLayout) return <section className="view active"><PageHead section="Requests" title={role === 'load_owner' ? 'My truck requests' : 'Customer truck requests'} description={role === 'load_owner' ? 'Post a request and track the owner’s response.' : 'Review each request and choose to accept or reject it.'} actions={role === 'load_owner' ? <button className="primary-btn" onClick={onAdd}>Request a truck</button> : undefined}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pickup, destination or goods"/></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter requests by status"><option value="all">All requests</option><option>Pending</option><option>Accepted</option><option>Rejected</option></select></div>{filtered.length === 0 && <div className="empty">No requests match this filter.</div>}<div className="request-mobile-cards">{filtered.map((request) => { const displayStatus = isPendingRequest(request) ? 'Pending' : request.status; return <details className="request-mobile-card" key={request.id}><summary><span className="request-mobile-route"><strong>{request.origin} <i>→</i> {request.destination}</strong><small>Request #F24-{request.id}</small></span><span className={`status ${statusClass(displayStatus)}`}>{displayStatus}</span><Icon name="chevron"/></summary><div className="request-mobile-body"><div className="request-mobile-facts"><div><span>Goods</span><strong>{request.material}</strong></div><div><span>Weight</span><strong>{request.quantity} tonnes</strong></div><div><span>Truck needed</span><strong>{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</strong></div><div><span>Pickup date</span><strong>{formatDate(request.date)}</strong></div></div>{role === 'truck_owner' && displayStatus === 'Pending' ? <button className="request-mobile-review" onClick={() => onOpenRequest(request)}>Review request <Icon name="chevron"/></button> : <button className="request-mobile-review secondary" onClick={() => onViewRequest(request)}>View details <Icon name="chevron"/></button>}</div></details>; })}</div></section>;
  return <section className="view active"><PageHead section="Requests" title={role === 'load_owner' ? 'My truck requests' : 'Customer truck requests'} description={role === 'load_owner' ? 'Post a request and track the truck owner’s response.' : 'Review each request and choose to accept or reject it.'} actions={role === 'load_owner' ? <button className="primary-btn" onClick={onAdd}>Request a truck</button> : undefined}/><div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pickup, destination or goods"/></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter requests by status"><option value="all">All requests</option><option>Pending</option><option>Accepted</option><option>Rejected</option></select></div><div className="table-wrap"><table><thead><tr><th>Route</th><th>Goods</th><th>Truck needed</th><th>Pickup date</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map((request) => { const displayStatus = isPendingRequest(request) ? 'Pending' : request.status; return <tr key={request.id}><td><button className="request-route-link" onClick={() => onViewRequest(request)}><strong>{request.origin} → {request.destination}</strong><small>Request #F24-{request.id}</small></button></td><td><strong>{request.material}</strong><small>{request.quantity} tonnes</small></td><td><span className="type-pill">{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</span></td><td>{formatDate(request.date)}</td><td><span className={`status ${statusClass(displayStatus)}`}>{displayStatus}</span></td><td>{role === 'truck_owner' && displayStatus === 'Pending' ? <button className="review-request-btn" onClick={() => onOpenRequest(request)}>Review</button> : <button className="view-request-btn" onClick={() => onViewRequest(request)}>View details</button>}</td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="empty">No requests match this filter.</div>}</div></section>;
}

function ProfileView({ onSaved, onSave, profile, role }: { onSaved: () => void; onSave?: (values: { business: string; contact: string; email: string; phone: string; city: string; gstin: string }) => Promise<void>; profile?: RegistrationProfile | null; role: AccountRole }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const value = (key: string) => String(form.get(key) ?? ''); if (onSave) { setBusy(true); try { await onSave({ business: value('business'), contact: value('contact'), email: value('email'), phone: value('phone'), city: value('location'), gstin: value('gst') }); setSaved(true); } catch { setSaved(false); } finally { setBusy(false); } return; } setSaved(true); onSaved(); };
  const fallback = role === 'load_owner'
    ? { name: 'Ananya Mehta', business: 'Mehta Foods', email: 'customer@fares24x7.demo', phone: '+91 98765 41002', city: 'Bengaluru' }
    : { name: 'Rajesh Sharma', business: 'Sharma Roadways', email: 'owner@fares24x7.demo', phone: '+91 98765 43210', city: 'Chennai' };
  const name = profile ? `${profile.firstName} ${profile.lastName}` : fallback.name;
  const business = profile?.business || fallback.business;
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const phone = profile?.phone ? `+91 ${profile.phone}` : fallback.phone;
  return <section className="view active"><PageHead section="Manage / Business profile" title="Business profile" description="Contact and business information visible across the portal."/><form className="panel profile-form" onSubmit={submit} onChange={() => setSaved(false)}><div className="profile-banner"><div className="avatar large">{initials}</div><div><h2>{business}</h2><span>{role === 'load_owner' ? 'Verified customer business' : 'Verified transport operator'}</span></div></div><div className="form-grid"><label><span className="field-label">Business name <span className="required-mark" aria-hidden="true">*</span></span><input name="business" defaultValue={business} minLength={2} maxLength={120} autoComplete="organization" required/></label><label><span className="field-label">Contact person <span className="required-mark" aria-hidden="true">*</span></span><input name="contact" defaultValue={name} minLength={2} maxLength={80} autoComplete="name" required/></label><label><span className="field-label">Email <span className="required-mark" aria-hidden="true">*</span></span><input type="email" name="email" defaultValue={profile?.email || fallback.email} autoComplete="email" required/></label><label><span className="field-label">Phone <span className="required-mark" aria-hidden="true">*</span></span><input type="tel" name="phone" defaultValue={phone} pattern="(\+91[\s\-]?)?[6-9][0-9]{4}[\s\-]?[0-9]{5}" title="Enter a 10-digit Indian mobile number, e.g. +91 98765 43210" autoComplete="tel" required/></label><label><span className="field-label">Base location <span className="required-mark" aria-hidden="true">*</span></span><input name="location" defaultValue={profile?.city || fallback.city} minLength={2} autoComplete="address-level2" required/></label><label><span className="field-label">GSTIN <span className="optional">Optional</span></span><input name="gst" defaultValue={profile?.details?.gstin ?? ''} placeholder="22AAAAA0000A1Z5" pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]" maxLength={15} title="Enter a valid 15-character GSTIN, e.g. 22AAAAA0000A1Z5" style={{ textTransform: 'uppercase' }}/></label></div><div className="form-footer"><span>{saved ? 'Profile saved just now' : <em className="form-hint">Fields marked <b className="required-mark">*</b> are required</em>}</span><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div></form></section>;
}

function RequestDecisionModal({ request, onClose, onDecision }: { request: Load; onClose: () => void; onDecision: (status: Extract<LoadStatus, 'Accepted' | 'Rejected'>) => Promise<boolean> }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const acceptTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(acceptTimer.current), []);
  const acceptRequest = async () => {
    if (accepted || busy) return;
    setBusy(true);
    const ok = await onDecision('Accepted');
    setBusy(false);
    if (!ok) return;
    setAccepted(true);
    acceptTimer.current = window.setTimeout(onClose, 1800);
  };
  const rejectRequest = async () => { if (busy) return; setBusy(true); await onDecision('Rejected'); setBusy(false); };
  return <div className="modal-backdrop request-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !accepted && onClose()}><div className={`modal request-decision-modal${accepted ? ' request-accepted' : ''}`} role="dialog" aria-modal="true" aria-labelledby={accepted ? 'requestAcceptedTitle' : 'requestTitle'}>{accepted ? <div className="request-success request-success-simple" role="status"><span className="request-success-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span><span className="eyebrow">Request confirmed</span><h2 id="requestAcceptedTitle">You’ve accepted the trip</h2><p>{request.origin} → {request.destination}. The customer has been notified and can see your response.</p><button className="primary-btn" onClick={onClose}>Done</button></div> : <><div className="modal-head"><div><span className="eyebrow">New truck request</span><h2 id="requestTitle">Can you take this trip?</h2></div><button onClick={onClose} aria-label="Close request"><Icon name="close"/></button></div><div className="request-decision-body"><div className="request-route-hero"><div className="request-route-point request-route-pickup"><span className="request-route-pin"><Icon name="pin"/></span><div><small>Pickup</small><strong>{request.origin}</strong></div></div><i className="route-journey" aria-hidden="true"><svg viewBox="0 0 150 38"><path d="M16 19 H134 L123 9 M134 19 L123 29"/></svg></i><div className="request-route-point request-route-delivery"><div><small>Delivery</small><strong>{request.destination}</strong></div></div></div><div className="request-detail-grid"><div><span>Goods</span><strong>{request.material}</strong></div><div><span>Weight</span><strong>{request.quantity} tonnes</strong></div><div><span>Truck needed</span><strong>{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</strong></div><div><span>Pickup date</span><strong>{formatDate(request.date)}</strong></div></div><p className="request-help">Accept if you can provide a truck for this request. The customer will be notified immediately.</p></div><div className="request-decision-actions"><button className="reject-request-btn" onClick={rejectRequest} disabled={busy}>Reject</button><button className="accept-request-btn" onClick={acceptRequest} disabled={busy}>{busy ? 'Confirming…' : 'Accept request'} <Icon name="arrow"/></button></div></>}</div></div>;
}

function RequestDetailsModal({ request, role, onClose, onRespond }: { request: Load; role: AccountRole; onClose: () => void; onRespond: (request: Load) => void }) {
  const displayStatus = isPendingRequest(request) ? 'Pending' : request.status;
  const statusHelp = role === 'load_owner'
    ? displayStatus === 'Accepted' ? `A truck owner accepted this request${request.bookedTruck ? ` and assigned ${request.bookedTruck}` : ''}.` : displayStatus === 'Rejected' ? 'This request was not taken. You can post a new request with a different date or truck type.' : 'Waiting for a truck owner to accept. You will be notified as soon as someone does.'
    : displayStatus === 'Accepted' ? `You accepted this trip${request.bookedTruck ? ` with ${request.bookedTruck}` : ''}. The customer has been notified.` : displayStatus === 'Rejected' ? 'You declined this request.' : 'This request is waiting for your answer.';
  return <div className="modal-backdrop request-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal request-decision-modal request-details-modal" role="dialog" aria-modal="true" aria-labelledby="requestDetailsTitle">
    <div className="modal-head"><div><span className="eyebrow">Request #F24-{request.id}</span><h2 id="requestDetailsTitle">{request.origin} → {request.destination}</h2></div><button onClick={onClose} aria-label="Close request details"><Icon name="close"/></button></div>
    <div className="request-decision-body">
      <div className={`request-status-banner ${statusClass(displayStatus)}`}><span className={`status ${statusClass(displayStatus)}`}>{displayStatus}</span><p>{statusHelp}</p></div>
      <div className="request-route-hero"><div className="request-route-point request-route-pickup"><span className="request-route-pin"><Icon name="pin"/></span><div><small>Pickup</small><strong>{request.origin}</strong></div></div><i className="route-journey" aria-hidden="true"><svg viewBox="0 0 150 38"><path d="M16 19 H134 L123 9 M134 19 L123 29"/></svg></i><div className="request-route-point request-route-delivery"><div><small>Delivery</small><strong>{request.destination}</strong></div></div></div>
      <div className="request-detail-grid"><div><span>Goods</span><strong>{request.material}</strong></div><div><span>Weight</span><strong>{request.quantity} tonnes</strong></div><div><span>Truck needed</span><strong>{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</strong></div><div><span>Pickup date</span><strong>{formatDate(request.date)}</strong></div>{request.bookedTruck && <div><span>Assigned truck</span><strong>{request.bookedTruck}</strong></div>}</div>
    </div>
    <div className="request-decision-actions">{role === 'truck_owner' && displayStatus === 'Pending' ? <><button className="reject-request-btn" onClick={onClose}>Close</button><button className="accept-request-btn" onClick={() => onRespond(request)}>Respond to request <Icon name="arrow"/></button></> : <button className="accept-request-btn request-details-close" onClick={onClose}>Close</button>}</div>
  </div></div>;
}

function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }: { title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return <div className="modal-backdrop confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><div className="modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMessage"><h2 id="confirmTitle">{title}</h2><p id="confirmMessage">{message}</p><div className="confirm-actions"><button className="secondary-btn" onClick={onCancel} autoFocus>Cancel</button><button className="primary-btn" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}

interface ModalProps { type: 'truck' | 'load'; onClose: () => void; onAddTruck: (truck: Truck, documents: UploadItem[]) => Promise<void>; onAddLoad: (load: Load) => Promise<void>; }
function VehicleDocumentUpload({ label, name }: { label: string; name: string }) {
  const [fileName, setFileName] = useState('');
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => setFileName(event.target.files?.[0]?.name || '');
  return <label className={`vehicle-upload-field ${fileName ? 'has-file' : ''}`}><span><Icon name="package"/></span><span><strong>{label}</strong><small>PDF, JPG or PNG · Maximum 10 MB</small></span><input type="file" name={name} accept=".pdf,image/*" onChange={selectFile} required/><b title={fileName || undefined}>{fileName || 'Choose file'}<i>{fileName ? 'Selected' : 'Browse'}</i></b></label>;
}

function EntryModal({ type, onClose, onAddTruck, onAddLoad }: ModalProps) {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [busy, setBusy] = useState(false);
  const guard = async (task: () => Promise<void>) => { if (busy) return; setBusy(true); try { await task(); } finally { setBusy(false); } };
  const submitTruck = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void guard(() => onAddTruck({ id: crypto.randomUUID(), registration: String(data.get('registration')), type: String(data.get('type')), capacity: Number(data.get('capacity')), location: String(data.get('location')), destination: String(data.get('destination')), status: data.get('status') as TruckStatus, engineNumber: String(data.get('engineNumber')), chassisNumber: String(data.get('chassisNumber')) }, filesFromForm(data))); };
  const submitLoad = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void guard(() => onAddLoad({ id: crypto.randomUUID(), origin: String(data.get('origin')), destination: String(data.get('destination')), material: String(data.get('material')), quantity: Number(data.get('quantity')), type: data.get('type') as LoadType, date: String(data.get('date')), status: 'Pending' })); };
  return <div className={`modal-backdrop ${type === 'truck' ? 'vehicle-entry-backdrop' : ''}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal ${type === 'truck' ? 'vehicle-entry-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div className="modal-head"><div><span className="eyebrow">{type === 'truck' ? 'Fleet' : 'Truck request'}</span><h2 id="modalTitle">{type === 'truck' ? 'Add vehicle' : 'Request a truck'}</h2></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></div>{type === 'truck' ? <form className="modal-form vehicle-entry-form" onSubmit={submitTruck}><div className="vehicle-form-heading"><span>Vehicle details</span><p>Enter the vehicle's operating and identification details.</p></div><div className="form-grid"><label>Registration number<input name="registration" placeholder="TN 01 AB 1234" required autoFocus/></label><label>Vehicle type<select name="type"><option>32 ft Multi Axle</option><option>20 ft Container</option><option>24 ft Single Axle</option><option>14 ft LCV</option></select></label><label>Engine number<input name="engineNumber" placeholder="Enter engine number" required/></label><label>Chassis number<input name="chassisNumber" placeholder="Enter chassis number" required/></label><label>Capacity (tonnes)<input name="capacity" type="number" min="1" max="50" defaultValue="16" required/></label><label>Current location<input name="location" placeholder="Chennai" required/></label><label>Typical destination<input name="destination" placeholder="Ahmedabad" required/></label><label>Availability<select name="status"><option>Available</option><option>In transit</option><option>Unavailable</option></select></label></div><div className="vehicle-form-heading documents-heading"><span>Vehicle documents</span><p>Upload clear and valid copies for verification.</p></div><div className="vehicle-document-grid"><VehicleDocumentUpload label="RC book front" name="rcFront"/><VehicleDocumentUpload label="RC book back" name="rcBack"/><VehicleDocumentUpload label="Fitness certificate" name="fitness"/><VehicleDocumentUpload label="PUC certificate" name="puc"/><VehicleDocumentUpload label="Valid insurance" name="insurance"/></div><div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Add vehicle'}</button></div></form> : <form className="modal-form" onSubmit={submitLoad}><div className="form-grid"><label>Pickup location<input name="origin" placeholder="Ahmedabad" required autoFocus/></label><label>Delivery destination<input name="destination" placeholder="Chennai" required/></label><label>Goods description<input name="material" placeholder="Textiles" required/></label><label>Approx. weight (tonnes)<input name="quantity" type="number" min="1" max="50" defaultValue="12" required/></label><label>Truck requirement<select name="type"><option value="FTL">Full truck</option><option value="PTL">Shared truck</option></select></label><label>Pickup date<input name="date" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={tomorrow} required/></label></div><div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post request'}</button></div></form>}</div></div>;
}

export default function App() {
  const backend = isBackendEnabled;
  const session = useSession();
  const backendProfile = backend ? session.profile : null;
  const live = useWorkspace(backendProfile?.role ?? null, backendProfile ? session.userId : null);

  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const [demoAuthenticated, setDemoAuthenticated] = useState(() => !backend && (localStorage.getItem('fares24x7-auth') === '1' || demo));
  // A failed Google sign-in comes back as ?error_description=... (or in the #hash).
  const [oauthError] = useState(() => {
    const params = new URLSearchParams(`${location.search.slice(1)}&${location.hash.slice(1)}`);
    const message = params.get('error_description');
    if (message) history.replaceState(null, '', location.pathname);
    return message ? `Google sign-in failed: ${message.replace(/\+/g, ' ')}` : '';
  });
  const [authModal, setAuthModal] = useState<AuthMode | null>(() => {
    if (oauthError) return 'login';
    const requested = new URLSearchParams(location.search).get('auth');
    return requested === 'login' || requested === 'signup' ? requested : null;
  });
  const [demoData, setData] = useLocalStorage<PortalData>(STORE_KEY, seedData);
  const [demoDrivers, setDrivers] = useLocalStorage<Driver[]>('fares24x7-drivers-v1', seedDrivers);
  const [demoTickets, setSupportTickets] = useLocalStorage<SupportTicket[]>('fares24x7-support-tickets-v1', []);
  const data = backend ? live.workspace.data : demoData;
  const drivers = backend ? live.workspace.drivers : demoDrivers;
  const supportTickets = backend ? live.workspace.tickets : demoTickets;
  const storedRole = localStorage.getItem('fares24x7-role');
  const activeRole: AccountRole = backendProfile ? backendProfile.role : storedRole === 'admin' ? 'admin' : storedRole === 'load_owner' ? 'load_owner' : 'truck_owner';
  const activeProfile = backendProfile ? api.toRegistrationProfile(backendProfile) : (() => { try { const value = localStorage.getItem('fares24x7-profile'); return value ? JSON.parse(value) as RegistrationProfile : null; } catch { return null; } })();
  const authenticated = backend ? Boolean(session.userId && backendProfile) : demoAuthenticated;
  const [view, setView] = useState<ViewName>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<'truck' | 'load' | null>(null);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [truckQuery, setTruckQuery] = useState('');
  const [truckStatus, setTruckStatus] = useState('all');
  const [driverQuery, setDriverQuery] = useState('');
  const [driverStatus, setDriverStatus] = useState('all');
  const [loadQuery, setLoadQuery] = useState('');
  const [adminQuery, setAdminQuery] = useState('');
  const [requestStatus, setRequestStatus] = useState('all');
  const [adminPendingCount, setAdminPendingCount] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fares24x7-admin-accounts-v1') || '[]') as Array<{ verification?: string }>;
      return stored.length ? stored.filter(account => account.verification !== 'Verified').length : 3;
    } catch { return 3; }
  });
  const [requestModal, setRequestModal] = useState<Load | null>(() => !backend && activeRole === 'truck_owner' ? data.loads.find(isPendingRequest) ?? null : null);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [viewRequest, setViewRequest] = useState<Load | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const counts = { trucks: data.trucks.length, drivers: drivers.length, requests: data.loads.filter(isPendingRequest).length, approvals: adminPendingCount, support: supportTickets.filter(ticket => ticket.status !== 'Resolved').length };

  const notify = (message: string, duration = 2500) => { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), duration); };
  const fail = (problem: unknown) => notify(friendlyError(problem), 5000);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') { setModal(null); setDriverModalOpen(false); setRequestModal(null); setSelectedTruck(null); setViewRequest(null); } }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, []);
  useEffect(() => { if (authenticated) setAuthModal(null); }, [authenticated]);

  if (backend && !session.ready) return <div className="app-loading" role="status"><span className="brand-mark">F24</span><p>Loading your workspace…</p></div>;

  if (backend && backendProfile?.account_status === 'suspended') {
    return <div className="app-loading" role="alert"><span className="brand-mark">F24</span><h1>Account suspended</h1><p>Your Fares24x7 account is currently suspended. Contact support@fares24x7.com for help.</p><button className="primary-btn" onClick={() => void api.signOut()}>Sign out</button></div>;
  }

  if (backend && backendProfile && !backendProfile.onboarded) {
    return <OnboardingScreen email={backendProfile.email} firstName={backendProfile.first_name} lastName={backendProfile.last_name} avatarUrl={backendProfile.avatar_url}
      onSignOut={() => void api.signOut()}
      onComplete={async (role, details) => { await api.completeOnboarding(role, details); await session.refreshProfile(); }}/>;
  }

  if (!authenticated) {
    const enterWorkspace = (profile?: RegistrationProfile) => { if (profile) { localStorage.setItem('fares24x7-role', profile.role); localStorage.setItem('fares24x7-profile', JSON.stringify(profile)); localStorage.setItem('fares24x7-kyc', 'pending'); } localStorage.setItem('fares24x7-auth', '1'); setAuthModal(null); setDemoAuthenticated(true); };
    const authBackend = backend ? { signIn: api.signIn, signUp: api.signUp, google: api.signInWithGoogle, resetPassword: api.sendPasswordReset } : undefined;
    return <><Landing onLogin={() => setAuthModal('login')} onSignup={() => setAuthModal('signup')} />{authModal && <RoleAuthModal mode={authModal} backend={authBackend} initialMessage={oauthError || undefined} onClose={() => setAuthModal(null)} onModeChange={setAuthModal} onComplete={enterWorkspace}/>}</>;
  }

  const userId = session.userId ?? '';
  const navigate = (next: ViewName) => { setView(next); setMenuOpen(false); if (next === 'loads') setRequestStatus('all'); if (next === 'trucks') setTruckStatus('all'); if (next === 'dashboard' && activeRole === 'truck_owner' && !backend) setRequestModal(data.loads.find(isPendingRequest) ?? null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openRequests = (status: string) => { navigate('loads'); setRequestStatus(status); };
  const openTrucks = (status: string) => { navigate('trucks'); setTruckStatus(status); };
  const globalSearch = (value: string) => {
    if (activeRole === 'admin') {
      setAdminQuery(value);
      if (value.trim().length > 1) navigate('admin-users');
      return;
    }
    setLoadQuery(value);
    if (value.trim().length > 1) navigate('loads');
  };

  const addTruck = async (truck: Truck, documents: UploadItem[]) => {
    if (backend) {
      try { await api.createTruck(userId, truck, documents); await live.reload(); } catch (problem) { fail(problem); return; }
    } else setData((current) => ({ ...current, trucks: [truck, ...current.trucks] }));
    setModal(null); notify('Vehicle added successfully');
  };
  const addDriver = async (driver: Driver, documents: UploadItem[]) => {
    if (backend) {
      try { await api.createDriver(userId, driver, documents); await live.reload(); } catch (problem) { fail(problem); return; }
    } else setDrivers(current => [driver, ...current]);
    setDriverModalOpen(false); notify('Driver added with photo and documents');
  };
  const addLoad = async (load: Load) => {
    if (backend) {
      try { await api.createLoad(userId, load); await live.reload(); } catch (problem) { fail(problem); return; }
    } else setData((current) => ({ ...current, loads: [load, ...current.loads] }));
    setModal(null); notify('Truck request posted');
  };
  /** Accept keeps the modal open for the success animation (it closes itself); reject closes immediately. */
  const decideRequest = async (status: Extract<LoadStatus, 'Accepted' | 'Rejected'>): Promise<boolean> => {
    if (!requestModal) return false;
    if (backend) {
      try {
        if (status === 'Accepted') {
          const registration = await api.acceptLoad(requestModal.id);
          notify(registration ? `Request accepted — ${registration} assigned and the customer notified` : 'Request accepted — the customer has been notified', 4000);
        } else {
          await api.declineLoad(userId, requestModal.id);
          notify('Request declined');
        }
        await live.reload();
      } catch (problem) { fail(problem); await live.reload(); return false; }
    } else {
      setData((current) => ({ ...current, loads: current.loads.map((request) => request.id === requestModal.id ? { ...request, status } : request) }));
      notify(status === 'Accepted' ? 'Request accepted — the customer has been notified' : 'Request rejected');
    }
    if (status === 'Rejected') setRequestModal(null);
    return true;
  };
  const submitSupport = async (ticket: SupportTicket) => {
    if (backend) {
      try { const id = await api.createTicket(userId, ticket); await live.reload(); setSupportOpen(false); notify(`Query ${id} submitted to support`); } catch (problem) { fail(problem); }
      return;
    }
    setSupportTickets(current => [ticket, ...current]); setSupportOpen(false); notify(`Query ${ticket.id} submitted to support`);
  };
  const saveProfile = backend ? async (values: Parameters<typeof api.updateProfile>[1]) => {
    try { await api.updateProfile(userId, values); await session.refreshProfile(); notify('Business profile updated'); } catch (problem) { fail(problem); throw problem; }
  } : undefined;
  const submitKyc = backend ? async (details: Record<string, string>, documents: UploadItem[]) => {
    await api.submitKyc(userId, details, documents);
    await session.refreshProfile();
    notify('Verification submitted — our team will review it shortly', 4000);
  } : undefined;
  const markNotificationsRead = (ids: string[]) => {
    live.setNotifications(current => current.map(item => ids.includes(item.id) ? { ...item, read: true } : item));
    void api.markNotificationsRead(ids).catch(fail);
  };
  const logout = () => { if (backend) { void api.signOut(); setView('dashboard'); return; } localStorage.removeItem('fares24x7-auth'); setDemoAuthenticated(false); };

  return <div className={`app-shell ${activeRole === 'admin' ? 'admin-shell' : ''}`}>
    <Sidebar view={view} role={activeRole} profile={activeProfile} counts={counts} open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} onLogout={() => setConfirmLogout(true)}/>
    <main className="main"><Topbar role={activeRole} onMenu={() => setMenuOpen(true)} onSearch={globalSearch} onNavigate={navigate} searchRef={searchRef} onOpenSupport={() => setSupportOpen(true)} notifications={backend ? live.notifications : undefined} onMarkRead={markNotificationsRead}/><div className="content">
      {backend && live.error && <div className="workspace-error" role="alert">Could not load the latest data: {live.error} <button onClick={() => void live.reload()}>Retry</button></div>}
      {activeRole === 'admin' ? <AdminConsole view={view} data={data} globalQuery={adminQuery} onNavigate={navigate} notify={notify} onPendingCountChange={setAdminPendingCount} supportTickets={supportTickets} setSupportTickets={setSupportTickets} backend={backend ? { reload: live.reload, fail } : undefined}/> : <>
        {view === 'dashboard' && <Dashboard data={data} role={activeRole} profile={activeProfile} onOpenModal={setModal} onNavigate={navigate} onOpenRequest={setRequestModal} onViewRequest={setViewRequest} onOpenRequests={openRequests} onOpenTrucks={openTrucks} kycStatus={backendProfile ? api.kycLabel[backendProfile.kyc_status] : undefined} onSubmitKyc={submitKyc}/>}
        {view === 'trucks' && <TrucksView trucks={data.trucks} drivers={drivers} query={truckQuery} setQuery={setTruckQuery} status={truckStatus} setStatus={setTruckStatus} onAdd={() => setModal('truck')} onOpen={setSelectedTruck}/>}
        {view === 'drivers' && activeRole === 'truck_owner' && <DriversView drivers={drivers} query={driverQuery} setQuery={setDriverQuery} status={driverStatus} setStatus={setDriverStatus} onAdd={()=>setDriverModalOpen(true)}/>}
        {view === 'loads' && <RequestsView requests={data.loads} query={loadQuery} setQuery={setLoadQuery} status={requestStatus} setStatus={setRequestStatus} role={activeRole} onAdd={() => setModal('load')} onOpenRequest={setRequestModal} onViewRequest={setViewRequest}/>}
        {view === 'profile' && <ProfileView key={backendProfile?.business_name ?? 'demo'} profile={activeProfile} role={activeRole} onSave={saveProfile} onSaved={() => notify('Business profile updated')}/>}
      </>}
    </div></main>
    <MobileBottomNav view={view} role={activeRole} onNavigate={navigate}/>
    {modal && activeRole !== 'admin' && <EntryModal type={modal} onClose={() => setModal(null)} onAddTruck={addTruck} onAddLoad={addLoad}/>}
    {driverModalOpen && activeRole === 'truck_owner' && <DriverEntryModal trucks={data.trucks} onClose={()=>setDriverModalOpen(false)} onAdd={addDriver}/>}
    {requestModal && activeRole === 'truck_owner' && <RequestDecisionModal request={requestModal} onClose={() => setRequestModal(null)} onDecision={decideRequest}/>}
    {selectedTruck && activeRole !== 'admin' && <VehicleDetailsModal truck={selectedTruck} driver={drivers.find(driver=>driver.assignedVehicle===selectedTruck.registration)} onClose={() => setSelectedTruck(null)}/>}
    {supportOpen && activeRole !== 'admin' && <SupportQueryModal profile={activeProfile} onClose={() => setSupportOpen(false)} onSubmit={ticket => void submitSupport(ticket)}/>}
    {viewRequest && activeRole !== 'admin' && <RequestDetailsModal request={data.loads.find(item => item.id === viewRequest.id) ?? viewRequest} role={activeRole} onClose={() => setViewRequest(null)} onRespond={(request) => { setViewRequest(null); setRequestModal(request); }}/>}
    {confirmLogout && <ConfirmDialog title="Log out of Fares24x7?" message="You will need to sign in again to access your workspace." confirmLabel="Log out" onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); logout(); }}/>}
    <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
  </div>;
}
