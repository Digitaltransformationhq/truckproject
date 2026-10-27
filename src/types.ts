export type ViewName = 'dashboard' | 'trucks' | 'loads' | 'matches' | 'profile' | 'admin-users' | 'admin-compliance' | 'admin-operations' | 'admin-support';
export type TruckStatus = 'Available' | 'In transit' | 'Unavailable';
export type LoadStatus = 'Pending' | 'Accepted' | 'Rejected';
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
}

export interface PortalData { trucks: Truck[]; loads: Load[]; }

export interface ReturnMatch {
  truck: Truck;
  load: Load;
  score: number;
  reasons: string[];
}

export type SupportTicketStatus = 'Open' | 'In review' | 'Resolved';
export interface SupportTicket {
  id: string;
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
}
