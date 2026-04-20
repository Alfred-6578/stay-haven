import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { calculateBookingPrice } from "@/lib/bookingUtils";
import { createNotification } from "@/lib/notifications";

/**
 * PATCH /api/admin/extensions/[id]/approve
 * Admin approves a pending extension. Re-checks availability, creates a
 * PendingPayment for the guest to complete, and saves the payment reference
 * on the extension (status stays PENDING until payment clears).
 */
export const PATCH = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const extension = await prisma.stayExtension.findUnique({
        where: { id },
        include: {
          booking: {
            include: {
              room: {
                include: {
                  roomType: {
                    select: { basePrice: true, weekendMultiplier: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!extension) return errorResponse("Extension not found", 404);
      if (extension.status !== "PENDING") {
        return errorResponse(
          `Cannot approve a ${extension.status} extension`,
          422
        );
      }
      if (extension.paymentReference) {
        return errorResponse(
          "This extension is already awaiting payment from the guest",
          422
        );
      }

      // Re-check availability — dates may have been booked since the request
      const conflicting = await prisma.booking.findFirst({
        where: {
          roomId: extension.booking.roomId,
          id: { not: extension.booking.id },
          status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
          checkIn: { lt: extension.newCheckOut },
          checkOut: { gt: extension.originalCheckOut },
        },
        select: { id: true },
      });
      if (conflicting) {
        return errorResponse(
          "The room is no longer available for the requested extension dates",
          409
        );
      }

      // Recalculate total (base + tax) so the guest pays the full amount
      const { totalAmount } = calculateBookingPrice(
        extension.booking.room.roomType,
        extension.originalCheckOut,
        extension.newCheckOut
      );

      const reference = `EXT-${extension.booking.bookingRef}-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        await tx.pendingPayment.create({
          data: {
            reference,
            userId: extension.booking.guestId,
            type: "EXTENSION",
            data: {
              extensionId: extension.id,
              bookingId: extension.booking.id,
            },
            amount: totalAmount,
            status: "pending",
            // 7-day window for the guest to pay before approval expires
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.stayExtension.update({
          where: { id },
          data: { paymentReference: reference },
        });
      });

      await createNotification({
        userId: extension.booking.guestId,
        title: "Extension Approved — Payment Required",
        message: `Your extension is approved. Pay ₦${totalAmount.toLocaleString()} to confirm ${extension.additionalNights} more night${extension.additionalNights === 1 ? "" : "s"}.`,
        type: "EXTENSION_APPROVED",
        bookingId: extension.booking.id,
      });

      return successResponse({
        requiresPayment: true,
        reference,
        amount: totalAmount,
      });
    } catch (error) {
      console.error("Admin approve extension error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
