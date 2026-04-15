import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "CHECK_IN_REMINDER"
  | "OVERSTAY_WARNING"
  | "PAYMENT_SUCCESS"
  | "ROOM_SERVICE_UPDATE"
  | "POINTS_EARNED"
  | "UPGRADE_APPROVED"
  | "EXTENSION_APPROVED"
  | "GENERAL";

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Prisma.InputJsonValue;
  bookingId?: string;
}

/**
 * Create a notification row. Supabase Realtime will broadcast this
 * insert to any client subscribed to `notifications:{userId}`.
 *
 * This helper is the single entry point for in-app notifications —
 * all route handlers should import it instead of calling
 * `prisma.notification.create()` directly, so that future cross-cutting
 * concerns (analytics, push, etc.) only need to be added in one place.
 */
export async function createNotification(input: CreateNotificationInput) {
  const { userId, title, message, type, metadata, bookingId } = input;
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      isRead: false,
      ...(metadata !== undefined ? { metadata } : {}),
      ...(bookingId ? { bookingId } : {}),
    },
  });
}
