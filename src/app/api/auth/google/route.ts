import { NextRequest } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { successResponse, errorResponse } from "@/lib/response";
import { welcomeEmail } from "@/lib/email";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface GoogleUserInfo {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string | null;
}

async function verifyCredential(credential: string): Promise<GoogleUserInfo> {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new Error("Invalid token");
  return {
    googleId: payload.sub!,
    email: payload.email,
    firstName: payload.given_name || "Guest",
    lastName: payload.family_name || "",
    picture: payload.picture || null,
  };
}

async function verifyAccessToken(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Invalid access token");
  const data = await res.json();
  if (!data.email) throw new Error("No email in Google profile");
  return {
    googleId: data.sub,
    email: data.email,
    firstName: data.given_name || "Guest",
    lastName: data.family_name || "",
    picture: data.picture || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, accessToken: googleAccessToken } = body;

    if (!credential && !googleAccessToken) {
      return errorResponse("Google credential or access token is required", 400);
    }

    // Verify with Google
    let googleUser: GoogleUserInfo;
    try {
      if (credential) {
        googleUser = await verifyCredential(credential);
      } else {
        googleUser = await verifyAccessToken(googleAccessToken);
      }
    } catch {
      return errorResponse("Invalid Google token", 401);
    }

    const { googleId, email, firstName, lastName, picture } = googleUser;

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
      include: { guestProfile: true },
    });

    let isNewUser = false;

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatar: user.avatar || picture,
          },
          include: { guestProfile: true },
        });
      }
    } else {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          firstName,
          lastName,
          avatar: picture,
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
    }

    if (!user.isActive || user.isDeleted) {
      return errorResponse("Account is deactivated", 403);
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const jwtAccess = signAccessToken(tokenPayload);
    const jwtRefresh = signRefreshToken(tokenPayload);

    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          guestProfile: user.guestProfile,
        },
      },
      isNewUser ? "Account created successfully" : "Login successful",
      isNewUser ? 201 : 200
    );

    setAuthCookies(response, jwtAccess, jwtRefresh);

    if (isNewUser) {
      welcomeEmail({ firstName: user.firstName, email: user.email });
    }

    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return errorResponse("Google authentication failed", 500);
  }
}
