import { Icon } from './Icon';
import { PageHead, formatDateTime, statusClass } from './ui';
import type { SupportTicket } from '../types';

/** A user's own support queries with the admin's reply. */
export function SupportView({ tickets, onNew }: { tickets: SupportTicket[]; onNew: () => void }) {
  return <section className="view active">
    <PageHead section="Account" title="Support" description="Your questions to the Fares24x7 team and their replies." actions={<button className="primary-btn" onClick={onNew}>New query</button>}/>
    <div className="support-contact-strip">
      <a href="mailto:support@fares24x7.com"><Icon name="inbox"/><span><strong>Email</strong><small>support@fares24x7.com</small></span></a>
      <button onClick={onNew}><Icon name="headset"/><span><strong>Submit a query</strong><small>Track the reply here</small></span></button>
    </div>
    {tickets.length === 0
      ? <div className="empty-state"><span><Icon name="headset"/></span><h2>No support queries yet</h2><p>If something isn’t working or you have a question, send us a query and the reply will appear here.</p><button className="primary-btn" onClick={onNew}>New query</button></div>
      : <div className="user-ticket-list">{tickets.map((ticket) => <article key={ticket.id} className="user-ticket">
        <header><div><small>{ticket.id} · {ticket.category} · {formatDateTime(ticket.createdAt)}</small><h3>{ticket.subject}</h3></div><span className={`status ${statusClass(ticket.status)}`}>{ticket.status}</span></header>
        <p className="user-ticket-message">{ticket.message}</p>
        {ticket.adminReply ? <div className="user-ticket-reply"><span><Icon name="headset"/> Fares24x7 support{ticket.repliedAt ? ` · ${formatDateTime(ticket.repliedAt)}` : ''}</span><p>{ticket.adminReply}</p></div>
          : <p className="user-ticket-waiting">{ticket.status === 'Resolved' ? 'Marked as resolved.' : 'Our team will reply here and notify you.'}</p>}
      </article>)}</div>}
  </section>;
}
