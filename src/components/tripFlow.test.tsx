// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoadFormModal, RequestDecisionModal, RequestDetailsModal, requestLabel, type RequestActions } from './RequestViews';
import { seedData } from '../data/seed';
import type { BookingInfo, Load } from '../types';

afterEach(cleanup);

/** Actions spy: every action succeeds unless overridden. */
function makeActions(overrides: Partial<RequestActions> = {}): RequestActions {
  const ok = () => vi.fn(async () => true);
  return {
    canTrade: true, blockedReason: '',
    accept: ok(), decline: ok(), cancelRequest: ok(), advance: ok(), cancelBooking: ok(),
    customerConfirm: ok(), reportIssue: ok(), rateTrip: ok(),
    ...overrides,
  };
}

const baseRequest: Load = { id: '1008', origin: 'Vadodara', destination: 'Pune', material: 'Textiles', quantity: 12, type: 'FTL', date: '2026-11-14', status: 'Pending', budget: 45000 };
const booking = (status: BookingInfo['status'], extra: Partial<BookingInfo> = {}): BookingInfo => ({
  id: 'BK-1', status, truck: 'GJ06CE2478',
  customer: { name: 'Ananya Mehta', business: 'Mehta Textiles', phone: '+91 98765 41002', email: 'customer@example.com' },
  transporter: { name: 'Rajesh Sharma', business: 'Sharma Roadways', phone: '+91 98765 43210', email: 'owner@example.com', rating: { avg: 4.6, count: 12 } },
  history: [{ status: 'confirmed', at: '2026-11-12T03:01:00Z' }],
  deliveryCode: '4821',
  ...extra,
});

describe('1 · Customer posts a truck request', () => {
  it('sends the filled-in request with status Pending', async () => {
    const onSave = vi.fn(async (_load: Load) => true);
    render(<LoadFormModal onClose={() => undefined} onSave={onSave}/>);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Ahmedabad'), 'Vadodara');
    await user.type(screen.getByPlaceholderText('Chennai'), 'Pune');
    await user.type(screen.getByPlaceholderText('Textiles'), 'Textiles');
    await user.type(screen.getByPlaceholderText('e.g. 45000'), '45000');
    await user.click(screen.getByRole('button', { name: 'Post request' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toMatchObject({ origin: 'Vadodara', destination: 'Pune', material: 'Textiles', quantity: 12, type: 'FTL', status: 'Pending', budget: 45000 });
  });
});

describe('2 · Truck owner accepts the request', () => {
  const trucks = seedData.trucks.map((truck) => ({ ...truck, status: 'Available' as const, capacity: Math.max(truck.capacity, 16) }));

  it('accepts with the best-matching available truck', async () => {
    const actions = makeActions();
    render(<RequestDecisionModal request={baseRequest} trucks={trucks} drivers={[]} actions={actions} onClose={() => undefined} onAddTruck={() => undefined}/>);
    await userEvent.setup().click(screen.getByRole('button', { name: /Accept request/ }));
    expect(actions.accept).toHaveBeenCalledTimes(1);
    const [request, truckId] = (actions.accept as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(request).toBe(baseRequest);
    expect(trucks.map((truck) => truck.id)).toContain(truckId);
  });

  it('blocks accepting until KYC is verified', () => {
    const actions = makeActions({ canTrade: false, blockedReason: 'Your KYC is being reviewed.' });
    render(<RequestDecisionModal request={baseRequest} trucks={trucks} drivers={[]} actions={actions} onClose={() => undefined} onAddTruck={() => undefined}/>);
    expect(screen.getByText('Your KYC is being reviewed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept request/ })).toBeDisabled();
  });

  it('explains when no truck is big enough', () => {
    const small = trucks.map((truck) => ({ ...truck, capacity: 5 }));
    render(<RequestDecisionModal request={baseRequest} trucks={small} drivers={[]} actions={makeActions()} onClose={() => undefined} onAddTruck={() => undefined}/>);
    expect(screen.getByText(/None of your available trucks can carry 12 tonnes/)).toBeInTheDocument();
  });
});

describe('3 · Delivery needs the customer’s code', () => {
  const inTransit: Load = { ...baseRequest, status: 'Accepted', booking: booking('in_transit') };

  it('transporter must enter the 4-digit code to mark delivered', async () => {
    const actions = makeActions();
    render(<RequestDetailsModal request={inTransit} role="truck_owner" actions={actions} onClose={() => undefined} onRespond={() => undefined}/>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Mark delivered/ }));
    const dialog = screen.getByRole('dialog', { name: 'Enter the delivery code' });
    const submit = within(dialog).getByRole('button', { name: 'Mark delivered' });
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByPlaceholderText('4-digit code'), '48a21');
    expect(within(dialog).getByPlaceholderText('4-digit code')).toHaveValue('4821');
    await user.click(submit);
    expect(actions.advance).toHaveBeenCalledWith(inTransit, 'delivered', '4821');
  });

  it('only the customer sees the delivery code', () => {
    const { unmount } = render(<RequestDetailsModal request={inTransit} role="load_owner" actions={makeActions()} onClose={() => undefined} onRespond={() => undefined}/>);
    expect(screen.getByLabelText('Delivery code 4 8 2 1')).toBeInTheDocument();
    unmount();
    render(<RequestDetailsModal request={inTransit} role="truck_owner" actions={makeActions()} onClose={() => undefined} onRespond={() => undefined}/>);
    expect(screen.queryByText('Delivery code')).not.toBeInTheDocument();
  });

  it('customer can confirm receipt themselves', async () => {
    const actions = makeActions();
    render(<RequestDetailsModal request={inTransit} role="load_owner" actions={actions} onClose={() => undefined} onRespond={() => undefined}/>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Goods received/ }));
    await user.click(screen.getByRole('button', { name: 'Yes, received' }));
    expect(actions.customerConfirm).toHaveBeenCalledWith(inTransit, 'delivered');
  });
});

describe('4 · Rating after delivery', () => {
  const delivered: Load = { ...baseRequest, status: 'Completed', booking: booking('delivered') };

  it('customer rates the transporter with stars and a comment', async () => {
    const actions = makeActions();
    render(<RequestDetailsModal request={delivered} role="load_owner" actions={actions} onClose={() => undefined} onRespond={() => undefined}/>);
    const user = userEvent.setup();
    expect(screen.getByText('How was the trip with Sharma Roadways?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit rating' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByPlaceholderText(/short comment/), 'On time');
    await user.click(screen.getByRole('button', { name: 'Submit rating' }));
    expect(actions.rateTrip).toHaveBeenCalledWith(delivered, 4, 'On time');
  });

  it('shows an existing rating with an Edit option', () => {
    const rated: Load = { ...delivered, booking: booking('delivered', { myRating: { stars: 5, comment: 'Great service' } }) };
    render(<RequestDetailsModal request={rated} role="load_owner" actions={makeActions()} onClose={() => undefined} onRespond={() => undefined}/>);
    expect(screen.getByLabelText('5 out of 5 stars')).toBeInTheDocument();
    expect(screen.getByText('“Great service”')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('is not offered before delivery', () => {
    render(<RequestDetailsModal request={{ ...baseRequest, status: 'Accepted', booking: booking('picked_up') }} role="load_owner" actions={makeActions()} onClose={() => undefined} onRespond={() => undefined}/>);
    expect(screen.queryByText(/How was the trip/)).not.toBeInTheDocument();
  });

  it('shows the transporter’s average rating to the customer', () => {
    render(<RequestDetailsModal request={delivered} role="load_owner" actions={makeActions()} onClose={() => undefined} onRespond={() => undefined}/>);
    expect(screen.getByText(/★ 4\.6/)).toBeInTheDocument();
  });
});

describe('requestLabel', () => {
  it('shows trip progress for active bookings', () => {
    expect(requestLabel({ ...baseRequest, status: 'Accepted', booking: booking('in_transit') }, 'load_owner')).toBe('In transit');
  });
  it('shows Declined for a transporter’s own decline', () => {
    expect(requestLabel({ ...baseRequest, status: 'Rejected' }, 'truck_owner')).toBe('Declined');
  });
});
