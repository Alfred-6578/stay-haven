import { NextRequest } from "next/server";
import { getAccessToken } from "@/lib/cookies";
import { verifyAccessToken, TokenPayload } from "@/lib/auth";
import { errorResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

type AuthenticatedHandler = (
  req: NextRequest,
  context: { params?: Record<string, string> },
  user: AuthUser
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler, roles?: string[]) {
  return async (
    req: NextRequest,
    context: { params?: Record<string, string> }
  ) => {
    const token = getAccessToken(req);

    if (!token) {
      return errorResponse("Unauthorized", 401);
    }

    let decoded: TokenPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return errorResponse("Unauthorized", 401);
    }

    if (roles && !roles.includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }

    return handler(req, context, user);
  };
}
