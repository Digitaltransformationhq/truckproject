import type { PortalData } from '../types';

export const seedData: PortalData = {
  trucks: [
    { id: 'truck-1', registration: 'TN 01 AB 4521', type: '32 ft Multi Axle', capacity: 18, location: 'Ahmedabad', destination: 'Chennai', status: 'Available' },
    { id: 'truck-2', registration: 'GJ 05 RT 8832', type: '20 ft Container', capacity: 14, location: 'Chennai', destination: 'Ahmedabad', status: 'Available' },
    { id: 'truck-3', registration: 'MH 12 KL 2901', type: '24 ft Single Axle', capacity: 11, location: 'Pune', destination: 'Bengaluru', status: 'In transit' },
    { id: 'truck-4', registration: 'KA 51 MN 7724', type: '14 ft LCV', capacity: 6, location: 'Bengaluru', destination: 'Chennai', status: 'Available' },
  ],
  loads: [
    { id: '101', origin: 'Ahmedabad', destination: 'Chennai', material: 'Textiles', quantity: 14, type: 'FTL', date: '2026-10-24', status: 'Pending' },
    { id: '102', origin: 'Chennai', destination: 'Ahmedabad', material: 'Auto components', quantity: 12, type: 'FTL', date: '2026-10-25', status: 'Pending' },
    { id: '103', origin: 'Pune', destination: 'Bengaluru', material: 'Industrial equipment', quantity: 8, type: 'PTL', date: '2026-10-25', status: 'Accepted' },
    { id: '104', origin: 'Bengaluru', destination: 'Chennai', material: 'Packaged foods', quantity: 5, type: 'PTL', date: '2026-10-26', status: 'Pending' },
    { id: '105', origin: 'Vadodara', destination: 'Chennai', material: 'Chemical drums', quantity: 10, type: 'FTL', date: '2026-10-26', status: 'Rejected' },
  ],
};
