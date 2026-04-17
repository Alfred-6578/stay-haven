import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

// PATCH — admin: update any field or toggle availability
export const PATCH = withAuth<{ id: string }>(
  async (
    request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    _user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const body = await request.json();
      const { name, description, price, category, image, isAvailable } =
        body as {
          name?: string;
          description?: string;
          price?: number;
          category?: string;
          image?: string | null;
          isAvailable?: boolean;
        };

      const existing = await prisma.hotelService.findUnique({
        where: { id },
      });
      if (!existing) return errorResponse("Service not found", 404);

      const validCategories = [
        "FOOD",
        "BEVERAGE",
        "LAUNDRY",
        "SPA",
        "TRANSPORT",
        "OTHER",
      ];
      if (category && !validCategories.includes(category)) {
        return errorResponse(
          `category must be one of: ${validCategories.join(", ")}`,
          422
        );
      }

      const updated = await prisma.hotelService.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(category !== undefined
            ? {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                category: category as any,
              }
            : {}),
          ...(image !== undefined ? { image } : {}),
          ...(isAvailable !== undefined ? { isAvailable } : {}),
        },
      });

      return successResponse(updated, "Service updated");
    } catch (error) {
      console.error("Update service error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
