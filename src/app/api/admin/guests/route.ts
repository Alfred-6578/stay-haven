import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const VALID_TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get("q") || "").trim();
      const loyaltyTier = searchParams.get("loyaltyTier");
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "15", 10) || 15)
      );

      const where: Prisma.UserWhereInput = {
        role: "GUEST",
        isDeleted: false,
      };

      if (q) {
        where.OR = [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ];
      }

      if (loyaltyTier) {
        if (!VALID_TIERS.includes(loyaltyTier)) {
          return errorResponse(
            `loyaltyTier must be one of: ${VALID_TIERS.join(", ")}`,
            422
          );
        }
        where.guestProfile = {
          loyaltyTier: loyaltyTier as "BRONZE" | "SILVER" | "GOLD" | "PLATINUM",
        };
      }

      const [total, guests] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            createdAt: true,
            guestProfile: {
              select: {
                loyaltyTier: true,
                totalStays: true,
                totalSpend: true,
              },
            },
            bookings: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                bookingRef: true,
                status: true,
                checkIn: true,
                checkOut: true,
              },
            },
          },
        }),
      ]);

      const shaped = guests.map((g) => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        phone: g.phone,
        avatar: g.avatar,
        createdAt: g.createdAt,
        guestProfile: g.guestProfile,
        lastBooking: g.bookings[0] || null,
      }));

      return successResponse({
        guests: shaped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Admin guests list error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
