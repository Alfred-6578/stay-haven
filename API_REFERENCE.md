# StayHaven API Reference

All routes live under `/api/**`. The API is built on Next.js App Router — folder paths map to URL paths, and dynamic segments use `[param]` syntax.

## Conventions

**Success response shape:**
```json
{ "success": true, "message": "...", "data": { ... } }
```

**Error response shape:**
```json
{ "success": false, "message": "..." }
```

**Auth:** routes marked `Auth (any)` require a valid `stayhaven_access` cookie. Role-restricted routes additionally enforce one of `GUEST | STAFF | MANAGER | ADMIN`. Access tokens are 15-minute JWTs; the client auto-refreshes via `POST /api/auth/refresh` (7-day refresh token cookie) on 401.

**Rate limiting:** `/api/auth/login` (10/15min), `/api/auth/register` (5/hr), `/api/auth/forgot-password` (3/hr). Exceeding returns `429` with a `Retry-After` header.

**Standard status codes:** `200` OK · `201` Created · `401` Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `422` Validation · `429` Rate Limited · `500` Internal.

---

## Health

### GET /api/health
- **Auth**: Public
- **Response**: `{ status, timestamp, version, database, userCount }`
- **Purpose**: Uptime + DB connectivity probe. Returns 503 with `status: "degraded"` if Prisma can't reach Postgres.

---

## Auth

### POST /api/auth/login
- **Auth**: Public · rate-limited (10 req / 15 min)
- **Body**: `email, password`
- **Response**: sets `stayhaven_access` + `stayhaven_refresh` cookies; body `{ user, profile }`

### POST /api/auth/register
- **Auth**: Public · rate-limited (5 req / 1 hr)
- **Body**: `firstName, lastName, email, password`
- **Response**: creates GUEST account + loyalty profile; sets cookies; body `{ user, profile }`

### POST /api/auth/logout
- **Auth**: Auth (any)
- **Body**: none
- **Response**: clears auth cookies

### GET /api/auth/me
- **Auth**: Auth (any)
- **Response**: authenticated user with `guestProfile` / `staffProfile` relations

### POST /api/auth/refresh
- **Auth**: Public (requires `stayhaven_refresh` cookie)
- **Response**: issues new access token cookie

### POST /api/auth/forgot-password
- **Auth**: Public · rate-limited (3 req / 1 hr)
- **Body**: `email`
- **Response**: always-success (prevents email enumeration); emails reset link if account exists

### POST /api/auth/reset-password
- **Auth**: Public
- **Body**: `token, newPassword`
- **Response**: password updated

### POST /api/auth/invite/validate
- **Auth**: Public
- **Body**: `token`
- **Response**: `{ valid, email?, role?, firstName?, reason? }` — reason ∈ `expired | already_used | not_found`

### POST /api/auth/invite/accept
- **Auth**: Public
- **Body**: `token, firstName, lastName, phone?, password`
- **Response**: creates active staff account; sets cookies

### POST /api/auth/google
- **Auth**: Public
- **Body**: `{ credential }` or `{ accessToken }`
- **Response**: OAuth login; creates guest on first use; sets cookies

---

## Public (Rooms)

### GET /api/rooms
- **Auth**: Public (sees `AVAILABLE` only) · STAFF/ADMIN see all
- **Query**: `status, floor, typeId, page`
- **Response**: paginated rooms

### GET /api/rooms/[id]
- **Auth**: Public
- **Response**: room details

### GET /api/rooms/types
- **Auth**: Public
- **Response**: all active room types with availability counts

### GET /api/rooms/types/[slug]
- **Auth**: Public
- **Response**: room type details + available rooms

### GET /api/rooms/available
- **Auth**: Public
- **Query**: `checkIn, checkOut, typeId?, adults?`
- **Response**: available rooms with per-booking pricing

### GET /api/bookings/check-availability
- **Auth**: Public
- **Query**: `roomId, checkIn, checkOut`
- **Response**: `{ available: boolean }`

---

## Guest

### GET /api/guest/bookings
- **Auth**: Auth (GUEST)
- **Query**: `status?, page?, limit?, groupRef?`
- **Response**: `{ upcoming, past }` split by status

### GET /api/guest/bookings/[id]
- **Auth**: Auth (GUEST)
- **Response**: full booking with upgrade/extension/room-service relations

### GET /api/guest/profile
- **Auth**: Auth (GUEST)
- **Response**: user + guest profile + loyalty summary

### PATCH /api/guest/profile
- **Auth**: Auth (GUEST)
- **Body**: `firstName?, lastName?, phone?, dateOfBirth?, nationality?, address?, idType?, idNumber?, preferences?`

### PATCH /api/guest/profile/avatar
- **Auth**: Auth (GUEST)
- **Body**: `file` (multipart/form-data) — uploads to Cloudinary, updates `user.avatar`

### GET /api/guest/loyalty
- **Auth**: Auth (GUEST)
- **Response**: tier, totalPoints, lifetimePoints, nextTier, totalStays, totalSpend

### GET /api/loyalty/transactions
- **Auth**: Auth (GUEST)
- **Query**: `type?, page?, limit?`

### POST /api/loyalty/redeem
- **Auth**: Auth (GUEST)
- **Body**: `points, bookingId`
- **Response**: applies discount (1 pt = ₦1)

---

## Bookings (shared)

### POST /api/bookings
- **Auth**: Auth (any)
- **Body**: `roomId, checkIn, checkOut, adults, children?, specialRequests?`
- **Response**: creates PENDING booking with calculated pricing (incl. weekend multiplier + 10% tax)

### POST /api/bookings/group
- **Auth**: Auth (any)
- **Body**: `rooms: [{ roomId }, ...], checkIn, checkOut, specialRequests?`
- **Response**: creates multiple linked PENDING bookings sharing a `groupRef`

### GET /api/bookings
- **Auth**: Auth (any) — guests see own, staff see all
- **Query**: `status?, page?, limit?`

### GET /api/bookings/[id]
- **Auth**: Auth (any)
- **Response**: booking detail with room-service balance

### PATCH /api/bookings/[id]/cancel
- **Auth**: Auth (any) — guest can cancel own; staff can cancel any
- **Response**: booking → CANCELLED, payment → REFUNDED

### GET /api/bookings/[id]/receipt
- **Auth**: Auth (any)
- **Response**: formatted receipt with nightly breakdown

---

## Room Upgrades

### GET /api/bookings/[id]/upgrade
- **Auth**: Auth (any)
- **Response**: current upgrade request for the booking (or null)

### GET /api/bookings/[id]/upgrade/options
- **Auth**: Auth (GUEST)
- **Response**: available room types with pricing deltas

### POST /api/bookings/[id]/upgrade/request
- **Auth**: Auth (GUEST) — booking must be CONFIRMED/CHECKED_IN
- **Body**: `requestedTypeId`
- **Response**: creates PENDING upgrade + notifies admins

### POST /api/bookings/[id]/upgrade/pay-link
- **Auth**: Auth (GUEST)
- **Response**: initializes Paystack against existing `paymentReference`; returns `{ authorizationUrl, reference, amount }`

### GET /api/payments/upgrade/status/[reference]
- **Auth**: Auth (GUEST)
- **Response**: polls Paystack; on success swaps room, marks upgrade APPROVED, notifies guest + staff

### GET /api/admin/upgrades
- **Auth**: ADMIN / MANAGER / STAFF
- **Query**: `status?, page?, limit?`

### PATCH /api/admin/upgrades/[id]/approve
- **Auth**: ADMIN / MANAGER
- **Response**: creates `PendingPayment`, saves `paymentReference`, notifies guest. Free upgrades (priceDifference ≤ 0) apply immediately.

### PATCH /api/admin/upgrades/[id]/reject
- **Auth**: ADMIN / MANAGER
- **Response**: upgrade → REJECTED, notifies guest

---

## Stay Extensions

### GET /api/bookings/[id]/extend/check
- **Auth**: Auth (any)
- **Query**: `newCheckOut` (ISO)
- **Response**: `{ available: true, additionalNights, additionalAmount, taxAmount, totalAdditional, newCheckOut }` or `{ available: false, earliestAvailable }`

### POST /api/bookings/[id]/extend
- **Auth**: Auth (GUEST) — booking must be CONFIRMED/CHECKED_IN
- **Body**: `newCheckOut`
- **Response**: creates PENDING extension + notifies admins (no payment yet)

### POST /api/bookings/[id]/extend/pay-link
- **Auth**: Auth (GUEST)
- **Response**: initializes Paystack for approved extension

### GET /api/payments/extension/status/[reference]
- **Auth**: Auth (GUEST)
- **Response**: polls Paystack; on success bumps booking `checkOut`/`totalNights`/`totalAmount`, marks extension APPROVED

### GET /api/bookings/[id]/extensions
- **Auth**: Auth (any)
- **Response**: extension history (currently at most one per booking)

### GET /api/admin/extensions
- **Auth**: ADMIN / MANAGER / STAFF
- **Query**: `status?, page?, limit?`

### PATCH /api/admin/extensions/[id]/approve
- **Auth**: ADMIN / MANAGER
- **Response**: re-checks availability, creates `PendingPayment`, saves reference, notifies guest

### PATCH /api/admin/extensions/[id]/reject
- **Auth**: ADMIN / MANAGER
- **Response**: extension → REJECTED, notifies guest

---

## Payments

### POST /api/payments/initialize
- **Auth**: Auth (GUEST)
- **Body**: `bookingId, pointsUsed?`
- **Response**: `{ authorizationUrl, reference }` (Paystack)

### GET /api/payments/status/[reference]
- **Auth**: Auth (any)
- **Response**: polls Paystack; on success confirms booking, awards loyalty points, sends email

### POST /api/payments/group/initialize
- **Auth**: Auth (GUEST)
- **Body**: `bookingIds: [ ... ], pointsUsed?`
- **Response**: Paystack init for multi-room booking

### GET /api/payments/group/status/[reference]
- **Auth**: Auth (GUEST)
- **Response**: confirms all bookings in the group on success

### POST /api/payments/room-service/initialize
- **Auth**: Auth (GUEST)
- **Body**: `bookingId`
- **Response**: Paystack init for unsettled room-service orders

### GET /api/payments/room-service/status/[reference]
- **Auth**: Auth (GUEST)
- **Response**: marks room-service orders settled on success

---

## Room Service

### GET /api/room-service/menu
- **Auth**: Public · admin with `?all=true` includes disabled items
- **Response**: menu items grouped by category

### POST /api/room-service/menu
- **Auth**: ADMIN
- **Body**: `name, description, price, category, image?, prepMinutes?`

### PATCH /api/room-service/menu/[id]
- **Auth**: ADMIN
- **Body**: any menu field + `isAvailable?`

### POST /api/room-service/orders
- **Auth**: Auth (GUEST) — must be CHECKED_IN
- **Body**: `bookingId, items: [{ itemId, quantity }, ...], instructions?`

### GET /api/room-service/orders
- **Auth**: Auth (any) — guests see own, staff see all
- **Query**: `status?, page?, limit?`

### GET /api/room-service/orders/[id]
- **Auth**: Auth (any)

### PATCH /api/room-service/orders/[id]/status
- **Auth**: STAFF / MANAGER / ADMIN
- **Body**: `status` ∈ `PREPARING | DELIVERED | CANCELLED`

### PATCH /api/room-service/orders/[id]/cancel
- **Auth**: Auth (any) — guests only PENDING; staff any non-delivered
- **Response**: sets order → CANCELLED

### POST /api/staff/bookings/[id]/settle-room-service
- **Auth**: STAFF / MANAGER / ADMIN
- **Body**: `method` ∈ `CASH | CARD | BANK_TRANSFER`, `reference?`
- **Response**: marks all unsettled room-service orders paid

---

## Hotel Services

### GET /api/services
- **Auth**: Public · admin with `?all=true` includes disabled
- **Response**: services grouped by category

### POST /api/services
- **Auth**: ADMIN
- **Body**: `name, description, price, category, image?`

### PATCH /api/services/[id]
- **Auth**: ADMIN
- **Body**: any service field + `isAvailable?`

### POST /api/services/book
- **Auth**: Auth (GUEST)
- **Body**: `serviceId, bookingId, scheduledAt, notes?` — scheduledAt must fall inside the booking's stay

### GET /api/services/bookings
- **Auth**: Auth (any) — guests see own, staff see all
- **Query**: `status?, date?, category?, page?, limit?`

### GET /api/services/bookings/[id]
- **Auth**: Auth (any)

### DELETE /api/services/bookings/[id]
- **Auth**: Auth (any) — guests only PENDING > 24h before; staff any

### PATCH /api/services/bookings/[id]/status
- **Auth**: STAFF / MANAGER / ADMIN
- **Body**: `status` ∈ `APPROVED | REJECTED`, `notes?`

---

## Staff

### GET /api/staff/dashboard
- **Auth**: STAFF / MANAGER / ADMIN
- **Response**: today's arrivals/departures, overdue checkouts, no-shows, rooms needing cleaning, counts

### GET /api/staff/arrivals
- **Auth**: STAFF / MANAGER / ADMIN
- **Query**: `date?`

### GET /api/staff/departures
- **Auth**: STAFF / MANAGER / ADMIN
- **Query**: `date?`

### GET /api/staff/rooms
- **Auth**: STAFF / MANAGER / ADMIN
- **Response**: rooms grouped by floor with booking status + no-show flag

### PATCH /api/staff/rooms/[id]/status
- **Auth**: STAFF / MANAGER / ADMIN
- **Body**: `status` ∈ `AVAILABLE | CLEANING | MAINTENANCE`, `notes?`

### GET /api/staff/guests/search
- **Auth**: STAFF / MANAGER / ADMIN
- **Query**: `q`
- **Response**: matches by name, email, phone, or booking ref

### GET /api/staff/guests/[id]
- **Auth**: STAFF / MANAGER / ADMIN
- **Response**: guest profile + bookings + loyalty + recent room-service

### POST /api/staff/walk-in
- **Auth**: STAFF / MANAGER / ADMIN
- **Body**: `{ guestId | (firstName, lastName, email, phone?) }, roomIds | roomId, checkIn, checkOut, adults, children?, specialRequests?, paymentMethod, amountReceived?, receiptRef? }`
- **Response**: creates CONFIRMED bookings + payment; activates guest (emails setup link for new users)

### POST /api/staff/bookings/[id]/checkin
- **Auth**: STAFF / MANAGER / ADMIN
- **Response**: booking → CHECKED_IN, room → OCCUPIED

### POST /api/staff/bookings/[id]/checkout
- **Auth**: STAFF / MANAGER / ADMIN
- **Query**: `force?` — bypasses pending-room-service guard
- **Response**: booking → CHECKED_OUT, room → CLEANING

### POST /api/staff/bookings/[id]/no-show
- **Auth**: STAFF / MANAGER / ADMIN
- **Response**: CONFIRMED booking past check-in → NO_SHOW, room → AVAILABLE

---

## Admin

### GET /api/admin/bookings
- **Auth**: ADMIN / MANAGER / STAFF
- **Query**: `status?, search?, checkIn?, checkOut?, page?, limit?`

### PATCH /api/admin/bookings/[id]
- **Auth**: ADMIN
- **Body**: `specialRequests?, status?`

### GET /api/admin/guests
- **Auth**: ADMIN / MANAGER
- **Query**: `q?, loyaltyTier?, page?, limit?`

### GET /api/admin/guests/[id]
- **Auth**: ADMIN / MANAGER
- **Response**: full guest with bookings, loyalty transactions, notifications

### GET /api/admin/stats
- **Auth**: ADMIN / MANAGER
- **Response**: dashboard overview (totals, today, this month, recent bookings/guests)

### GET /api/admin/stats/revenue
- **Auth**: ADMIN / MANAGER
- **Query**: `period` ∈ `7d | 30d | 90d | 12m`

### GET /api/admin/stats/occupancy
- **Auth**: ADMIN / MANAGER
- **Response**: occupancy by room type + 30-day trend

### GET /api/admin/stats/bookings
- **Auth**: ADMIN / MANAGER
- **Response**: status breakdown, revenue by room type, avg booking value

### GET /api/admin/revenue
- **Auth**: ADMIN / MANAGER
- **Query**: `startDate?, endDate?`

### GET /api/admin/rooms/board
- **Auth**: ADMIN / MANAGER / STAFF
- **Response**: rooms by floor with current occupancy

### GET /api/admin/overstay/check
- **Auth**: ADMIN / MANAGER
- **Response**: current overstays (CHECKED_IN past checkout)

### POST /api/admin/overstay/notify/[bookingId]
- **Auth**: ADMIN / MANAGER

### POST /api/admin/overstay/notify-all
- **Auth**: ADMIN / MANAGER

### GET /api/admin/loyalty
- **Auth**: ADMIN / MANAGER
- **Response**: program stats, tier breakdown, top guests

### POST /api/admin/loyalty/award
- **Auth**: ADMIN / MANAGER
- **Body**: `userId, points, description` — positive to award, negative to deduct

### GET /api/admin/staff
- **Auth**: ADMIN / MANAGER
- **Query**: `search?, department?, isActive?, page?`

### GET /api/admin/staff/[id]
- **Auth**: ADMIN / MANAGER

### PATCH /api/admin/staff/[id]
- **Auth**: ADMIN / MANAGER
- **Body**: `isActive?, department?, role?`

### DELETE /api/admin/staff/[id]
- **Auth**: ADMIN / MANAGER
- **Response**: soft-deactivates staff member

### PATCH /api/admin/staff/[id]/duty
- **Auth**: ADMIN / MANAGER
- **Response**: toggles on/off-duty flag

### POST /api/admin/staff/invite
- **Auth**: ADMIN / MANAGER
- **Body**: `email, role, department?`

### GET /api/admin/invites
- **Auth**: ADMIN / MANAGER
- **Response**: all invite records

### DELETE /api/admin/invites/[id]
- **Auth**: ADMIN / MANAGER
- **Response**: revokes pending invite

### POST /api/rooms
- **Auth**: ADMIN
- **Body**: `number, floor, roomTypeId, notes?`

### PATCH /api/rooms/[id]
- **Auth**: ADMIN / MANAGER / STAFF
- **Body**: `status?, notes?, floor?`

### DELETE /api/rooms/[id]
- **Auth**: ADMIN

### POST /api/rooms/types
- **Auth**: ADMIN
- **Body**: `name, description, capacity, amenities, basePrice, weekendMultiplier?, image?, images?`

### PATCH /api/rooms/types/[slug]
- **Auth**: ADMIN

### DELETE /api/rooms/types/[slug]
- **Auth**: ADMIN

---

## Notifications

### GET /api/notifications
- **Auth**: Auth (any)
- **Query**: `isRead?, page?, limit?`
- **Response**: `{ notifications, unreadCount, pagination }`

### PATCH /api/notifications/[id]/read
- **Auth**: Auth (any)

### PATCH /api/notifications/read-all
- **Auth**: Auth (any)

### DELETE /api/notifications/[id]
- **Auth**: Auth (any)

---

## Upload

### POST /api/upload
- **Auth**: ADMIN / MANAGER
- **Query**: `folder?`
- **Body**: `file` (multipart/form-data)
- **Response**: `{ url }` (Cloudinary)
