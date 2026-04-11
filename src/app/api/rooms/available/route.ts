import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/response";

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkInParam = searchParams.get("checkIn");
    const checkOutParam = searchParams.get("checkOut");
    const typeId = searchParams.get("typeId");
    const adultsParam = searchParams.get("adults");

    if (!checkInParam || !checkOutParam) {
      return errorResponse("checkIn and checkOut dates are required", 422);
    }

    const checkIn = new Date(checkInParam);
    const checkOut = new Date(checkOutParam);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return errorResponse("Invalid date format", 422);
    }

    if (checkOut <= checkIn) {
      return errorResponse("checkOut must be after checkIn", 422);
    }

    const adults = adultsParam ? parseInt(adultsParam, 10) : 1;

    // Find rooms with overlapping bookings
    const bookedRoomIds = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
        NOT: [
          { checkOut: { lte: checkIn } },
          { checkIn: { gte: checkOut } },
        ],
      },
      select: { roomId: true },
      distinct: ["roomId"],
    });

    const excludeIds = bookedRoomIds.map((b) => b.roomId);

    // Find available rooms
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        status: "AVAILABLE",
        id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        roomType: {
          isActive: true,
          capacity: { gte: adults },
          ...(typeId ? { id: typeId } : {}),
        },
      },
      include: { roomType: true },
      orderBy: { number: "asc" },
    });

    // Calculate pricing for each room
    const results = rooms.map((room) => {
      const type = room.roomType;
      let baseAmount = 0;
      let totalNights = 0;

      const current = new Date(checkIn);
      while (current < checkOut) {
        const nightPrice = isWeekend(current)
          ? Number(type.basePrice) * Number(type.weekendMultiplier)
          : Number(type.basePrice);
        baseAmount += nightPrice;
        totalNights++;
        current.setDate(current.getDate() + 1);
      }

      const taxAmount = Math.round(baseAmount * 0.1 * 100) / 100;
      const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

      return {
        room,
        baseAmount,
        taxAmount,
        totalAmount,
        totalNights,
      };
    });

    return successResponse(results);
  } catch (error) {
    console.error("Available rooms error:", error);
    return errorResponse("Internal server error", 500);
  }
}
