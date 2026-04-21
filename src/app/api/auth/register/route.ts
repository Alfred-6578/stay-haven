import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { successResponse, errorResponse } from "@/lib/response";
import { welcomeEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "auth:register", 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      return errorResponse(message, 422);
    }

    const { firstName, lastName, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: "GUEST",
        guestProfile: {
          create: {
            loyaltyTier: "BRONZE",
            totalPoints: 0,
            lifetimePoints: 0,
            totalStays: 0,
            totalSpend: 0,
          },
        },
      },
      include: { guestProfile: true },
    });

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        profile: user.guestProfile,
      },
      "Registration successful",
      201
    );

    setAuthCookies(response, accessToken, refreshToken);

    welcomeEmail({ firstName: user.firstName, email: user.email });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return errorResponse("Internal server error", 500);
  }
}
