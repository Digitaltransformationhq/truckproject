/**
 * Supabase data access for Fares24x7.
 * Every function maps database rows (snake_case, backend statuses) to the UI's domain types,
 * so components never touch raw rows.
 */
import { requireSupabase } from './supabase';
import type { AccountRole, RegistrationProfile } from '../components/RoleAuthModal';
import type {
  AdminAccount, AppNotification, Driver, DriverStatus, Load, LoadStatus, LoadType, PortalData, StoredDocument,
  SupportTicket, SupportTicketStatus, Truck, TruckStatus, VerificationStatus, ViewName,
} from '../types';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------
type KycStatus = 'not_submitted' | 'pending' | 'needs_information' | 'verified' | 'rejected';
type BackendLoadStatus = 'open' | 'booked' | 'cancelled' | 'completed';

export interface ProfileRow {
  id: string; role: AccountRole; first_name: string; last_name: string; business_name: string; email: string;
  phone: string; city: string; gstin: string | null; details: Record<string, string> | null;
  kyc_status: KycStatus; account_status: 'active' | 'suspended'; created_at: string;
  /** False for Google sign-ups until they choose a role and add business details. */
  onboarded: boolean; avatar_url: string | null;
}
interface TruckRow {
  id: string; owner_id: string; registration: string; vehicle_type: string; capacity_tonnes: number; current_city: string;
  preferred_destination: string; status: TruckStatus; engine_number: string | null; chassis_number: string | null;
}
interface DriverRow {
  id: string; name: string; phone: string; licence_number: string; licence_expiry: string; city: string;
  status: DriverStatus; assigned_truck_id: string | null;
}
interface LoadRow {
  id: number; owner_id: string; origin: string; destination: string; material: string; quantity_tonnes: number;
  load_type: LoadType; pickup_date: string; status: BackendLoadStatus;
}
interface BookingRow { load_id: number; truck_owner_id: string; trucks: { registration: string } | { registration: string }[] | null; }
interface DocumentRow {
  id: string; owner_id: string; entity_type: StoredDocument['entityType']; entity_id: string | null; kind: string; file_name: string;
  storage_path: string; mime_type: string | null; size_bytes: number | null; status: 'submitted' | 'verified' | 'rejected';
  review_remark: string | null; created_at: string;
}
interface TicketRow {
  id: number; user_id: string; category: string; subject: string; message: string; priority: SupportTicket['priority'];
  status: SupportTicketStatus; contact_email: string; contact_phone: string; created_at: string;
  profiles: { first_name: string; last_name: string; business_name: string; role: AccountRole } | null;
}
interface NotificationRow { id: string; title: string; body: string; link_view: string | null; read_at: string | null; created_at: string; }

const unwrap = <T,>(result: { data: T | null; error: unknown }): T => {
  if (result.error) throw result.error;
  return result.data as T;
};
const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] ?? null : value);

// ---------------------------------------------------------------------------
// Auth and profile
// ---------------------------------------------------------------------------
export const kycLabel: Record<KycStatus, VerificationStatus> = {
  not_submitted: 'Not submitted', pending: 'Pending', needs_information: 'Needs information', verified: 'Verified', rejected: 'Rejected',
};

export function toRegistrationProfile(row: ProfileRow): RegistrationProfile {
  return {
    role: row.role, firstName: row.first_name, lastName: row.last_name, business: row.business_name, email: row.email,
    phone: row.phone, city: row.city, details: { ...(row.details ?? {}), ...(row.gstin ? { gstin: row.gstin } : {}) },
  };
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

export async function signUp(profile: RegistrationProfile, password: string) {
  const { gstin, ...details } = profile.details;
  const { data, error } = await requireSupabase().auth.signUp({
    email: profile.email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        role: profile.role, first_name: profile.firstName, last_name: profile.lastName, business_name: profile.business,
        phone: profile.phone, city: profile.city, gstin: gstin ?? '', details,
      },
    },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Redirects to Google. A role chosen on the sign-up screen is remembered to pre-fill onboarding. */
export async function signInWithGoogle(preferredRole?: AccountRole) {
  try { if (preferredRole) localStorage.setItem(PENDING_ROLE_KEY, preferredRole); } catch { /* storage unavailable */ }
  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}

export const PENDING_ROLE_KEY = 'fares24x7-pending-role';

export interface OnboardingDetails {
  firstName: string; lastName: string; business: string; phone: string; city: string; gstin: string; details: Record<string, string>;
}

/** One-time setup for Google sign-ups: choose customer / truck owner and add business details. */
export async function completeOnboarding(role: Exclude<AccountRole, 'admin'>, profile: OnboardingDetails) {
  unwrap(await requireSupabase().rpc('complete_onboarding', {
    p_role: role,
    p_profile: {
      first_name: profile.firstName, last_name: profile.lastName, business_name: profile.business,
      phone: profile.phone.replace(/^\+91\s*/, ''), city: profile.city, gstin: profile.gstin, details: profile.details,
    },
  }));
  try { localStorage.removeItem(PENDING_ROLE_KEY); } catch { /* storage unavailable */ }
}

export async function sendPasswordReset(email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw error;
}

export async function signOut() {
  await requireSupabase().auth.signOut();
}

export async function updateProfile(userId: string, patch: { business: string; contact: string; email: string; phone: string; city: string; gstin: string }) {
  const [firstName, ...rest] = patch.contact.trim().split(/\s+/);
  unwrap(await requireSupabase().from('profiles').update({
    business_name: patch.business, first_name: firstName ?? '', last_name: rest.join(' '), email: patch.email,
    phone: patch.phone.replace(/^\+91\s*/, ''), city: patch.city, gstin: patch.gstin.trim().toUpperCase() || null,
  }).eq('id', userId));
}

// ---------------------------------------------------------------------------
// Documents (private storage bucket; files live under "<owner id>/...")
// ---------------------------------------------------------------------------
const toDocument = (row: DocumentRow): StoredDocument => ({
  id: row.id, ownerId: row.owner_id, entityType: row.entity_type, entityId: row.entity_id ?? undefined, kind: row.kind,
  fileName: row.file_name, path: row.storage_path, mimeType: row.mime_type ?? undefined, sizeBytes: row.size_bytes ?? undefined,
  status: row.status === 'verified' ? 'Verified' : row.status === 'rejected' ? 'Rejected' : 'Submitted',
  remark: row.review_remark ?? undefined, createdAt: row.created_at,
});

export interface UploadItem { kind: string; file: File }

/** Collects every non-empty file input of a form as upload items keyed by the input name. */
export function filesFromForm(form: FormData): UploadItem[] {
  const items: UploadItem[] = [];
  form.forEach((value, kind) => { if (value instanceof File && value.size > 0) items.push({ kind, file: value }); });
  return items;
}

export async function uploadDocuments(ownerId: string, entityType: StoredDocument['entityType'], entityId: string | null, items: UploadItem[]) {
  const client = requireSupabase();
  for (const { kind, file } of items) {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${ownerId}/${entityType}/${entityId ?? 'account'}/${kind}-${Date.now()}-${safeName}`;
    const upload = await client.storage.from('documents').upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upload.error) throw upload.error;
    unwrap(await client.from('documents').insert({
      owner_id: ownerId, entity_type: entityType, entity_id: entityId, kind, storage_path: path, file_name: file.name,
      mime_type: file.type || null, size_bytes: file.size,
    }));
  }
}

export async function fetchDocuments(filter: { ownerId?: string; entityType?: StoredDocument['entityType']; entityId?: string }) {
  let query = requireSupabase().from('documents').select('*').order('created_at', { ascending: false });
  if (filter.ownerId) query = query.eq('owner_id', filter.ownerId);
  if (filter.entityType) query = query.eq('entity_type', filter.entityType);
  if (filter.entityId) query = query.eq('entity_id', filter.entityId);
  return (unwrap(await query) as DocumentRow[]).map(toDocument);
}

/** Short-lived link for viewing a private document. */
export async function documentUrl(path: string) {
  const { data, error } = await requireSupabase().storage.from('documents').createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function reviewDocument(documentId: string, status: 'Verified' | 'Rejected', remark?: string) {
  const { data: auth } = await requireSupabase().auth.getUser();
  unwrap(await requireSupabase().from('documents').update({
    status: status === 'Verified' ? 'verified' : 'rejected', review_remark: status === 'Rejected' ? remark ?? null : null,
    reviewed_by: auth.user?.id ?? null, reviewed_at: new Date().toISOString(),
  }).eq('id', documentId));
}

// ---------------------------------------------------------------------------
// Workspace data (trucks, drivers, loads, tickets)
// ---------------------------------------------------------------------------
export interface Workspace { data: PortalData; drivers: Driver[]; tickets: SupportTicket[] }

const toTruck = (row: TruckRow, documentCount = 0): Truck => ({
  id: row.id, registration: row.registration, type: row.vehicle_type, capacity: Number(row.capacity_tonnes), location: row.current_city,
  destination: row.preferred_destination, status: row.status, engineNumber: row.engine_number ?? undefined,
  chassisNumber: row.chassis_number ?? undefined, documentCount,
});

/** Backend load status → what this viewer should see. */
function loadStatusFor(row: LoadRow, role: AccountRole, userId: string, declined: Set<number>, bookedBy: Map<number, string>): LoadStatus {
  if (role === 'truck_owner') {
    if (bookedBy.get(row.id) === userId) return 'Accepted';
    return declined.has(row.id) ? 'Rejected' : 'Pending';
  }
  if (row.status === 'booked' || row.status === 'completed') return 'Accepted';
  if (row.status === 'cancelled') return 'Rejected';
  return 'Pending';
}

export async function fetchWorkspace(role: AccountRole, userId: string): Promise<Workspace> {
  const client = requireSupabase();
  const [trucksRes, driversRes, loadsRes, bookingsRes, declinesRes, ticketsRes, docsRes] = await Promise.all([
    role === 'load_owner' ? Promise.resolve({ data: [], error: null }) : client.from('trucks').select('*').order('created_at', { ascending: false }),
    role === 'truck_owner' ? client.from('drivers').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    client.from('loads').select('*').order('created_at', { ascending: false }),
    client.from('bookings').select('load_id, truck_owner_id, trucks(registration)'),
    role === 'truck_owner' ? client.from('load_declines').select('load_id') : Promise.resolve({ data: [], error: null }),
    client.from('support_tickets').select('*, profiles(first_name, last_name, business_name, role)').order('created_at', { ascending: false }),
    role === 'truck_owner' ? client.from('documents').select('entity_id').eq('entity_type', 'truck') : Promise.resolve({ data: [], error: null }),
  ]);

  const truckRows = unwrap(trucksRes) as TruckRow[];
  const docCounts = new Map<string, number>();
  for (const doc of unwrap(docsRes) as Array<{ entity_id: string | null }>) if (doc.entity_id) docCounts.set(doc.entity_id, (docCounts.get(doc.entity_id) ?? 0) + 1);
  const trucks = truckRows.map((row) => toTruck(row, docCounts.get(row.id)));
  const registrationById = new Map(truckRows.map((row) => [row.id, row.registration]));

  const bookings = unwrap(bookingsRes) as BookingRow[];
  const bookedBy = new Map(bookings.map((b) => [b.load_id, b.truck_owner_id]));
  const bookedTruck = new Map(bookings.map((b) => [b.load_id, one(b.trucks)?.registration]));
  const declined = new Set((unwrap(declinesRes) as Array<{ load_id: number }>).map((d) => d.load_id));

  const loads: Load[] = (unwrap(loadsRes) as LoadRow[])
    .filter((row) => role !== 'truck_owner' || row.status === 'open' || bookedBy.get(row.id) === userId)
    .map((row) => ({
      id: String(row.id), origin: row.origin, destination: row.destination, material: row.material, quantity: Number(row.quantity_tonnes),
      type: row.load_type, date: row.pickup_date, status: loadStatusFor(row, role, userId, declined, bookedBy),
      bookedTruck: bookedTruck.get(row.id),
    }));

  const drivers: Driver[] = (unwrap(driversRes) as DriverRow[]).map((row) => ({
    id: row.id, name: row.name, phone: row.phone, licenceNumber: row.licence_number, licenceExpiry: row.licence_expiry, city: row.city,
    status: row.status, assignedTruckId: row.assigned_truck_id ?? undefined,
    assignedVehicle: row.assigned_truck_id ? registrationById.get(row.assigned_truck_id) : undefined,
    photoName: '', licenceFrontName: '', licenceBackName: '', identityProofName: '',
  }));

  const tickets: SupportTicket[] = (unwrap(ticketsRes) as TicketRow[]).map((row) => ({
    id: `SUP-${row.id}`, userId: row.user_id, userName: row.profiles ? `${row.profiles.first_name} ${row.profiles.last_name}`.trim() : 'User',
    business: row.profiles?.business_name ?? '', email: row.contact_email, phone: row.contact_phone,
    role: row.profiles?.role === 'load_owner' ? 'load_owner' : 'truck_owner', category: row.category, subject: row.subject,
    message: row.message, priority: row.priority, status: row.status, createdAt: row.created_at,
  }));

  return { data: { trucks, loads }, drivers, tickets };
}

export async function createTruck(ownerId: string, truck: Truck, documents: UploadItem[]) {
  const row = unwrap(await requireSupabase().from('trucks').insert({
    owner_id: ownerId, registration: truck.registration.trim().toUpperCase(), vehicle_type: truck.type, capacity_tonnes: truck.capacity,
    current_city: truck.location.trim(), preferred_destination: truck.destination.trim(), status: truck.status,
    engine_number: truck.engineNumber || null, chassis_number: truck.chassisNumber || null,
  }).select('id').single()) as { id: string };
  await uploadDocuments(ownerId, 'truck', row.id, documents);
}

export async function createDriver(ownerId: string, driver: Driver, documents: UploadItem[]) {
  const row = unwrap(await requireSupabase().from('drivers').insert({
    owner_id: ownerId, name: driver.name, phone: driver.phone, licence_number: driver.licenceNumber.trim().toUpperCase(),
    licence_expiry: driver.licenceExpiry, city: driver.city, status: driver.status, assigned_truck_id: driver.assignedTruckId ?? null,
  }).select('id').single()) as { id: string };
  await uploadDocuments(ownerId, 'driver', row.id, documents);
}

export async function createLoad(ownerId: string, load: Load) {
  unwrap(await requireSupabase().from('loads').insert({
    owner_id: ownerId, origin: load.origin.trim(), destination: load.destination.trim(), material: load.material.trim(),
    quantity_tonnes: load.quantity, load_type: load.type, pickup_date: load.date,
  }));
}

/** Accepts an open request; the database picks the best available truck. Returns the truck's registration. */
export async function acceptLoad(loadId: string): Promise<string | undefined> {
  const client = requireSupabase();
  const booking = unwrap(await client.rpc('accept_load', { p_load_id: Number(loadId) })) as { truck_id: string };
  const truck = await client.from('trucks').select('registration').eq('id', booking.truck_id).maybeSingle();
  return (truck.data as { registration: string } | null)?.registration;
}

export async function declineLoad(userId: string, loadId: string) {
  unwrap(await requireSupabase().from('load_declines').upsert({ load_id: Number(loadId), truck_owner_id: userId }, { ignoreDuplicates: true }));
}

export async function submitKyc(userId: string, details: Record<string, string>, documents: UploadItem[]) {
  await uploadDocuments(userId, 'kyc', null, documents);
  unwrap(await requireSupabase().rpc('submit_kyc', { p_details: details }));
}

export async function createTicket(userId: string, ticket: SupportTicket) {
  const row = unwrap(await requireSupabase().from('support_tickets').insert({
    user_id: userId, category: ticket.category, subject: ticket.subject, message: ticket.message, priority: ticket.priority,
    contact_email: ticket.email, contact_phone: ticket.phone,
  }).select('id').single()) as { id: number };
  return `SUP-${row.id}`;
}

export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  unwrap(await requireSupabase().from('support_tickets').update({ status }).eq('id', Number(ticketId.replace(/^SUP-/, ''))));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function fetchNotifications(): Promise<AppNotification[]> {
  const rows = unwrap(await requireSupabase().from('notifications').select('*').order('created_at', { ascending: false }).limit(20)) as NotificationRow[];
  return rows.map((row) => ({ id: row.id, title: row.title, body: row.body, view: (row.link_view ?? undefined) as ViewName | undefined, read: Boolean(row.read_at), createdAt: row.created_at }));
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  unwrap(await requireSupabase().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids));
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------
export async function fetchAdminAccounts(): Promise<AdminAccount[]> {
  const client = requireSupabase();
  const [profilesRes, trucksRes, loadsRes] = await Promise.all([
    client.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
    client.from('trucks').select('owner_id'),
    client.from('loads').select('owner_id'),
  ]);
  const count = (rows: Array<{ owner_id: string }>) => rows.reduce((map, row) => map.set(row.owner_id, (map.get(row.owner_id) ?? 0) + 1), new Map<string, number>());
  const trucks = count(unwrap(trucksRes) as Array<{ owner_id: string }>);
  const loads = count(unwrap(loadsRes) as Array<{ owner_id: string }>);
  return (unwrap(profilesRes) as ProfileRow[]).map((row) => ({
    id: row.id, name: `${row.first_name} ${row.last_name}`.trim() || row.email, business: row.business_name || '—',
    role: row.role === 'load_owner' ? 'Load owner' : 'Truck owner', city: row.city, phone: row.phone ? `+91 ${row.phone}` : '', email: row.email,
    joined: row.created_at.slice(0, 10), status: row.account_status === 'active' ? 'Active' : 'Suspended', verification: kycLabel[row.kyc_status],
    assets: (row.role === 'load_owner' ? loads : trucks).get(row.id) ?? 0,
  }));
}

const kycValue: Record<VerificationStatus, KycStatus> = {
  'Not submitted': 'not_submitted', Pending: 'pending', 'Needs information': 'needs_information', Verified: 'verified', Rejected: 'rejected',
};

export async function updateAccount(accountId: string, patch: { status?: AdminAccount['status']; verification?: VerificationStatus }) {
  const update: Record<string, string> = {};
  if (patch.status) update.account_status = patch.status === 'Active' ? 'active' : 'suspended';
  if (patch.verification) update.kyc_status = kycValue[patch.verification];
  unwrap(await requireSupabase().from('profiles').update(update).eq('id', accountId));
}
