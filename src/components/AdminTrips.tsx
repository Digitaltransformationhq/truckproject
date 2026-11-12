import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../lib/backend';
import { computeAnalytics, formatDuration } from '../lib/analytics';
import { Icon } from './Icon';
import { bookingLabel, formatDateTime, formatInr, statusClass } from './ui';
import type { BookingStatus, Contact, Load } from '../types';

type AdminBackend = { reload: () => Promise<void>; fail: (problem: unknown) => void } | undefined;

const ACTIVE: BookingStatus[] = ['confirmed', 'picked_up', 'in_transit'];
const STEPS: BookingStatus[] = ['confirmed', 'picked_up', 'in_transit', 'delivered'];
const hoursSince = (iso?: string) => iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : 0;
const needsAttention = (load: Load) => Boolean(load.booking && ACTIVE.includes(load.booking.status) && (load.booking.issue || (load.booking.reminderStage ?? 0) >= 2));

function sinceLabel(iso?: string) {
  if (!iso) return '—';
  const h = hoursSince(iso);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`;
  if (h < 48) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

function Flags({ load }: { load: Load }) {
  const b = load.booking;
  if (!b) return null;
  return <>
    {b.issue && <em className="admin-badge rejected">Problem reported</em>}
    {!b.issue && (b.reminderStage ?? 0) >= 3 && <em className="admin-badge rejected">Not updated · escalated</em>}
    {!b.issue && (b.reminderStage ?? 0) === 2 && <em className="admin-badge pending">Reminded both sides</em>}
  </>;
}

// ---------------------------------------------------------------------------
// Trips tab: find stuck / disputed trips and act on them
// ---------------------------------------------------------------------------
export function AdminTrips({ loads, backend, notify }: { loads: Load[]; backend: AdminBackend; notify: (message: string) => void }) {
  const [filter, setFilter] = useState<'attention' | 'active' | 'delivered' | 'all'>('attention');
  const [openId, setOpenId] = useState<string | null>(null);
  const trips = useMemo(() => loads.filter((load) => load.booking).sort((a, b) => (b.booking!.statusChangedAt ?? '').localeCompare(a.booking!.statusChangedAt ?? '')), [loads]);
  const counts = {
    attention: trips.filter(needsAttention).length,
    active: trips.filter((load) => ACTIVE.includes(load.booking!.status)).length,
    delivered: trips.filter((load) => load.booking!.status === 'delivered').length,
    all: trips.length,
  };
  const shown = trips.filter((load) => filter === 'attention' ? needsAttention(load) : filter === 'active' ? ACTIVE.includes(load.booking!.status) : filter === 'delivered' ? load.booking!.status === 'delivered' : true);
  const open = trips.find((load) => load.id === openId) ?? null;
  const labels = { attention: 'Needs attention', active: 'Active', delivered: 'Delivered', all: 'All trips' } as const;

  return <>
    <div className="trip-filters">{(Object.keys(labels) as Array<keyof typeof labels>).map((key) => <button key={key} type="button" className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{labels[key]} <b className={key === 'attention' && counts.attention ? 'alert' : ''}>{counts[key]}</b></button>)}</div>
    <div className="admin-table-wrap"><table className="admin-table trip-admin-table"><thead><tr><th>Trip</th><th>Route</th><th>Stage</th><th>Customer</th><th>Transporter</th><th>Last update</th><th/></tr></thead><tbody>
      {shown.map((load) => { const b = load.booking!; return <tr key={load.id} className="clickable" onClick={() => setOpenId(load.id)}>
        <td><strong>#F24-{load.id}</strong><small>{b.truck ?? '—'}</small></td>
        <td><div className="operation-route"><i/><strong>{load.origin}</strong><Icon name="arrow"/><strong>{load.destination}</strong></div></td>
        <td><em className={`admin-badge ${statusClass(bookingLabel[b.status])}`}>{bookingLabel[b.status]}</em><div className="trip-flags"><Flags load={load}/></div></td>
        <td><strong>{b.customer?.business || b.customer?.name || '—'}</strong><small>{b.customer?.phone}</small></td>
        <td><strong>{b.transporter?.business || b.transporter?.name || '—'}</strong><small>{b.transporter?.phone}</small></td>
        <td><small>{sinceLabel(b.statusChangedAt ?? b.history.at(-1)?.at)}</small></td>
        <td><button type="button" className="admin-action">Open</button></td>
      </tr>; })}
    </tbody></table>{shown.length === 0 && <div className="admin-empty"><h2>{filter === 'attention' ? 'Nothing needs attention' : 'No trips here yet'}</h2><p>{filter === 'attention' ? 'Trips with a reported problem or no updates despite reminders will appear here.' : 'Trips appear once a truck owner accepts a request.'}</p></div>}</div>
    {open && <TripAdminModal load={open} backend={backend} notify={notify} onClose={() => setOpenId(null)}/>}
  </>;
}

const ContactBlock = ({ title, contact }: { title: string; contact?: Contact }) => <div className="trip-admin-contact">
  <span>{title}</span>
  <strong>{contact?.business || contact?.name || 'Account removed'}</strong>
  {contact?.business && <small>{contact.name}</small>}
  {contact && <div className="trip-admin-links">
    {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, '')}`}><Icon name="headset"/> Call</a>}
    {contact.phone && <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
    {contact.email && <a href={`mailto:${contact.email}`}><Icon name="inbox"/> Email</a>}
  </div>}
  {contact?.phone && <small className="trip-admin-phone">{contact.phone} · {contact.email}</small>}
</div>;

function TripAdminModal({ load, backend, notify, onClose }: { load: Load; backend: AdminBackend; notify: (message: string) => void; onClose: () => void }) {
  const b = load.booking!;
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Exclude<BookingStatus, 'confirmed'> | ''>('');
  const [busy, setBusy] = useState(false);
  const active = ACTIVE.includes(b.status) || b.status === 'delivered';
  const run = async (task: () => Promise<void>, done: string) => {
    if (!backend) { notify('Demo mode: admin changes are not saved'); return; }
    setBusy(true);
    try { await task(); await backend.reload(); notify(done); onClose(); } catch (problem) { backend.fail(problem); } finally { setBusy(false); }
  };
  const options: Array<{ value: Exclude<BookingStatus, 'confirmed'>; label: string }> = (['picked_up', 'in_transit', 'delivered', 'cancelled'] as const).filter((value) => value !== b.status).map((value) => ({ value, label: value === 'cancelled' ? 'Cancel trip (request re-opens)' : `Set to ${bookingLabel[value]}` }));

  return <div className="modal-backdrop request-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal request-decision-modal trip-admin-modal" role="dialog" aria-modal="true" aria-labelledby="tripAdminTitle">
    <div className="modal-head"><div><span className="eyebrow">Trip #F24-{load.id} · {b.truck ?? 'no truck'}</span><h2 id="tripAdminTitle">{load.origin} → {load.destination}</h2></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></div>
    <div className="request-decision-body">
      {b.issue && <div className="trip-issue" role="note"><strong>Problem reported</strong><p>{b.issue.note}</p><small>{formatDateTime(b.issue.at)}</small></div>}
      {!b.issue && (b.reminderStage ?? 0) >= 2 && <div className="trip-issue amber" role="note"><strong>{(b.reminderStage ?? 0) >= 3 ? 'Not updated despite reminders' : 'Both sides have been reminded'}</strong><p>Stage "{bookingLabel[b.status]}" since {b.statusChangedAt ? formatDateTime(b.statusChangedAt) : '—'}. Call both sides to confirm where the goods are.</p></div>}
      {b.status !== 'cancelled' && <ol className="trip-steps" aria-label="Trip progress">{STEPS.map((step) => { const reached = STEPS.indexOf(b.status) >= STEPS.indexOf(step); const event = b.history.find((item) => item.status === step); return <li key={step} className={reached ? 'done' : ''}><i aria-hidden="true">{reached ? '✓' : ''}</i><span>{bookingLabel[step]}</span>{event && <small>{formatDateTime(event.at)}</small>}</li>; })}</ol>}
      <div className="trip-admin-contacts"><ContactBlock title="Customer" contact={b.customer}/><ContactBlock title="Transporter" contact={b.transporter}/></div>
      <dl className="trip-admin-facts"><div><dt>Goods</dt><dd>{load.material} · {load.quantity} t</dd></div><div><dt>Budget</dt><dd>{load.budget ? formatInr(load.budget) : '—'}</dd></div><div><dt>Driver</dt><dd>{b.driver ? `${b.driver.name} · ${b.driver.phone}` : 'Not assigned'}</dd></div><div><dt>Delivery code</dt><dd>{b.deliveryCode ?? '—'}</dd></div></dl>
      {b.history.some((item) => item.note) && <ul className="trip-notes">{b.history.filter((item) => item.note).map((item) => <li key={item.at}><b>{bookingLabel[item.status]}</b> · {formatDateTime(item.at)}: {item.note}</li>)}</ul>}
      {active && <div className="trip-admin-actions">
        <label>Note for both sides<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={300} placeholder="E.g. Spoke to the driver; goods were delivered at 4 pm."/></label>
        <div className="trip-admin-buttons">
          {b.issue && <button type="button" className="secondary-btn" disabled={busy || note.trim().length < 3} onClick={() => void run(() => api.adminResolveTripIssue(b.id, note), 'Problem resolved and both sides notified')}>Resolve problem</button>}
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Change trip stage"><option value="">Change stage…</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <button type="button" className={status === 'cancelled' ? 'primary-btn danger-btn' : 'primary-btn'} disabled={busy || !status || note.trim().length < 3} onClick={() => status && void run(() => api.adminSetTripStatus(b.id, status, note), status === 'cancelled' ? 'Trip cancelled; the request is open again' : 'Trip updated and both sides notified')}>{busy ? 'Saving…' : 'Apply'}</button>
        </div>
        <small className="field-help">Every change is saved in the trip history, and both sides are notified with your note.</small>
      </div>}
    </div>
  </div></div>;
}

// ---------------------------------------------------------------------------
// Analytics page
// ---------------------------------------------------------------------------
function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: 'good' | 'warn' }) {
  return <article className={`kpi ${tone ?? ''}`}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}

export function AdminAnalytics({ loads }: { loads: Load[] }) {
  const [days, setDays] = useState(30);
  const a = useMemo(() => computeAnalytics(loads, days), [loads, days]);
  const peak = Math.max(1, ...a.weeks.map((week) => Math.max(week.posted, week.accepted, week.delivered)));
  const pct = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}%`;
  return <section className="admin-view">
    <div className="admin-page-head"><div><span>Marketplace performance</span><h1>Analytics</h1><p>How requests turn into trips, how fast owners respond, and which routes are busiest.</p></div>
      <div className="admin-segmented">{[7, 30, 90].map((value) => <button key={value} className={days === value ? 'active' : ''} onClick={() => setDays(value)}>Last {value} days</button>)}</div></div>
    <div className="kpi-grid">
      <Kpi label="Requests posted" value={a.posted} hint={`${a.openNow} waiting for a truck now`}/>
      <Kpi label="Acceptance rate" value={pct(a.acceptanceRate)} hint={`${a.accepted} of ${a.posted} got a truck`} tone={a.acceptanceRate !== null && a.acceptanceRate >= .6 ? 'good' : a.acceptanceRate !== null ? 'warn' : undefined}/>
      <Kpi label="Median time to accept" value={formatDuration(a.medianAcceptMinutes)} hint="From posting to a truck owner accepting"/>
      <Kpi label="Trips delivered" value={a.delivered} hint={`${a.activeTrips} on the road now`}/>
      <Kpi label="Freight value delivered" value={formatInr(a.deliveredValue)} hint="Sum of customer budgets"/>
      <Kpi label="Cancellation rate" value={pct(a.cancellationRate)} hint={`${a.cancelled} cancelled`} tone={a.cancellationRate !== null && a.cancellationRate > .2 ? 'warn' : undefined}/>
    </div>
    <div className="analytics-grid">
      <section className="admin-panel analytics-chart"><header><div><span>Weekly trend</span><h2>Last 8 weeks</h2></div><div className="chart-legend"><i className="posted"/>Posted<i className="accepted"/>Accepted<i className="delivered"/>Delivered</div></header>
        <div className="week-bars">{a.weeks.map((week) => <div key={week.start} className="week" title={`Week of ${week.label}: ${week.posted} posted, ${week.accepted} accepted, ${week.delivered} delivered`}>
          <div className="bars"><b className="posted" style={{ height: `${(week.posted / peak) * 100}%` }}/><b className="accepted" style={{ height: `${(week.accepted / peak) * 100}%` }}/><b className="delivered" style={{ height: `${(week.delivered / peak) * 100}%` }}/></div>
          <small>{week.label}</small>
        </div>)}</div>
      </section>
      <section className="admin-panel analytics-routes"><header><div><span>Demand</span><h2>Top routes</h2></div></header>
        {a.topRoutes.length ? <ol>{a.topRoutes.map((route) => <li key={route.route}><strong>{route.route}</strong><span><b style={{ width: `${(route.accepted / route.requests) * 100}%` }}/></span><small>{route.requests} request{route.requests === 1 ? '' : 's'} · {Math.round((route.accepted / route.requests) * 100)}% accepted</small></li>)}</ol>
          : <p className="muted">No requests in this period yet.</p>}
        {a.needsAttention > 0 && <p className="analytics-warning"><b>{a.needsAttention}</b> active trip{a.needsAttention === 1 ? ' needs' : 's need'} attention. See Operations → Trips.</p>}
      </section>
    </div>
  </section>;
}
