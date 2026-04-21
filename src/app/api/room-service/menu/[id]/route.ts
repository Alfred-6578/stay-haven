import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const CATEGORIES = [
  "FOOD",
  "BEVERAGE",
  "LAUNDRY",
  "SPA",
  "TRANSPORT",
  "OTHER",
] as const;

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  price: z.number().positive().optional(),
  category: z.enum(CATEGORIES).optional(),
  image: z.string().url().optional().nullable().or(z.literal("")),
  prepMinutes: z.number().int().min(1).max(240).optional(),
  isAvailable: z.boolean().optional(),
});

export const PATCH = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const body = await request.json();
      const parsed = patchSchema.safeParse(body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i: { message: string }) => i.message).join(", ");
        return errorResponse(msg, 422);
      }

      const existing = await prisma.serviceMenuItem.findUnique({ where: { id } });
      if (!existing) return errorResponse("Menu item not found", 404);

      const data = { ...parsed.data };
      if (data.image === "") data.image = null;

      const updated = await prisma.serviceMenuItem.update({
        where: { id },
        data,
      });

      return successResponse(updated, "Menu item updated");
    } catch (error) {
      console.error("Menu PATCH error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
