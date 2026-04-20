import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { successResponse, errorResponse } from "@/lib/response";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "auth:login", 10, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      return errorResponse(message, 422);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { email, isActive: true, isDeleted: false },
      include: { guestProfile: true, staffProfile: true },
    });

    if (!user || !user.passwordHash) {
      return errorResponse("Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return errorResponse("Invalid email or password", 401);
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const profile =
      user.role === "GUEST" ? user.guestProfile : user.staffProfile;

    const { passwordHash: _, ...userWithoutPassword } = user;

    const response = successResponse(
      { user: userWithoutPassword, profile },
      "Login successful"
    );

    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
