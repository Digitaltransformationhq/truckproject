import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import * as api from '../lib/backend';
import { requestLabel } from './RequestViews';
import { VEHICLE_DOCUMENTS } from './FleetViews';
import { ConfirmDialog, bookingLabel, formatDateTime, formatInr, statusClass } from './ui';
import { Icon } from './Icon';
import { AdminAnalytics, AdminTrips } from './AdminTrips';
import { SupportThread, ticketThread } from './SupportView';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatDate } from '../lib/matching';
import type { AdminAccount, Driver, Load, PortalData, StoredDocument, SupportTicket, SupportTicketStatus, Truck, VerificationStatus, ViewName } from '../types';

type DocumentKind = 'gst' | 'identity';
type DocumentReviewStatus = 'Verified' | 'Needs information' | 'Rejected';

const seedAccounts: AdminAccount[] = [
  { id:'USR-1048', name:'Rajesh Sharma', business:'Sharma Roadways', role:'Truck owner', city:'Chennai', phone:'+91 98765 43210', email:'rajesh@sharmaroadways.in', joined:'2026-10-18', status:'Active', verification:'Pending', assets:4 },
  { id:'USR-1047', name:'Ananya Mehta', business:'Mehta Foods', role:'Load owner', city:'Bengaluru', phone:'+91 98765 41002', email:'ananya@mehtafoods.in', joined:'2026-10-17', status:'Active', verification:'Verified', assets:11 },
  { id:'USR-1046', name:'Vikram Singh', business:'NorthStar Logistics', role:'Truck owner', city:'Delhi', phone:'+91 98201 14228', email:'vikram@northstar.in', joined:'2026-10-16', status:'Active', verification:'Needs information', assets:18 },
  { id:'USR-1045', name:'Nisha Patel', business:'Patel Textiles', role:'Load owner', city:'Ahmedabad', phone:'+91 98980 21109', email:'nisha@pateltextiles.in', joined:'2026-10-14', status:'Active', verification:'Pending', assets:7 },
  { id:'USR-1044', name:'Arun Kumar', business:'AK Freight Movers', role:'Truck owner', city:'Pune', phone:'+91 97666 73118', email:'arun@akfreight.in', joined:'2026-10-12', status:'Suspended', verification:'Verified', assets:9 },
  { id:'USR-1043', name:'Farah Khan', business:'Coastal Retail', role:'Load owner', city:'Mumbai', phone:'+91 98190 88721', email:'farah@coastalretail.in', joined:'2026-10-09', status:'Active', verification:'Verified', assets:24 },
];

const badgeClass = (value: string) => value.toLowerCase().replaceAll(' ', '-');
/** Live account ids are UUIDs; show a short, readable reference. */
const shortId = (id: string) => id.length > 12 ? `#${id.slice(0, 8).toUpperCase()}` : id;
const needsVerificationReview = (account: AdminAccount) => account.verification === 'Pending' || account.verification === 'Needs information';

const documentMeta: Record<DocumentKind, { title: string; icon: 'package' | 'building' | 'inbox'; filename: string }> = {
  gst: { title: 'GST registration', icon: 'package', filename: 'gst-registration-certificate.pdf' },
  identity: { title: 'Business identity', icon: 'building', filename: 'certificate-of-incorporation.pdf' },
};

function DocumentReviewModal({ account, kind, status, savedRemark, onClose, onDecision }: { account: AdminAccount; kind: DocumentKind; status?: DocumentReviewStatus; savedRemark?: string; onClose: () => void; onDecision: (status: DocumentReviewStatus, remark?: string) => void }) {
  const docMeta = documentMeta[kind];
  const [remark,setRemark] = useState(savedRemark ?? '');
  const [remarkError,setRemarkError] = useState('');
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [onClose]);
  const reference = kind === 'gst' ? `33AABCS${account.id.slice(-4)}F1Z2` : kind === 'identity' ? `U60231${account.id.slice(-4)}PTC` : `XXXXXX${account.phone.replace(/\D/g,'').slice(-4)}`;
  const rejectDocument = () => {
    const reason = remark.trim();
    if (!reason) { setRemarkError('Add a remark explaining what is unclear or incorrect.'); return; }
    onDecision('Rejected',reason);
  };
  return <div className="document-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="document-review-modal" role="dialog" aria-modal="true" aria-labelledby="documentReviewTitle">
      <header><div><span>Document review</span><h2 id="documentReviewTitle">{docMeta.title}</h2><p>{account.business} · {account.id}</p></div><button onClick={onClose} aria-label="Close document preview"><Icon name="close"/></button></header>
      <div className="document-review-layout">
        <div className="document-preview-stage">
          <div className="document-preview-toolbar"><span><b>PDF</b>{docMeta.filename}</span><em>1 of 1</em></div>
          <div className="document-paper">
            <div className="document-emblem">F24</div>
            <small>GOVERNMENT OF INDIA</small>
            <h3>{kind === 'gst' ? 'Goods and Services Tax Registration Certificate' : 'Certificate of Incorporation'}</h3>
            <i/>
            <dl><div><dt>Legal business name</dt><dd>{account.business}</dd></div><div><dt>Authorised representative</dt><dd>{account.name}</dd></div><div><dt>{kind === 'gst' ? 'GSTIN' : kind === 'identity' ? 'Registration number' : 'Account reference'}</dt><dd>{reference}</dd></div><div><dt>Registered address</dt><dd>{account.city}, India</dd></div><div><dt>Effective date</dt><dd>{formatDate(account.joined)}</dd></div><div><dt>Document status</dt><dd>Valid and active</dd></div></dl>
            <div className="document-signature"><span><b>Digitally signed</b><small>Issuing authority</small></span><span className="document-stamp">VERIFIED<br/>SOURCE</span></div>
          </div>
        </div>
        <aside className="document-review-sidebar"><span>Uploaded file</span><h3>{docMeta.filename}</h3><div className="document-review-facts"><div><span>Applicant</span><strong>{account.name}</strong></div><div><span>Business</span><strong>{account.business}</strong></div><div><span>Uploaded</span><strong>{formatDate(account.joined)}</strong></div><div><span>File type</span><strong>PDF · 842 KB</strong></div></div><div className="document-security-note"><Icon name="building"/><p><strong>Review the original details</strong><small>Confirm the business name, reference number, address and validity before making a decision.</small></p></div>{status && <div className={`document-current-status ${badgeClass(status)}`}><span>Current review</span><strong>{status}</strong></div>}<label className={`document-remark-field ${remarkError ? 'has-error' : ''}`}><span>Review remark <b>Required to reject</b></span><textarea value={remark} onChange={event=>{setRemark(event.target.value);if(remarkError)setRemarkError('')}} placeholder="Describe what is unclear, missing or incorrect…" rows={4}/><small>{remarkError || 'This remark will be recorded for the applicant and review history.'}</small></label></aside>
      </div>
      <footer><button className="document-reject" onClick={rejectDocument}>Reject document</button><button className="admin-primary" onClick={() => onDecision('Verified')}>Mark document verified</button></footer>
    </section>
  </div>;
}

const documentLabels: Record<string, string> = {
  gstCertificate: 'GST registration certificate', companyPanFile: 'Company PAN card', ownerPanFile: 'Personal PAN card',
  aadhaar: 'Aadhaar card', contactId: 'Authorised contact ID', addressProof: 'Billing address proof',
};
const documentLabel = (kind: string) => documentLabels[kind] ?? kind.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function StoredDocumentModal({ account, document, onClose, onDecision }: { account: Pick<AdminAccount, 'name' | 'business'>; document: StoredDocument; onClose: () => void; onDecision: (status: 'Verified' | 'Rejected', remark?: string) => Promise<void> }) {
  const [url,setUrl] = useState('');
  const [loadError,setLoadError] = useState('');
  const [remark,setRemark] = useState(document.remark ?? '');
  const [remarkError,setRemarkError] = useState('');
  const [busy,setBusy] = useState(false);
  useEffect(() => { api.documentUrl(document.path).then(setUrl).catch(() => setLoadError('This file could not be opened.')); }, [document.path]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const decide = async (status: 'Verified' | 'Rejected') => {
    if (status === 'Rejected' && !remark.trim()) { setRemarkError('Add a remark explaining what is unclear or incorrect.'); return; }
    setBusy(true);
    try { await onDecision(status, remark.trim()); } finally { setBusy(false); }
  };
  const isImage = document.mimeType?.startsWith('image/');
  return <div className="document-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="document-review-modal" role="dialog" aria-modal="true" aria-labelledby="storedDocumentTitle">
      <header><div><span>Document review</span><h2 id="storedDocumentTitle">{documentLabel(document.kind)}</h2><p>{account.business} · {account.name}</p></div><button onClick={onClose} aria-label="Close document preview"><Icon name="close"/></button></header>
      <div className="document-review-layout">
        <div className="document-preview-stage">
          <div className="document-preview-toolbar"><span><b>{isImage ? 'IMG' : 'PDF'}</b>{document.fileName}</span>{url && <a href={url} target="_blank" rel="noreferrer">Open in new tab</a>}</div>
          {loadError ? <p className="document-load-error">{loadError}</p> : !url ? <p className="document-load-error">Loading file…</p> : isImage ? <img className="document-frame" src={url} alt={documentLabel(document.kind)}/> : <iframe className="document-frame" src={url} title={document.fileName}/>}
        </div>
        <aside className="document-review-sidebar"><span>Uploaded file</span><h3>{document.fileName}</h3><div className="document-review-facts"><div><span>Applicant</span><strong>{account.name}</strong></div><div><span>Business</span><strong>{account.business}</strong></div><div><span>Uploaded</span><strong>{formatDate(document.createdAt.slice(0, 10))}</strong></div><div><span>File size</span><strong>{document.sizeBytes ? `${Math.max(1, Math.round(document.sizeBytes / 1024))} KB` : '—'}</strong></div></div><div className={`document-current-status ${badgeClass(document.status)}`}><span>Current review</span><strong>{document.status}</strong></div><label className={`document-remark-field ${remarkError ? 'has-error' : ''}`}><span>Review remark <b>Required to reject</b></span><textarea value={remark} onChange={event=>{setRemark(event.target.value);if(remarkError)setRemarkError('')}} placeholder="Describe what is unclear, missing or incorrect…" rows={4}/><small>{remarkError || 'This remark is saved with the document review.'}</small></label></aside>
      </div>
      <footer><button className="document-reject" disabled={busy} onClick={() => void decide('Rejected')}>Reject document</button><button className="admin-primary" disabled={busy} onClick={() => void decide('Verified')}>Mark document verified</button></footer>
    </section>
  </div>;
}

function RejectBusinessDialog({ account, onCancel, onConfirm }: { account: AdminAccount; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);
  return <div className="business-reject-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onCancel()}>
    <section className="business-reject-dialog" role="alertdialog" aria-modal="true" aria-labelledby="rejectBusinessTitle" aria-describedby="rejectBusinessDescription">
      <button className="business-reject-close" onClick={onCancel} aria-label="Close confirmation"><Icon name="close"/></button>
      <span className="business-reject-icon">!</span>
      <span className="business-reject-eyebrow">Reject KYC application</span>
      <h2 id="rejectBusinessTitle">Reject {account.business}?</h2>
      <p id="rejectBusinessDescription">This will reject the business verification and suspend the account. The business will no longer appear in the active KYC review queue.</p>
      <div className="business-reject-summary"><span>{account.name.split(' ').map(part=>part[0]).join('')}</span><div><strong>{account.business}</strong><small>{account.id} · {account.role} · {account.city}</small></div></div>
      <footer><button onClick={onCancel}>Cancel</button><button className="confirm-business-reject" onClick={onConfirm}>Yes, reject business</button></footer>
    </section>
  </div>;
}

function AdminHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-page-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ accounts, data, navigate, alerts }: { accounts: AdminAccount[]; data: PortalData; navigate: (view: ViewName) => void; alerts: api.AdminAlerts | null }) {
  const pending = accounts.filter(needsVerificationReview);
  const active = accounts.filter(account => account.status === 'Active');
  const accepted = data.loads.filter(load => load.status === 'Accepted').length;
  const pendingRequests = data.loads.filter(load => load.status === 'Pending').length;
  const availableTrucks = data.trucks.filter(truck => truck.status === 'Available').length;
  const marketplaceActivity = [
    { label: 'Requests', value: data.loads.length },
    { label: 'Pending', value: pendingRequests },
    { label: 'Accepted', value: accepted },
    { label: 'Vehicles', value: data.trucks.length },
    { label: 'Available', value: availableTrucks },
    { label: 'Accounts', value: accounts.length },
  ];
  const chartMaximum = Math.max(1,...marketplaceActivity.map(item=>item.value));
  return <section className="admin-view">
    <AdminHeader eyebrow="Control centre" title="Platform overview" description="Monitor users, verification and marketplace activity from one place." action={<button className="admin-primary" onClick={() => navigate('admin-compliance')}>Review KYC queue <span>{pending.length}</span></button>}/>
    <div className="admin-metric-grid">
      <button onClick={() => navigate('admin-users')}><span className="admin-metric-icon blue"><Icon name="building"/></span><div><small>Managed accounts</small><strong>{accounts.length}</strong><em>{active.length} currently active</em></div><Icon name="chevron"/></button>
      <button onClick={() => navigate('admin-compliance')}><span className="admin-metric-icon amber"><Icon name="inbox"/></span><div><small>KYC needs review</small><strong>{pending.length}</strong><em>Requires admin attention</em></div><Icon name="chevron"/></button>
      <button onClick={() => navigate('admin-operations')}><span className="admin-metric-icon green"><Icon name="truck"/></span><div><small>Vehicles on platform</small><strong>{data.trucks.length}</strong><em>{data.trucks.filter(t => t.status === 'Available').length} accepting requests</em></div><Icon name="chevron"/></button>
      <button onClick={() => navigate('admin-operations')}><span className="admin-metric-icon violet"><Icon name="route"/></span><div><small>Accepted requests</small><strong>{accepted}</strong><em>{data.loads.length} total requests</em></div><Icon name="chevron"/></button>
    </div>
    <div className="admin-overview-grid">
      <section className="admin-panel admin-activity-panel"><header><div><span>Marketplace activity</span><h2>Live platform snapshot</h2></div><span className="admin-live"><i/> Live</span></header><div className="admin-chart"><div className="chart-scale"><span>{chartMaximum}</span><span>{Math.ceil(chartMaximum*.66)}</span><span>{Math.ceil(chartMaximum*.33)}</span><span>0</span></div><div className="chart-bars">{marketplaceActivity.map(item=><div key={item.label}><i style={{height:`${Math.max(8,(item.value/chartMaximum)*100)}%`}}><b>{item.value}</b></i><span>{item.label}</span></div>)}</div></div><footer><div><strong>{data.loads.length}</strong><span>Total truck requests</span></div><div><strong>{pendingRequests}</strong><span>Awaiting owner response</span></div><div><strong>{availableTrucks}</strong><span>Trucks available now</span></div></footer></section>
      <section className="admin-panel admin-queue"><header><div><span>Action centre</span><h2>Verification queue</h2></div><button onClick={() => navigate('admin-compliance')}>View all</button></header><div>{pending.slice(0,3).map(account=><button key={account.id} onClick={() => navigate('admin-compliance')}><span className="admin-account-avatar">{account.name.split(' ').map(p=>p[0]).join('')}</span><span><strong>{account.business}</strong><small>{account.role} · {account.city}</small></span><em className={`admin-badge ${badgeClass(account.verification)}`}>{account.verification}</em><Icon name="chevron"/></button>)}</div></section>
    </div>
    {alerts ? <section className="admin-panel admin-alerts"><header><div><span>Risk and exceptions</span><h2>Needs attention</h2></div></header><div className="admin-alert-grid">{(() => {
      const items = [
        alerts.pendingKyc > 0 && { mark: 'high', title: `${alerts.pendingKyc} business${alerts.pendingKyc === 1 ? '' : 'es'} waiting for KYC review`, text: 'They cannot post or accept requests until approved.', action: 'Review', view: 'admin-compliance' as ViewName },
        alerts.vehicleDocsToReview > 0 && { mark: 'medium', title: `${alerts.vehicleDocsToReview} vehicle document${alerts.vehicleDocsToReview === 1 ? '' : 's'} to review`, text: 'RC, insurance, fitness and PUC uploads awaiting verification.', action: 'Inspect', view: 'admin-operations' as ViewName },
        alerts.licencesExpiring > 0 && { mark: 'medium', title: `${alerts.licencesExpiring} driver licence${alerts.licencesExpiring === 1 ? '' : 's'} expiring`, text: 'Expired or expiring within 30 days.', action: 'View drivers', view: 'admin-operations' as ViewName },
        alerts.tripsNeedingAttention > 0 && { mark: 'high', title: `${alerts.tripsNeedingAttention} trip${alerts.tripsNeedingAttention === 1 ? '' : 's'} need${alerts.tripsNeedingAttention === 1 ? 's' : ''} attention`, text: 'A problem was reported, or the trip has not been updated despite reminders. Call both sides.', action: 'View trips', view: 'admin-operations' as ViewName },
        alerts.urgentTickets > 0 && { mark: 'high', title: `${alerts.urgentTickets} urgent support quer${alerts.urgentTickets === 1 ? 'y' : 'ies'} open`, text: 'Marked urgent by the user.', action: 'Open', view: 'admin-support' as ViewName },
      ].filter(Boolean) as Array<{ mark: string; title: string; text: string; action: string; view: ViewName }>;
      return items.length ? items.map((item) => <article key={item.title}><span className={`alert-mark ${item.mark}`}>!</span><div><strong>{item.title}</strong><p>{item.text}</p></div><button onClick={() => navigate(item.view)}>{item.action}</button></article>)
        : <article><span className="alert-mark neutral">✓</span><div><strong>All clear</strong><p>No pending verifications, expiring licences or urgent queries.</p></div></article>;
    })()}</div></section> : <section className="admin-panel admin-alerts"><header><div><span>Risk and exceptions</span><h2>Needs attention</h2></div></header><div className="admin-alert-grid"><article><span className="alert-mark high">!</span><div><strong>2 vehicle documents expire soon</strong><p>Insurance or fitness certificates expire within 30 days.</p></div><button onClick={() => navigate('admin-operations')}>Inspect</button></article><article><span className="alert-mark medium">i</span><div><strong>1 account needs more information</strong><p>The submitted GST document could not be verified.</p></div><button onClick={() => navigate('admin-compliance')}>Review</button></article><article><span className="alert-mark neutral"><Icon name="trend"/></span><div><strong>Acceptance is trending upward</strong><p>{accepted} of {data.loads.length} requests are currently confirmed.</p></div><button onClick={() => navigate('admin-operations')}>View activity</button></article></div></section>}
  </section>;
}

function Accounts({ accounts, setAccounts, query, notify, onDelete }: { onDelete: (account: AdminAccount) => Promise<boolean>; accounts: AdminAccount[]; setAccounts: React.Dispatch<React.SetStateAction<AdminAccount[]>>; query: string; notify: (message:string)=>void }) {
  const [status,setStatus] = useState('All');
  const [role,setRole] = useState('All');
  const filtered = accounts.filter(account => (status==='All'||account.status===status) && (role==='All'||account.role===role) && (!query||Object.values(account).some(value=>String(value).toLowerCase().includes(query.toLowerCase()))));
  const [deleting,setDeleting] = useState<AdminAccount|null>(null);
  const reopenKyc = (account: AdminAccount) => { setAccounts(current=>current.map(item=>item.id===account.id?{...item,verification:'Needs information',status:'Active'}:item)); notify(`${account.business} can resubmit KYC — they have been notified`); };
  const toggle = (account: AdminAccount) => { const next=account.status==='Active'?'Suspended':'Active'; setAccounts(current=>current.map(item=>item.id===account.id?{...item,status:next}:item)); notify(`${account.business} ${next==='Active'?'activated':'suspended'}`); };
  return <section className="admin-view"><AdminHeader eyebrow="Platform / Accounts" title="User accounts" description="Search, inspect and control access for every business on Fares24x7."/>
    <div className="admin-toolbar"><div className="admin-query"><Icon name="search"/><input value={query} readOnly placeholder="Use global search to find an account"/></div><select value={role} onChange={event=>setRole(event.target.value)}><option>All</option><option>Truck owner</option><option>Load owner</option></select><select value={status} onChange={event=>setStatus(event.target.value)}><option>All</option><option>Active</option><option>Suspended</option></select><span>{filtered.length} accounts</span></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Business</th><th>Account type</th><th>Location</th><th>KYC</th><th>Platform status</th><th>Activity</th><th>Action</th></tr></thead><tbody>{filtered.map(account=><tr key={account.id}><td><div className="admin-business-cell"><span>{account.name.split(' ').map(p=>p[0]).join('')}</span><div><strong>{account.business}</strong><small>{account.name} · {shortId(account.id)}</small></div></div></td><td>{account.role}</td><td>{account.city}</td><td><em className={`admin-badge ${badgeClass(account.verification)}`}>{account.verification}</em></td><td><em className={`admin-badge ${badgeClass(account.status)}`}>{account.status}</em></td><td><strong>{account.assets}</strong><small>{account.role==='Truck owner'?' vehicles':' requests'}</small></td><td><div className="admin-row-actions">{account.verification==='Rejected'?<button className="admin-action" onClick={()=>reopenKyc(account)} title="Re-activate the account and ask the business to resubmit KYC">Re-open KYC</button>:<button className={account.status==='Active'?'admin-action danger':'admin-action'} onClick={()=>toggle(account)}>{account.status==='Active'?'Suspend':'Activate'}</button>}<button className="admin-action danger-outline" onClick={()=>setDeleting(account)}>Delete</button></div></td></tr>)}</tbody></table></div>
    {deleting && <ConfirmDialog title={`Delete ${deleting.business}?`} message={`This permanently erases ${deleting.name}'s account: login, profile, vehicles, drivers, requests, KYC details, support queries and all uploaded documents. It cannot be undone. Accounts with a trip in progress cannot be deleted.`} confirmLabel="Delete permanently" danger onCancel={()=>setDeleting(null)} onConfirm={async()=>{ if(await onDelete(deleting)) setDeleting(null); }}/>}
  </section>;
}

function Compliance({ accounts, setAccounts, notify, backend }: { accounts: AdminAccount[]; setAccounts: React.Dispatch<React.SetStateAction<AdminAccount[]>>; notify:(message:string)=>void; backend?: AdminBackend }) {
  const [storedDocs,setStoredDocs] = useState<Record<string, StoredDocument[]>>({});
  const [openStored,setOpenStored] = useState<{ account: AdminAccount; document: StoredDocument } | null>(null);
  const queueIds = accounts.filter(needsVerificationReview).map(account => account.id).join(',');
  const backendEnabled = Boolean(backend);
  useEffect(() => {
    if (!backendEnabled || !queueIds) return;
    let cancelled = false;
    Promise.all(queueIds.split(',').map(async id => [id, await api.fetchDocuments({ ownerId: id, entityType: 'kyc' })] as const))
      .then(entries => { if (!cancelled) setStoredDocs(Object.fromEntries(entries)); })
      .catch(() => { if (!cancelled) notify('Could not load KYC documents'); });
    return () => { cancelled = true; };
  }, [backendEnabled, queueIds, notify]);
  const reviewStored = async (status: 'Verified' | 'Rejected', remark?: string) => {
    if (!openStored) return;
    const { account, document } = openStored;
    try {
      await api.reviewDocument(document.id, status, remark);
      setStoredDocs(current => ({ ...current, [account.id]: (current[account.id] ?? []).map(item => item.id === document.id ? { ...item, status, remark: status === 'Rejected' ? remark : undefined } : item) }));
      if (status === 'Rejected') setAccounts(current => current.map(item => item.id === account.id ? { ...item, verification: 'Needs information' } : item));
      notify(status === 'Verified' ? `${documentLabel(document.kind)} marked as verified` : `${documentLabel(document.kind)} rejected with a remark`);
      setOpenStored(null);
    } catch (problem) { backend?.fail(problem); }
  };
  const [selectedDocument,setSelectedDocument] = useState<{ account: AdminAccount; kind: DocumentKind } | null>(null);
  const [rejectingAccount,setRejectingAccount] = useState<AdminAccount | null>(null);
  const [documentReviews,setDocumentReviews] = useLocalStorage<Record<string,DocumentReviewStatus>>('fares24x7-admin-document-reviews-v1',{});
  const [documentRemarks,setDocumentRemarks] = useLocalStorage<Record<string,string>>('fares24x7-admin-document-remarks-v1',{});
  const queue=accounts.filter(needsVerificationReview);
  const update=(account:AdminAccount,verification:VerificationStatus)=>{setAccounts(current=>current.map(item=>item.id===account.id?{...item,verification}:item));notify(verification==='Verified'?`${account.business} verified`:`Information requested from ${account.business}`)};
  const documentKey=(account:AdminAccount,kind:DocumentKind)=>`${account.id}:${kind}`;
  const reviewDocument=(status:DocumentReviewStatus,remark?:string)=>{if(!selectedDocument)return;const {account,kind}=selectedDocument;const key=documentKey(account,kind);setDocumentReviews(current=>({...current,[key]:status}));if(status==='Rejected'&&remark)setDocumentRemarks(current=>({...current,[key]:remark}));if(status==='Verified')setDocumentRemarks(current=>{const next={...current};delete next[key];return next});if(status!=='Verified')setAccounts(current=>current.map(item=>item.id===account.id?{...item,verification:'Needs information'}:item));notify(status==='Verified'?`${documentMeta[kind].title} marked as verified`:`${documentMeta[kind].title} rejected with a remark`);setSelectedDocument(null)};
  const rejectBusiness=()=>{if(!rejectingAccount)return;const account=rejectingAccount;setAccounts(current=>current.map(item=>item.id===account.id?{...item,verification:'Rejected',status:'Suspended'}:item));notify(`${account.business} rejected and account suspended`);setRejectingAccount(null)};
  return <section className="admin-view"><AdminHeader eyebrow="Trust & safety" title="KYC verification" description="Review business identity and tax information before granting full access." action={<span className="admin-queue-count"><b>{queue.length}</b> waiting</span>}/>
    <div className="compliance-layout"><div className="compliance-list">{queue.length===0?<div className="admin-empty"><span>✓</span><h2>Queue cleared</h2><p>There are no businesses waiting for review.</p></div>:queue.map(account=><article key={account.id}><header><span className="admin-account-avatar">{account.name.split(' ').map(p=>p[0]).join('')}</span><div><strong>{account.business}</strong><small>{shortId(account.id)} · Submitted {formatDate(account.joined)}</small></div><em className={`admin-badge ${badgeClass(account.verification)}`}>{account.verification}</em></header><div className="compliance-facts"><div><span>Applicant</span><strong>{account.name}</strong></div><div><span>Account type</span><strong>{account.role}</strong></div><div><span>Registered city</span><strong>{account.city}</strong></div><div><span>Phone</span><strong>{account.phone}</strong></div></div><div className="document-checks">{backend ? ((storedDocs[account.id] ?? []).length === 0 ? <p className="document-none">No documents uploaded yet.</p> : (storedDocs[account.id] ?? []).map(document => <button key={document.id} onClick={()=>setOpenStored({account,document})} aria-label={`Open ${documentLabel(document.kind)} for ${account.business}`}><span><Icon name="package"/>{documentLabel(document.kind)}</span><b className={document.status==='Rejected'?'document-issue':'document-ready'}>{document.status==='Submitted'?'Received':document.status}</b><Icon name="chevron"/></button>)) : (['gst','identity'] as DocumentKind[]).map(kind=>{const meta=documentMeta[kind];const reviewed=documentReviews[documentKey(account,kind)];const issue=reviewed==='Needs information'||reviewed==='Rejected'||(!reviewed&&kind==='identity'&&account.verification==='Needs information');const label=reviewed??(issue?'Unclear':'Received');return <button key={kind} onClick={()=>setSelectedDocument({account,kind})} aria-label={`Open ${meta.title} for ${account.business}`}><span><Icon name={meta.icon}/>{meta.title}</span><b className={issue?'document-issue':'document-ready'}>{label}</b><Icon name="chevron"/></button>})}</div><footer><button className="reject-business-button" onClick={()=>setRejectingAccount(account)}>Reject business</button><button onClick={()=>update(account,'Needs information')}>Request information</button><button className="admin-primary" onClick={()=>update(account,'Verified')}>Approve business</button></footer></article>)}</div><aside className="compliance-guide"><span>Review checklist</span><h3>Before approving</h3><ol><li><b>1</b><p><strong>Business identity</strong><small>Name matches incorporation or GST records.</small></p></li><li><b>2</b><p><strong>Contact ownership</strong><small>Phone and email belong to the applicant.</small></p></li><li><b>3</b><p><strong>Tax registration</strong><small>GSTIN format and business state are consistent.</small></p></li><li><b>4</b><p><strong>PAN details</strong><small>Personal and business PAN match the names on the application.</small></p></li></ol><p className="guide-note">Every decision is recorded in the platform audit history.</p></aside></div>
    {selectedDocument && <DocumentReviewModal account={selectedDocument.account} kind={selectedDocument.kind} status={documentReviews[documentKey(selectedDocument.account,selectedDocument.kind)]} savedRemark={documentRemarks[documentKey(selectedDocument.account,selectedDocument.kind)]} onClose={()=>setSelectedDocument(null)} onDecision={reviewDocument}/>}
    {rejectingAccount && <RejectBusinessDialog account={rejectingAccount} onCancel={()=>setRejectingAccount(null)} onConfirm={rejectBusiness}/>}
    {openStored && <StoredDocumentModal account={openStored.account} document={openStored.document} onClose={()=>setOpenStored(null)} onDecision={reviewStored}/>}
  </section>;
}

function VehicleDocumentsModal({ truck, onClose, notify }: { truck: Truck; onClose: () => void; notify: (message: string) => void }) {
  const [documents, setDocuments] = useState<StoredDocument[] | null>(null);
  const [open, setOpen] = useState<StoredDocument | null>(null);
  const load = useCallback(() => api.fetchDocuments({ entityType: 'truck', entityId: truck.id }).then(setDocuments).catch(() => setDocuments([])), [truck.id]);
  useEffect(() => { void load(); }, [load]);
  const latest = (kind: string) => documents?.find((document) => document.kind === kind);
  return <div className="document-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="support-detail-modal vehicle-docs-review" role="dialog" aria-modal="true" aria-labelledby="vehicleDocsTitle">
    <header><div><span>Vehicle documents</span><h2 id="vehicleDocsTitle">{truck.registration}</h2><p>{truck.type} · {truck.capacity} tonnes · {truck.location}</p></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></header>
    <div className="vehicle-docs-list">{documents === null ? <p>Loading…</p> : VEHICLE_DOCUMENTS.map(({ kind, label }) => { const document = latest(kind); return <div key={kind}><span><Icon name="package"/>{label}</span>{document ? <><em className={`admin-badge ${badgeClass(document.status === 'Submitted' ? 'Pending' : document.status)}`}>{document.status === 'Submitted' ? 'To review' : document.status}</em><button className="admin-action" onClick={() => setOpen(document)}>Open</button></> : <em className="admin-badge needs-information">Missing</em>}</div>; })}</div>
    <footer><button onClick={onClose}>Close</button></footer>
    {open && <StoredDocumentModal account={{ name: truck.type, business: truck.registration }} document={open} onClose={() => setOpen(null)} onDecision={async (status, remark) => { await api.reviewDocument(open.id, status, remark); notify(status === 'Verified' ? 'Document verified' : 'Document rejected with a remark'); setOpen(null); await load(); }}/>}
  </section></div>;
}

function Operations({ data, drivers, backendEnabled, notify, backend }: { data: PortalData; drivers: Driver[]; backendEnabled: boolean; notify: (message: string) => void; backend?: { reload: () => Promise<void>; fail: (problem: unknown) => void } }) {
  const [section,setSection]=useState<'trips'|'requests'|'vehicles'|'drivers'>('trips');
  const [reviewTruck,setReviewTruck]=useState<Truck|null>(null);
  const soon = Date.now() + 30 * 86_400_000;
  return <section className="admin-view"><AdminHeader eyebrow="Marketplace oversight" title="Operations" description="Inspect requests and trips, review vehicle documents and watch driver licences." action={<div className="admin-segmented"><button className={section==='trips'?'active':''} onClick={()=>setSection('trips')}>Trips</button><button className={section==='requests'?'active':''} onClick={()=>setSection('requests')}>Requests</button><button className={section==='vehicles'?'active':''} onClick={()=>setSection('vehicles')}>Vehicles</button><button className={section==='drivers'?'active':''} onClick={()=>setSection('drivers')}>Drivers</button></div>}/>
    {section==='trips' && <AdminTrips loads={data.loads} backend={backend} notify={notify}/>}
    {section==='requests' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Request</th><th>Route</th><th>Goods</th><th>Budget</th><th>Pickup</th><th>Status</th><th>Carrier</th></tr></thead><tbody>{data.loads.map((load:Load)=>{ const label = requestLabel(load, 'load_owner'); return <tr key={load.id}><td><strong>#F24-{load.id}</strong></td><td><div className="operation-route"><i/><strong>{load.origin}</strong><Icon name="arrow"/><strong>{load.destination}</strong></div></td><td><strong>{load.material}</strong><small>{load.quantity} tonnes</small></td><td>{load.budget ? formatInr(load.budget) : '—'}</td><td>{formatDate(load.date)}</td><td><em className={`admin-badge ${statusClass(label)}`}>{label}</em>{(() => { const last = load.booking?.history.at(-1); return last ? <small>{bookingLabel[last.status]} · {formatDateTime(last.at)}</small> : null; })()}</td><td>{load.booking && load.booking.status !== 'cancelled' ? <><strong>{load.booking.transporter?.business || '—'}</strong><small>{load.booking.truck}{load.booking.driver ? ` · ${load.booking.driver.name}` : ''}</small></> : <span className="muted">—</span>}</td></tr>; })}</tbody></table>{data.loads.length===0&&<div className="admin-empty"><h2>No requests yet</h2></div>}</div>}
    {section==='vehicles' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Registration</th><th>Vehicle</th><th>Route corridor</th><th>Capacity</th><th>Documents</th><th>Status</th>{backendEnabled&&<th>Action</th>}</tr></thead><tbody>{data.trucks.map((truck:Truck)=>{ const count = truck.documentCount ?? (truck.chassisNumber ? VEHICLE_DOCUMENTS.length : 0); return <tr key={truck.id}><td><strong>{truck.registration}</strong></td><td>{truck.type}</td><td><div className="operation-route"><strong>{truck.location}</strong><Icon name="arrow"/><strong>{truck.destination}</strong></div></td><td>{truck.capacity} tonnes</td><td><em className={`admin-badge ${count >= VEHICLE_DOCUMENTS.length ? 'verified' : 'needs-information'}`}>{count >= VEHICLE_DOCUMENTS.length ? 'All uploaded' : `${count} of ${VEHICLE_DOCUMENTS.length}`}</em></td><td><em className={`admin-badge ${badgeClass(truck.status)}`}>{truck.status}</em></td>{backendEnabled&&<td><button className="admin-action" onClick={()=>setReviewTruck(truck)}>Review documents</button></td>}</tr>; })}</tbody></table>{data.trucks.length===0&&<div className="admin-empty"><h2>No vehicles yet</h2></div>}</div>}
    {section==='drivers' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Driver</th><th>Phone</th><th>Licence</th><th>Licence expiry</th><th>Base city</th><th>Vehicle</th><th>Status</th></tr></thead><tbody>{drivers.map((driver)=>{ const expiring = new Date(driver.licenceExpiry).getTime() < soon; return <tr key={driver.id}><td><strong>{driver.name}</strong></td><td>{driver.phone}</td><td>{driver.licenceNumber}</td><td><em className={`admin-badge ${expiring ? 'rejected' : 'verified'}`}>{formatDate(driver.licenceExpiry)}{expiring ? ' · expiring' : ''}</em></td><td>{driver.city}</td><td>{driver.assignedVehicle || '—'}</td><td><em className={`admin-badge ${badgeClass(driver.status)}`}>{driver.status}</em></td></tr>; })}</tbody></table>{drivers.length===0&&<div className="admin-empty"><h2>No drivers yet</h2></div>}</div>}
    {reviewTruck && <VehicleDocumentsModal truck={reviewTruck} onClose={()=>setReviewTruck(null)} notify={notify}/>}
  </section>;
}

function SupportReply({ ticket, onReply }: { ticket: SupportTicket; onReply: (ticket: SupportTicket, reply: string, status: SupportTicketStatus) => Promise<boolean> }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (status: SupportTicketStatus) => { if (!reply.trim() || busy) return; setBusy(true); if (await onReply(ticket, reply, status)) setReply(''); setBusy(false); };
  return <div className="support-reply">
    <SupportThread ticket={ticket} viewer="support"/>
    <label><span>{ticketThread(ticket).length ? 'Send another reply' : 'Reply to the user'}</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} maxLength={2000} placeholder="Write your answer. The user is notified and sees it under Support."/></label>
    <div className="support-reply-actions"><button onClick={() => void send('In review')} disabled={!reply.trim() || busy}>Send reply</button><button className="admin-primary" onClick={() => void send('Resolved')} disabled={!reply.trim() || busy}>{busy ? 'Sending…' : 'Send & resolve'}</button></div>
  </div>;
}

function SupportRequests({ tickets, setTickets, notify, onReply }: { onReply: (ticket: SupportTicket, reply: string, status: SupportTicketStatus) => Promise<boolean>; tickets: SupportTicket[]; setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>; notify:(message:string)=>void }) {
  const [filter,setFilter]=useState<'All'|SupportTicketStatus>('All');
  const [selected,setSelected]=useState<SupportTicket|null>(null);
  const filtered=tickets.filter(ticket=>filter==='All'||ticket.status===filter);
  const updateStatus=(ticket:SupportTicket,status:SupportTicketStatus)=>{setTickets(current=>current.map(item=>item.id===ticket.id?{...item,status}:item));setSelected(current=>current?.id===ticket.id?{...current,status}:current);notify(status==='Resolved'?`${ticket.id} resolved`:`${ticket.id} moved to review`)};
  const dateLabel=(value:string)=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
  return <section className="admin-view"><AdminHeader eyebrow="Service desk" title="Support requests" description="Review questions submitted by truck owners and customers, then track them through resolution." action={<span className="admin-queue-count"><b>{tickets.filter(ticket=>ticket.status!=='Resolved').length}</b> unresolved</span>}/><div className="support-admin-filters">{(['All','Open','In review','Resolved'] as const).map(status=><button key={status} className={filter===status?'active':''} onClick={()=>setFilter(status)}>{status}<span>{status==='All'?tickets.length:tickets.filter(ticket=>ticket.status===status).length}</span></button>)}</div>{filtered.length===0?<div className="support-admin-empty"><span><Icon name="headset"/></span><h2>No {filter==='All'?'support requests':filter.toLowerCase()+' requests'}</h2><p>New queries submitted by platform users will appear here.</p></div>:<div className="support-ticket-list">{filtered.map(ticket=><button key={ticket.id} onClick={()=>setSelected(ticket)}><span className={`support-priority ${ticket.priority.toLowerCase()}`}>{ticket.priority==='Urgent'?'!':<Icon name="inbox"/>}</span><span className="support-ticket-copy"><span><strong>{ticket.subject}</strong><em className={`admin-badge ${badgeClass(ticket.status)}`}>{ticket.status}</em></span><small>{ticket.business} · {ticket.category}</small><p>{ticket.message}</p><time>{ticket.id} · {dateLabel(ticket.createdAt)}</time></span><Icon name="chevron"/></button>)}</div>}{selected&&<div className="support-detail-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setSelected(null)}><section className="support-detail-modal" role="dialog" aria-modal="true" aria-labelledby="supportDetailTitle"><header><div><span>{selected.id} · {selected.category}</span><h2 id="supportDetailTitle">{selected.subject}</h2><p>Submitted {dateLabel(selected.createdAt)}</p></div><button onClick={()=>setSelected(null)} aria-label="Close support request"><Icon name="close"/></button></header><div className="support-detail-body"><div className="support-detail-message"><span>Customer query</span><p>{selected.message}</p></div><aside><div><span>Submitted by</span><strong>{selected.userName}</strong><small>{selected.business}</small></div><div><span>Account type</span><strong>{selected.role==='load_owner'?'Load owner':'Truck owner'}</strong></div><div><span>Contact</span><strong>{selected.email}</strong><small>{selected.phone}</small></div><div><span>Priority</span><strong>{selected.priority}</strong></div><div><span>Current status</span><em className={`admin-badge ${badgeClass(selected.status)}`}>{selected.status}</em></div></aside></div><SupportReply key={selected.id} ticket={selected} onReply={async (ticket, reply, status) => { const ok = await onReply(ticket, reply, status); if (ok) setSelected(current => current && current.id === ticket.id ? { ...current, adminReply: reply.trim(), repliedAt: new Date().toISOString(), status } : current); return ok; }}/><footer><button onClick={()=>setSelected(null)}>Close</button>{selected.status!=='In review'&&selected.status!=='Resolved'&&<button className="support-review-btn" onClick={()=>updateStatus(selected,'In review')}>Mark in review</button>}{selected.status!=='Resolved'&&<button className="admin-primary" onClick={()=>updateStatus(selected,'Resolved')}>Resolve query</button>}</footer></section></div>}</section>;
}

export interface AdminBackend { reload: () => Promise<void>; fail: (problem: unknown) => void }

export function AdminConsole({ view, data, drivers, globalQuery, onNavigate, notify, onPendingCountChange, supportTickets, setSupportTickets, backend }: { view: ViewName; data: PortalData; drivers: Driver[]; globalQuery: string; onNavigate:(view:ViewName)=>void; notify:(message:string)=>void; onPendingCountChange:(count:number)=>void; supportTickets:SupportTicket[]; setSupportTickets:React.Dispatch<React.SetStateAction<SupportTicket[]>>; backend?: AdminBackend }) {
  const [localAccounts,setLocalAccounts]=useLocalStorage<AdminAccount[]>('fares24x7-admin-accounts-v1',seedAccounts);
  const [remoteAccounts,setRemoteAccounts]=useState<AdminAccount[]>([]);
  const backendRef=useRef(backend); backendRef.current=backend;
  const backendEnabled=Boolean(backend);
  const loadAccounts=useCallback(()=>api.fetchAdminAccounts().then(setRemoteAccounts).catch(problem=>backendRef.current?.fail(problem)),[]);
  useEffect(()=>{ if(backendEnabled) void loadAccounts(); },[backendEnabled,loadAccounts,data]);
  // In backend mode, persist whatever the existing screens change (status / verification) and keep the UI optimistic.
  const remoteAccountsRef=useRef(remoteAccounts); remoteAccountsRef.current=remoteAccounts;
  const remoteSetAccounts=useCallback<Dispatch<SetStateAction<AdminAccount[]>>>(update=>{
    const previous=remoteAccountsRef.current;
    const next=typeof update==='function'?update(previous):update;
    remoteAccountsRef.current=next;
    setRemoteAccounts(next);
    const writes=next.flatMap(account=>{const before=previous.find(item=>item.id===account.id);if(!before)return [];const patch={status:before.status!==account.status?account.status:undefined,verification:before.verification!==account.verification?account.verification:undefined};return patch.status||patch.verification?[api.updateAccount(account.id,patch)]:[];});
    if(writes.length) void Promise.all(writes).catch(problem=>{backendRef.current?.fail(problem);void loadAccounts();});
  },[loadAccounts]);
  const remoteSetTickets=useCallback<Dispatch<SetStateAction<SupportTicket[]>>>(update=>{
    const next=typeof update==='function'?update(supportTickets):update;
    const writes=next.flatMap(ticket=>{const before=supportTickets.find(item=>item.id===ticket.id);return before&&before.status!==ticket.status?[api.updateTicketStatus(ticket.id,ticket.status)]:[];});
    void Promise.all(writes).then(()=>backendRef.current?.reload()).catch(problem=>backendRef.current?.fail(problem));
  },[supportTickets]);
  const [alerts,setAlerts]=useState<api.AdminAlerts|null>(null);
  useEffect(()=>{ if(backendEnabled && view==='dashboard') api.fetchAdminAlerts().then(setAlerts).catch(()=>setAlerts(null)); },[backendEnabled,view,data,supportTickets]);
  const replyToTicket=useCallback(async(ticket:SupportTicket,reply:string,status:SupportTicketStatus)=>{
    if(!backendRef.current){ setSupportTickets(current=>current.map(item=>item.id===ticket.id?{...item,adminReply:reply.trim(),repliedAt:new Date().toISOString(),status,thread:[...ticketThread(item),{from:'support',text:reply.trim(),at:new Date().toISOString()}]}:item)); notify('Reply saved'); return true; }
    try{ await api.replyToTicket(ticket.id,reply,status); await backendRef.current.reload(); notify(status==='Resolved'?'Reply sent and query resolved':'Reply sent to the user'); return true; }
    catch(problem){ backendRef.current.fail(problem); return false; }
  },[notify,setSupportTickets]);
  const deleteAccount=useCallback(async(account:AdminAccount)=>{
    if(!backendRef.current){ setLocalAccounts(current=>current.filter(item=>item.id!==account.id)); notify(`${account.business} deleted`); return true; }
    try{ await api.adminDeleteAccount(account.id); await loadAccounts(); await backendRef.current.reload(); notify(`${account.business} and all its data were permanently deleted`); return true; }
    catch(problem){ backendRef.current.fail(problem); return false; }
  },[loadAccounts,notify,setLocalAccounts]);
  const accounts=backend?remoteAccounts:localAccounts;
  const setAccounts=backend?remoteSetAccounts:setLocalAccounts;
  const setTickets=backend?remoteSetTickets:setSupportTickets;
  useEffect(() => { onPendingCountChange(accounts.filter(needsVerificationReview).length); }, [accounts, onPendingCountChange]);
  const content=useMemo(()=>{
    if(view==='admin-users') return <Accounts accounts={accounts} setAccounts={setAccounts} query={globalQuery} notify={notify} onDelete={deleteAccount}/>;
    if(view==='admin-compliance') return <Compliance accounts={accounts} setAccounts={setAccounts} notify={notify} backend={backend}/>;
    if(view==='admin-operations') return <Operations data={data} drivers={drivers} backendEnabled={Boolean(backend)} notify={notify} backend={backend}/>;
    if(view==='admin-analytics') return <AdminAnalytics loads={data.loads}/>;
    if(view==='admin-support') return <SupportRequests tickets={supportTickets} setTickets={setTickets} notify={notify} onReply={replyToTicket}/>;
    return <Overview accounts={accounts} data={data} navigate={onNavigate} alerts={alerts}/>;
  },[accounts,alerts,backend,data,deleteAccount,drivers,globalQuery,notify,onNavigate,replyToTicket,setAccounts,setTickets,supportTickets,view]);
  return content;
}
