import { useState } from 'react';
import { Icon } from './Icon';
import { PageHead, formatDateTime, statusClass } from './ui';
import type { SupportMessage, SupportTicket } from '../types';

/** Replies after the first message, oldest first (older tickets only have a single admin reply). */
export function ticketThread(ticket: SupportTicket): SupportMessage[] {
  if (ticket.thread && ticket.thread.length) return ticket.thread;
  return ticket.adminReply ? [{ from: 'support', text: ticket.adminReply, at: ticket.repliedAt ?? ticket.createdAt }] : [];
}

/** The conversation under a query. `viewer` decides whose messages are labelled "You". */
export function SupportThread({ ticket, viewer }: { ticket: SupportTicket; viewer: 'user' | 'support' }) {
  const thread = ticketThread(ticket);
  if (!thread.length) return null;
  return <div className="support-thread">{thread.map((entry, index) => {
    const label = entry.from === 'support' ? (viewer === 'support' ? 'Fares24x7 support (team)' : 'Fares24x7 support') : (viewer === 'user' ? 'You' : ticket.userName || 'User');
    return <div key={index} className={entry.from === 'support' ? 'user-ticket-reply' : 'user-ticket-followup'}>
      <span>{entry.from === 'support' ? <Icon name="headset"/> : <Icon name="inbox"/>} {label} · {formatDateTime(entry.at)}</span>
      <p>{entry.text}</p>
    </div>;
  })}</div>;
}

function FollowUp({ ticket, onFollowUp }: { ticket: SupportTicket; onFollowUp: (ticket: SupportTicket, message: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const resolved = ticket.status === 'Resolved';
  const send = async () => { if (!text.trim() || busy) return; setBusy(true); if (await onFollowUp(ticket, text)) { setText(''); setOpen(false); } setBusy(false); };
  if (!open) return <div className="user-ticket-actions"><button className="secondary-btn" onClick={() => setOpen(true)}>{resolved ? 'Not solved? Reopen query' : 'Add a reply'}</button></div>;
  return <div className="user-ticket-compose">
    <label><span>{resolved ? 'Tell us what is still not working — this reopens the query' : 'Add more details or reply to support'}</span>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={2000} autoFocus placeholder="Write your message"/></label>
    <div className="user-ticket-compose-actions">
      <button className="secondary-btn" onClick={() => { setOpen(false); setText(''); }} disabled={busy}>Cancel</button>
      <button className="primary-btn" onClick={() => void send()} disabled={!text.trim() || busy}>{busy ? 'Sending…' : resolved ? 'Reopen & send' : 'Send'}</button>
    </div>
  </div>;
}

/** A user's own support queries with the conversation and a way to continue or reopen them. */
export function SupportView({ tickets, onNew, onFollowUp }: { tickets: SupportTicket[]; onNew: () => void; onFollowUp: (ticket: SupportTicket, message: string) => Promise<boolean> }) {
  return <section className="view active">
    <PageHead section="Account" title="Support" description="Your questions to the Fares24x7 team and their replies." actions={<button className="primary-btn" onClick={onNew}>New query</button>}/>
    <div className="support-contact-strip">
      <a href="mailto:support@fares24x7.com"><Icon name="inbox"/><span><strong>Email</strong><small>support@fares24x7.com</small></span></a>
      <button onClick={onNew}><Icon name="headset"/><span><strong>Submit a query</strong><small>Track the reply here</small></span></button>
    </div>
    {tickets.length === 0
      ? <div className="empty-state"><span><Icon name="headset"/></span><h2>No support queries yet</h2><p>If something isn’t working or you have a question, send us a query and the reply will appear here.</p><button className="primary-btn" onClick={onNew}>New query</button></div>
      : <div className="user-ticket-list">{tickets.map((ticket) => {
        const thread = ticketThread(ticket);
        const awaitingSupport = !thread.length || thread[thread.length - 1]?.from === 'user';
        return <article key={ticket.id} className="user-ticket">
          <header><div><small>{ticket.id} · {ticket.category} · {formatDateTime(ticket.createdAt)}</small><h3>{ticket.subject}</h3></div><span className={`status ${statusClass(ticket.status)}`}>{ticket.status}</span></header>
          <p className="user-ticket-message">{ticket.message}</p>
          <SupportThread ticket={ticket} viewer="user"/>
          {awaitingSupport && ticket.status !== 'Resolved' && <p className="user-ticket-waiting">Our team will reply here and notify you.</p>}
          {!thread.length && ticket.status === 'Resolved' && <p className="user-ticket-waiting">Marked as resolved.</p>}
          <FollowUp ticket={ticket} onFollowUp={onFollowUp}/>
        </article>;
      })}</div>}
  </section>;
}
