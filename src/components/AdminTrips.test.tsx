// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminAnalytics, AdminTrips } from './AdminTrips';
import type { Load } from '../types';

afterEach(cleanup);

const now = Date.now();
const iso = (hoursAgo: number) => new Date(now - hoursAgo * 3_600_000).toISOString();
const contact = (business: string) => ({ name: 'Contact', business, phone: '+91 98765 43210', email: 'a@b.c' });
const loads: Load[] = [
  { id: '1001', origin: 'Vadodara', destination: 'Pune', material: 'Textiles', quantity: 12, type: 'FTL', date: '2026-11-14', status: 'Accepted', budget: 45000, createdAt: iso(30),
    booking: { id: 'b1', status: 'in_transit', truck: 'GJ06CE2478', customer: contact('Mehta Textiles'), transporter: contact('Sharma Roadways'), history: [{ status: 'confirmed', at: iso(28) }], issue: { note: 'Truck not at pickup', at: iso(2), byMe: false }, statusChangedAt: iso(20) } },
  { id: '1002', origin: 'Surat', destination: 'Nashik', material: 'Machinery', quantity: 8, type: 'FTL', date: '2026-11-15', status: 'Accepted', createdAt: iso(10),
    booking: { id: 'b2', status: 'confirmed', truck: 'GJ05AB1234', customer: contact('ABC Mfg'), transporter: contact('Patel Logistics'), history: [{ status: 'confirmed', at: iso(9) }], statusChangedAt: iso(9) } },
];

describe('AdminTrips', () => {
  it('lists trips that need attention first', () => {
    render(<AdminTrips loads={loads} backend={undefined} notify={vi.fn()}/>);
    expect(screen.getByRole('button', { name: /Needs attention 1/ })).toBeInTheDocument();
    expect(screen.getByText('#F24-1001')).toBeInTheDocument();
    expect(screen.queryByText('#F24-1002')).not.toBeInTheDocument();
    expect(screen.getByText('Problem reported')).toBeInTheDocument();
  });

  it('opens a trip with contacts and admin actions', async () => {
    const notify = vi.fn();
    render(<AdminTrips loads={loads} backend={undefined} notify={notify}/>);
    const user = userEvent.setup();
    await user.click(screen.getByText('#F24-1001'));
    expect(screen.getByRole('dialog', { name: 'Vadodara → Pune' })).toBeInTheDocument();
    expect(screen.getByText('Truck not at pickup')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /WhatsApp/ })).toHaveLength(2);
    const resolve = screen.getByRole('button', { name: 'Resolve problem' });
    expect(resolve).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/Spoke to the driver/), 'Called both sides, sorted');
    await user.click(resolve);
    expect(notify).toHaveBeenCalledWith('Demo mode: admin changes are not saved');
  });

  it('shows all active trips under Active', async () => {
    render(<AdminTrips loads={loads} backend={undefined} notify={vi.fn()}/>);
    await userEvent.setup().click(screen.getByRole('button', { name: /Active 2/ }));
    expect(screen.getByText('#F24-1002')).toBeInTheDocument();
  });
});

describe('AdminAnalytics', () => {
  it('shows the key numbers and top routes', () => {
    render(<AdminAnalytics loads={loads}/>);
    expect(screen.getByText('Requests posted').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Acceptance rate').nextElementSibling).toHaveTextContent('100%');
    expect(screen.getByText('Vadodara → Pune')).toBeInTheDocument();
    expect(document.querySelector('.analytics-warning')).toHaveTextContent('1 active trip needs attention');
  });
});
