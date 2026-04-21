import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { successResponse, errorResponse } from "@/lib/response";

export async function POST(request: NextRequest) {
  try {
    const { token, firstName, lastName, phone, password } =
      await request.json();

    if (!token || !firstName || !lastName || !password) {
      return errorResponse("All fields are required", 422);
    }

    const user = await prisma.user.findFirst({
      where: { inviteToken: token },
    });

    if (!user) {
      return errorResponse("Invalid invite token", 400);
    }

    if (user.isActive) {
      return errorResponse("Invitation already used", 400);
    }

    if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      return errorResponse("Invitation has expired", 400);
    }

    const inviteRecord = await prisma.inviteRecord.findFirst({
      where: { token },
    });

    const department = inviteRecord?.department || "FRONT_DESK";

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate staff number: STAFF-YYYY-XXXX
    const year = new Date().getFullYear();
    const staffCount = await prisma.staffProfile.count();
    const staffNumber = `STAFF-${year}-${String(staffCount + 1).padStart(4, "0")}`;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        isActive: true,
        inviteToken: null,
        inviteExpiresAt: null,
        staffProfile: {
          create: {
            staffNumber,
            department,
            hiredAt: new Date(),
          },
        },
      },
      include: { staffProfile: true },
    });

    if (inviteRecord) {
      await prisma.inviteRecord.update({
        where: { id: inviteRecord.id },
        data: { usedAt: new Date() },
      });
    }

    const tokenPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    const response = successResponse(
      { user: userWithoutPassword, profile: updatedUser.staffProfile },
      "Invitation accepted successfully",
      201
    );

    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    console.error("Invite accept error:", error);
    return errorResponse("Internal server error", 500);
  }
}
