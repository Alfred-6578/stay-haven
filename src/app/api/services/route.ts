import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

// GET — public: available services grouped by category (?all=true for admin: includes disabled)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    const services = await prisma.hotelService.findMany({
      where: showAll ? {} : { isAvailable: true },
      orderBy: { name: "asc" },
    });

    // Group by category
    const grouped: Record<string, typeof services> = {};
    for (const s of services) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }

    return successResponse({ services, grouped });
  } catch (error) {
    console.error("List services error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST — admin: create a new service
export const POST = withAuth(
  async (request: NextRequest, _ctx, _user: AuthUser) => {
    try {
      const { name, description, price, category, image } =
        (await request.json()) as {
          name?: string;
          description?: string;
          price?: number;
          category?: string;
          image?: string;
        };

      if (!name || !description || price === undefined || !category) {
        return errorResponse(
          "name, description, price, and category are required",
          422
        );
      }

      const validCategories = [
        "FOOD",
        "BEVERAGE",
        "LAUNDRY",
        "SPA",
        "TRANSPORT",
        "OTHER",
      ];
      if (!validCategories.includes(category)) {
        return errorResponse(
          `category must be one of: ${validCategories.join(", ")}`,
          422
        );
      }

      const service = await prisma.hotelService.create({
        data: {
          name,
          description,
          price,
          category: category as (typeof validCategories)[number] extends string
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              any
            : never,
          image: image || null,
        },
      });

      return successResponse(service, "Service created", 201);
    } catch (error) {
      console.error("Create service error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
