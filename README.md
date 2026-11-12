# Fares24x7 - Phase 1 Review Build

Fares24x7 is a responsive web portal prototype for matching commercial trucks with suitable return loads. It was developed from the scope in the Batra Consulting quotation.

## Technology

- React 19.3 with strict TypeScript 7
- Vite 8.3 and the official React plugin
- Custom CSS design system (no generic component-library skin)
- Typed domain models and isolated return-load matching logic
- Supabase backend (Postgres, Auth, Storage, Realtime) with a browser-only demo fallback
- Vitest unit coverage for matching rules

## Run locally

```powershell
npm install
npm run dev
```

Then visit `http://localhost:5173`.

The app runs in one of two modes:

- **Demo mode** (no Supabase keys): data lives in the browser and the login screen offers one-click demo accounts. `http://localhost:5173/?demo=1` opens the truck-owner workspace directly.
- **Live mode** (Supabase keys present): real accounts, a shared Postgres database, private document storage and live updates.

## Connect Supabase (live mode)

1. Create a project at [supabase.com](https://supabase.com) (region: Mumbai `ap-south-1` is closest to users in India).
2. Copy `.env.example` to `.env.local` and fill in **Project URL** and **Publishable key** from *Project Settings → API*.
3. Apply the database schema, either by:
   - `npx supabase login`, then `npx supabase link --project-ref <your-project-ref>` and `npx supabase db push`, or
   - pasting `supabase/migrations/20261111000000_initial_schema.sql` into the Supabase *SQL Editor* and running it.
4. In *Authentication → URL Configuration*, set the Site URL to `https://www.fares24x7.com` and add these redirect URLs: `https://www.fares24x7.com/**`, `https://fares24x7.com/**`, `http://localhost:5173/**`.
5. Google sign-in: create a Google OAuth *Web application* client with JavaScript origins `https://www.fares24x7.com`, `https://fares24x7.com`, `http://localhost:5173` and redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then enable Google under *Authentication → Sign In / Providers* with that client ID and secret. Also set `VITE_GOOGLE_CLIENT_ID` to the same client ID (locally and in Vercel): the app then uses Google's own sign-in button, so Google shows fares24x7.com instead of the Supabase URL. Without it the app falls back to the redirect flow.
6. Create the first admin: sign up normally in the app, then run in the SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

   Admin rights can only be granted this way; the sign-up form can never create an admin.

### What the database enforces

- Every table uses row-level security. Users only see their own trucks, drivers, documents and tickets.
- Truck owners see open truck requests; the customer sees the transporter's contact details only after acceptance.
- Accepting a request is atomic (`accept_load`): the first transporter wins, and the best available truck with enough capacity is assigned automatically.
- Declining a request hides it for that transporter only.
- Users cannot change their own role, KYC status or account status. Suspended accounts lose access.
- Uploaded documents are stored privately under each user's folder; admins view them through short-lived signed links.
- Notifications are created automatically for new matching requests, acceptances, KYC decisions and support replies.

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

## Hosting

Production is served by Vercel at **https://www.fares24x7.com** (the bare `fares24x7.com` redirects to `www`). Vercel builds from the `main` branch of the GitHub repository using `vercel.json`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in *Vercel → Project → Settings → Environment Variables*; without them the deployed site falls back to demo mode.
