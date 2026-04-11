import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { inviteEmail } from "@/lib/email";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

export const POST = withAuth(
  async (request: NextRequest, _ctx, admin) => {
    try {
      const { email, role, department } = await request.json();

      if (!email || !role || !department) {
        return errorResponse("Email, role, and department are required", 422);
      }

      if (!["STAFF", "MANAGER"].includes(role)) {
        return errorResponse("Invalid role", 422);
      }

      if (!["FRONT_DESK", "HOUSEKEEPING", "MANAGEMENT"].includes(department)) {
        return errorResponse("Invalid department", 422);
      }

      const existing = await prisma.user.findFirst({
        where: { email, isDeleted: false },
      });
      if (existing) {
        return errorResponse("A user with that email already exists", 409);
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.user.create({
        data: {
          email,
          firstName: "",
          lastName: "",
          role,
          isActive: false,
          inviteToken: rawToken,
          inviteExpiresAt: expiresAt,
        },
      });

      const invite = await prisma.inviteRecord.create({
        data: {
          email,
          token: rawToken,
          role,
          department,
          invitedById: admin.id,
          expiresAt,
        },
      });

      const fullAdmin = await prisma.user.findUnique({
        where: { id: admin.id },
        select: { firstName: true, lastName: true },
      });
      const adminName = fullAdmin
        ? `${fullAdmin.firstName} ${fullAdmin.lastName}`.trim()
        : "StayHaven Admin";

      const inviteLink = `${CLIENT_URL}/invite?token=${rawToken}`;
      inviteEmail(email, inviteLink, role, adminName);

      return successResponse({ invite }, "Invite sent", 201);
    } catch (error) {
      console.error("Invite staff error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
