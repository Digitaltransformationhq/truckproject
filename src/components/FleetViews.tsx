import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Icon } from './Icon';
import { ConfirmDialog, PageHead, initials, normalise, statusClass } from './ui';
import { formatDate } from '../lib/matching';
import { filesFromForm, type UploadItem } from '../lib/backend';
import type { Driver, DriverStatus, StoredDocument, Truck, TruckStatus } from '../types';

export const VEHICLE_DOCUMENTS: Array<{ kind: string; label: string }> = [
  { kind: 'rcFront', label: 'RC book front' },
  { kind: 'rcBack', label: 'RC book back' },
  { kind: 'fitness', label: 'Fitness certificate' },
  { kind: 'puc', label: 'PUC certificate' },
  { kind: 'insurance', label: 'Valid insurance' },
];

/** Everything the fleet screens need from the app; implemented for both live and demo mode. */
export interface FleetActions {
  backend: boolean;
  saveTruck: (truck: Truck, documents: UploadItem[], existing?: Truck) => Promise<boolean>;
  setTruckStatus: (truck: Truck, status: TruckStatus) => Promise<void>;
  deleteTruck: (truck: Truck) => Promise<boolean>;
  loadTruckDocuments: (truck: Truck) => Promise<StoredDocument[]>;
  uploadTruckDocuments: (truck: Truck, documents: UploadItem[]) => Promise<boolean>;
  openDocument: (document: StoredDocument) => Promise<void>;
  saveDriver: (driver: Driver, documents: UploadItem[], existing?: Driver) => Promise<boolean>;
  deleteDriver: (driver: Driver) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
export function TrucksView({ trucks, drivers, query, setQuery, status, setStatus, onAdd, onOpen }: { trucks: Truck[]; drivers: Driver[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void; onOpen: (truck: Truck) => void }) {
  const filtered = trucks.filter((truck) => (status === 'all' || truck.status === status) && (!query || [truck.registration, truck.type, truck.location, truck.destination].some((value) => normalise(value).includes(normalise(query)))));
  const documentState = (truck: Truck) => truck.documentCount === undefined
    ? { label: truck.chassisNumber ? 'Submitted' : 'Not added', ok: Boolean(truck.chassisNumber) }
    : { label: truck.documentCount >= VEHICLE_DOCUMENTS.length ? 'Submitted' : truck.documentCount ? `${truck.documentCount} of ${VEHICLE_DOCUMENTS.length}` : 'Not added', ok: truck.documentCount >= VEHICLE_DOCUMENTS.length };
  return <section className="view active">
    <PageHead section="Fleet" title="My vehicles" description="Keep your vehicle details, documents and availability up to date." actions={<button className="primary-btn" onClick={onAdd}>Add vehicle</button>}/>
    <div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration, type or city"/></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter vehicles by status"><option value="all">All statuses</option><option>Available</option><option>In transit</option><option>Unavailable</option></select></div>
    {trucks.length === 0 && <div className="empty-state"><span><Icon name="truck"/></span><h2>Add your first vehicle</h2><p>Add a truck with its documents so you can accept customer requests.</p><button className="primary-btn" onClick={onAdd}>Add vehicle</button></div>}
    <div className="card-grid vehicle-card-grid">{filtered.map((truck) => {
      const assignedDriver = drivers.find((driver) => driver.assignedTruckId ? driver.assignedTruckId === truck.id : driver.assignedVehicle === truck.registration);
      const docs = documentState(truck);
      return <article className="truck-card vehicle-card vehicle-card-clickable" key={truck.id} role="button" tabIndex={0} aria-label={`View complete details for ${truck.registration}`} onClick={() => onOpen(truck)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(truck); } }}>
        <header className="vehicle-card-head"><div className="vehicle-identity"><span className="vehicle-card-icon"><Icon name="truck"/></span><div><h3>{truck.registration}</h3><p>{truck.type}</p></div></div><span className={`status ${statusClass(truck.status)}`}>{truck.status}</span></header>
        <div className="vehicle-route"><span><small>From</small><strong>{truck.location}</strong></span><i aria-hidden="true"><svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M2 12H96M88 4L96 12L88 20"/></svg></i><span><small>To</small><strong>{truck.destination}</strong></span></div>
        <div className="vehicle-card-facts"><div><span>Capacity</span><strong>{truck.capacity}<small> tonnes</small></strong></div><div><span>Current location</span><strong>{truck.location}</strong></div><div><span>Documents</span><strong className={docs.ok ? 'verified' : 'legacy'}>{docs.label}</strong></div><div><span>Assigned driver</span><strong className={assignedDriver ? 'verified' : 'legacy'}>{assignedDriver?.name || 'Not assigned'}</strong></div></div>
        <footer className="vehicle-card-footer"><span className={`vehicle-request-state ${truck.status === 'Available' ? 'ready' : ''}`}><i/>{truck.status === 'Available' ? 'Receiving requests' : truck.status === 'In transit' ? 'On a trip' : 'Requests paused'}</span><span className="vehicle-details-cue">View details <Icon name="chevron"/></span></footer>
      </article>;
    })}</div>
    {trucks.length > 0 && filtered.length === 0 && <div className="empty">No vehicles match this filter.</div>}
  </section>;
}

export function VehicleDetailsModal({ truck, driver, actions, onEdit, onClose }: { truck: Truck; driver?: Driver; actions: FleetActions; onEdit: () => void; onClose: () => void }) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [localFiles, setLocalFiles] = useState<Record<string, string>>({});
  const [busyKind, setBusyKind] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loadDocuments = useCallback(async () => { if (actions.backend) setDocuments(await actions.loadTruckDocuments(truck)); }, [actions, truck]);
  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const latest = (kind: string) => documents.find((document) => document.kind === kind);
  const demoComplete = !actions.backend && Boolean(truck.chassisNumber && truck.engineNumber);
  const submittedCount = actions.backend ? VEHICLE_DOCUMENTS.filter(({ kind }) => latest(kind)).length : demoComplete ? VEHICLE_DOCUMENTS.length : Object.keys(localFiles).length;

  const upload = async (kind: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!actions.backend) { setLocalFiles((current) => ({ ...current, [kind]: file.name })); return; }
    setBusyKind(kind);
    if (await actions.uploadTruckDocuments(truck, [{ kind, file }])) await loadDocuments();
    setBusyKind('');
  };

  return <div className="modal-backdrop vehicle-details-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal vehicle-details-modal" role="dialog" aria-modal="true" aria-labelledby="vehicleDetailsTitle">
    <div className="modal-head"><div><span className="eyebrow">Vehicle details</span><h2 id="vehicleDetailsTitle">{truck.registration}</h2></div><button onClick={onClose} aria-label="Close vehicle details"><Icon name="close"/></button></div>
    <div className="vehicle-details-body">
      <div className="vehicle-details-summary"><span className="vehicle-card-icon"><Icon name="truck"/></span><div><strong>{truck.type}</strong><small>{truck.capacity} tonnes carrying capacity</small></div>
        <label className="vehicle-status-select">Availability<select value={truck.status} onChange={(event) => void actions.setTruckStatus(truck, event.target.value as TruckStatus)}><option>Available</option><option>Unavailable</option><option>In transit</option></select></label>
      </div>
      <section><h3>Identification</h3><div className="vehicle-details-grid"><div><span>Registration number</span><strong>{truck.registration}</strong></div><div><span>Engine number</span><strong>{truck.engineNumber || 'Not added'}</strong></div><div><span>Chassis number</span><strong>{truck.chassisNumber || 'Not added'}</strong></div><div><span>Vehicle type</span><strong>{truck.type}</strong></div></div></section>
      <section><h3>Operations</h3><div className="vehicle-details-grid"><div><span>Current location</span><strong>{truck.location}</strong></div><div><span>Typical destination</span><strong>{truck.destination}</strong></div><div><span>Capacity</span><strong>{truck.capacity} tonnes</strong></div><div><span>Request availability</span><strong>{truck.status === 'Available' ? 'Receiving requests' : truck.status === 'In transit' ? 'On a trip' : 'Requests paused'}</strong></div></div></section>
      <section><div className="vehicle-driver-head"><h3>Assigned driver</h3>{driver && <span className={`status ${statusClass(driver.status)}`}>{driver.status}</span>}</div>{driver ? <div className="vehicle-assigned-driver"><span className="driver-avatar">{initials(driver.name)}</span><div><strong>{driver.name}</strong><small>{driver.phone}</small></div><dl><div><dt>Licence number</dt><dd>{driver.licenceNumber}</dd></div><div><dt>Licence expiry</dt><dd>{formatDate(driver.licenceExpiry)}</dd></div></dl></div> : <div className="vehicle-no-driver"><Icon name="driver"/><div><strong>No driver assigned</strong><small>Assign a driver from My drivers, or when accepting a request.</small></div></div>}</section>
      <section><div className="vehicle-documents-head"><h3>Vehicle documents</h3><span className={submittedCount === VEHICLE_DOCUMENTS.length ? 'complete' : 'incomplete'}>{submittedCount === VEHICLE_DOCUMENTS.length ? 'Submitted' : submittedCount ? `${submittedCount} of ${VEHICLE_DOCUMENTS.length} added` : 'Not added'}</span></div>
        <div className="vehicle-document-statuses">{VEHICLE_DOCUMENTS.map(({ kind, label }) => {
          const stored = latest(kind);
          const localName = localFiles[kind];
          const state = stored ? stored.status : demoComplete || localName ? 'Submitted' : 'Missing';
          return <div key={kind}>
            <span><Icon name="package"/><span className="vehicle-document-name">{label}{(stored?.fileName || localName) && <small title={stored?.fileName || localName}>{stored?.fileName || localName}</small>}{stored?.status === 'Rejected' && stored.remark && <small className="document-remark">Rejected: {stored.remark}</small>}</span></span>
            <span className="vehicle-document-row-action">
              <strong className={state === 'Missing' || state === 'Rejected' ? 'incomplete' : 'complete'}>{state}</strong>
              {stored && <button className="vehicle-document-view" onClick={() => void actions.openDocument(stored)}>View</button>}
              {!demoComplete && stored?.status !== 'Verified' && <label className="vehicle-document-upload"><input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busyKind === kind} onChange={(event) => void upload(kind, event)}/>{busyKind === kind ? 'Uploading…' : stored || localName ? 'Replace' : 'Upload'}</label>}
            </span>
          </div>;
        })}</div>
        <p className="vehicle-document-help">Upload PDF, JPG or PNG files up to 10 MB. Documents are reviewed by the Fares24x7 team; verified documents can no longer be replaced.</p>
      </section>
    </div>
    <div className="vehicle-details-footer vehicle-details-actions"><button className="danger-link" onClick={() => setConfirmDelete(true)}>Delete vehicle</button><span/><button className="secondary-btn" onClick={onEdit}>Edit details</button><button className="primary-btn" onClick={onClose}>Done</button></div>
    {confirmDelete && <ConfirmDialog title={`Delete ${truck.registration}?`} message="The vehicle and its uploaded documents will be removed. Vehicles with trip history cannot be deleted — mark them Unavailable instead." confirmLabel="Delete vehicle" danger onCancel={() => setConfirmDelete(false)} onConfirm={async () => { if (await actions.deleteTruck(truck)) onClose(); else setConfirmDelete(false); }}/>}
  </div></div>;
}

function VehicleDocumentUpload({ label, name }: { label: string; name: string }) {
  const [fileName, setFileName] = useState('');
  return <label className={`vehicle-upload-field ${fileName ? 'has-file' : ''}`}><span><Icon name="package"/></span><span><strong>{label}</strong><small>PDF, JPG or PNG · Maximum 10 MB</small></span><input type="file" name={name} accept=".pdf,image/*" onChange={(event) => setFileName(event.target.files?.[0]?.name || '')} required/><b title={fileName || undefined}>{fileName || 'Choose file'}<i>{fileName ? 'Selected' : 'Browse'}</i></b></label>;
}

export function VehicleFormModal({ initial, onClose, onSave }: { initial?: Truck; onClose: () => void; onSave: (truck: Truck, documents: UploadItem[]) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const editing = Boolean(initial);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    setBusy(true);
    try {
      await onSave({ id: initial?.id ?? crypto.randomUUID(), registration: value('registration'), type: value('type'), capacity: Number(data.get('capacity')), location: value('location'), destination: value('destination'), status: (data.get('status') as TruckStatus) ?? initial?.status ?? 'Available', engineNumber: value('engineNumber'), chassisNumber: value('chassisNumber') }, editing ? [] : filesFromForm(data));
    } finally { setBusy(false); }
  };
  const types = ['32 ft Multi Axle', '20 ft Container', '24 ft Single Axle', '14 ft LCV'];
  return <div className="modal-backdrop vehicle-entry-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal vehicle-entry-modal" role="dialog" aria-modal="true" aria-labelledby="vehicleFormTitle">
    <div className="modal-head"><div><span className="eyebrow">Fleet</span><h2 id="vehicleFormTitle">{editing ? `Edit ${initial!.registration}` : 'Add vehicle'}</h2></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></div>
    <form className="modal-form vehicle-entry-form" onSubmit={submit}>
      <div className="vehicle-form-heading"><span>Vehicle details</span><p>Enter the vehicle's operating and identification details.</p></div>
      <div className="form-grid">
        <label>Registration number<input name="registration" defaultValue={initial?.registration} placeholder="TN 01 AB 1234" pattern="[A-Za-z]{2}[\s\-]?[0-9]{1,2}[\s\-]?[A-Za-z]{0,3}[\s\-]?[0-9]{1,4}" title="Indian registration number, e.g. GJ 01 AB 1234" required autoFocus/></label>
        <label>Vehicle type<select name="type" defaultValue={initial?.type ?? types[0]}>{[...new Set([...(initial ? [initial.type] : []), ...types])].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Engine number<input name="engineNumber" defaultValue={initial?.engineNumber} placeholder="Enter engine number" required/></label>
        <label>Chassis number<input name="chassisNumber" defaultValue={initial?.chassisNumber} placeholder="Enter chassis number" required/></label>
        <label>Capacity (tonnes)<input name="capacity" type="number" min="1" max="60" step="0.5" defaultValue={initial?.capacity ?? 16} required/></label>
        <label>Current location<input name="location" defaultValue={initial?.location} placeholder="Chennai" required/></label>
        <label>Typical destination<input name="destination" defaultValue={initial?.destination} placeholder="Ahmedabad" required/></label>
        {!editing && <label>Availability<select name="status"><option>Available</option><option>Unavailable</option></select></label>}
      </div>
      {!editing && <><div className="vehicle-form-heading documents-heading"><span>Vehicle documents</span><p>Upload clear and valid copies for verification.</p></div>
        <div className="vehicle-document-grid">{VEHICLE_DOCUMENTS.map(({ kind, label }) => <VehicleDocumentUpload key={kind} label={label} name={kind}/>)}</div></>}
      <div className="form-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? (editing ? 'Saving…' : 'Uploading…') : editing ? 'Save changes' : 'Add vehicle'}</button></div>
    </form>
  </div></div>;
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------
export function DriversView({ drivers, query, setQuery, status, setStatus, onAdd, onEdit, onDelete }: { drivers: Driver[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; onAdd: () => void; onEdit: (driver: Driver) => void; onDelete: (driver: Driver) => void }) {
  const filtered = drivers.filter((driver) => (status === 'all' || driver.status === status) && (!query || [driver.name, driver.phone, driver.licenceNumber, driver.city, driver.assignedVehicle].some((value) => normalise(value).includes(normalise(query)))));
  const soon = Date.now() + 30 * 86_400_000;
  return <section className="view active">
    <PageHead section="Fleet" title="My drivers" description="Manage driver availability, assignments and compliance documents." actions={<button className="primary-btn" onClick={onAdd}>Add driver</button>}/>
    <div className="driver-summary"><article><span><Icon name="driver"/></span><div><small>Total drivers</small><strong>{drivers.length}</strong></div></article><article><span><Icon name="overview"/></span><div><small>Available</small><strong>{drivers.filter((driver) => driver.status === 'Available').length}</strong></div></article><article><span><Icon name="truck"/></span><div><small>Assigned or on trip</small><strong>{drivers.filter((driver) => driver.status === 'Assigned' || driver.status === 'On trip').length}</strong></div></article></div>
    <div className="toolbar"><div className="inline-search"><span><Icon name="search"/></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search driver, licence or city"/></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter drivers by status"><option value="all">All statuses</option><option>Available</option><option>Assigned</option><option>On trip</option><option>Inactive</option></select></div>
    {drivers.length === 0 && <div className="empty-state"><span><Icon name="driver"/></span><h2>Add your first driver</h2><p>Drivers can be assigned to trucks when you accept a request.</p><button className="primary-btn" onClick={onAdd}>Add driver</button></div>}
    <div className="driver-card-grid">{filtered.map((driver) => {
      const expiring = new Date(driver.licenceExpiry).getTime() < soon;
      return <article className="driver-card" key={driver.id}>
        <header><span className="driver-avatar">{initials(driver.name)}</span><div><h3>{driver.name}</h3><p><a href={`tel:${driver.phone.replace(/\s/g, '')}`}>{driver.phone}</a></p></div><em className={`status ${statusClass(driver.status)}`}>{driver.status}</em></header>
        <div className="driver-facts"><div><span>Licence number</span><strong>{driver.licenceNumber}</strong></div><div><span>Licence expiry</span><strong className={expiring ? 'licence-expiring' : ''}>{formatDate(driver.licenceExpiry)}{expiring ? ' · renew soon' : ''}</strong></div><div><span>Base city</span><strong>{driver.city}</strong></div><div><span>Assigned vehicle</span><strong>{driver.assignedVehicle || 'Not assigned'}</strong></div></div>
        <footer className="driver-card-actions"><button className="secondary-btn" onClick={() => onEdit(driver)}>Edit</button><button className="danger-link" onClick={() => onDelete(driver)} disabled={driver.status === 'On trip'} title={driver.status === 'On trip' ? 'Drivers on a trip cannot be removed' : undefined}>Remove</button></footer>
      </article>;
    })}</div>
    {drivers.length > 0 && filtered.length === 0 && <div className="empty">No drivers match this filter.</div>}
  </section>;
}

function DriverUploadField({ label, name, accept = '.pdf,image/*', required }: { label: string; name: string; accept?: string; required: boolean }) {
  const [fileName, setFileName] = useState('');
  return <label className={`driver-upload-field ${fileName ? 'has-file' : ''}`}><span><Icon name={name === 'photo' ? 'driver' : 'package'}/></span><span><strong>{label}</strong><small>{name === 'photo' ? 'JPG or PNG · Maximum 10 MB' : 'PDF, JPG or PNG · Maximum 10 MB'}</small></span><input type="file" name={name} accept={accept} required={required} onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}/><b title={fileName || undefined}>{fileName || (required ? 'Upload' : 'Replace')}<small>{fileName ? 'Selected' : 'Browse'}</small></b></label>;
}

export function DriverFormModal({ trucks, initial, onClose, onSave }: { trucks: Truck[]; initial?: Driver; onClose: () => void; onSave: (driver: Driver, documents: UploadItem[]) => Promise<boolean> }) {
  const today = new Date().toISOString().slice(0, 10);
  const editing = Boolean(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? '').trim();
    const fileName = (key: string) => (form.get(key) as File | null)?.name || '';
    const assigned = value('assignedVehicle');
    const driver: Driver = {
      id: initial?.id ?? `DRV-${Date.now().toString().slice(-6)}`, name: value('name'), phone: value('phone'), licenceNumber: value('licenceNumber'), licenceExpiry: value('licenceExpiry'), city: value('city'), status: form.get('status') as DriverStatus,
      assignedVehicle: assigned || undefined, assignedTruckId: trucks.find((truck) => truck.registration === assigned)?.id,
      photoName: fileName('photo') || initial?.photoName || '', licenceFrontName: fileName('licenceFront') || initial?.licenceFrontName || '', licenceBackName: fileName('licenceBack') || initial?.licenceBackName || '', identityProofName: fileName('identityProof') || initial?.identityProofName || '',
    };
    setBusy(true);
    try { await onSave(driver, filesFromForm(form)); } finally { setBusy(false); }
  };
  return <div className="modal-backdrop driver-entry-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal driver-entry-modal" role="dialog" aria-modal="true" aria-labelledby="driverModalTitle">
    <div className="modal-head"><div><span className="eyebrow">Driver management</span><h2 id="driverModalTitle">{editing ? `Edit ${initial!.name}` : 'Add driver'}</h2><p>{editing ? 'Update details, availability or the assigned vehicle.' : 'Add profile, licence and availability details.'}</p></div><button onClick={onClose} aria-label="Close driver form"><Icon name="close"/></button></div>
    <form onSubmit={submit} className="driver-entry-form">
      <section><h3>Driver details</h3><div className="form-grid">
        <label>Full name<input name="name" defaultValue={initial?.name} placeholder="Enter driver's full name" required autoFocus/></label>
        <label>Phone number<input name="phone" type="tel" defaultValue={initial?.phone} placeholder="+91 98765 43210" pattern="(\+91[\s\-]?)?[6-9][0-9]{4}[\s\-]?[0-9]{5}" title="10-digit Indian mobile number" required/></label>
        <label>Driving licence number<input name="licenceNumber" defaultValue={initial?.licenceNumber} placeholder="TN01 20210004567" required/></label>
        <label>Licence expiry date<input name="licenceExpiry" type="date" defaultValue={initial?.licenceExpiry} min={editing ? undefined : today} required/></label>
        <label>Base city<input name="city" defaultValue={initial?.city} placeholder="Chennai" required/></label>
        <label>Driver status<select name="status" defaultValue={initial?.status ?? 'Available'} disabled={initial?.status === 'On trip'}><option>Available</option><option>Assigned</option><option>On trip</option><option>Inactive</option></select>{initial?.status === 'On trip' && <input type="hidden" name="status" value="On trip"/>}</label>
        <label className="driver-vehicle-field">Assign vehicle (optional)<select name="assignedVehicle" defaultValue={initial?.assignedVehicle ?? ''}><option value="">Not assigned</option>{trucks.map((truck) => <option key={truck.id} value={truck.registration}>{truck.registration} · {truck.type}</option>)}</select></label>
      </div></section>
      <section><h3>Photo and documents</h3><p className="driver-form-helper">{editing ? 'Upload a file only if you want to replace the current one.' : 'Upload a clear driver photo, licence copies and either an Aadhaar card or PAN card. All four uploads are required.'}</p>
        <div className="driver-upload-grid"><DriverUploadField label="Driver photo" name="photo" accept="image/*" required={!editing}/><DriverUploadField label="Licence front" name="licenceFront" required={!editing}/><DriverUploadField label="Licence back" name="licenceBack" required={!editing}/><DriverUploadField label="Aadhaar card or PAN card" name="identityProof" required={!editing}/></div>
      </section>
      <footer><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add driver'}</button></footer>
    </form>
  </div></div>;
}
