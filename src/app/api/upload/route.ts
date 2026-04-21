import { NextRequest } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return errorResponse("No file provided", 422);
      }

      const { searchParams } = new URL(request.url);
      const folder = searchParams.get("folder") || "general";

      const result = await uploadToCloudinary(file, `stayhaven/${folder}`);

      return successResponse(result, "File uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      return errorResponse("Upload failed", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
