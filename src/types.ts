export type ViewName = 'dashboard' | 'trucks' | 'loads' | 'matches' | 'profile';
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
