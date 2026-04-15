import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import {
  calculateBookingPrice,
  generateBookingRef,
  checkRoomAvailability,
} from "@/lib/bookingUtils";
import { LOYALTY_TIERS } from "@/lib/loyalty";
import { createNotification } from "@/lib/notifications";
import { bookingConfirmationEmail, walkInActivationEmail } from "@/lib/email";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

type PaymentMethod = "CASH" | "POS" | "BANK_TRANSFER";
const VALID_METHODS: PaymentMethod[] = ["CASH", "POS", "BANK_TRANSFER"];

function tierForPoints(lifetimePoints: number): keyof typeof LOYALTY_TIERS {
  const order: Array<keyof typeof LOYALTY_TIERS> = [
    "PLATINUM",
    "GOLD",
    "SILVER",
    "BRONZE",
  ];
  for (const tier of order) {
    if (lifetimePoints >= LOYALTY_TIERS[tier].threshold) return tier;
  }
  return "BRONZE";
}

/**
 * Distribute total adults greedily across rooms, respecting each room's
 * capacity. Every room gets at least 1 adult. Returns null if the combined
 * capacity cannot fit `totalAdults`.
 */
function distributeAdults(
  capacities: number[],
  totalAdults: number
): number[] | null {
  const n = capacities.length;
  if (n === 0 || totalAdults < n) return null;
  const totalCap = capacities.reduce((s, c) => s + c, 0);
  if (totalAdults > totalCap) return null;

  const alloc = new Array<number>(n).fill(1);
  let remaining = totalAdults - n;
  for (let i = 0; i < n && remaining > 0; i++) {
    const room = capacities[i];
    const extra = Math.min(room - 1, remaining);
    alloc[i] += extra;
    remaining -= extra;
  }
  return remaining === 0 ? alloc : null;
}

export const POST = withAuth(
  async (request: NextRequest, _ctx, staff: AuthUser) => {
    try {
      const body = await request.json();
      const {
        guestId,
        firstName,
        lastName,
        email,
        phone,
        roomId, // legacy single-room support
        roomIds, // new multi-room support
        checkIn,
        checkOut,
        adults,
        children,
        specialRequests,
        paymentMethod,
        amountReceived,
        receiptRef,
      } = body as {
        guestId?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        roomId?: string;
        roomIds?: string[];
        checkIn?: string;
        checkOut?: string;
        adults?: number;
        children?: number;
        specialRequests?: string;
        paymentMethod?: PaymentMethod;
        amountReceived?: number;
        receiptRef?: string;
      };

      // Normalize rooms into array
      const rooms: string[] = Array.isArray(roomIds) && roomIds.length > 0
        ? Array.from(new Set(roomIds))
        : roomId
          ? [roomId]
          : [];

      // ── Validate required fields ──
      if (
        !firstName ||
        !lastName ||
        !email ||
        rooms.length === 0 ||
        !checkIn ||
        !checkOut ||
        !paymentMethod ||
        amountReceived === undefined ||
        amountReceived === null
      ) {
        return errorResponse(
          "Missing required fields (firstName, lastName, email, roomIds, checkIn, checkOut, paymentMethod, amountReceived)",
          400
        );
      }
      if (!VALID_METHODS.includes(paymentMethod)) {
        return errorResponse(
          "paymentMethod must be CASH, POS, or BANK_TRANSFER",
          422
        );
      }
      if (typeof amountReceived !== "number" || amountReceived < 0) {
        return errorResponse("amountReceived must be a non-negative number", 422);
      }
      if (!adults || adults < 1) {
        return errorResponse("At least 1 adult is required", 422);
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return errorResponse("Invalid date format", 422);
      }
      if (checkOutDate <= checkInDate) {
        return errorResponse("Check-out must be after check-in", 422);
      }
      // Compare against UTC midnight (the same anchor the client sends).
      // Using server-local midnight would drift a day when the server
      // and sender are in different timezones.
      const now = new Date();
      const todayUtcMidnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );
      if (checkInDate.getTime() < todayUtcMidnight) {
        return errorResponse("Check-in date cannot be in the past", 422);
      }

      // ── STEP 1: Resolve or create guest ──
      let resolvedUser: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      } | null = null;
      let isNewGuest = false;
      // True when the resolved guest has no way to log in yet (no password
      // and no Google account). Triggers the activation flow even if the
      // User row already existed (e.g. created by a prior walk-in).
      let needsActivation = false;
      let rawResetToken: string | null = null;

      if (guestId) {
        const existing = await prisma.user.findFirst({
          where: { id: guestId, role: "GUEST", isActive: true, isDeleted: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            passwordHash: true,
            googleId: true,
          },
        });
        if (!existing) {
          return errorResponse("Guest not found", 404);
        }
        resolvedUser = existing;
        needsActivation = !existing.passwordHash && !existing.googleId;
      } else {
        const byEmail = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            isDeleted: true,
            passwordHash: true,
            googleId: true,
          },
        });
        if (byEmail) {
          if (byEmail.isDeleted || byEmail.role !== "GUEST" || !byEmail.isActive) {
            return errorResponse(
              "Email belongs to a non-guest or inactive account",
              422
            );
          }
          resolvedUser = {
            id: byEmail.id,
            firstName: byEmail.firstName,
            lastName: byEmail.lastName,
            email: byEmail.email,
          };
          needsActivation = !byEmail.passwordHash && !byEmail.googleId;
        } else {
          rawResetToken = crypto.randomBytes(32).toString("hex");
          const hashedToken = crypto
            .createHash("sha256")
            .update(rawResetToken)
            .digest("hex");

          const created = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              firstName,
              lastName,
              phone: phone?.trim() || null,
              role: "GUEST",
              isActive: true,
              passwordHash: null,
              resetToken: hashedToken,
              resetExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
              guestProfile: { create: {} },
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          });
          resolvedUser = created;
          isNewGuest = true;
          needsActivation = true;
        }
      }

      // If the resolved user has no way to log in yet, mint a fresh activation
      // token (overwrites any prior, expired one) so the activation email can
      // include a working link.
      if (needsActivation && !rawResetToken) {
        rawResetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
          .createHash("sha256")
          .update(rawResetToken)
          .digest("hex");
        await prisma.user.update({
          where: { id: resolvedUser.id },
          data: {
            resetToken: hashedToken,
            resetExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          },
        });
      }

      // ── STEP 2: Load rooms, check capacity, check availability ──
      const roomRows = await prisma.room.findMany({
        where: { id: { in: rooms }, isActive: true },
        include: { roomType: true },
      });
      if (roomRows.length !== rooms.length) {
        return errorResponse("One or more rooms not found", 404);
      }
      // Preserve input order
      const roomsOrdered = rooms
        .map((id) => roomRows.find((r) => r.id === id))
        .filter((r): r is (typeof roomRows)[number] => !!r);

      // Capacity check across the group
      const capacities = roomsOrdered.map((r) => r.roomType.capacity);
      const adultsPerRoom = distributeAdults(capacities, adults);
      if (!adultsPerRoom) {
        const totalCap = capacities.reduce((s, c) => s + c, 0);
        return errorResponse(
          `Selected rooms accommodate max ${totalCap} adults; received ${adults}`,
          422
        );
      }

      // Availability for each room (in parallel)
      const availabilityChecks = await Promise.all(
        roomsOrdered.map((r) =>
          checkRoomAvailability(r.id, checkInDate, checkOutDate)
        )
      );
      const unavailable = roomsOrdered
        .filter((_, i) => !availabilityChecks[i])
        .map((r) => r.number);
      if (unavailable.length > 0) {
        return errorResponse(
          `Room${unavailable.length > 1 ? "s" : ""} ${unavailable.join(", ")} not available for selected dates`,
          409
        );
      }

      // ── STEP 3: Compute pricing per room + group total ──
      const roomPricings = roomsOrdered.map((r) =>
        calculateBookingPrice(r.roomType, checkInDate, checkOutDate)
      );
      const groupTotal = roomPricings.reduce(
        (s, p) => s + p.totalAmount,
        0
      );
      const underpaid = amountReceived < groupTotal;
      const shortfall = underpaid
        ? Math.round((groupTotal - amountReceived) * 100) / 100
        : 0;
      const isGroup = roomsOrdered.length > 1;
      const groupRef = isGroup
        ? `GRP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
        : null;

      // Split amountReceived proportionally across rooms (last gets remainder)
      const amounts: number[] = [];
      let allocated = 0;
      for (let i = 0; i < roomPricings.length; i++) {
        if (i === roomPricings.length - 1) {
          amounts.push(Math.round((amountReceived - allocated) * 100) / 100);
        } else {
          const share =
            groupTotal > 0
              ? Math.round(
                  ((roomPricings[i].totalAmount / groupTotal) *
                    amountReceived) *
                    100
                ) / 100
              : 0;
          amounts.push(share);
          allocated += share;
        }
      }

      // Is check-in today?
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDayStart = new Date(checkInDate);
      checkInDayStart.setHours(0, 0, 0, 0);
      const isCheckInToday = checkInDayStart.getTime() === today.getTime();

      // Match the online Paystack booking path (1 point per naira).
      // Keeping rates parallel so walk-in and online bookings accrue
      // loyalty identically.
      const pointsEarned = Math.floor(amountReceived);

      // Pre-generate N sequential booking refs. generateBookingRef() uses
      // count+1 — calling it in a loop before any rows are created would
      // return the same ref N times. Take one count and pad from there.
      const existingCount = await prisma.booking.count();
      const year = new Date().getFullYear();
      const bookingRefs: string[] = roomsOrdered.map(
        (_, i) => `BK-${year}-${String(existingCount + 1 + i).padStart(4, "0")}`
      );
      // Parity check — any collision (e.g. another request crept in between
      // the count and this point) will be caught by the @unique DB constraint
      // and surface as a 500. Acceptable for a walk-in; retry is fine.
      void generateBookingRef;

      const { bookings, payments } = await prisma.$transaction(async (tx) => {
        const createdBookings = [];
        const createdPayments = [];

        for (let i = 0; i < roomsOrdered.length; i++) {
          const room = roomsOrdered[i];
          const pricing = roomPricings[i];
          const bRef = bookingRefs[i];
          const paymentReference = `WALKIN-${Date.now()}-${i}-${crypto
            .randomBytes(3)
            .toString("hex")
            .toUpperCase()}`;

          const b = await tx.booking.create({
            data: {
              bookingRef: bRef,
              groupRef,
              guestId: resolvedUser!.id,
              roomId: room.id,
              checkIn: checkInDate,
              checkOut: checkOutDate,
              adults: adultsPerRoom[i],
              children: i === 0 ? children || 0 : 0, // children grouped on first booking
              totalNights: pricing.totalNights,
              baseAmount: pricing.baseAmount,
              taxAmount: pricing.taxAmount,
              totalAmount: pricing.totalAmount,
              discountAmount: 0,
              pointsUsed: 0,
              status: "CONFIRMED",
              specialRequests: i === 0 ? specialRequests || null : null,
              checkedInById: staff.id,
            },
          });
          createdBookings.push(b);

          const bookingUnderpaid = amounts[i] < pricing.totalAmount;
          const bookingShortfall = bookingUnderpaid
            ? Math.round((pricing.totalAmount - amounts[i]) * 100) / 100
            : 0;

          const p = await tx.payment.create({
            data: {
              bookingId: b.id,
              reference: paymentReference,
              amount: amounts[i],
              currency: "NGN",
              type: "BOOKING",
              status: "COMPLETED",
              paystackData: {
                method: paymentMethod,
                receiptRef: receiptRef || null,
                processedBy: staff.id,
                isWalkIn: true,
                timestamp: new Date().toISOString(),
                ...(groupRef
                  ? { groupRef, groupTotal, groupAmountReceived: amountReceived }
                  : {}),
                ...(bookingUnderpaid
                  ? { underpayment: true, shortfall: bookingShortfall }
                  : {}),
              },
            },
          });
          createdPayments.push(p);

          if (isCheckInToday) {
            await tx.room.update({
              where: { id: room.id },
              data: { status: "OCCUPIED" },
            });
          }
        }

        // Loyalty + totalSpend updates (once per guest, based on total received)
        const profile = await tx.guestProfile.findUnique({
          where: { userId: resolvedUser!.id },
        });
        if (profile) {
          if (pointsEarned > 0) {
            const newLifetime = profile.lifetimePoints + pointsEarned;
            const newTier = tierForPoints(newLifetime);
            await tx.guestProfile.update({
              where: { userId: resolvedUser!.id },
              data: {
                totalPoints: profile.totalPoints + pointsEarned,
                lifetimePoints: newLifetime,
                totalSpend: { increment: amountReceived },
                loyaltyTier: newTier,
              },
            });
            await tx.loyaltyTransaction.create({
              data: {
                guestId: resolvedUser!.id,
                points: pointsEarned,
                type: "EARNED",
                description: groupRef
                  ? `Earned from walk-in group booking ${groupRef}`
                  : `Earned from walk-in booking ${createdBookings[0].bookingRef}`,
                bookingId: createdBookings[0].id,
              },
            });
          } else {
            await tx.guestProfile.update({
              where: { userId: resolvedUser!.id },
              data: { totalSpend: { increment: amountReceived } },
            });
          }
        }

        return { bookings: createdBookings, payments: createdPayments };
      });

      // ── STEP 5: Post-transaction notifications + emails ──
      const primary = bookings[0];
      const summary = isGroup
        ? `Your group booking (${bookings.length} rooms, ref ${groupRef}) has been confirmed.`
        : `Your booking ${primary.bookingRef} has been confirmed.`;

      await createNotification({
        userId: resolvedUser.id,
        title: "Booking Confirmed",
        message: summary,
        type: "BOOKING_CONFIRMED",
        bookingId: primary.id,
      });

      if (needsActivation && rawResetToken) {
        const activationLink = `${CLIENT_URL}/reset-password?token=${rawResetToken}&activate=1`;
        const roomLabel = isGroup
          ? `${bookings.length} rooms — ${roomsOrdered.map((r) => r.roomType.name).join(", ")}`
          : `Room ${roomsOrdered[0].number} · ${roomsOrdered[0].roomType.name}`;
        try {
          const sent = await walkInActivationEmail(
            { firstName: resolvedUser.firstName, email: resolvedUser.email },
            {
              bookingRef: isGroup ? groupRef! : primary.bookingRef,
              checkIn: checkInDate,
              checkOut: checkOutDate,
              totalAmount: groupTotal,
            },
            roomLabel,
            activationLink
          );
          if (sent) {
            console.log(
              `[walk-in] Activation email sent to ${resolvedUser.email} (${primary.bookingRef})`
            );
          } else {
            console.error(
              `[walk-in] Activation email NOT sent to ${resolvedUser.email}. ` +
                `SMTP_HOST/SMTP_USER/SMTP_PASS may be missing or invalid. ` +
                `Manual activation link: ${activationLink}`
            );
          }
        } catch (emailErr) {
          console.error(
            `[walk-in] Activation email threw for ${resolvedUser.email}:`,
            emailErr,
            `\nManual activation link: ${activationLink}`
          );
        }
      } else {
        bookingConfirmationEmail(
          { firstName: resolvedUser.firstName, email: resolvedUser.email },
          {
            bookingRef: isGroup ? groupRef! : primary.bookingRef,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            totalAmount: groupTotal,
          },
          isGroup
            ? `${bookings.length} rooms — ${roomsOrdered.map((r) => r.roomType.name).join(", ")}`
            : roomsOrdered[0].roomType.name
        ).catch((e) => console.error("[walk-in] bookingConfirmationEmail failed:", e));
      }

      return successResponse(
        {
          groupRef,
          isGroup,
          bookings: bookings.map((b, i) => ({
            id: b.id,
            bookingRef: b.bookingRef,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            status: b.status,
            totalAmount: Number(b.totalAmount),
            adults: b.adults,
            room: {
              number: roomsOrdered[i].number,
              floor: roomsOrdered[i].floor,
            },
            roomType: { name: roomsOrdered[i].roomType.name },
            payment: {
              reference: payments[i].reference,
              amount: Number(payments[i].amount),
            },
          })),
          guest: {
            id: resolvedUser.id,
            firstName: resolvedUser.firstName,
            lastName: resolvedUser.lastName,
            email: resolvedUser.email,
            isNewGuest,
          },
          payment: {
            method: paymentMethod,
            amountReceived,
            groupTotal,
            ...(underpaid ? { underpayment: true, shortfall } : {}),
          },
          loyaltyPointsAwarded: pointsEarned,
        },
        underpaid
          ? `Booking${isGroup ? "s" : ""} created with shortfall of ₦${shortfall.toLocaleString()} — flagged for admin review`
          : isGroup
            ? `Group booking (${bookings.length} rooms) created`
            : "Walk-in booking created",
        201
      );
    } catch (error) {
      console.error("Walk-in booking error:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return errorResponse(message, 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
