import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const PATCH = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return errorResponse("No file provided", 422);
      }

      const { url } = await uploadToCloudinary(file, "stayhaven/avatars");

      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: url },
      });

      return successResponse({ avatarUrl: url }, "Avatar updated");
    } catch (error) {
      console.error("Avatar upload error:", error);
      return errorResponse("Upload failed", 500);
    }
  }
);
