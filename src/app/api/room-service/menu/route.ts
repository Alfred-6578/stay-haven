import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const CATEGORIES = [
  "FOOD",
  "BEVERAGE",
  "LAUNDRY",
  "SPA",
  "TRANSPORT",
  "OTHER",
] as const;

type Category = (typeof CATEGORIES)[number];

// GET — public, grouped by category
export async function GET() {
  try {
    const items = await prisma.serviceMenuItem.findMany({
      where: { isAvailable: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        image: true,
        prepMinutes: true,
      },
    });

    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }

    return successResponse(grouped);
  } catch (error) {
    console.error("Menu GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST — admin only
const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  price: z.number().positive(),
  category: z.enum(CATEGORIES),
  image: z.string().url().optional().or(z.literal("")),
  prepMinutes: z.number().int().min(1).max(240).optional(),
});

export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i: { message: string }) => i.message).join(", ");
        return errorResponse(msg, 422);
      }

      const { image, ...rest } = parsed.data;
      const item = await prisma.serviceMenuItem.create({
        data: {
          ...rest,
          category: rest.category as Category,
          image: image || null,
        },
      });

      return successResponse(item, "Menu item created", 201);
    } catch (error) {
      console.error("Menu POST error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
