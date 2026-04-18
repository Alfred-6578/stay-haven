import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const typeParam = searchParams.get("type"); // EARNED | REDEEMED
      const page = Math.max(
        1,
        parseInt(searchParams.get("page") || "1", 10)
      );
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "15", 10))
      );

      const where: Prisma.LoyaltyTransactionWhereInput = {
        guestId: user.id,
      };
      if (typeParam) {
        where.type = typeParam;
      }

      const [total, transactions] = await Promise.all([
        prisma.loyaltyTransaction.count({ where }),
        prisma.loyaltyTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            booking: {
              select: { bookingRef: true },
            },
          },
        }),
      ]);

      const shaped = transactions.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        description: t.description,
        bookingRef: t.booking?.bookingRef || null,
        createdAt: t.createdAt,
      }));

      return successResponse({
        transactions: shaped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Loyalty transactions error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
