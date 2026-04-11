import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const PATCH = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const user = await prisma.user.findFirst({
        where: { id, isDeleted: false },
        include: { staffProfile: true },
      });

      if (!user || !user.staffProfile) {
        return errorResponse("Staff profile not found", 404);
      }

      const updated = await prisma.staffProfile.update({
        where: { id: user.staffProfile.id },
        data: { isOnDuty: !user.staffProfile.isOnDuty },
        select: { isOnDuty: true },
      });

      return successResponse(
        { isOnDuty: updated.isOnDuty },
        `Staff is now ${updated.isOnDuty ? "on" : "off"} duty`
      );
    } catch (error) {
      console.error("Toggle duty error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
