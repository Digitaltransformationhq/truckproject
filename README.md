# ReturnRun - Phase 1 Review Build

ReturnRun is a responsive web portal prototype for matching commercial trucks with suitable return loads. It was developed from the scope in the Batra Consulting quotation.

## Technology

- React 19.3 with strict TypeScript 7
- Vite 8.3 and the official React plugin
- Custom CSS design system (no generic component-library skin)
- Typed domain models and isolated return-load matching logic
- Browser-local persistence for the Phase 1 review environment
- Vitest unit coverage for matching rules

## Run locally

```powershell
npm install
npm run dev
```

Then visit `http://localhost:5173`. Use the pre-filled credentials or select **Continue with demo account**.

For one-click client review, open `http://localhost:5173/?demo=1`.

## Quality commands

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

## Phase 1 delivered

- Responsive sign-in and demo access
- Operations dashboard with live summary metrics
- Truck/vehicle listing, search, availability filtering, and add-truck workflow
- Load listing, search, FTL/PTL filtering, and post-load workflow
- Explainable return-load matching based on origin, destination, capacity, and availability
- Business profile editing
- Browser-local persistence for review data
- Mobile, tablet, laptop, and desktop layouts

## Delivery phases

### Phase 1 - Core operations and matching (complete)

The reviewable operating loop: user access, business profile, fleet, loads, search/filtering, dashboard, and rule-based return matching.

### Phase 2 - Enquiry and booking workflow

Express interest, transporter shortlist, contact/enquiry exchange, booking states, notifications, and booking history.

### Phase 3 - Route intelligence and utilisation

Nearby-location matching, configurable return-route corridors, loaded-vs-empty trip records, utilisation reports, savings/refund records, and refined container support.

### Phase 4 - Administration and production launch

Admin users, user activation/deactivation, fleet/load/enquiry oversight, basic reports, server database and authentication, security hardening, testing, deployment, and go-live support.

## Review notes

This phase intentionally uses browser-local storage so the workflow can be demonstrated without infrastructure. Production authentication, a shared database, maps/routing APIs, messaging providers, and hosting are not included in this prototype and should be finalised in later phases according to the quotation's commercial terms and exclusions.
