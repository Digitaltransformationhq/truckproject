import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatDate } from '../lib/matching';
import type { Load, PortalData, SupportTicket, SupportTicketStatus, Truck, ViewName } from '../types';

type AdminAccountStatus = 'Active' | 'Suspended';
type VerificationStatus = 'Verified' | 'Pending' | 'Needs information';
type DocumentKind = 'gst' | 'identity' | 'bank';
type DocumentReviewStatus = 'Verified' | 'Needs information';

interface AdminAccount {
  id: string;
  name: string;
  business: string;
  role: 'Truck owner' | 'Load owner';
  city: string;
  phone: string;
  email: string;
  joined: string;
  status: AdminAccountStatus;
  verification: VerificationStatus;
  assets: number;
}

const seedAccounts: AdminAccount[] = [
  { id:'USR-1048', name:'Rajesh Sharma', business:'Sharma Roadways', role:'Truck owner', city:'Chennai', phone:'+91 98765 43210', email:'rajesh@sharmaroadways.in', joined:'2026-10-18', status:'Active', verification:'Pending', assets:4 },
  { id:'USR-1047', name:'Ananya Mehta', business:'Mehta Foods', role:'Load owner', city:'Bengaluru', phone:'+91 98765 41002', email:'ananya@mehtafoods.in', joined:'2026-10-17', status:'Active', verification:'Verified', assets:11 },
  { id:'USR-1046', name:'Vikram Singh', business:'NorthStar Logistics', role:'Truck owner', city:'Delhi', phone:'+91 98201 14228', email:'vikram@northstar.in', joined:'2026-10-16', status:'Active', verification:'Needs information', assets:18 },
  { id:'USR-1045', name:'Nisha Patel', business:'Patel Textiles', role:'Load owner', city:'Ahmedabad', phone:'+91 98980 21109', email:'nisha@pateltextiles.in', joined:'2026-10-14', status:'Active', verification:'Pending', assets:7 },
  { id:'USR-1044', name:'Arun Kumar', business:'AK Freight Movers', role:'Truck owner', city:'Pune', phone:'+91 97666 73118', email:'arun@akfreight.in', joined:'2026-10-12', status:'Suspended', verification:'Verified', assets:9 },
  { id:'USR-1043', name:'Farah Khan', business:'Coastal Retail', role:'Load owner', city:'Mumbai', phone:'+91 98190 88721', email:'farah@coastalretail.in', joined:'2026-10-09', status:'Active', verification:'Verified', assets:24 },
];

const badgeClass = (value: string) => value.toLowerCase().replaceAll(' ', '-');

const documentMeta: Record<DocumentKind, { title: string; icon: 'package' | 'building' | 'inbox'; filename: string }> = {
  gst: { title: 'GST registration', icon: 'package', filename: 'gst-registration-certificate.pdf' },
  identity: { title: 'Business identity', icon: 'building', filename: 'certificate-of-incorporation.pdf' },
  bank: { title: 'Bank proof', icon: 'inbox', filename: 'cancelled-cheque.pdf' },
};

function DocumentReviewModal({ account, kind, status, onClose, onDecision }: { account: AdminAccount; kind: DocumentKind; status?: DocumentReviewStatus; onClose: () => void; onDecision: (status: DocumentReviewStatus) => void }) {
  const docMeta = documentMeta[kind];
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [onClose]);
  const reference = kind === 'gst' ? `33AABCS${account.id.slice(-4)}F1Z2` : kind === 'identity' ? `U60231${account.id.slice(-4)}PTC` : `XXXXXX${account.phone.replace(/\D/g,'').slice(-4)}`;
  return <div className="document-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="document-review-modal" role="dialog" aria-modal="true" aria-labelledby="documentReviewTitle">
      <header><div><span>Document review</span><h2 id="documentReviewTitle">{docMeta.title}</h2><p>{account.business} · {account.id}</p></div><button onClick={onClose} aria-label="Close document preview"><Icon name="close"/></button></header>
      <div className="document-review-layout">
        <div className="document-preview-stage">
          <div className="document-preview-toolbar"><span><b>PDF</b>{docMeta.filename}</span><em>1 of 1</em></div>
          <div className="document-paper">
            <div className="document-emblem">RR</div>
            <small>{kind === 'bank' ? 'ACCOUNT VERIFICATION DOCUMENT' : 'GOVERNMENT OF INDIA'}</small>
            <h3>{kind === 'gst' ? 'Goods and Services Tax Registration Certificate' : kind === 'identity' ? 'Certificate of Incorporation' : 'Bank Account Confirmation'}</h3>
            <i/>
            <dl><div><dt>Legal business name</dt><dd>{account.business}</dd></div><div><dt>Authorised representative</dt><dd>{account.name}</dd></div><div><dt>{kind === 'gst' ? 'GSTIN' : kind === 'identity' ? 'Registration number' : 'Account reference'}</dt><dd>{reference}</dd></div><div><dt>Registered address</dt><dd>{account.city}, India</dd></div><div><dt>Effective date</dt><dd>{formatDate(account.joined)}</dd></div><div><dt>Document status</dt><dd>Valid and active</dd></div></dl>
            <div className="document-signature"><span><b>Digitally signed</b><small>Issuing authority</small></span><span className="document-stamp">VERIFIED<br/>SOURCE</span></div>
          </div>
        </div>
        <aside className="document-review-sidebar"><span>Uploaded file</span><h3>{docMeta.filename}</h3><div className="document-review-facts"><div><span>Applicant</span><strong>{account.name}</strong></div><div><span>Business</span><strong>{account.business}</strong></div><div><span>Uploaded</span><strong>{formatDate(account.joined)}</strong></div><div><span>File type</span><strong>PDF · 842 KB</strong></div></div><div className="document-security-note"><Icon name="building"/><p><strong>Review the original details</strong><small>Confirm the business name, reference number, address and validity before making a decision.</small></p></div>{status && <div className={`document-current-status ${badgeClass(status)}`}><span>Current review</span><strong>{status}</strong></div>}</aside>
      </div>
      <footer><button className="document-flag" onClick={() => onDecision('Needs information')}>Flag for follow-up</button><button className="admin-primary" onClick={() => onDecision('Verified')}>Mark document verified</button></footer>
    </section>
  </div>;
}

function AdminHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-page-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ accounts, data, navigate }: { accounts: AdminAccount[]; data: PortalData; navigate: (view: ViewName) => void }) {
  const pending = accounts.filter(account => account.verification !== 'Verified');
  const active = accounts.filter(account => account.status === 'Active');
  const accepted = data.loads.filter(load => load.status === 'Accepted').length;
  const activity = [42,58,48,72,64,86,78];
  return <section className="admin-view">
    <AdminHeader eyebrow="Control centre" title="Platform overview" description="Monitor users, verification and marketplace activity from one place." action={<button className="admin-primary" onClick={() => navigate('admin-compliance')}>Review KYC queue <span>{pending.length}</span></button>}/>
    <div className="admin-metric-grid">
      <button onClick={() => navigate('admin-users')}><span className="admin-metric-icon blue"><Icon name="building"/></span><div><small>Managed accounts</small><strong>{accounts.length}</strong><em>{active.length} currently active</em></div><Icon name="chevron"/></button>
      <button onClick={() => navigate('admin-compliance')}><span className="admin-metric-icon amber"><Icon name="inbox"/></span><div><small>KYC needs review</small><strong>{pending.length}</strong><em>Requires admin attention</em></div><Icon name="chevron"/></button>
      <button onClick={() => navigate('admin-operations')}><span className="admin-metric-icon green"><Icon name="truck"/></span><div><small>Vehicles on platform</small><strong>{data.trucks.length}</strong><em>{data.trucks.filter(t => t.status === 'Available').length} accepting requests</em></div><Icon name="chevron"/></button>
      <button onClick={() => navigate('admin-operations')}><span className="admin-metric-icon violet"><Icon name="route"/></span><div><small>Accepted requests</small><strong>{accepted}</strong><em>{data.loads.length} total requests</em></div><Icon name="chevron"/></button>
    </div>
    <div className="admin-overview-grid">
      <section className="admin-panel admin-activity-panel"><header><div><span>Marketplace health</span><h2>Weekly activity</h2></div><span className="admin-live"><i/> Live</span></header><div className="admin-chart"><div className="chart-scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-bars">{activity.map((value,index)=><div key={index}><i style={{height:`${value}%`}}><b>{value}</b></i><span>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index]}</span></div>)}</div></div><footer><div><strong>448</strong><span>Actions this week</span></div><div><strong>+18%</strong><span>vs. last week</span></div><div><strong>2m 18s</strong><span>Median response</span></div></footer></section>
      <section className="admin-panel admin-queue"><header><div><span>Action centre</span><h2>Verification queue</h2></div><button onClick={() => navigate('admin-compliance')}>View all</button></header><div>{pending.slice(0,3).map(account=><button key={account.id} onClick={() => navigate('admin-compliance')}><span className="admin-account-avatar">{account.name.split(' ').map(p=>p[0]).join('')}</span><span><strong>{account.business}</strong><small>{account.role} · {account.city}</small></span><em className={`admin-badge ${badgeClass(account.verification)}`}>{account.verification}</em><Icon name="chevron"/></button>)}</div></section>
    </div>
    <section className="admin-panel admin-alerts"><header><div><span>Risk and exceptions</span><h2>Needs attention</h2></div></header><div className="admin-alert-grid"><article><span className="alert-mark high">!</span><div><strong>2 vehicle documents expire soon</strong><p>Insurance or fitness certificates expire within 30 days.</p></div><button onClick={() => navigate('admin-operations')}>Inspect</button></article><article><span className="alert-mark medium">i</span><div><strong>1 account needs more information</strong><p>The submitted GST document could not be verified.</p></div><button onClick={() => navigate('admin-compliance')}>Review</button></article><article><span className="alert-mark neutral"><Icon name="trend"/></span><div><strong>Acceptance is trending upward</strong><p>{accepted} of {data.loads.length} requests are currently confirmed.</p></div><button onClick={() => navigate('admin-operations')}>View activity</button></article></div></section>
  </section>;
}

function Accounts({ accounts, setAccounts, query, notify }: { accounts: AdminAccount[]; setAccounts: React.Dispatch<React.SetStateAction<AdminAccount[]>>; query: string; notify: (message:string)=>void }) {
  const [status,setStatus] = useState('All');
  const [role,setRole] = useState('All');
  const filtered = accounts.filter(account => (status==='All'||account.status===status) && (role==='All'||account.role===role) && (!query||Object.values(account).some(value=>String(value).toLowerCase().includes(query.toLowerCase()))));
  const toggle = (account: AdminAccount) => { const next=account.status==='Active'?'Suspended':'Active'; setAccounts(current=>current.map(item=>item.id===account.id?{...item,status:next}:item)); notify(`${account.business} ${next==='Active'?'activated':'suspended'}`); };
  return <section className="admin-view"><AdminHeader eyebrow="Platform / Accounts" title="User accounts" description="Search, inspect and control access for every business on ReturnRun."/>
    <div className="admin-toolbar"><div className="admin-query"><Icon name="search"/><input value={query} readOnly placeholder="Use global search to find an account"/></div><select value={role} onChange={event=>setRole(event.target.value)}><option>All</option><option>Truck owner</option><option>Load owner</option></select><select value={status} onChange={event=>setStatus(event.target.value)}><option>All</option><option>Active</option><option>Suspended</option></select><span>{filtered.length} accounts</span></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Business</th><th>Account type</th><th>Location</th><th>KYC</th><th>Platform status</th><th>Activity</th><th>Action</th></tr></thead><tbody>{filtered.map(account=><tr key={account.id}><td><div className="admin-business-cell"><span>{account.name.split(' ').map(p=>p[0]).join('')}</span><div><strong>{account.business}</strong><small>{account.name} · {account.id}</small></div></div></td><td>{account.role}</td><td>{account.city}</td><td><em className={`admin-badge ${badgeClass(account.verification)}`}>{account.verification}</em></td><td><em className={`admin-badge ${badgeClass(account.status)}`}>{account.status}</em></td><td><strong>{account.assets}</strong><small>{account.role==='Truck owner'?' vehicles':' requests'}</small></td><td><button className={account.status==='Active'?'admin-action danger':'admin-action'} onClick={()=>toggle(account)}>{account.status==='Active'?'Suspend':'Activate'}</button></td></tr>)}</tbody></table></div>
  </section>;
}

function Compliance({ accounts, setAccounts, notify }: { accounts: AdminAccount[]; setAccounts: React.Dispatch<React.SetStateAction<AdminAccount[]>>; notify:(message:string)=>void }) {
  const [selectedDocument,setSelectedDocument] = useState<{ account: AdminAccount; kind: DocumentKind } | null>(null);
  const [documentReviews,setDocumentReviews] = useLocalStorage<Record<string,DocumentReviewStatus>>('returnrun-admin-document-reviews-v1',{});
  const queue=accounts.filter(account=>account.verification!=='Verified');
  const update=(account:AdminAccount,verification:VerificationStatus)=>{setAccounts(current=>current.map(item=>item.id===account.id?{...item,verification}:item));notify(verification==='Verified'?`${account.business} verified`:`Information requested from ${account.business}`)};
  const documentKey=(account:AdminAccount,kind:DocumentKind)=>`${account.id}:${kind}`;
  const reviewDocument=(status:DocumentReviewStatus)=>{if(!selectedDocument)return;const {account,kind}=selectedDocument;setDocumentReviews(current=>({...current,[documentKey(account,kind)]:status}));if(status==='Needs information')setAccounts(current=>current.map(item=>item.id===account.id?{...item,verification:'Needs information'}:item));notify(status==='Verified'?`${documentMeta[kind].title} marked as verified`:`${documentMeta[kind].title} flagged for follow-up`);setSelectedDocument(null)};
  return <section className="admin-view"><AdminHeader eyebrow="Trust & safety" title="KYC verification" description="Review business identity and tax information before granting full access." action={<span className="admin-queue-count"><b>{queue.length}</b> waiting</span>}/>
    <div className="compliance-layout"><div className="compliance-list">{queue.length===0?<div className="admin-empty"><span>✓</span><h2>Queue cleared</h2><p>There are no businesses waiting for review.</p></div>:queue.map(account=><article key={account.id}><header><span className="admin-account-avatar">{account.name.split(' ').map(p=>p[0]).join('')}</span><div><strong>{account.business}</strong><small>{account.id} · Submitted {formatDate(account.joined)}</small></div><em className={`admin-badge ${badgeClass(account.verification)}`}>{account.verification}</em></header><div className="compliance-facts"><div><span>Applicant</span><strong>{account.name}</strong></div><div><span>Account type</span><strong>{account.role}</strong></div><div><span>Registered city</span><strong>{account.city}</strong></div><div><span>Phone</span><strong>{account.phone}</strong></div></div><div className="document-checks">{(['gst','identity','bank'] as DocumentKind[]).map(kind=>{const meta=documentMeta[kind];const reviewed=documentReviews[documentKey(account,kind)];const issue=reviewed==='Needs information'||(!reviewed&&kind==='bank'&&account.verification==='Needs information');const label=reviewed??(issue?'Unclear':'Received');return <button key={kind} onClick={()=>setSelectedDocument({account,kind})} aria-label={`Open ${meta.title} for ${account.business}`}><span><Icon name={meta.icon}/>{meta.title}</span><b className={issue?'document-issue':'document-ready'}>{label}</b><Icon name="chevron"/></button>})}</div><footer><button onClick={()=>update(account,'Needs information')}>Request information</button><button className="admin-primary" onClick={()=>update(account,'Verified')}>Approve business</button></footer></article>)}</div><aside className="compliance-guide"><span>Review checklist</span><h3>Before approving</h3><ol><li><b>1</b><p><strong>Business identity</strong><small>Name matches incorporation or GST records.</small></p></li><li><b>2</b><p><strong>Contact ownership</strong><small>Phone and email belong to the applicant.</small></p></li><li><b>3</b><p><strong>Tax registration</strong><small>GSTIN format and business state are consistent.</small></p></li><li><b>4</b><p><strong>Bank beneficiary</strong><small>Beneficiary matches the registered entity.</small></p></li></ol><p className="guide-note">Every decision is recorded in the platform audit history.</p></aside></div>
    {selectedDocument && <DocumentReviewModal account={selectedDocument.account} kind={selectedDocument.kind} status={documentReviews[documentKey(selectedDocument.account,selectedDocument.kind)]} onClose={()=>setSelectedDocument(null)} onDecision={reviewDocument}/>} 
  </section>;
}

function Operations({ data }: { data: PortalData }) {
  const [section,setSection]=useState<'requests'|'vehicles'>('requests');
  return <section className="admin-view"><AdminHeader eyebrow="Marketplace oversight" title="Operations" description="Inspect active requests and fleet availability across the platform." action={<div className="admin-segmented"><button className={section==='requests'?'active':''} onClick={()=>setSection('requests')}>Requests</button><button className={section==='vehicles'?'active':''} onClick={()=>setSection('vehicles')}>Vehicles</button></div>}/>
    {section==='requests'?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Request</th><th>Route</th><th>Goods</th><th>Requirement</th><th>Pickup</th><th>Status</th></tr></thead><tbody>{data.loads.map((load:Load)=><tr key={load.id}><td><strong>#RR{load.id}</strong></td><td><div className="operation-route"><i/><strong>{load.origin}</strong><Icon name="arrow"/><strong>{load.destination}</strong></div></td><td><strong>{load.material}</strong><small>{load.quantity} tonnes</small></td><td>{load.type==='FTL'?'Full truck':'Shared truck'}</td><td>{formatDate(load.date)}</td><td><em className={`admin-badge ${badgeClass(load.status)}`}>{load.status}</em></td></tr>)}</tbody></table></div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Registration</th><th>Vehicle</th><th>Route corridor</th><th>Capacity</th><th>Documents</th><th>Status</th></tr></thead><tbody>{data.trucks.map((truck:Truck)=><tr key={truck.id}><td><strong>{truck.registration}</strong></td><td>{truck.type}</td><td><div className="operation-route"><strong>{truck.location}</strong><Icon name="arrow"/><strong>{truck.destination}</strong></div></td><td>{truck.capacity} tonnes</td><td><em className={`admin-badge ${truck.chassisNumber?'verified':'needs-information'}`}>{truck.chassisNumber?'Submitted':'Incomplete'}</em></td><td><em className={`admin-badge ${badgeClass(truck.status)}`}>{truck.status}</em></td></tr>)}</tbody></table></div>}
  </section>;
}

function SupportRequests({ tickets, setTickets, notify }: { tickets: SupportTicket[]; setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>; notify:(message:string)=>void }) {
  const [filter,setFilter]=useState<'All'|SupportTicketStatus>('All');
  const [selected,setSelected]=useState<SupportTicket|null>(null);
  const filtered=tickets.filter(ticket=>filter==='All'||ticket.status===filter);
  const updateStatus=(ticket:SupportTicket,status:SupportTicketStatus)=>{setTickets(current=>current.map(item=>item.id===ticket.id?{...item,status}:item));setSelected(current=>current?.id===ticket.id?{...current,status}:current);notify(status==='Resolved'?`${ticket.id} resolved`:`${ticket.id} moved to review`)};
  const dateLabel=(value:string)=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
  return <section className="admin-view"><AdminHeader eyebrow="Service desk" title="Support requests" description="Review questions submitted by truck owners and customers, then track them through resolution." action={<span className="admin-queue-count"><b>{tickets.filter(ticket=>ticket.status!=='Resolved').length}</b> unresolved</span>}/><div className="support-admin-filters">{(['All','Open','In review','Resolved'] as const).map(status=><button key={status} className={filter===status?'active':''} onClick={()=>setFilter(status)}>{status}<span>{status==='All'?tickets.length:tickets.filter(ticket=>ticket.status===status).length}</span></button>)}</div>{filtered.length===0?<div className="support-admin-empty"><span><Icon name="headset"/></span><h2>No {filter==='All'?'support requests':filter.toLowerCase()+' requests'}</h2><p>New queries submitted by platform users will appear here.</p></div>:<div className="support-ticket-list">{filtered.map(ticket=><button key={ticket.id} onClick={()=>setSelected(ticket)}><span className={`support-priority ${ticket.priority.toLowerCase()}`}>{ticket.priority==='Urgent'?'!':<Icon name="inbox"/>}</span><span className="support-ticket-copy"><span><strong>{ticket.subject}</strong><em className={`admin-badge ${badgeClass(ticket.status)}`}>{ticket.status}</em></span><small>{ticket.business} · {ticket.category}</small><p>{ticket.message}</p><time>{ticket.id} · {dateLabel(ticket.createdAt)}</time></span><Icon name="chevron"/></button>)}</div>}{selected&&<div className="support-detail-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setSelected(null)}><section className="support-detail-modal" role="dialog" aria-modal="true" aria-labelledby="supportDetailTitle"><header><div><span>{selected.id} · {selected.category}</span><h2 id="supportDetailTitle">{selected.subject}</h2><p>Submitted {dateLabel(selected.createdAt)}</p></div><button onClick={()=>setSelected(null)} aria-label="Close support request"><Icon name="close"/></button></header><div className="support-detail-body"><div className="support-detail-message"><span>Customer query</span><p>{selected.message}</p></div><aside><div><span>Submitted by</span><strong>{selected.userName}</strong><small>{selected.business}</small></div><div><span>Account type</span><strong>{selected.role==='load_owner'?'Load owner':'Truck owner'}</strong></div><div><span>Contact</span><strong>{selected.email}</strong><small>{selected.phone}</small></div><div><span>Priority</span><strong>{selected.priority}</strong></div><div><span>Current status</span><em className={`admin-badge ${badgeClass(selected.status)}`}>{selected.status}</em></div></aside></div><footer><button onClick={()=>setSelected(null)}>Close</button>{selected.status!=='In review'&&selected.status!=='Resolved'&&<button className="support-review-btn" onClick={()=>updateStatus(selected,'In review')}>Mark in review</button>}{selected.status!=='Resolved'&&<button className="admin-primary" onClick={()=>updateStatus(selected,'Resolved')}>Resolve query</button>}</footer></section></div>}</section>;
}

export function AdminConsole({ view, data, globalQuery, onNavigate, notify, onPendingCountChange, supportTickets, setSupportTickets }: { view: ViewName; data: PortalData; globalQuery: string; onNavigate:(view:ViewName)=>void; notify:(message:string)=>void; onPendingCountChange:(count:number)=>void; supportTickets:SupportTicket[]; setSupportTickets:React.Dispatch<React.SetStateAction<SupportTicket[]>> }) {
  const [accounts,setAccounts]=useLocalStorage<AdminAccount[]>('returnrun-admin-accounts-v1',seedAccounts);
  useEffect(() => { onPendingCountChange(accounts.filter(account => account.verification !== 'Verified').length); }, [accounts, onPendingCountChange]);
  const content=useMemo(()=>{
    if(view==='admin-users') return <Accounts accounts={accounts} setAccounts={setAccounts} query={globalQuery} notify={notify}/>;
    if(view==='admin-compliance') return <Compliance accounts={accounts} setAccounts={setAccounts} notify={notify}/>;
    if(view==='admin-operations') return <Operations data={data}/>;
    if(view==='admin-support') return <SupportRequests tickets={supportTickets} setTickets={setSupportTickets} notify={notify}/>;
    return <Overview accounts={accounts} data={data} navigate={onNavigate}/>;
  },[accounts,data,globalQuery,notify,onNavigate,setAccounts,setSupportTickets,supportTickets,view]);
  return content;
}
