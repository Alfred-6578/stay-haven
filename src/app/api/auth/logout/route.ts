import { clearAuthCookies } from "@/lib/cookies";
import { successResponse } from "@/lib/response";

export async function POST() {
  const response = successResponse(null, "Logged out successfully");
  clearAuthCookies(response);
  return response;
}
