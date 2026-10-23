# ReturnRun Project Delivery Plan

Prepared from the accepted scope in **Batra Consulting SD Quotation** dated 06 October 2026.

## Delivery approach

The project is split into four demonstrable phases. Each phase leaves the portal in a usable state and has a clear review checkpoint before the next phase begins.

| Phase | Outcome | Quotation scope covered | Review checkpoint |
|---|---|---|---|
| **1. Core Operations & Matching** | A reviewable portal covering the essential truck-to-load operating loop | User access/profile, truck management, load posting, search/filtering, initial return-load matching, responsive portal | User can add a truck, post a load, find a scored return match, and review the dashboard on desktop/mobile |
| **2. Enquiries & Booking** | Users can act on a match and track it through confirmation | Booking/enquiry workflow, interested transporter list, contact mechanism, booking/status tracking | Load owner and transporter can complete an enquiry-to-booking workflow with status history |
| **3. Route, Utilisation & Savings** | Operational records show the value created by return loads | Route information, nearby-location matching, loaded/empty trips, savings/refund records, refined container support | User can record trips and review utilisation/saving summaries by vehicle and route |
| **4. Administration & Go-Live** | The portal is centrally managed, secured, tested, and production-ready | Administration panel, platform records, basic reports, activation/deactivation, testing, deployment, go-live support | Admin controls are approved, tests pass, production environment is configured, and handover is completed |

## Phase 1 - Completed review scope

### Access and profile

- Responsive sign-in screen and one-click demo access
- Basic business/contact profile form
- Review-session sign-out

### Fleet management

- Truck cards with registration, type, capacity, location, preferred destination, and availability
- Add-truck workflow
- Search by registration, vehicle type, location, or destination
- Availability filter

### Load management

- Load records with pickup, destination, material, quantity, FTL/PTL, required date, and status
- Post-load workflow
- Search and FTL/PTL filtering

### Return-load matching

- Automatic match generation for available trucks and open loads
- Explainable score based on pickup fit, return destination, and capacity
- Nearby Ahmedabad/Vadodara pickup rule as the first configurable proximity example
- Immediate recalculation after a truck or load is added

### Operations dashboard

- Available-truck, open-load, match, city, and potential-saving summaries
- Best-match list, live activity, and active route corridors
- Desktop, laptop, tablet, and mobile layouts

### Review acceptance checklist

- [x] Demo access opens the operations workspace
- [x] Seed fleet and load records render correctly
- [x] Add-truck data persists in the browser
- [x] Post-load data persists in the browser
- [x] Filters and search update the displayed records
- [x] Return-match scores update when operational data changes
- [x] Business profile can be updated in the current review session
- [x] Login and dashboard pass visual QA at 1440px
- [x] JavaScript passes syntax validation
- [x] Portal responds successfully from the local review server

## Decisions required before Phase 2

1. Which roles can see direct phone/email details: all users, only interested parties, or only after acceptance?
2. What booking statuses and cancellation rules should be used?
3. Should enquiries be in-portal only, or should email/WhatsApp notifications be added as separately priced provider integrations?
4. Does a load owner choose one transporter, or can a load be split among multiple PTL transporters?
5. What documents, if any, must be exchanged during booking?

## Technical handoff note

Phase 1 is implemented as a modern React 19.3 and TypeScript 7 application built with Vite 8.3. The review environment uses browser-local persistence, typed domain models, reusable components, isolated matching rules, and automated unit tests. A shared server database, production authentication, map/routing APIs, notifications, hosting, and third-party integrations belong to later implementation decisions. This respects the quotation's exclusions while keeping the client review fully interactive.
