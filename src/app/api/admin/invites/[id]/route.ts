import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const DELETE = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const invite = await prisma.inviteRecord.findUnique({ where: { id } });
      if (!invite) {
        return errorResponse("Invite not found", 404);
      }

      const linkedUser = await prisma.user.findFirst({
        where: { inviteToken: invite.token, isActive: false },
      });

      await prisma.inviteRecord.delete({ where: { id } });

      if (linkedUser) {
        await prisma.user.update({
          where: { id: linkedUser.id },
          data: { inviteToken: null, inviteExpiresAt: null },
        });
      }

      return successResponse(null, "Invite revoked");
    } catch (error) {
      console.error("Delete invite error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
