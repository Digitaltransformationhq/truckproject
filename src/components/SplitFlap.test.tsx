// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SplitFlapBoard } from './SplitFlap';
import { ticketThread } from './SupportView';
import type { SupportTicket } from '../types';

afterEach(cleanup);

describe('SplitFlapBoard', () => {
  it('sizes the board for the longest word so it never changes width', () => {
    const long = render(<SplitFlapBoard word="LOGGING OUT"/>);
    expect(long.container.querySelectorAll('.sf-flap')).toHaveLength(11);
    long.unmount();
    const short = render(<SplitFlapBoard word="LOADING"/>);
    expect(short.container.querySelectorAll('.sf-flap')).toHaveLength(9); // FARES24X7 is the longer word
  });
});

describe('ticketThread', () => {
  const ticket: SupportTicket = { id: 'SUP-1', userName: 'Jay', business: 'ABC', email: 'a@b.c', phone: '1', role: 'load_owner', category: 'Truck request', subject: 'Status', message: 'How?', priority: 'Normal', status: 'Resolved', createdAt: '2026-11-12T03:04:00Z' };

  it('falls back to the single admin reply for older tickets', () => {
    expect(ticketThread({ ...ticket, adminReply: 'Updated by the driver', repliedAt: '2026-11-12T03:05:00Z' })).toEqual([{ from: 'support', text: 'Updated by the driver', at: '2026-11-12T03:05:00Z' }]);
  });

  it('uses the stored conversation when present', () => {
    const thread = [{ from: 'support' as const, text: 'Hi', at: 'a' }, { from: 'user' as const, text: 'Still stuck', at: 'b' }];
    expect(ticketThread({ ...ticket, adminReply: 'Hi', thread })).toBe(thread);
  });

  it('is empty when nobody has replied', () => {
    expect(ticketThread(ticket)).toEqual([]);
  });
});
