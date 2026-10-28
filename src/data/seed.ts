import type { Driver, PortalData } from '../types';

export const seedDrivers: Driver[] = [
  { id:'DRV-1001', name:'Arun Kumar', phone:'+91 97666 73118', licenceNumber:'TN01 20210004567', licenceExpiry:'2028-08-14', city:'Chennai', status:'Available', photoName:'arun-kumar.jpg', licenceFrontName:'licence-front.jpg', licenceBackName:'licence-back.jpg', identityProofName:'aadhaar-card.pdf' },
  { id:'DRV-1002', name:'Suresh Yadav', phone:'+91 98202 44881', licenceNumber:'GJ05 20190007832', licenceExpiry:'2027-03-21', city:'Ahmedabad', status:'Assigned', assignedVehicle:'TN 01 AB 4521', photoName:'suresh-yadav.jpg', licenceFrontName:'licence-front.jpg', licenceBackName:'licence-back.jpg', identityProofName:'aadhaar-card.pdf' },
  { id:'DRV-1003', name:'Manoj Singh', phone:'+91 98980 33627', licenceNumber:'MH12 20200002119', licenceExpiry:'2026-12-09', city:'Pune', status:'On trip', assignedVehicle:'MH 12 KL 2901', photoName:'manoj-singh.jpg', licenceFrontName:'licence-front.jpg', licenceBackName:'licence-back.jpg', identityProofName:'voter-id.pdf' },
];

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
