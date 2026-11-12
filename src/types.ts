export type ViewName = 'dashboard' | 'trucks' | 'drivers' | 'loads' | 'profile' | 'support' | 'admin-users' | 'admin-compliance' | 'admin-operations' | 'admin-support';
export type TruckStatus = 'Available' | 'In transit' | 'Unavailable';
export type LoadStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Completed' | 'Cancelled';
export type BookingStatus = 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export interface Contact { name: string; business: string; phone: string; email: string; }

/** The active (or last) booking behind a request: who carries it, and the trip's progress. */
export interface BookingInfo {
  id: string;
  status: BookingStatus;
  truck?: string;
  truckId?: string;
  driver?: { name: string; phone: string };
  customer?: Contact;
  transporter?: Contact;
  cancelledReason?: string;
  history: Array<{ status: BookingStatus; note?: string; at: string }>;
}
export type LoadType = 'FTL' | 'PTL';

export interface Truck {
  id: string;
  registration: string;
  type: string;
  capacity: number;
  location: string;
  destination: string;
  status: TruckStatus;
  engineNumber?: string;
  chassisNumber?: string;
  /** Number of verification documents uploaded (backend mode). */
  documentCount?: number;
}

export interface Load {
  id: string;
  origin: string;
  destination: string;
  material: string;
  quantity: number;
  type: LoadType;
  date: string;
  status: LoadStatus;
  /** Registration of the truck that accepted the request, when booked. */
  bookedTruck?: string;
  /** Customer's expected freight in rupees (optional). */
  budget?: number;
  booking?: BookingInfo;
}

export interface PortalData { trucks: Truck[]; loads: Load[]; }

export type DriverStatus = 'Available' | 'Assigned' | 'On trip' | 'Inactive';
export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenceNumber: string;
  licenceExpiry: string;
  city: string;
  status: DriverStatus;
  assignedVehicle?: string;
  assignedTruckId?: string;
  photoName: string;
  licenceFrontName: string;
  licenceBackName: string;
  identityProofName: string;
}

export interface ReturnMatch {
  truck: Truck;
  load: Load;
  score: number;
  reasons: string[];
}

export type SupportTicketStatus = 'Open' | 'In review' | 'Resolved';
export interface SupportTicket {
  id: string;
  userId?: string;
  userName: string;
  business: string;
  email: string;
  phone: string;
  role: 'load_owner' | 'truck_owner';
  category: string;
  subject: string;
  message: string;
  priority: 'Normal' | 'Urgent';
  status: SupportTicketStatus;
  createdAt: string;
  adminReply?: string;
  repliedAt?: string;
  /** The conversation after the first message, oldest first. */
  thread?: SupportMessage[];
}
export interface SupportMessage { from: 'support' | 'user'; text: string; at: string }

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  view?: ViewName;
  read: boolean;
  createdAt: string;
}

export type AdminAccountStatus = 'Active' | 'Suspended';
export type VerificationStatus = 'Verified' | 'Pending' | 'Needs information' | 'Rejected' | 'Not submitted';
export interface AdminAccount {
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

export type DocumentReviewState = 'Submitted' | 'Verified' | 'Rejected';
export interface StoredDocument {
  id: string;
  ownerId: string;
  entityType: 'kyc' | 'truck' | 'driver';
  entityId?: string;
  kind: string;
  fileName: string;
  path: string;
  mimeType?: string;
  sizeBytes?: number;
  status: DocumentReviewState;
  remark?: string;
  createdAt: string;
}
