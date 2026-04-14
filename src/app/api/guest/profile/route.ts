import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { getNextTier } from "@/lib/loyalty";

// GET — own profile
export const GET = withAuth(async (_req: NextRequest, _ctx, user: AuthUser) => {
  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
        guestProfile: true,
      },
    });

    if (!fullUser) return errorResponse("User not found", 404);

    const gp = fullUser.guestProfile;
    const loyaltySummary = gp
      ? {
          tier: gp.loyaltyTier,
          totalPoints: gp.totalPoints,
          nextTier: getNextTier(gp.loyaltyTier, gp.lifetimePoints),
        }
      : null;

    return successResponse({
      user: {
        id: fullUser.id,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        email: fullUser.email,
        phone: fullUser.phone,
        avatar: fullUser.avatar,
        role: fullUser.role,
        createdAt: fullUser.createdAt,
      },
      guestProfile: gp,
      loyaltySummary,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// PATCH — update profile
export const PATCH = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const body = await request.json();
      const {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        nationality,
        address,
        idType,
        idNumber,
        preferences,
      } = body;

      // Update user fields
      const userUpdate: Record<string, unknown> = {};
      if (firstName !== undefined) userUpdate.firstName = firstName;
      if (lastName !== undefined) userUpdate.lastName = lastName;
      if (phone !== undefined) userUpdate.phone = phone;

      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({ where: { id: user.id }, data: userUpdate });
      }

      // Update guest profile fields
      const guestProfile = await prisma.guestProfile.findUnique({
        where: { userId: user.id },
      });

      if (guestProfile) {
        const profileUpdate: Record<string, unknown> = {};
        if (dateOfBirth !== undefined)
          profileUpdate.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (nationality !== undefined) profileUpdate.nationality = nationality;
        if (address !== undefined) profileUpdate.address = address;
        if (idType !== undefined) profileUpdate.idType = idType;
        if (idNumber !== undefined) profileUpdate.idNumber = idNumber;

        // JSON merge for preferences
        if (preferences !== undefined && typeof preferences === "object") {
          const existing =
            typeof guestProfile.preferences === "object" &&
            guestProfile.preferences !== null
              ? guestProfile.preferences
              : {};
          profileUpdate.preferences = { ...existing, ...preferences };
        }

        if (Object.keys(profileUpdate).length > 0) {
          await prisma.guestProfile.update({
            where: { id: guestProfile.id },
            data: profileUpdate,
          });
        }
      }

      // Return updated
      const updated = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          guestProfile: true,
        },
      });

      return successResponse(updated, "Profile updated");
    } catch (error) {
      console.error("Update profile error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
