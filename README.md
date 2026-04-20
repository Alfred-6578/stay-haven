# StayHaven

A full-stack hotel management platform covering the entire guest journey — from browsing rooms to checkout — with dedicated workflows for front-desk staff and administrators.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 + Postgres · Tailwind v4 · Paystack · JWT auth · Supabase Realtime · Cloudinary · Nodemailer · Recharts**.

---

## Roles

Four role tiers enforced by `withAuth` middleware on every protected route:

- **GUEST** — browses rooms, books stays, orders services, earns loyalty
- **STAFF** — check-in/out, room service, walk-ins, guest lookup
- **MANAGER** — everything staff can do plus admin-level approvals
- **ADMIN** — full system control including staff invites, analytics, pricing

---

## Feature Reference

### 1. Authentication

- **Email + password** login / registration with Zod validation and bcrypt password hashing
- **Google OAuth** sign-in/sign-up via `@react-oauth/google` — auto-creates a guest profile on first use
- **JWT session** with 15-minute access tokens + 7-day refresh tokens, both as `httpOnly` cookies; the client auto-refreshes on 401 via an axios interceptor
- **Forgot password** flow — emails a single-use hashed-token reset link with 1-hour expiry; always returns success to prevent email enumeration
- **Staff invite system** — admin emails an invite with a signed token; staff members set their own password on acceptance and land in an active staff account
- **Rate limiting** on `/api/auth/login` (10 / 15 min), `/api/auth/register` (5 / 1 hr), `/api/auth/forgot-password` (3 / 1 hr) — in-memory counter with `Retry-After` headers
- **Auto-redirect on logout** — guest/staff/admin layouts all push to `/login` when the auth context clears
- **Role-gated layouts** — admin/staff layouts hard-guard against wrong-role access and redirect
- **Remember-me session persistence** via the refresh-token cookie (no user action needed)

### 2. Room Catalog & Public Site

- **Landing page** with hero, featured rooms, facilities, testimonials, promos, services overview, footer
- **Rooms browse** with hero, date/guest/type search bar, filter pills, sort (price asc/desc, capacity, availability)
- **Room detail** with image gallery + lightbox, amenity list, capacity, per-night breakdown (base + weekend surcharge)
- **Live availability check** — given check-in/check-out dates, the backend runs per-room conflict queries and returns only bookable rooms with full nightly pricing
- **Weekend multiplier** — each room type has a `weekendMultiplier` applied to Sat/Sun nights, surfaced in pricing UI
- **12 seeded room types** ranging from Standard (₦65,000) to Penthouse (₦250,000), 22 rooms across 4 floors
- **Public services page** showcasing hotel amenities (gym, pool, restaurant, spa, transport, parking, etc.)
- **About page** with brand story
- **404 page** branded with suggested links (Home, Rooms, Bookings, Contact)

### 3. Booking Flow

- **Single-room booking** with step-by-step wizard: Review → Loyalty (redeem points) → Payment
- **Multi-room booking** — pick multiple rooms of the same type on one stay; bookings share a `groupRef` and pay in one transaction
- **Date validation** — disallows past dates; check-out must be after check-in; conflicts surface early
- **Paystack payment** — Paystack popup with polling from the client for transaction status; on success the booking is marked `CONFIRMED` and loyalty points are awarded
- **Loyalty redemption at checkout** — apply points as a ₦1-per-point discount against the total
- **Points estimate shown pre-payment** so guests see what they'll earn
- **Booking confirmation email** with receipt details
- **Receipt page** with formatted pricing breakdown, downloadable via jsPDF
- **Cancel booking** (guest self-service when `PENDING`/`CONFIRMED`) — refunds payment status and frees the room
- **Pending-payment recovery** — interrupted payments can resume; the existing reference is re-used

### 4. Guest Dashboard

- Personalized welcome card with loyalty tier badge
- Upcoming stay card with image, date range, days-until countdown
- Loyalty progress ring + points balance + "N points to next tier"
- Active room service orders snapshot with ETAs
- Quick action cards (Book a Room, Room Service, Request Service)

### 5. My Bookings (Guest)

- Upcoming / Past tab split — one fetch, client-side filter
- Booking card with room image, dates, status badge, booking ref, night count
- **Booking detail page** with: stay details grid, price breakdown (base + tax + loyalty discount + total), special requests, service history, payment status, room-service outstanding balance, upgrade + extension cards, cancel action (ConfirmModal)

### 6. Room Upgrades

Guest → admin approval → guest pays flow:

- **Guest** browses upgrade options filtered to higher-priced room types available for their dates (+ price delta and new amenities highlighted)
- Guest submits request → admin and managers receive notifications
- **Admin approves** → system re-checks availability, creates `PendingPayment`, notifies guest (no Paystack init yet — deferred to guest click)
- **Guest clicks Pay Now** → `pay-link` endpoint initializes Paystack with the stored reference; popup opens, client polls for status
- On success → booking moves to new room, old room → AVAILABLE (if guest was CHECKED_IN) → new room → OCCUPIED; upgrade marked APPROVED; guest + staff + admin all notified
- **Free upgrades** (price difference ≤ 0) apply immediately on admin approve
- **Reject** — admin rejects with one click + guest is notified
- **Admin page** — status tabs (Pending / Approved / Rejected / All), ConfirmModal for approve + reject, disabled tabs while fetching

### 7. Stay Extensions

Same gated flow as upgrades:

- **Pre-check** — `/extend/check` endpoint validates the new checkout date, detects room conflicts, returns additional nights + cost (or `earliestAvailable` date if blocked)
- Guest submits request → admin notified
- **Admin approves** → re-checks availability, creates `PendingPayment`, saves reference, guest notified
- **Guest pays** via pay-link → Paystack popup → polling
- On success → booking `checkOut` bumped, `totalNights` incremented, `totalAmount` bumped, extension → APPROVED, guest + staff + admin notified, extension confirmation email sent
- Admin can also **reject** pending extensions
- Admin page mirrors upgrade page (tabs, ConfirmModal, race-free tabs)

### 8. Room Service

**Menu (admin):**
- CRUD via admin page with drag-and-drop image upload (Cloudinary)
- Categories: FOOD, BEVERAGE, LAUNDRY, SPA, TRANSPORT, OTHER
- Per-item prep time (minutes), availability toggle

**Ordering (guest):**
- Menu page with category filter chips + cart
- Cart supports quantity adjustment, instructions, running total
- Submit order → creates `RoomServiceOrder` with item snapshots and ETA
- Guest can cancel while `PENDING`
- Active orders section on dashboard shows ETAs and status

**Queue (staff):**
- Orders page with PENDING / PREPARING / All tabs
- Auto-refresh every 30s
- One-click status transitions (PENDING → PREPARING → DELIVERED or CANCELLED)
- Optimistic UI — status changes move cards between tabs instantly

**Settlement:**
- Unsettled orders accrue as a balance on the booking
- Guest can **Pay Now** via Paystack from the booking detail page
- Or staff can settle at check-out with method (CASH/CARD/BANK_TRANSFER) + reference

### 9. Hotel Services

Admin-managed non-room services (spa, laundry, transport, etc.):

- Admin CRUD catalog with image upload, categories, availability toggle
- Guest browses services grouped by category on **My Services**
- Guest books a service for a specific date/time during their stay (scheduledAt must fall inside check-in/check-out)
- **Approval workflow** — PENDING → admin/staff marks APPROVED or REJECTED
- Cancellation rules: guests can cancel own `PENDING` > 24h before scheduled; staff can cancel any
- Email confirmation on booking
- Admin service-bookings tab with date + status + category filters, search, inline approve/reject

### 10. Loyalty Program

Tier-based earn + redeem system:

- **Tiers by lifetime points**: Bronze (0) → Silver (500) → Gold (1500) → Platinum (5000)
- **Earn rates by tier** (points per ₦1,000 spent): 30 / 35 / 40 / 50 (Bronze → Platinum)
- **1 point = ₦1** redemption value (no floor/ceiling on partial redemptions)
- Tier auto-upgrades on lifetime threshold crossing; notifications fire on upgrade
- **Guest loyalty page** — progress ring, hero card with totalPoints + lifetimePoints, tier benefits for all 4 tiers side-by-side, paginated transaction history
- **Admin loyalty page** — program stats (points issued, redeemed, outstanding value), donut chart of tier distribution, top guests table, **manual award/deduct** via modal (guest search + points + reason) with automatic tier recalculation
- Points are awarded on:
  - Paid bookings (amount × tier rate / 1000, floored)
  - Walk-in bookings (same formula, computed server-side)
- Points are deducted when redeemed at checkout
- Every change writes a `LoyaltyTransaction` row for audit

### 11. Staff Dashboard

Operational dashboard for front-desk activity:

- Stat strip: Arrivals Today, Departures Today, Overdue, No-Shows, Needs Cleaning
- **Overdue Checkouts** section (CHECKED_IN past checkout date) with Resolve button → opens OverstayModal
- **No-Shows** section (CONFIRMED bookings past check-in date) with Mark No-Show button → frees room instantly
- **Today's Arrivals** table with Check-In button per guest
- **Today's Departures** table with Check-Out button per guest (pending room-service flag visible)
- **Room Status Board** — floors × rooms grid with live statuses, click any room to change status or act on the current booking
- **Walk-in booking** button — creates bookings for walk-up guests

### 12. Walk-in Booking (Staff)

Full booking creation without online payment:

- Pick existing guest or enter new guest details (creates user account with activation email)
- Select one or more rooms from same type (checks real-time availability)
- Adults/children, special requests
- Payment method: CASH / CARD / BANK_TRANSFER with amount received + receipt ref
- Creates bookings immediately as `CONFIRMED` + payment as `COMPLETED`
- Awards loyalty points on the spot
- New guests receive an email with a password-setup link so they can access the online account later

### 13. Check-in / Check-out / No-Show

- **Check-in** — validates check-in date is today; booking → `CHECKED_IN`, room → `OCCUPIED`; records staff ID + timestamp; notifies guest
- **Check-out** — validates all room-service orders are DELIVERED; unsettled balances force a settlement flow before checkout (or admin can `force=true`); booking → `CHECKED_OUT`, room → `CLEANING`
- **Settle room service** — CASH/CARD/BANK_TRANSFER payment entry at checkout; marks orders as settled with method + reference
- **No-show** — CONFIRMED bookings past their check-in date can be marked NO_SHOW; room → AVAILABLE for same-day re-booking; confirmable via modal everywhere (guest lookup, dashboard, room board)

### 14. Guest Lookup (Staff)

- Debounced search by name, email, phone, or booking reference
- Expandable guest cards reveal: profile (ID, nationality, preferences), full booking history, loyalty summary, actionable buttons per booking (Check-in, Check-out, Mark No-Show)

### 15. Room Status Board

- Floors with color-coded rooms: Available (green), Occupied (red), Cleaning (yellow), Maintenance (gray), No-Show (bright red)
- Click any AVAILABLE/CLEANING/MAINTENANCE room → status-change dialog with 3 transition options
- Click any OCCUPIED room → opens check-out modal (or overstay modal if past checkout)
- Click any NO_SHOW room → opens no-show modal
- Today's arrivals + departures shown as horizontally-scrollable cards above the board with one-click check-in/out

### 16. Admin Dashboard & Analytics

- **KPIs:** Total Revenue (+this month), Occupancy Rate (+occupied/total), Total Bookings (+new today), Registered Guests (+new recent)
- **Revenue chart** — line chart with period tabs (7d / 30d / 90d / 12m), formatted Naira axes, compact tooltips, ResponsiveContainer
- **Occupancy chart** — stacked bar by room type (available / occupied / cleaning / maintenance)
- **Recent bookings table** — latest 10 bookings
- **Quick actions** — Check Overstay, Invite Staff, Add Room
- **Export dashboard** modal — full stats snapshot to XLSX or PDF

### 17. Admin Bookings Management

- Search bar (name / email / booking ref) — debounced 300ms
- Status tabs: All / Pending / Confirmed / Checked-In / Checked-Out / Cancelled / No-Show (disabled while loading)
- Date range filter (check-in from/to)
- Paginated table with Ref, Guest, Room, Type, Check-in/out, Nights, Amount, Status, Actions
- **Booking detail drawer** — full info with status change actions

### 18. Admin Rooms Management

- Tabs: Room Types (cards) / Individual Rooms (table)
- **Room Type CRUD** — image upload, multiple images, name, description, capacity, amenities, basePrice, weekendMultiplier, tag
- **Room CRUD** — number, floor, type, status, notes; delete blocked while OCCUPIED
- **Table view + board view** for individual rooms (same board used by staff)

### 19. Admin Staff Management

- Invite modal with email + role (STAFF/MANAGER) + department (FRONT_DESK/HOUSEKEEPING/MANAGEMENT)
- Staff list with search, department filter, active/inactive tabs
- Per-staff actions: Edit (role + department), **On-duty toggle**, Deactivate (ConfirmModal)
- Pending invites panel — lists outstanding invites with resend/revoke
- Soft-delete (deactivate) rather than hard-delete to preserve history

### 20. Admin Guests Directory

- Paginated guest list with search + loyalty tier filter
- Guest detail drawer — profile, booking history, loyalty transactions, notifications log
- Ability to award points directly from the drawer

### 21. Overstay Management (Admin)

- Auto-refresh check every 5 minutes
- Shows guests currently past their checkout date, severity-flagged at 12hr threshold ("urgent")
- Per-guest notify button — sends in-app notification + email
- Bulk "Notify All" button with ConfirmModal

### 22. Notifications

- Per-user notification table — `Notification` rows with title, message, type, optional `bookingId`, read-status
- **10 notification types** — BOOKING_CONFIRMED, BOOKING_CANCELLED, CHECK_IN_REMINDER, OVERSTAY_WARNING, PAYMENT_SUCCESS, ROOM_SERVICE_UPDATE, POINTS_EARNED, UPGRADE_APPROVED, EXTENSION_APPROVED, GENERAL
- **`notifyRoles` helper** fans out a single event to all users in a role (e.g. every admin + staff) in one bulk insert
- **Real-time delivery** via Supabase Realtime — client subscribes to `notifications:{userId}` channel; new rows stream live without refresh
- **Notification bell** in guest + admin + staff headers with unread count badge
- **Full notifications page** shared across all roles — filter All/Unread, per-row mark-read, delete, bulk "Mark all as read", paginated
- **Server-side await on `notifyRoles`** — the insert is awaited before the response returns so serverless cold-start tear-down can't kill it mid-flight

### 23. Emails

Transactional emails via Nodemailer + SMTP with a branded HTML template:

- **Welcome** — new guest registration
- **Booking Confirmation** — after paid booking with dates + receipt link
- **Walk-in Activation** — new guest booked at desk with password-setup link
- **Password Reset** — one-time hashed reset link
- **Service Booking** — confirmation of hotel-service booking
- **Overstay Warning** — for guests past checkout
- **Extension Confirmed** — new checkout date confirmed
- **Booking Cancellation** — refund-status included
- **Staff Invite** — signed token link to complete profile

### 24. Payments

- **Standard booking** — `/api/payments/initialize` + status poll
- **Group booking** — multiple rooms, one transaction; confirms all bookings atomically on success
- **Upgrade** — pay-link generates Paystack URL from the existing `PendingPayment` reference
- **Extension** — same pay-link pattern
- **Room service** — pays all unsettled orders for a booking
- All payments use Paystack popup + client-side polling (no webhook dependency)
- On success, server atomically: marks payment COMPLETED, updates booking/upgrade/extension status, awards loyalty points, sends emails, sends notifications

### 25. Health & Observability

- **`GET /api/health`** — public uptime probe; runs `prisma.user.count()`; returns `status: "ok" | "degraded"`, DB connection state, version, user count; 503 on DB failure
- **Rate limiting** with in-memory counter + periodic sweep; 429 with `Retry-After` on exceed
- **Global error boundaries** — `error.tsx` at root + every route group (guest/staff/admin/public/auth) with retry + home-link
- **Structured error logging** — every catch logs `[ROUTE_NAME]` prefix for traceability
- **Production sanitization** — every route returns static error messages, never `error.message` — verified via codebase grep

### 26. UI / UX Foundation

- **Skeleton system** — `SkeletonBar`, `BookingCardSkeleton`, `StatCardSkeleton`, `TableRowSkeleton`, `RoomCardSkeleton`, `ListSkeleton`, `PageSkeleton` exported from `@/component/ui/PageSkeleton` — used across every fetching page to match layout pre-load
- **ErrorState component** with retry + optional home-link, compact + full modes
- **EmptyState component** with icon + title + description + optional primary + secondary actions
- **ConfirmModal** with default/danger variants, escape-to-close, backdrop-to-close, loading state
- **Branded 404** (`app/not-found.tsx`) with suggested link cards
- **Route-segment error boundaries** — failures bubble to per-group UI rather than crashing the whole app
- **Responsive mobile pass** — every page works at 375px; tables wrap in `overflow-x-auto`, tab bars scroll, booking flow stacks vertically, charts use `ResponsiveContainer`, sidebars become hamburger sheets
- **Tab-click race prevention** — tabs that drive server fetches are `disabled={loading}` to block rapid clicks causing stale data

### 27. Developer Experience

- **Tailwind v4** with custom color tokens (`--color-foreground`, `--color-accent`, semantic states, loyalty-tier colors)
- **Playfair Display + Outfit** font pair loaded via `next/font`
- **Zod validation** on all input schemas
- **Prisma 7** with Postgres (via `@prisma/adapter-pg`) and a rich seed covering 12 room types, 22 rooms, menu items, services, admin/staff/guest accounts
- **`withAuth<P>`** generic middleware with role-gating
- **Centralized response helpers** — `successResponse(data, message?, status?)` / `errorResponse(message, status?)`
- **Shared pricing constants** (`src/lib/pricing.ts`) — `TAX_RATE` + `TAX_LABEL` — single source of truth for tax across backend and UI
- **Auto-memory system** stores user preferences across sessions (see `CLAUDE.md`)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router (Webpack) |
| Language | TypeScript 5 |
| UI | React 19 + Tailwind v4 |
| DB | Postgres via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | JWT (jsonwebtoken) + httpOnly cookies + bcryptjs |
| OAuth | Google via `@react-oauth/google` + `google-auth-library` |
| Payments | Paystack (popup + polling) |
| Realtime | Supabase Realtime channels |
| Images | Cloudinary |
| Email | Nodemailer (SMTP) — Resend dependency available as alternative |
| Charts | Recharts (ResponsiveContainer) |
| Validation | Zod |
| Toasts | Sonner |
| PDF / XLSX | jsPDF + jspdf-autotable / xlsx |

---

## Getting Started

### 1. Clone & install

```bash
git clone <repo>
cd stayhaven
npm install
```

### 2. Environment variables

Create `.env` with:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/stayhaven"

# Auth
JWT_SECRET="<random 32+ chars>"
JWT_REFRESH_SECRET="<random 32+ chars>"

# App
CLIENT_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="/api"

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID="<google client id>"

# Paystack
PAYSTACK_SECRET_KEY="<paystack test key>"
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="<paystack public key>"

# Cloudinary (images)
CLOUDINARY_CLOUD_NAME="<name>"
CLOUDINARY_API_KEY="<key>"
CLOUDINARY_API_SECRET="<secret>"

# Email (SMTP)
SMTP_HOST="<host>"
SMTP_PORT="587"
SMTP_USER="<user>"
SMTP_PASS="<pass>"
FROM_EMAIL="noreply@stayhaven.com"
FROM_NAME="StayHaven"

# Supabase Realtime
NEXT_PUBLIC_SUPABASE_URL="<url>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>"
```

### 3. Migrate + seed

```bash
npx prisma migrate deploy
npm run seed
```

The seed creates 12 room types, 22 rooms, a sample menu + services, plus these demo accounts:

- Admin: `admin@stayhaven.com`
- Manager: `manager@stayhaven.com`
- Staff: `staff@stayhaven.com`
- Guest: `guest@stayhaven.com`

(passwords are set in `prisma/seed.ts`)

### 4. Dev server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Build

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
├── app/
│   ├── (routes)/
│   │   ├── (public)/       # landing, rooms browse, room detail, about, services
│   │   ├── (auth)/         # login, register, forgot/reset-password, invite accept
│   │   ├── (guest)/        # dashboard, bookings, loyalty, my-services, notifications, book flow
│   │   ├── (staff)/        # dashboard, orders, guests, room-board, notifications
│   │   └── (admin)/        # dashboard, bookings, rooms, services, room-service, staff, guests,
│   │                       # loyalty, overstay, upgrades, extensions, notifications
│   ├── api/                # 100+ route.ts handlers
│   ├── error.tsx           # root error boundary
│   ├── not-found.tsx       # branded 404
│   └── layout.tsx
├── component/
│   ├── ui/                 # Button, ConfirmModal, EmptyState, ErrorState, PageSkeleton, Pill, Navbar
│   ├── admin/              # StatCard, Charts, BookingDetailDrawer, ImageUploadField, modals
│   ├── auth/               # LoginForm, RegisterForm, ForgotPasswordForm, InviteAcceptForm
│   ├── booking/            # Step components, UpgradeOptionsModal, ExtendStayModal, PaymentPolling
│   ├── guest/              # BookingCard, LoyaltyTierBadge, LoyaltyProgressRing, NotificationBell
│   ├── layout/             # AdminSidebar, StaffSidebar, GuestSidebar
│   ├── room-service/       # MenuGrid, Cart, PayRoomServiceModal, ActiveOrdersSection
│   ├── rooms/              # RoomsHero, SearchBar, FilterPills, RoomTypeGrid, ImageGallery, etc.
│   ├── services/           # ServiceBookingModal
│   ├── shared/             # NotificationsList
│   └── staff/              # CheckInModal, CheckOutModal, WalkInBookingModal, OverstayModal,
│                           # NoShowModal, OrderQueueCard, RoomStatusBoard
├── context/
│   └── AuthContext.tsx
├── lib/
│   ├── api.ts              # axios instance + interceptor
│   ├── auth.ts             # JWT sign/verify
│   ├── bookingUtils.ts     # pricing calculator, conflict checks
│   ├── cloudinary.ts
│   ├── cookies.ts
│   ├── email.ts            # 9 transactional email templates
│   ├── loyalty.ts          # tier thresholds + earn rates
│   ├── notifications.ts    # createNotification + notifyRoles
│   ├── pricing.ts          # TAX_RATE + TAX_LABEL (single source)
│   ├── prisma.ts
│   ├── rateLimit.ts
│   ├── response.ts
│   ├── roomServiceBalance.ts
│   ├── supabase.ts / supabase-client.ts
│   ├── validations.ts      # Zod schemas
│   └── withAuth.ts
└── types/

prisma/
├── schema.prisma           # 20+ models with relations + enums
├── migrations/
└── seed.ts
```

---

## Documentation

- **[API_REFERENCE.md](./API_REFERENCE.md)** — every route with method, auth, params, body, and purpose
- **[REALTIME.md](./REALTIME.md)** — Supabase Realtime channel setup for live notifications
- **[CLAUDE.md](./CLAUDE.md) / [AGENTS.md](./AGENTS.md)** — project instructions and conventions

---

## License

Private — all rights reserved.
