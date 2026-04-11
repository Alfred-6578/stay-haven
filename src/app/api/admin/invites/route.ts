import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async () => {
    try {
      const invites = await prisma.inviteRecord.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          invitedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      const now = new Date();
      const enriched = invites.map((invite) => {
        let status: "used" | "expired" | "pending";
        if (invite.usedAt) status = "used";
        else if (invite.expiresAt < now) status = "expired";
        else status = "pending";
        return { ...invite, status };
      });

      return successResponse(enriched);
    } catch (error) {
      console.error("List invites error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
