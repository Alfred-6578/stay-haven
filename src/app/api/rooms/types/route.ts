import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

// GET — public, no auth
export async function GET() {
  try {
    const roomTypes = await prisma.roomType.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: { isActive: true },
          select: { id: true, status: true },
        },
      },
      orderBy: { basePrice: "asc" },
    });

    const data = roomTypes.map(({ rooms, ...type }) => ({
      ...type,
      roomCount: rooms.length,
      availableCount: rooms.filter((r) => r.status === "AVAILABLE").length,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("List room types error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST — ADMIN only
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const {
        name,
        description,
        capacity,
        amenities,
        basePrice,
        weekendMultiplier,
        images,
      } = await request.json();

      if (!name || !description || !capacity || !basePrice) {
        return errorResponse(
          "Name, description, capacity, and base price are required",
          422
        );
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      const existing = await prisma.roomType.findFirst({
        where: { OR: [{ slug }, { name }] },
      });
      if (existing) {
        return errorResponse("A room type with that name already exists", 409);
      }

      const roomType = await prisma.roomType.create({
        data: {
          name,
          slug,
          description,
          capacity,
          amenities: amenities || [],
          basePrice,
          weekendMultiplier: weekendMultiplier || 1.0,
          images: images || [],
        },
      });

      return successResponse(roomType, "Room type created", 201);
    } catch (error) {
      console.error("Create room type error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
