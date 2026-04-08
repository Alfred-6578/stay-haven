import { NextResponse } from "next/server";

export function successResponse(
  data: unknown,
  message = "Success",
  status = 200
): NextResponse {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}
