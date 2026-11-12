import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Icon } from './Icon';
import { ConfirmDialog, PageHead, bookingLabel, displayStatus, formatDateTime, formatInr, isPendingRequest, normalise, statusClass } from './ui';
import { formatDate } from '../lib/matching';
import type { AccountRole } from './RoleAuthModal';
import type { BookingStatus, Contact, Driver, Load, LoadType, Truck } from '../types';

/** Everything the request screens need from the app; implemented for both live and demo mode. */
export interface RequestActions {
  /** False when the user's KYC is not verified yet (live mode); explains why in `blockedReason`. */
  canTrade: boolean;
  blockedReason: string;
  accept: (request: Load, truckId?: string, driverId?: string) => Promise<boolean>;
  decline: (request: Load) => Promise<boolean>;
  cancelRequest: (request: Load) => Promise<boolean>;
  /** Transporter moves the trip forward; delivery needs the customer's 4-digit code. */
  advance: (request: Load, status: Exclude<BookingStatus, 'confirmed' | 'cancelled'>, code?: string) => Promise<boolean>;
  cancelBooking: (request: Load, reason: string) => Promise<boolean>;
  /** Customer confirms "Goods handed over" or "Goods received". */
  customerConfirm: (request: Load, status: 'picked_up' | 'delivered') => Promise<boolean>;
  reportIssue: (request: Load, note: string) => Promise<boolean>;
  /** Rate the other party after delivery. */
  rateTrip: (request: Load, stars: number, comment: string) => Promise<boolean>;
}

const isActiveBooking = (request: Load) => Boolean(request.booking && !['cancelled', 'delivered'].includes(request.booking.status));

/** Status text for lists: trip progress for active bookings, "Declined" for a transporter's own declines. */
export function requestLabel(request: Load, role: AccountRole) {
  if (request.booking && isActiveBooking(request)) return bookingLabel[request.booking.status];
  if (role === 'truck_owner' && request.status === 'Rejected') return 'Declined';
  return displayStatus(request);
}

const FILTERS = ['Pending', 'Accepted', 'Completed', 'Cancelled'];
const matchesFilter = (request: Load, filter: string) => filter === 'all' || (filter === 'Pending' ? isPendingRequest(request) : request.status === filter);

const RouteHero = ({ request }: { request: Load }) => <div className="request-route-hero"><div className="request-route-point request-route-pickup"><span className="request-route-pin"><Icon name="pin"/></span><div><small>Pickup</small><strong>{request.origin}</strong></div></div><i className="route-journey" aria-hidden="true"><svg viewBox="0 0 150 38"><path d="M16 19 H134 L123 9 M134 19 L123 29"/></svg></i><div className="request-route-point request-route-delivery"><div><small>Delivery</small><strong>{request.destination}</strong></div></div></div>;

const DetailGrid = ({ request }: { request: Load }) => <div className="request-detail-grid">
  <div><span>Goods</span><strong>{request.material}</strong></div>
  <div><span>Weight</span><strong>{request.quantity} tonnes</strong></div>
  <div><span>Truck needed</span><strong>{request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</strong></div>
  <div><span>Pickup date</span><strong>{formatDate(request.date)}</strong></div>
  <div><span>Customer budget</span><strong>{request.budget ? formatInr(request.budget) : 'Not specified'}</strong></div>
  {request.bookedTruck && <div><span>Assigned truck</span><strong>{request.bookedTruck}</strong></div>}
</div>;

export function RequestsView({ requests, query, setQuery, status, setStatus, role, onAdd, onOpenRequest, onViewRequest }: { requests: Load[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; role: AccountRole; onAdd: () => void; onOpenRequest: (request: Load) => void; onViewRequest: (request: Load) => void }) {
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const update = (event: MediaQueryListEvent) => setMobileLayout(event.matches);
    setMobileLayout(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const filtered = requests.filter((request) => matchesFilter(request, status) && (!query || [request.origin, request.destination, request.material, request.id, request.bookedTruck].some((value) => normalise(value).includes(normalise(query)))));
  const head = <PageHead section="Requests" title={role === 'load_owner' ? 'My truck requests' : 'Customer truck requests'} description={role === 'load_owner' ? 'Post a request, track the truck owner’s response and follow the trip.' : 'Review requests, accept the ones that suit you and update trip progress.'} actions={role === 'load_owner' ? <button className="primary-btn" onClick={onAdd}>Request a truck</button> : undefined}/>;
  const toolbar = <div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pickup, destination, goods or request no."/></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter requests by status"><option value="all">All requests</option>{FILTERS.map((filter) => <option key={filter}>{filter}</option>)}{role === 'truck_owner' && <option value="Rejected">Declined</option>}</select></div>;
  const empty = requests.length === 0
    ? <div className="empty-state"><span><Icon name="inbox"/></span><h2>{role === 'load_owner' ? 'No requests yet' : 'No open requests right now'}</h2><p>{role === 'load_owner' ? 'Post your first truck request and verified truck owners will be able to accept it.' : 'New customer requests appear here, and you are notified when one matches your trucks.'}</p>{role === 'load_owner' && <button className="primary-btn" onClick={onAdd}>Request a truck</button>}</div>
    : filtered.length === 0 ? <div className="empty">No requests match this filter.</div> : null;
  const action = (request: Load) => role === 'truck_owner' && isPendingRequest(request);

  if (mobileLayout) return <section className="view active">{head}{toolbar}{empty}<div className="request-mobile-cards">{filtered.map((request) => { const label = requestLabel(request, role); return <details className="request-mobile-card" key={request.id}><summary><span className="request-mobile-route"><strong>{request.origin} <i>→</i> {request.destination}</strong><small>Request #F24-{request.id}</small></span><span className={`status ${statusClass(label)}`}>{label}</span><Icon name="chevron"/></summary><div className="request-mobile-body"><div className="request-mobile-facts"><div><span>Goods</span><strong>{request.material}</strong></div><div><span>Weight</span><strong>{request.quantity} tonnes</strong></div><div><span>Budget</span><strong>{request.budget ? formatInr(request.budget) : '—'}</strong></div><div><span>Pickup date</span><strong>{formatDate(request.date)}</strong></div></div>{action(request) ? <button className="request-mobile-review" onClick={() => onOpenRequest(request)}>Review request <Icon name="chevron"/></button> : <button className="request-mobile-review secondary" onClick={() => onViewRequest(request)}>View details <Icon name="chevron"/></button>}</div></details>; })}</div></section>;

  return <section className="view active">{head}{toolbar}<div className="table-wrap"><table><thead><tr><th>Route</th><th>Goods</th><th>Budget</th><th>Pickup date</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map((request) => { const label = requestLabel(request, role); return <tr key={request.id}>
    <td><button className="request-route-link" onClick={() => onViewRequest(request)}><strong>{request.origin} → {request.destination}</strong><small>Request #F24-{request.id}</small></button></td>
    <td><strong>{request.material}</strong><small>{request.quantity} tonnes · {request.type === 'FTL' ? 'Full truck' : 'Shared truck'}</small></td>
    <td>{request.budget ? formatInr(request.budget) : <span className="muted">—</span>}</td>
    <td>{formatDate(request.date)}</td>
    <td><span className={`status ${statusClass(label)}`}>{label}</span>{request.bookedTruck && <small>{request.bookedTruck}</small>}</td>
    <td>{action(request) ? <button className="review-request-btn" onClick={() => onOpenRequest(request)}>Review</button> : <button className="view-request-btn" onClick={() => onViewRequest(request)}>{isActiveBooking(request) && role === 'truck_owner' ? 'Update trip' : 'View details'}</button>}</td>
  </tr>; })}</tbody></table>{empty}</div></section>;
}

export function LoadFormModal({ onClose, onSave }: { onClose: () => void; onSave: (load: Load) => Promise<boolean> }) {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const budget = Number(value('budget').replace(/[^0-9.]/g, ''));
    setBusy(true);
    try {
      await onSave({ id: crypto.randomUUID(), origin: value('origin'), destination: value('destination'), material: value('material'), quantity: Number(value('quantity')), type: value('type') as LoadType, date: value('date'), status: 'Pending', budget: budget > 0 ? budget : undefined });
    } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="loadFormTitle">
    <div className="modal-head"><div><span className="eyebrow">Truck request</span><h2 id="loadFormTitle">Request a truck</h2></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></div>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Pickup location<input name="origin" placeholder="Ahmedabad" required autoFocus/></label>
        <label>Delivery destination<input name="destination" placeholder="Chennai" required/></label>
        <label>Goods description<input name="material" placeholder="Textiles" required/></label>
        <label>Approx. weight (tonnes)<input name="quantity" type="number" min="0.5" max="60" step="0.5" defaultValue="12" required/></label>
        <label>Truck requirement<select name="type"><option value="FTL">Full truck</option><option value="PTL">Shared truck</option></select></label>
        <label>Pickup date<input name="date" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={tomorrow} required/></label>
        <label className="form-span-2">Expected freight (₹) <span className="optional">Optional</span><input name="budget" inputMode="numeric" placeholder="e.g. 45000" pattern="[0-9,]*" title="Amount in rupees, numbers only"/><small className="field-help">Shown to truck owners before they accept. You can agree the final price with the transporter after acceptance.</small></label>
      </div>
      <div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post request'}</button></div>
    </form>
  </div></div>;
}

/** Best first: already at pickup city, heading to the destination, then the smallest truck that fits. */
const rankTrucks = (trucks: Truck[], request: Load) => trucks
  .filter((truck) => truck.status === 'Available' && truck.capacity >= request.quantity)
  .sort((a, b) => Number(normalise(b.location) === normalise(request.origin)) - Number(normalise(a.location) === normalise(request.origin))
    || Number(normalise(b.destination) === normalise(request.destination)) - Number(normalise(a.destination) === normalise(request.destination))
    || a.capacity - b.capacity);

export function RequestDecisionModal({ request, trucks, drivers, actions, onClose, onAddTruck }: { request: Load; trucks: Truck[]; drivers: Driver[]; actions: RequestActions; onClose: () => void; onAddTruck: () => void }) {
  const eligible = useMemo(() => rankTrucks(trucks, request), [trucks, request]);
  const [truckId, setTruckId] = useState(eligible[0]?.id ?? '');
  const availableDrivers = drivers.filter((driver) => driver.status === 'Available' || driver.status === 'Assigned');
  const defaultDriver = (id: string) => availableDrivers.find((driver) => driver.assignedTruckId === id || driver.assignedVehicle === trucks.find((truck) => truck.id === id)?.registration)?.id ?? '';
  const [driverId, setDriverId] = useState(() => defaultDriver(eligible[0]?.id ?? ''));
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const chosenTruck = trucks.find((truck) => truck.id === truckId);

  const accept = async () => {
    if (busy || accepted || !truckId) return;
    setBusy(true);
    const ok = await actions.accept(request, truckId, driverId || undefined);
    setBusy(false);
    if (!ok) return;
    setAccepted(true);
    timer.current = window.setTimeout(onClose, 2200);
  };
  const decline = async () => { if (busy) return; setBusy(true); if (await actions.decline(request)) onClose(); setBusy(false); };

  if (accepted) return <div className="modal-backdrop request-backdrop"><div className="modal request-decision-modal request-accepted" role="dialog" aria-modal="true" aria-labelledby="requestAcceptedTitle"><div className="request-success request-success-simple" role="status"><span className="request-success-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span><span className="eyebrow">Request confirmed</span><h2 id="requestAcceptedTitle">You’ve accepted the trip</h2><p>{request.origin} → {request.destination} with {chosenTruck?.registration}. The customer has been notified and can now see your contact details.</p><button className="primary-btn" onClick={onClose}>Done</button></div></div></div>;

  return <div className="modal-backdrop request-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal request-decision-modal" role="dialog" aria-modal="true" aria-labelledby="requestTitle">
    <div className="modal-head"><div><span className="eyebrow">Request #F24-{request.id}</span><h2 id="requestTitle">Can you take this trip?</h2></div><button onClick={onClose} aria-label="Close request"><Icon name="close"/></button></div>
    <div className="request-decision-body">
      <RouteHero request={request}/>
      <DetailGrid request={request}/>
      {!actions.canTrade ? <div className="trade-blocked" role="note"><Icon name="building"/><p>{actions.blockedReason}</p></div>
        : eligible.length === 0 ? <div className="trade-blocked" role="note"><Icon name="truck"/><p>None of your available trucks can carry {request.quantity} tonnes. Add a suitable vehicle or mark one as Available.</p><button className="secondary-btn" onClick={onAddTruck}>Add vehicle</button></div>
        : <div className="accept-assignment">
          <fieldset><legend>Choose a truck</legend><div className="truck-choice-list">{eligible.map((truck, index) => <label key={truck.id} className={`truck-choice ${truckId === truck.id ? 'selected' : ''}`}><input type="radio" name="truck" value={truck.id} checked={truckId === truck.id} onChange={() => { setTruckId(truck.id); setDriverId(defaultDriver(truck.id)); }}/><span><strong>{truck.registration}</strong><small>{truck.type} · {truck.capacity} t · at {truck.location}</small></span>{index === 0 && <em>Best match</em>}</label>)}</div></fieldset>
          <label className="driver-choice"><span>Driver <span className="optional">Optional</span></span><select value={driverId} onChange={(event) => setDriverId(event.target.value)}><option value="">Assign later</option>{availableDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.phone}{driver.status === 'Assigned' && driver.assignedVehicle ? ` (with ${driver.assignedVehicle})` : ''}</option>)}</select></label>
        </div>}
      <p className="request-help">When you accept, the customer is notified and you will both see each other’s contact details to agree the final price and pickup.</p>
    </div>
    <div className="request-decision-actions"><button className="reject-request-btn" onClick={() => void decline()} disabled={busy}>Not for me</button><button className="accept-request-btn" onClick={() => void accept()} disabled={busy || !actions.canTrade || !truckId}>{busy ? 'Confirming…' : 'Accept request'} <Icon name="arrow"/></button></div>
  </div></div>;
}

const STEPS: Array<Exclude<BookingStatus, 'cancelled'>> = ['confirmed', 'picked_up', 'in_transit', 'delivered'];
const NEXT_STEP: Partial<Record<BookingStatus, { status: Exclude<BookingStatus, 'confirmed' | 'cancelled'>; label: string }>> = {
  confirmed: { status: 'picked_up', label: 'Mark picked up' },
  picked_up: { status: 'in_transit', label: 'Mark in transit' },
  in_transit: { status: 'delivered', label: 'Mark delivered' },
};

const RatingBadge = ({ rating }: { rating?: Contact['rating'] }) => rating ? <span className="rating-badge" title={`${rating.avg.toFixed(1)} out of 5 from ${rating.count} trip${rating.count === 1 ? '' : 's'}`}>★ {rating.avg.toFixed(1)} <small>· {rating.count} trip{rating.count === 1 ? '' : 's'}</small></span> : <span className="rating-badge new">New on Fares24x7</span>;

const ContactCard = ({ title, contact, extra }: { title: string; contact?: Contact; extra?: ReactNode }) => contact ? <div className="contact-card"><span className="contact-card-title">{title}</span><strong>{contact.business || contact.name} <RatingBadge rating={contact.rating}/></strong>{contact.business && <small>{contact.name}</small>}<div className="contact-card-links">{contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, '')}`}><Icon name="headset"/> {contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`}><Icon name="inbox"/> {contact.email}</a>}</div>{extra}</div> : null;

export function RequestDetailsModal({ request, role, actions, onClose, onRespond }: { request: Load; role: AccountRole; actions: RequestActions; onClose: () => void; onRespond: (request: Load) => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'cancel-request' | 'cancel-booking' | 'deliver' | 'handed-over' | 'received' | 'report' | null>(null);
  const booking = request.booking;
  const label = requestLabel(request, role);
  const active = isActiveBooking(request);
  const next = role === 'truck_owner' && booking && active ? NEXT_STEP[booking.status] : undefined;
  const run = async (task: () => Promise<boolean>) => { setBusy(true); const ok = await task(); setBusy(false); setConfirm(null); return ok; };

  const statusHelp = (() => {
    if (booking?.status === 'cancelled' || request.status === 'Cancelled') return booking?.cancelledReason ? `Cancelled. Reason: ${booking.cancelledReason}` : 'This request was cancelled.';
    if (request.status === 'Completed') return 'Delivered. This trip is complete.';
    if (booking && active) return role === 'load_owner'
      ? `Your goods are with ${booking.transporter?.business || 'the transporter'}${booking.truck ? ` (${booking.truck})` : ''}. You can confirm pickup and delivery yourself too.`
      : 'Update the trip as it progresses. To mark it delivered you will need the customer’s 4-digit delivery code.';
    if (role === 'truck_owner' && request.status === 'Rejected') return 'You marked this request as not for you. You can still accept it while it is open.';
    return role === 'load_owner' ? 'Waiting for a truck owner to accept. You will be notified as soon as someone does.' : 'This request is waiting for a truck owner.';
  })();

  return <div className="modal-backdrop request-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal request-decision-modal request-details-modal" role="dialog" aria-modal="true" aria-labelledby="requestDetailsTitle">
    <div className="modal-head"><div><span className="eyebrow">Request #F24-{request.id}</span><h2 id="requestDetailsTitle">{request.origin} → {request.destination}</h2></div><button onClick={onClose} aria-label="Close request details"><Icon name="close"/></button></div>
    <div className="request-decision-body">
      <div className={`request-status-banner ${statusClass(request.status === 'Completed' ? 'accepted' : label)}`}><span className={`status ${statusClass(label)}`}>{label}</span><p>{statusHelp}</p></div>
      {booking && booking.status !== 'cancelled' && <ol className="trip-steps" aria-label="Trip progress">{STEPS.map((step) => { const reached = STEPS.indexOf(booking.status as typeof step) >= STEPS.indexOf(step); const event = booking.history.find((item) => item.status === step); return <li key={step} className={reached ? 'done' : ''}><i aria-hidden="true">{reached ? '✓' : ''}</i><span>{bookingLabel[step]}</span>{event && <small>{formatDateTime(event.at)}</small>}</li>; })}</ol>}
      {booking?.issue && <div className="trip-issue" role="note"><strong>{booking.issue.byMe ? 'You reported a problem' : 'A problem was reported on this trip'}</strong><p>{booking.issue.note}</p><small>{formatDateTime(booking.issue.at)} · Our team has been alerted and will contact both sides.</small></div>}
      {role === 'load_owner' && booking && active && booking.deliveryCode && <div className="delivery-code"><div><span>Delivery code</span><strong aria-label={`Delivery code ${booking.deliveryCode.split('').join(' ')}`}>{booking.deliveryCode.split('').map((digit, index) => <b key={index}>{digit}</b>)}</strong></div><p>Share this code with the driver <b>only when your goods arrive</b>. The transporter needs it to mark the trip delivered.</p></div>}
      {booking && active && <button type="button" className="trip-report-link" onClick={() => setConfirm('report')}>Something not right? Report a problem</button>}
      <RouteHero request={request}/>
      <DetailGrid request={request}/>
      {booking && booking.status !== 'cancelled' && <div className="contact-grid">
        {role === 'load_owner' ? <ContactCard title="Transporter" contact={booking.transporter} extra={<>{booking.truck && <small>Truck: <b>{booking.truck}</b></small>}{booking.driver && <small>Driver: <b>{booking.driver.name}</b> · <a href={`tel:${booking.driver.phone.replace(/\s/g, '')}`}>{booking.driver.phone}</a></small>}</>}/>
          : <ContactCard title="Customer" contact={booking.customer}/>}
        {role === 'truck_owner' && (booking.truck || booking.driver) && <div className="contact-card"><span className="contact-card-title">Your assignment</span>{booking.truck && <strong>{booking.truck}</strong>}{booking.driver ? <small>Driver: {booking.driver.name} · {booking.driver.phone}</small> : <small>No driver assigned</small>}</div>}
      </div>}
      {booking?.status === 'delivered' && <TripRating key={booking.id} existing={booking.myRating} otherName={(role === 'load_owner' ? booking.transporter : booking.customer)?.business || (role === 'load_owner' ? 'the transporter' : 'the customer')} onSubmit={(stars, comment) => actions.rateTrip(request, stars, comment)}/>}
      {booking && booking.history.some((item) => item.note) && <ul className="trip-notes">{booking.history.filter((item) => item.note).map((item) => <li key={item.at}><b>{bookingLabel[item.status]}</b> · {formatDateTime(item.at)} — {item.note}</li>)}</ul>}
    </div>
    <div className="request-decision-actions">
      {role === 'truck_owner' && isPendingRequest(request) ? <><button className="reject-request-btn" onClick={onClose}>Close</button><button className="accept-request-btn" onClick={() => onRespond(request)}>Respond to request <Icon name="arrow"/></button></>
        : next ? <>{booking?.status === 'confirmed' ? <button className="reject-request-btn" onClick={() => setConfirm('cancel-booking')} disabled={busy}>Cancel trip</button> : <button className="reject-request-btn" onClick={onClose}>Close</button>}<button className="accept-request-btn" onClick={() => next.status === 'delivered' ? setConfirm('deliver') : void run(() => actions.advance(request, next.status))} disabled={busy}>{busy ? 'Updating…' : next.label} <Icon name="arrow"/></button></>
        : role === 'load_owner' && request.status === 'Pending' ? <><button className="reject-request-btn" onClick={() => setConfirm('cancel-request')} disabled={busy}>Cancel request</button><button className="accept-request-btn" onClick={onClose}>Close</button></>
        : role === 'load_owner' && booking?.status === 'confirmed' ? <><button className="reject-request-btn" onClick={() => setConfirm('cancel-booking')} disabled={busy}>Cancel booking</button><button className="accept-request-btn" onClick={() => setConfirm('handed-over')} disabled={busy}>Goods handed over <Icon name="arrow"/></button></>
        : role === 'load_owner' && booking && active ? <><button className="reject-request-btn" onClick={onClose}>Close</button><button className="accept-request-btn" onClick={() => setConfirm('received')} disabled={busy}>Goods received <Icon name="arrow"/></button></>
        : <button className="accept-request-btn request-details-close" onClick={onClose}>Close</button>}
    </div>
    {confirm === 'cancel-request' && <ConfirmDialog title="Cancel this request?" message="Truck owners will no longer see it. You can post a new request any time." confirmLabel="Cancel request" danger onCancel={() => setConfirm(null)} onConfirm={async () => { if (await run(() => actions.cancelRequest(request))) onClose(); }}/>}
    {confirm === 'cancel-booking' && <ConfirmDialog title={role === 'truck_owner' ? 'Cancel this trip?' : 'Cancel this booking?'} message={role === 'truck_owner' ? 'The customer will be notified and the request will be open again for other truck owners.' : 'The transporter will be notified and the request will be closed.'} reasonLabel="Reason (shared with the other party)" confirmLabel={role === 'truck_owner' ? 'Cancel trip' : 'Cancel booking'} danger onCancel={() => setConfirm(null)} onConfirm={async (reason) => { if (await run(() => actions.cancelBooking(request, reason))) onClose(); }}/>}
    {confirm === 'deliver' && <InputDialog title="Enter the delivery code" message="Ask the customer for the 4-digit delivery code shown in their app. They share it once the goods have arrived." label="Delivery code" placeholder="4-digit code" code confirmLabel="Mark delivered" onCancel={() => setConfirm(null)} onConfirm={async (code) => { await run(() => actions.advance(request, 'delivered', code)); }}/>}
    {confirm === 'handed-over' && <ConfirmDialog title="Goods handed over?" message="Confirm the truck has collected your goods. The transporter is notified and the trip moves to Picked up." confirmLabel="Yes, handed over" onCancel={() => setConfirm(null)} onConfirm={async () => { await run(() => actions.customerConfirm(request, 'picked_up')); }}/>}
    {confirm === 'received' && <ConfirmDialog title="Received your goods?" message="Confirm your goods have arrived. The trip is marked delivered and the transporter is notified." confirmLabel="Yes, received" onCancel={() => setConfirm(null)} onConfirm={async () => { await run(() => actions.customerConfirm(request, 'delivered')); }}/>}
    {confirm === 'report' && <InputDialog title="Report a problem" message={`Tell us what is wrong with this trip. ${role === 'load_owner' ? 'The transporter' : 'The customer'} and the Fares24x7 team will be notified.`} label="What happened?" placeholder="For example: status says picked up but the truck has not arrived" confirmLabel="Report problem" danger onCancel={() => setConfirm(null)} onConfirm={async (note) => { await run(() => actions.reportIssue(request, note)); }}/>}
  </div></div>;
}

/** Small dialog that collects a required value: a 4-digit code or a short note. */
function InputDialog({ title, message, label, placeholder, confirmLabel, code, danger, onCancel, onConfirm }: { title: string; message: string; label: string; placeholder: string; confirmLabel: string; code?: boolean; danger?: boolean; onCancel: () => void; onConfirm: (value: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = code ? /^[0-9]{4}$/.test(value) : value.trim().length >= 5;
  const submit = async () => { if (!valid || busy) return; setBusy(true); try { await onConfirm(value.trim()); } finally { setBusy(false); } };
  return <div className="modal-backdrop confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <form className="modal confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="inputDialogTitle" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <h2 id="inputDialogTitle">{title}</h2>
      <p>{message}</p>
      <label className="confirm-reason">{label}
        {code ? <input className="delivery-code-input" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="one-time-code" placeholder={placeholder} autoFocus/>
          : <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={3} maxLength={500} placeholder={placeholder} autoFocus/>}
      </label>
      <div className="confirm-actions"><button type="button" className="secondary-btn" onClick={onCancel}>Back</button><button type="submit" className={danger ? 'primary-btn danger-btn' : 'primary-btn'} disabled={!valid || busy}>{busy ? 'Please wait…' : confirmLabel}</button></div>
    </form>
  </div>;
}

/** Star rating for the other party, shown once a trip is delivered. */
function TripRating({ existing, otherName, onSubmit }: { existing?: { stars: number; comment?: string }; otherName: string; onSubmit: (stars: number, comment: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(!existing);
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const labels = ['', 'Poor', 'Below average', 'Good', 'Very good', 'Excellent'];
  const shown = hover || stars;
  if (!editing && existing) return <div className="trip-rating done"><div><span className="trip-rating-title">Your rating for {otherName}</span><span className="trip-rating-stars static" aria-label={`${existing.stars} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <b key={n} className={n <= existing.stars ? 'on' : ''}>★</b>)}</span>{existing.comment && <p>“{existing.comment}”</p>}</div><button type="button" onClick={() => setEditing(true)}>Edit</button></div>;
  const submit = async () => { if (!stars || busy) return; setBusy(true); if (await onSubmit(stars, comment)) setEditing(false); setBusy(false); };
  return <div className="trip-rating">
    <span className="trip-rating-title">How was the trip with {otherName}?</span>
    <div className="trip-rating-row">
      <span className="trip-rating-stars" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} className={n <= shown ? 'on' : ''} onMouseEnter={() => setHover(n)} onClick={() => setStars(n)}>★</button>)}</span>
      <small>{labels[shown] || 'Tap a star'}</small>
    </div>
    {stars > 0 && <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} maxLength={500} placeholder="Add a short comment (optional)"/>}
    <div className="trip-rating-actions">{existing && <button type="button" className="secondary" onClick={() => { setEditing(false); setStars(existing.stars); setComment(existing.comment ?? ''); }}>Cancel</button>}<button type="button" className="primary" disabled={!stars || busy} onClick={() => void submit()}>{busy ? 'Saving…' : existing ? 'Update rating' : 'Submit rating'}</button></div>
  </div>;
}
