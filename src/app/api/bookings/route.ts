import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import {
  calculateBookingPrice,
  generateBookingRef,
  checkRoomAvailability,
} from "@/lib/bookingUtils";

// POST — create booking (any authenticated user)
export const POST = withAuth(async (request: NextRequest, _ctx, user) => {
  try {
    const { roomId, checkIn, checkOut, adults, children, specialRequests } =
      await request.json();

    // Validate inputs
    if (!roomId || !checkIn || !checkOut) {
      return errorResponse("roomId, checkIn, and checkOut are required", 422);
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return errorResponse("Invalid date format", 422);
    }
    if (checkInDate < today) {
      return errorResponse("Check-in date must be today or later", 422);
    }
    if (checkOutDate <= checkInDate) {
      return errorResponse("Check-out must be after check-in", 422);
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights > 30) {
      return errorResponse("Maximum stay is 30 nights", 422);
    }
    if (!adults || adults < 1) {
      return errorResponse("At least 1 adult is required", 422);
    }

    // Room checks
    const room = await prisma.room.findFirst({
      where: { id: roomId, isActive: true },
      include: { roomType: true },
    });
    if (!room) {
      return errorResponse("Room not found", 404);
    }
    if (adults > room.roomType.capacity) {
      return errorResponse(
        `This room supports max ${room.roomType.capacity} guests`,
        422
      );
    }

    const available = await checkRoomAvailability(
      roomId,
      checkInDate,
      checkOutDate
    );
    if (!available) {
      return errorResponse("Room is not available for the selected dates", 409);
    }

    // Calculate price
    const pricing = calculateBookingPrice(
      room.roomType,
      checkInDate,
      checkOutDate
    );
    const bookingRef = await generateBookingRef();

    const booking = await prisma.booking.create({
      data: {
        bookingRef,
        guestId: user.id,
        roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: adults || 1,
        children: children || 0,
        totalNights: pricing.totalNights,
        baseAmount: pricing.baseAmount,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        status: "PENDING",
        specialRequests: specialRequests || null,
      },
      include: {
        room: { include: { roomType: true } },
      },
    });

    return successResponse(booking, "Booking created", 201);
  } catch (error) {
    console.error("Create booking error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// GET — list bookings
export const GET = withAuth(
  async (request: NextRequest, _ctx: RouteContext, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const page = Math.max(
        1,
        parseInt(searchParams.get("page") || "1", 10)
      );
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
      );

      const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);

      const where: Prisma.BookingWhereInput = {};
      if (!isStaff) {
        where.guestId = user.id;
      }
      if (status) {
        where.status = status as Prisma.EnumBookingStatusFilter;
      }

      const [total, bookings] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
          where,
          include: {
            room: { select: { number: true, floor: true } },
            guest: {
              select: { firstName: true, lastName: true, email: true },
            },
            payment: { select: { status: true, amount: true } },
          },
          orderBy: isStaff
            ? { createdAt: "desc" }
            : { checkIn: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return successResponse({
        bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("List bookings error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
