import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/response";
import { checkRoomAvailability } from "@/lib/bookingUtils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const checkInParam = searchParams.get("checkIn");
    const checkOutParam = searchParams.get("checkOut");

    if (!roomId || !checkInParam || !checkOutParam) {
      return errorResponse("roomId, checkIn, and checkOut are required", 422);
    }

    const checkIn = new Date(checkInParam);
    const checkOut = new Date(checkOutParam);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return errorResponse("Invalid date format", 422);
    }

    if (checkOut <= checkIn) {
      return errorResponse("checkOut must be after checkIn", 422);
    }

    const available = await checkRoomAvailability(roomId, checkIn, checkOut);

    return successResponse({ available });
  } catch (error) {
    console.error("Check availability error:", error);
    return errorResponse("Internal server error", 500);
  }
}
