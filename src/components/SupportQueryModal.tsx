import { useEffect } from 'react';
import type { FormEvent } from 'react';
import { Icon } from './Icon';
import type { RegistrationProfile } from './RoleAuthModal';
import type { SupportTicket } from '../types';

export function SupportQueryModal({ profile, onClose, onSubmit }: { profile: RegistrationProfile | null; onClose: () => void; onSubmit: (ticket: SupportTicket) => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); };
  }, [onClose]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      id: `SUP-${Date.now().toString().slice(-6)}`,
      userName: profile ? `${profile.firstName} ${profile.lastName}` : 'Demo user',
      business: profile?.business || 'ReturnRun business',
      email: String(data.get('email')),
      phone: String(data.get('phone')),
      role: profile?.role === 'load_owner' ? 'load_owner' : 'truck_owner',
      category: String(data.get('category')),
      subject: String(data.get('subject')),
      message: String(data.get('message')),
      priority: data.get('priority') as SupportTicket['priority'],
      status: 'Open',
      createdAt: new Date().toISOString(),
    });
  };
  return <div className="support-query-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="support-query-modal" role="dialog" aria-modal="true" aria-labelledby="supportQueryTitle"><header><div><span>ReturnRun support</span><h2 id="supportQueryTitle">Submit your query</h2><p>Share the issue and our operations team will review it.</p></div><button onClick={onClose} aria-label="Close support form"><Icon name="close"/></button></header><form onSubmit={submit}><div className="support-query-grid"><label>Category<select name="category" required autoFocus><option value="">Select a category</option><option>Account and KYC</option><option>Vehicle and documents</option><option>Truck request</option><option>Booking or trip</option><option>Billing and payment</option><option>Technical issue</option><option>Other</option></select></label><label>Priority<select name="priority" defaultValue="Normal"><option>Normal</option><option>Urgent</option></select></label></div><label>Subject<input name="subject" placeholder="Briefly describe your issue" maxLength={100} required/></label><label>Query details<textarea name="message" placeholder="Tell us what happened, what you expected, and any relevant request or vehicle number." rows={6} required/></label><div className="support-query-grid"><label>Email<input type="email" name="email" defaultValue={profile?.email || ''} placeholder="you@company.com" required/></label><label>Phone<input name="phone" defaultValue={profile?.phone || ''} placeholder="+91 98765 43210" required/></label></div><div className="support-query-note"><Icon name="inbox"/><span><strong>Replies appear in your registered contact channels</strong><small>Urgent operational issues are prioritised by the admin team.</small></span></div><footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" type="submit">Submit query</button></footer></form></section></div>;
}
