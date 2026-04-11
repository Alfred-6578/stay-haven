import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { getAccessToken } from "@/lib/cookies";
import { verifyAccessToken } from "@/lib/auth";

// GET — paginated, public sees AVAILABLE only, admin/staff sees all
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const floor = searchParams.get("floor");
    const typeId = searchParams.get("typeId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 15;

    // Check if authenticated admin/staff
    let isStaff = false;
    const token = getAccessToken(request);
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        if (["ADMIN", "MANAGER", "STAFF"].includes(decoded.role)) {
          isStaff = true;
        }
      } catch {
        // not authenticated or invalid — treat as public
      }
    }

    const where: Prisma.RoomWhereInput = { isActive: true };

    if (!isStaff) {
      where.status = "AVAILABLE";
      where.roomType = { isActive: true };
    } else if (status) {
      where.status = status as Prisma.EnumRoomStatusFilter;
    }

    if (floor) where.floor = parseInt(floor, 10);
    if (typeId) where.roomTypeId = typeId;

    const [total, rooms] = await Promise.all([
      prisma.room.count({ where }),
      prisma.room.findMany({
        where,
        include: { roomType: true },
        orderBy: { number: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return successResponse({
      rooms,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("List rooms error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST — ADMIN only
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const { number, floor, roomTypeId, notes } = await request.json();

      if (!number || floor === undefined || !roomTypeId) {
        return errorResponse("Number, floor, and room type are required", 422);
      }

      const existing = await prisma.room.findUnique({ where: { number } });
      if (existing) {
        return errorResponse("A room with that number already exists", 409);
      }

      const roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId },
      });
      if (!roomType) {
        return errorResponse("Room type not found", 404);
      }

      const room = await prisma.room.create({
        data: {
          number,
          floor,
          roomTypeId,
          notes: notes || null,
          status: "AVAILABLE",
        },
        include: { roomType: true },
      });

      return successResponse(room, "Room created", 201);
    } catch (error) {
      console.error("Create room error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
