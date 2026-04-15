import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import {
  calculateBookingPrice,
  checkRoomAvailability,
} from "@/lib/bookingUtils";

interface GroupRoomInput {
  roomId: string;
  adults: number;
  children?: number;
}

/**
 * Create N PENDING bookings for a guest with a shared groupRef.
 * Payment is initialized separately against the group.
 */
export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const body = await request.json();
      const {
        rooms,
        checkIn,
        checkOut,
        specialRequests,
      } = body as {
        rooms?: GroupRoomInput[];
        checkIn?: string;
        checkOut?: string;
        specialRequests?: string;
      };

      if (!Array.isArray(rooms) || rooms.length === 0) {
        return errorResponse("rooms[] is required", 422);
      }
      if (!checkIn || !checkOut) {
        return errorResponse("checkIn and checkOut are required", 422);
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return errorResponse("Invalid date format", 422);
      }
      if (checkOutDate <= checkInDate) {
        return errorResponse("Check-out must be after check-in", 422);
      }
      const now = new Date();
      const todayUtcMidnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );
      if (checkInDate.getTime() < todayUtcMidnight) {
        return errorResponse("Check-in date cannot be in the past", 422);
      }

      // De-dup rooms by id
      const seen = new Set<string>();
      const dedup: GroupRoomInput[] = [];
      for (const r of rooms) {
        if (!r || !r.roomId || typeof r.roomId !== "string") {
          return errorResponse("Each room must have a roomId", 422);
        }
        if (!r.adults || r.adults < 1) {
          return errorResponse("Each room must have at least 1 adult", 422);
        }
        if (!seen.has(r.roomId)) {
          seen.add(r.roomId);
          dedup.push(r);
        }
      }

      // Load room rows
      const roomRows = await prisma.room.findMany({
        where: { id: { in: dedup.map((r) => r.roomId) }, isActive: true },
        include: { roomType: true },
      });
      if (roomRows.length !== dedup.length) {
        return errorResponse("One or more rooms not found", 404);
      }

      // Validate per-room capacity
      for (const r of dedup) {
        const row = roomRows.find((rr) => rr.id === r.roomId)!;
        if (r.adults > row.roomType.capacity) {
          return errorResponse(
            `Room ${row.number} supports max ${row.roomType.capacity} adults`,
            422
          );
        }
      }

      // Parallel availability check
      const checks = await Promise.all(
        dedup.map((r) =>
          checkRoomAvailability(r.roomId, checkInDate, checkOutDate)
        )
      );
      const unavailable = dedup
        .filter((_, i) => !checks[i])
        .map((r) => roomRows.find((rr) => rr.id === r.roomId)!.number);
      if (unavailable.length > 0) {
        return errorResponse(
          `Room${unavailable.length > 1 ? "s" : ""} ${unavailable.join(", ")} no longer available for these dates`,
          409
        );
      }

      // Pricing per room + group total
      const pricings = dedup.map((r) => {
        const row = roomRows.find((rr) => rr.id === r.roomId)!;
        return calculateBookingPrice(row.roomType, checkInDate, checkOutDate);
      });
      const groupTotal = pricings.reduce((s, p) => s + p.totalAmount, 0);

      // Single group?
      const isGroup = dedup.length > 1;
      const groupRef = isGroup
        ? `GRP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
        : null;

      // Pre-generate sequential booking refs (see walk-in route for rationale)
      const existingCount = await prisma.booking.count();
      const year = new Date().getFullYear();
      const bookingRefs = dedup.map(
        (_, i) => `BK-${year}-${String(existingCount + 1 + i).padStart(4, "0")}`
      );

      const created = await prisma.$transaction(async (tx) => {
        const bookings = [];
        for (let i = 0; i < dedup.length; i++) {
          const input = dedup[i];
          const row = roomRows.find((rr) => rr.id === input.roomId)!;
          const pricing = pricings[i];
          const b = await tx.booking.create({
            data: {
              bookingRef: bookingRefs[i],
              groupRef,
              guestId: user.id,
              roomId: input.roomId,
              checkIn: checkInDate,
              checkOut: checkOutDate,
              adults: input.adults,
              children: i === 0 ? input.children || 0 : 0,
              totalNights: pricing.totalNights,
              baseAmount: pricing.baseAmount,
              taxAmount: pricing.taxAmount,
              totalAmount: pricing.totalAmount,
              discountAmount: 0,
              pointsUsed: 0,
              status: "PENDING",
              specialRequests: i === 0 ? specialRequests || null : null,
            },
            include: {
              room: {
                select: {
                  number: true,
                  floor: true,
                  roomType: { select: { name: true } },
                },
              },
            },
          });
          bookings.push(b);
        }
        return bookings;
      });

      return successResponse(
        {
          groupRef,
          isGroup,
          bookingIds: created.map((b) => b.id),
          bookings: created.map((b) => ({
            id: b.id,
            bookingRef: b.bookingRef,
            roomId: b.roomId,
            adults: b.adults,
            totalAmount: Number(b.totalAmount),
            room: {
              number: b.room.number,
              floor: b.room.floor,
              roomType: { name: b.room.roomType.name },
            },
          })),
          checkIn: checkInDate,
          checkOut: checkOutDate,
          groupTotal,
        },
        isGroup
          ? `Group booking created (${created.length} rooms pending payment)`
          : "Booking created",
        201
      );
    } catch (error) {
      console.error("Group booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
