import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { BookingStatus, Load } from '../types';

export const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase();
export const statusClass = (value: string) => value.toLowerCase().replaceAll(' ', '-');
export const isPendingRequest = (request: Load) => !['Accepted', 'Rejected', 'Completed', 'Cancelled'].includes(String(request.status));
export const displayStatus = (request: Load) => (isPendingRequest(request) ? 'Pending' : request.status);
export const initials = (name: string) => name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
export const formatInr = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
export const formatDateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
export const bookingLabel: Record<BookingStatus, string> = { confirmed: 'Confirmed', picked_up: 'Picked up', in_transit: 'In transit', delivered: 'Delivered', cancelled: 'Cancelled' };

const todayLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

export function PageHead({ section, title, description, actions }: { section: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-head"><div><p className="breadcrumb">{section} <span className="date-separator">/</span> {todayLabel}</p><h1>{title}</h1><p>{description}</p></div>{actions}</div>;
}

/** Closes on Escape while mounted. */
export function useEscape(onEscape: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onEscape]);
}

interface ConfirmProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  /** Ask for an optional reason (e.g. when cancelling); passed to onConfirm. */
  reasonLabel?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function ConfirmDialog({ title, message, confirmLabel, danger, reasonLabel, onCancel, onConfirm }: ConfirmProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEscape(onCancel);
  const confirm = async () => { if (busy) return; setBusy(true); try { await onConfirm(reason.trim()); } finally { setBusy(false); } };
  return <div className="modal-backdrop confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <div className="modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMessage">
      <h2 id="confirmTitle">{title}</h2>
      <p id="confirmMessage">{message}</p>
      {reasonLabel && <label className="confirm-reason">{reasonLabel}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={300} placeholder="Optional"/></label>}
      <div className="confirm-actions"><button className="secondary-btn" onClick={onCancel} autoFocus>Back</button><button className={danger ? 'primary-btn danger-btn' : 'primary-btn'} onClick={() => void confirm()} disabled={busy}>{busy ? 'Please wait…' : confirmLabel}</button></div>
    </div>
  </div>;
}
