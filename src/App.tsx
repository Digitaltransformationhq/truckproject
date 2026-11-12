import { useEffect, useRef, useState } from 'react';
import { startGoogleOneTap } from './lib/googleIdentity';
import type { FormEvent, RefObject } from 'react';
import { Landing } from './components/Landing';
import { RoleAuthModal, type AccountRole, type AuthMode, type RegistrationProfile } from './components/RoleAuthModal';
import { KycModal } from './components/KycModal';
import { Icon, type IconName } from './components/Icon';
import { AdminConsole } from './components/AdminConsole';
import { SupportQueryModal } from './components/SupportQueryModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PasswordRecovery } from './components/PasswordRecovery';
import { SupportView } from './components/SupportView';
import { DriverFormModal, DriversView, TrucksView, VehicleDetailsModal, VehicleFormModal, type FleetActions } from './components/FleetViews';
import { LoadFormModal, RequestDecisionModal, RequestDetailsModal, RequestsView, requestLabel, type RequestActions } from './components/RequestViews';
import { ConfirmDialog, PageHead, isPendingRequest, statusClass } from './components/ui';
import { seedData, seedDrivers } from './data/seed';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatDate } from './lib/matching';
import { friendlyError, isBackendEnabled } from './lib/supabase';
import * as api from './lib/backend';
import { type UploadItem } from './lib/backend';
import { useSession, useWorkspace } from './hooks/useBackend';
import type { AppNotification, Driver, Load, PortalData, SupportTicket, Truck, VerificationStatus, ViewName } from './types';

const STORE_KEY = 'fares24x7-phase1-v2';
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
        <button className={`nav-item ${view === 'support' ? 'active' : ''}`} aria-current={view === 'support' ? 'page' : undefined} onClick={() => onNavigate('support')}><span><Icon name="headset" /></span>Support{counts.support > 0 && <b className="accent-count">{counts.support}</b>}</button></>}
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
    { view: 'support', label: 'Support', icon: 'headset' },
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

function Dashboard({ data, role, profile, onOpenModal, onNavigate, onOpenRequest, onViewRequest, onOpenRequests, onOpenTrucks, kycStatus, kycIssues, onSubmitKyc }: { data: PortalData; role?: AccountRole; profile?: RegistrationProfile | null; onOpenModal: (type: 'truck' | 'load') => void; onNavigate: (view: ViewName) => void; onOpenRequest: (request: Load) => void; onViewRequest: (request: Load) => void; onOpenRequests: (status: string) => void; onOpenTrucks: (status: string) => void; kycStatus?: VerificationStatus; kycIssues?: string[]; onSubmitKyc?: (details: Record<string, string>, documents: UploadItem[]) => Promise<void> }) {
  const activeRole: AccountRole = role ?? (localStorage.getItem('fares24x7-role') === 'load_owner' ? 'load_owner' : 'truck_owner');
  const [kycOpen, setKycOpen] = useState(false);
  const [kycComplete, setKycComplete] = useState(() => localStorage.getItem('fares24x7-kyc') === 'complete');
  const pendingRequests = data.loads.filter(isPendingRequest);
  const acceptedRequests = data.loads.filter(({ status }) => status === 'Accepted');
  const completedRequests = data.loads.filter(({ status }) => status === 'Completed');
  const kycState: VerificationStatus = kycStatus ?? (kycComplete ? 'Verified' : 'Not submitted');
  const kycCopy = kycState === 'Pending' ? { title: 'Verification under review', text: 'Our team is checking your documents. We will notify you once it is complete.', badge: 'In review', action: false, button: '' }
    : kycState === 'Needs information' ? { title: 'More information needed', text: 'Some KYC details could not be verified. Please review them and submit again.', badge: 'Action needed', action: true, button: 'Update KYC' }
    : kycState === 'Rejected' ? { title: 'Verification was not approved', text: 'Contact support if you believe this is a mistake.', badge: 'Rejected', action: false, button: '' }
    : { title: activeRole === 'load_owner' ? 'Verify your customer account' : 'Complete your business KYC', text: activeRole === 'load_owner' ? 'Confirm your business, GST and billing details before posting truck requests.' : 'Verify identity, company details and GST registration to activate full platform access.', badge: 'Pending', action: true, button: activeRole === 'load_owner' ? 'Verify business' : 'Complete KYC' };
  const available = data.trucks.filter(({ status }) => status === 'Available');
  const inTransit = data.trucks.filter(({ status }) => status === 'In transit');
  return <section className="view active">
    <PageHead section="Dashboard" title={`${greeting}, ${profile?.firstName || (activeRole === 'load_owner' ? 'Ananya' : 'Rajesh')}`} description={activeRole === 'load_owner' ? 'Post a truck request and track the owner’s response.' : 'Review customer requests and accept the work that suits you.'}/>
    {kycState !== 'Verified' && <div className="kyc-banner"><span className="kyc-banner-icon"><Icon name="building"/></span><div><strong>{kycCopy.title}</strong><p>{kycCopy.text}</p>{kycState === 'Needs information' && kycIssues && kycIssues.length > 0 && <ul className="kyc-issues">{kycIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}{kycStatus !== undefined && <p className="kyc-gate-note">{activeRole === 'load_owner' ? 'You can post truck requests once verified.' : 'You can accept requests once verified. You can already add vehicles and drivers.'}</p>}</div><span className="kyc-banner-state">{kycCopy.badge}</span>{kycCopy.action && <button onClick={() => setKycOpen(true)}>{kycCopy.button} <Icon name="arrow"/></button>}</div>}
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
      <button className="metric" onClick={() => onOpenRequests('Completed')}><div className="metric-icon"><Icon name="route"/></div><div><span>Delivered</span><strong>{completedRequests.length}</strong><small>Completed trips</small></div></button>
    </> : <>
      <button className="metric highlight" onClick={() => onOpenRequests('Pending')}><div className="metric-icon"><Icon name="inbox"/></div><div><span>Pending requests</span><strong>{pendingRequests.length}</strong><small><b>Need a response</b></small></div></button>
      <button className="metric" onClick={() => onOpenRequests('Accepted')}><div className="metric-icon"><Icon name="package"/></div><div><span>Accepted requests</span><strong>{acceptedRequests.length}</strong><small>Confirmed by truck owners</small></div></button>
      <button className="metric" onClick={() => onOpenTrucks('all')}><div className="metric-icon"><Icon name="truck"/></div><div><span>My vehicles</span><strong>{data.trucks.length}</strong><small><b>{available.length} available</b></small></div></button>
      <button className="metric" onClick={() => onOpenTrucks('In transit')}><div className="metric-icon"><Icon name="route"/></div><div><span>On the road</span><strong>{inTransit.length}</strong><small>Trucks currently moving</small></div></button>
    </>}</div>
    <section className="panel request-panel"><div className="panel-head"><div><h2>{activeRole === 'load_owner' ? 'Your recent requests' : 'Incoming truck requests'}</h2><p>{activeRole === 'load_owner' ? 'See whether a truck owner has accepted your request.' : 'Open a request to accept or reject it.'}</p></div><button className="text-link view-all-link" onClick={() => onNavigate('loads')}>View all <Icon name="chevron"/></button></div><div className="request-list">{data.loads.slice(0, 4).map((request) => <button className="request-list-item" key={request.id} onClick={() => activeRole === 'truck_owner' && isPendingRequest(request) ? onOpenRequest(request) : onViewRequest(request)}><span className="request-route"><strong>{request.origin} → {request.destination}</strong><small>{request.material} · {request.quantity} tonnes · {formatDate(request.date)}</small></span><span className={`status ${statusClass(requestLabel(request, activeRole))}`}>{requestLabel(request, activeRole)}</span><Icon name="chevron"/></button>)}</div></section>
    {kycOpen && <KycModal role={activeRole} onSubmit={onSubmitKyc} onClose={() => setKycOpen(false)} onComplete={() => { if (!onSubmitKyc) setKycComplete(true); setKycOpen(false); }}/>} 
  </section>;
}

function ProfileView({ onSaved, onSave, profile, role, kycStatus }: { kycStatus?: VerificationStatus; onSaved: () => void; onSave?: (values: { business: string; contact: string; email: string; phone: string; city: string; gstin: string }) => Promise<void>; profile?: RegistrationProfile | null; role: AccountRole }) {
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
  return <section className="view active"><PageHead section="Manage / Business profile" title="Business profile" description="Contact and business information visible across the portal."/><form className="panel profile-form" onSubmit={submit} onChange={() => setSaved(false)}><div className="profile-banner"><div className="avatar large">{initials}</div><div><h2>{business}</h2><span className={kycStatus && kycStatus !== 'Verified' ? 'profile-unverified' : undefined}>{kycStatus && kycStatus !== 'Verified' ? `KYC: ${kycStatus}` : role === 'load_owner' ? 'Verified customer business' : 'Verified transport operator'}</span></div></div><div className="form-grid"><label><span className="field-label">Business name <span className="required-mark" aria-hidden="true">*</span></span><input name="business" defaultValue={business} minLength={2} maxLength={120} autoComplete="organization" required/></label><label><span className="field-label">Contact person <span className="required-mark" aria-hidden="true">*</span></span><input name="contact" defaultValue={name} minLength={2} maxLength={80} autoComplete="name" required/></label><label><span className="field-label">Email <span className="required-mark" aria-hidden="true">*</span></span><input type="email" name="email" defaultValue={profile?.email || fallback.email} autoComplete="email" required/></label><label><span className="field-label">Phone <span className="required-mark" aria-hidden="true">*</span></span><input type="tel" name="phone" defaultValue={phone} pattern="(\+91[\s\-]?)?[6-9][0-9]{4}[\s\-]?[0-9]{5}" title="Enter a 10-digit Indian mobile number, e.g. +91 98765 43210" autoComplete="tel" required/></label><label><span className="field-label">Base location <span className="required-mark" aria-hidden="true">*</span></span><input name="location" defaultValue={profile?.city || fallback.city} minLength={2} autoComplete="address-level2" required/></label><label><span className="field-label">GSTIN <span className="optional">Optional</span></span><input name="gst" defaultValue={profile?.details?.gstin ?? ''} placeholder="22AAAAA0000A1Z5" pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]" maxLength={15} title="Enter a valid 15-character GSTIN, e.g. 22AAAAA0000A1Z5" style={{ textTransform: 'uppercase' }}/></label></div><div className="form-footer"><span>{saved ? 'Profile saved just now' : <em className="form-hint">Fields marked <b className="required-mark">*</b> are required</em>}</span><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div></form></section>;
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
  const kycStatus = backendProfile ? api.kycLabel[backendProfile.kyc_status] : undefined;
  const [view, setView] = useState<ViewName>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<{ initial?: Truck } | null>(null);
  const [loadFormOpen, setLoadFormOpen] = useState(false);
  const [driverForm, setDriverForm] = useState<{ initial?: Driver } | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
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
  const [requestModal, setRequestModal] = useState<Load | null>(null);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [viewRequest, setViewRequest] = useState<Load | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [kycIssues, setKycIssues] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const counts = { trucks: data.trucks.length, drivers: drivers.length, requests: data.loads.filter(isPendingRequest).length, approvals: adminPendingCount, support: supportTickets.filter(ticket => ticket.status !== 'Resolved').length };

  const notify = (message: string, duration = 2500) => { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), duration); };
  const fail = (problem: unknown) => notify(friendlyError(problem), 5000);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') { setVehicleForm(null); setLoadFormOpen(false); setDriverForm(null); setRequestModal(null); setSelectedTruckId(null); setViewRequest(null); } }; document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, []);
  useEffect(() => { if (authenticated) setAuthModal(null); }, [authenticated]);
  // Google One Tap: "Continue as …" for visitors already signed in to Google (landing page only).
  useEffect(() => {
    if (!backend || !session.ready || authenticated || authModal) return;
    return startGoogleOneTap((token, nonce) => { api.signInWithGoogleIdToken(token, nonce).catch((problem) => notify(friendlyError(problem), 5000)); });
  }, [backend, session.ready, authenticated, authModal]);
  // Show users which KYC documents were rejected and why.
  const kycState = backendProfile?.kyc_status;
  const profileId = backendProfile?.id;
  useEffect(() => {
    if (!profileId || kycState !== 'needs_information') { setKycIssues([]); return; }
    api.fetchDocuments({ ownerId: profileId, entityType: 'kyc' })
      .then((documents) => setKycIssues(documents.filter((document) => document.status === 'Rejected').map((document) => `${document.fileName}${document.remark ? `: ${document.remark}` : ''}`)))
      .catch(() => setKycIssues([]));
  }, [profileId, kycState]);

  if (backend && !session.ready) return <div className="app-loading" role="status"><span className="brand-mark">F24</span><p>Loading your workspace…</p></div>;

  if (backend && session.recovering && session.userId) {
    return <PasswordRecovery onCancel={session.finishRecovery} onSave={async (password) => { await api.updatePassword(password); session.finishRecovery(); notify('Your password has been updated'); }}/>;
  }

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
    const authBackend = backend ? { signIn: api.signIn, signUp: api.signUp, google: api.signInWithGoogle, googleIdToken: api.signInWithGoogleIdToken, resetPassword: api.sendPasswordReset } : undefined;
    return <><Landing onLogin={() => setAuthModal('login')} onSignup={() => setAuthModal('signup')} />{authModal && <RoleAuthModal mode={authModal} backend={authBackend} initialMessage={oauthError || undefined} onClose={() => setAuthModal(null)} onModeChange={setAuthModal} onComplete={enterWorkspace}/>}</>;
  }

  const userId = session.userId ?? '';
  const canTrade = !backend || kycStatus === 'Verified';
  const blockedReason = kycStatus === 'Pending'
    ? 'Your KYC is being reviewed. You can ' + (activeRole === 'load_owner' ? 'post requests' : 'accept requests') + ' as soon as it is approved.'
    : 'Complete your business KYC verification from the Overview page before you can ' + (activeRole === 'load_owner' ? 'post truck requests.' : 'accept requests.');
  const navigate = (next: ViewName) => { setView(next); setMenuOpen(false); if (next === 'loads') setRequestStatus('all'); if (next === 'trucks') setTruckStatus('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openRequests = (status: string) => { navigate('loads'); setRequestStatus(status); };
  const openTrucks = (status: string) => { navigate('trucks'); setTruckStatus(status); };
  const openLoadForm = () => { if (!canTrade) { notify(blockedReason, 6000); return; } setLoadFormOpen(true); };
  const globalSearch = (value: string) => {
    if (activeRole === 'admin') {
      setAdminQuery(value);
      if (value.trim().length > 1) navigate('admin-users');
      return;
    }
    setLoadQuery(value);
    if (value.trim().length > 1) navigate('loads');
  };
  /** Runs a live-mode task with error toast + refresh; returns whether it succeeded. */
  const attempt = async (task: () => Promise<unknown>, success?: string, duration?: number) => {
    try { await task(); await live.reload(); if (success) notify(success, duration); return true; } catch (problem) { fail(problem); await live.reload().catch(() => undefined); return false; }
  };
  const patchDemoLoad = (id: string, change: (load: Load) => Load) => setData((current) => ({ ...current, loads: current.loads.map((load) => load.id === id ? change(load) : load) }));

  const fleet: FleetActions = {
    backend,
    saveTruck: async (truck, documents, existing) => {
      const ok = backend
        ? await attempt(() => existing ? api.updateTruck(existing.id, truck) : api.createTruck(userId, truck, documents))
        : (setData((current) => ({ ...current, trucks: existing ? current.trucks.map((item) => item.id === existing.id ? { ...existing, ...truck, id: existing.id } : item) : [truck, ...current.trucks] })), true);
      if (ok) { setVehicleForm(null); notify(existing ? 'Vehicle details updated' : 'Vehicle added successfully'); }
      return ok;
    },
    setTruckStatus: async (truck, status) => {
      if (backend) await attempt(() => api.updateTruck(truck.id, { status }), `${truck.registration} is now ${status}`);
      else { setData((current) => ({ ...current, trucks: current.trucks.map((item) => item.id === truck.id ? { ...item, status } : item) })); notify(`${truck.registration} is now ${status}`); }
    },
    deleteTruck: async (truck) => {
      if (backend) return attempt(() => api.deleteTruck(truck.id), 'Vehicle and its documents deleted');
      setData((current) => ({ ...current, trucks: current.trucks.filter((item) => item.id !== truck.id) })); notify('Vehicle deleted'); return true;
    },
    loadTruckDocuments: async (truck) => { try { return await api.fetchDocuments({ entityType: 'truck', entityId: truck.id }); } catch (problem) { fail(problem); return []; } },
    uploadTruckDocuments: (truck, documents) => attempt(() => api.uploadDocuments(userId, 'truck', truck.id, documents), 'Document uploaded for review'),
    openDocument: async (document) => {
      const tab = window.open('', '_blank');
      try { const url = await api.documentUrl(document.path); if (tab) { tab.opener = null; tab.location.href = url; } else window.location.assign(url); }
      catch (problem) { tab?.close(); fail(problem); }
    },
    saveDriver: async (driver, documents, existing) => {
      const ok = backend
        ? await attempt(async () => {
          if (!existing) { await api.createDriver(userId, driver, documents); return; }
          await api.updateDriver(existing.id, { name: driver.name, phone: driver.phone, licenceNumber: driver.licenceNumber, licenceExpiry: driver.licenceExpiry, city: driver.city, status: driver.status, assignedTruckId: driver.assignedTruckId ?? null });
          if (documents.length) await api.uploadDocuments(userId, 'driver', existing.id, documents);
        })
        : (setDrivers((current) => existing ? current.map((item) => item.id === existing.id ? { ...driver, id: existing.id } : item) : [driver, ...current]), true);
      if (ok) { setDriverForm(null); notify(existing ? 'Driver details updated' : 'Driver added with photo and documents'); }
      return ok;
    },
    deleteDriver: async (driver) => {
      if (backend) return attempt(() => api.deleteDriver(driver.id), `${driver.name} and their documents removed`);
      setDrivers((current) => current.filter((item) => item.id !== driver.id)); notify(`${driver.name} removed`); return true;
    },
  };

  const requests: RequestActions = {
    canTrade,
    blockedReason,
    accept: async (request, truckId, driverId) => {
      const truck = data.trucks.find((item) => item.id === truckId);
      const driver = drivers.find((item) => item.id === driverId);
      if (backend) return attempt(() => api.acceptLoad(request.id, truckId, driverId), `Request accepted with ${truck?.registration ?? 'your truck'} — the customer has been notified`, 4000);
      const now = new Date().toISOString();
      patchDemoLoad(request.id, (load) => ({ ...load, status: 'Accepted', bookedTruck: truck?.registration, booking: { id: `BK-${Date.now()}`, status: 'confirmed', deliveryCode: String(Math.floor(Math.random() * 10000)).padStart(4, '0'), truck: truck?.registration, truckId, driver: driver ? { name: driver.name, phone: driver.phone } : undefined, customer: { name: 'Ananya Mehta', business: 'Mehta Foods', phone: '+91 98765 41002', email: 'customer@fares24x7.demo' }, history: [{ status: 'confirmed', at: now }] } }));
      if (driver) setDrivers((current) => current.map((item) => item.id === driver.id ? { ...item, status: 'Assigned', assignedTruckId: truckId, assignedVehicle: truck?.registration } : item));
      notify('Request accepted — the customer has been notified'); return true;
    },
    decline: async (request) => {
      if (backend) return attempt(() => api.declineLoad(userId, request.id), 'Marked as not for you');
      patchDemoLoad(request.id, (load) => ({ ...load, status: 'Rejected' })); notify('Marked as not for you'); return true;
    },
    cancelRequest: async (request) => {
      if (backend) return attempt(() => api.cancelLoad(request.id), 'Request cancelled');
      patchDemoLoad(request.id, (load) => ({ ...load, status: 'Cancelled' })); notify('Request cancelled'); return true;
    },
    advance: async (request, status, code) => {
      const message = status === 'delivered' ? 'Trip marked as delivered — well done!' : `Trip updated: ${status === 'picked_up' ? 'picked up' : 'in transit'}`;
      if (backend) return attempt(() => api.updateBookingStatus(request.booking!.id, status, undefined, code), message);
      if (status === 'delivered' && request.booking?.deliveryCode && code !== request.booking.deliveryCode) { fail(new Error('The delivery code is not correct. Ask the customer for the 4-digit code shown in their app.')); return false; }
      patchDemoLoad(request.id, (load) => ({ ...load, status: status === 'delivered' ? 'Completed' : load.status, booking: load.booking && { ...load.booking, status, history: [...load.booking.history, { status, at: new Date().toISOString() }] } }));
      notify(message); return true;
    },
    customerConfirm: async (request, status) => {
      const message = status === 'delivered' ? 'Delivery confirmed — the transporter has been notified' : 'Pickup confirmed — the transporter has been notified';
      if (backend) return attempt(() => api.customerConfirmBooking(request.booking!.id, status), message);
      patchDemoLoad(request.id, (load) => ({ ...load, status: status === 'delivered' ? 'Completed' : load.status, booking: load.booking && { ...load.booking, status, history: [...load.booking.history, { status, note: status === 'delivered' ? 'Receipt confirmed by the customer' : 'Confirmed by the customer', at: new Date().toISOString() }] } }));
      notify(message); return true;
    },
    reportIssue: async (request, note) => {
      const message = 'Problem reported — our team and the other party have been notified';
      if (backend) return attempt(() => api.reportBookingIssue(request.booking!.id, note), message);
      patchDemoLoad(request.id, (load) => ({ ...load, booking: load.booking && { ...load.booking, issue: { note, at: new Date().toISOString(), byMe: true } } }));
      notify(message); return true;
    },
    cancelBooking: async (request, reason) => {
      if (backend) return attempt(() => api.cancelBooking(request.booking!.id, reason), activeRole === 'truck_owner' ? 'Trip cancelled — the request is open again for others' : 'Booking cancelled');
      patchDemoLoad(request.id, (load) => activeRole === 'truck_owner' ? { ...load, status: 'Pending', bookedTruck: undefined, booking: undefined } : { ...load, status: 'Cancelled', booking: load.booking && { ...load.booking, status: 'cancelled', cancelledReason: reason } });
      notify('Booking cancelled'); return true;
    },
  };

  const addLoad = async (load: Load) => {
    const ok = backend ? await attempt(() => api.createLoad(userId, load)) : (setData((current) => ({ ...current, loads: [load, ...current.loads] })), true);
    if (ok) { setLoadFormOpen(false); notify('Truck request posted — matching truck owners have been notified'); }
    return ok;
  };
  const submitSupport = async (ticket: SupportTicket) => {
    if (backend) {
      try { const id = await api.createTicket(userId, ticket); await live.reload(); setSupportOpen(false); notify(`Query ${id} submitted — you can track it under Support`); } catch (problem) { fail(problem); }
      return;
    }
    setSupportTickets(current => [ticket, ...current]); setSupportOpen(false); notify(`Query ${ticket.id} submitted to support`);
  };
  const followUpSupport = async (ticket: SupportTicket, message: string) => {
    const reopened = ticket.status === 'Resolved';
    if (backend) {
      if (!await attempt(() => api.followUpTicket(ticket.id, message))) return false;
    } else {
      const entry = { from: 'user' as const, text: message.trim(), at: new Date().toISOString() };
      setSupportTickets(current => current.map(item => item.id === ticket.id ? { ...item, status: 'Open', thread: [...(item.thread?.length ? item.thread : item.adminReply ? [{ from: 'support' as const, text: item.adminReply, at: item.repliedAt ?? item.createdAt }] : []), entry] } : item));
    }
    notify(reopened ? `Query ${ticket.id} reopened — support has been notified` : 'Message sent to support');
    return true;
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
  const selectedTruck = data.trucks.find((truck) => truck.id === selectedTruckId);
  const currentRequest = (request: Load) => data.loads.find((item) => item.id === request.id) ?? request;

  return <div className={`app-shell ${activeRole === 'admin' ? 'admin-shell' : ''}`}>
    <Sidebar view={view} role={activeRole} profile={activeProfile} counts={counts} open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} onLogout={() => setConfirmLogout(true)}/>
    <main className="main"><Topbar role={activeRole} onMenu={() => setMenuOpen(true)} onSearch={globalSearch} onNavigate={navigate} searchRef={searchRef} onOpenSupport={() => setSupportOpen(true)} notifications={backend ? live.notifications : undefined} onMarkRead={markNotificationsRead}/><div className="content">
      {backend && live.error && <div className="workspace-error" role="alert">Could not load the latest data: {live.error} <button onClick={() => void live.reload()}>Retry</button></div>}
      {activeRole === 'admin' ? <AdminConsole view={view} data={data} drivers={drivers} globalQuery={adminQuery} onNavigate={navigate} notify={notify} onPendingCountChange={setAdminPendingCount} supportTickets={supportTickets} setSupportTickets={setSupportTickets} backend={backend ? { reload: live.reload, fail } : undefined}/> : <>
        {view === 'dashboard' && <Dashboard data={data} role={activeRole} profile={activeProfile} onOpenModal={(type) => type === 'truck' ? setVehicleForm({}) : openLoadForm()} onNavigate={navigate} onOpenRequest={setRequestModal} onViewRequest={setViewRequest} onOpenRequests={openRequests} onOpenTrucks={openTrucks} kycStatus={kycStatus} kycIssues={kycIssues} onSubmitKyc={submitKyc}/>}
        {view === 'trucks' && <TrucksView trucks={data.trucks} drivers={drivers} query={truckQuery} setQuery={setTruckQuery} status={truckStatus} setStatus={setTruckStatus} onAdd={() => setVehicleForm({})} onOpen={(truck) => setSelectedTruckId(truck.id)}/>}
        {view === 'drivers' && activeRole === 'truck_owner' && <DriversView drivers={drivers} query={driverQuery} setQuery={setDriverQuery} status={driverStatus} setStatus={setDriverStatus} onAdd={() => setDriverForm({})} onEdit={(driver) => setDriverForm({ initial: driver })} onDelete={setDriverToDelete}/>}
        {view === 'loads' && <RequestsView requests={data.loads} query={loadQuery} setQuery={setLoadQuery} status={requestStatus} setStatus={setRequestStatus} role={activeRole} onAdd={openLoadForm} onOpenRequest={setRequestModal} onViewRequest={setViewRequest}/>}
        {view === 'support' && <SupportView tickets={supportTickets} onNew={() => setSupportOpen(true)} onFollowUp={followUpSupport}/>}
        {view === 'profile' && <ProfileView key={backendProfile?.business_name ?? 'demo'} profile={activeProfile} role={activeRole} kycStatus={kycStatus} onSave={saveProfile} onSaved={() => notify('Business profile updated')}/>}
      </>}
    </div></main>
    <MobileBottomNav view={view} role={activeRole} onNavigate={navigate}/>
    {vehicleForm && activeRole === 'truck_owner' && <VehicleFormModal initial={vehicleForm.initial} onClose={() => setVehicleForm(null)} onSave={(truck, documents) => fleet.saveTruck(truck, documents, vehicleForm.initial)}/>}
    {loadFormOpen && activeRole === 'load_owner' && <LoadFormModal onClose={() => setLoadFormOpen(false)} onSave={addLoad}/>}
    {driverForm && activeRole === 'truck_owner' && <DriverFormModal trucks={data.trucks} initial={driverForm.initial} onClose={() => setDriverForm(null)} onSave={(driver, documents) => fleet.saveDriver(driver, documents, driverForm.initial)}/>}
    {driverToDelete && <ConfirmDialog title={`Remove ${driverToDelete.name}?`} message="The driver and their photo, licence and ID documents will be permanently deleted. Past trips keep their history." confirmLabel="Remove driver" danger onCancel={() => setDriverToDelete(null)} onConfirm={async () => { await fleet.deleteDriver(driverToDelete); setDriverToDelete(null); }}/>}
    {requestModal && activeRole === 'truck_owner' && <RequestDecisionModal request={currentRequest(requestModal)} trucks={data.trucks} drivers={drivers} actions={requests} onClose={() => setRequestModal(null)} onAddTruck={() => { setRequestModal(null); setVehicleForm({}); }}/>}
    {selectedTruck && activeRole === 'truck_owner' && <VehicleDetailsModal key={selectedTruck.id} truck={selectedTruck} driver={drivers.find((driver) => driver.assignedTruckId ? driver.assignedTruckId === selectedTruck.id : driver.assignedVehicle === selectedTruck.registration)} actions={fleet} onEdit={() => { setVehicleForm({ initial: selectedTruck }); setSelectedTruckId(null); }} onClose={() => setSelectedTruckId(null)}/>}
    {supportOpen && activeRole !== 'admin' && <SupportQueryModal profile={activeProfile} onClose={() => setSupportOpen(false)} onSubmit={ticket => void submitSupport(ticket)}/>}
    {viewRequest && activeRole !== 'admin' && <RequestDetailsModal request={currentRequest(viewRequest)} role={activeRole} actions={requests} onClose={() => setViewRequest(null)} onRespond={(request) => { setViewRequest(null); setRequestModal(request); }}/>}
    {confirmLogout && <ConfirmDialog title="Log out of Fares24x7?" message="You will need to sign in again to access your workspace." confirmLabel="Log out" onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); logout(); }}/>}
    <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
  </div>;
}
