import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification, notifyRoles } from "@/lib/notifications";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * GET /api/payments/upgrade/status/[reference]
 * Polls Paystack for upgrade payment status. On success, applies the room swap.
 */
export const GET = withAuth<{ reference: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ reference: string }>,
    user: AuthUser
  ) => {
    try {
      const { reference } = await ctx.params;

      const pending = await prisma.pendingPayment.findUnique({
        where: { reference },
      });
      if (!pending) return errorResponse("Payment not found", 404);
      if (pending.userId !== user.id) return errorResponse("Forbidden", 403);
      if (pending.type !== "UPGRADE") {
        return errorResponse("Not an upgrade payment", 422);
      }

      if (pending.status === "completed") {
        return successResponse({ status: "COMPLETED" });
      }
      if (pending.status === "failed") {
        return successResponse({ status: "FAILED" });
      }

      const data = pending.data as {
        upgradeRequestId: string;
        bookingId: string;
        oldRoomId: string;
        newRoomId: string;
        newRoomNumber: string;
        newRoomStatus: string;
        requestedTypeName: string;
        bookingStatus: string;
      };

      // Verify with Paystack
      const paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const paystackData = await paystackRes.json();

      if (!paystackData.status || paystackData.data?.status !== "success") {
        if (paystackData.data?.status === "failed") {
          await prisma.pendingPayment.update({
            where: { id: pending.id },
            data: { status: "failed" },
          });
          return successResponse({ status: "FAILED" });
        }
        return successResponse({ status: "PENDING" });
      }

      // ── Payment succeeded — apply upgrade ──
      await prisma.$transaction(async (tx) => {
        // Move booking to new room
        await tx.booking.update({
          where: { id: data.bookingId },
          data: { roomId: data.newRoomId },
        });

        // Swap room statuses if guest is checked in
        if (data.bookingStatus === "CHECKED_IN") {
          await tx.room.update({
            where: { id: data.oldRoomId },
            data: { status: "AVAILABLE" },
          });
          await tx.room.update({
            where: { id: data.newRoomId },
            data: { status: "OCCUPIED" },
          });
        }

        // Mark upgrade approved
        await tx.roomUpgradeRequest.update({
          where: { id: data.upgradeRequestId },
          data: {
            status: "APPROVED",
            paymentReference: reference,
            processedAt: new Date(),
          },
        });

        // Mark pending payment complete
        await tx.pendingPayment.update({
          where: { id: pending.id },
          data: { status: "completed" },
        });
      });

      await createNotification({
        userId: user.id,
        title: "Upgrade Confirmed",
        message: `Your upgrade to ${data.requestedTypeName} is confirmed! You've been moved to Room ${data.newRoomNumber}.`,
        type: "UPGRADE_APPROVED",
        bookingId: data.bookingId,
      });

      // Notify staff + admin that the upgrade payment went through, so they
      // can prep the new room and follow up with housekeeping on the old one.
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        select: {
          bookingRef: true,
          guest: { select: { firstName: true, lastName: true } },
        },
      });
      const guestName = booking
        ? `${booking.guest.firstName} ${booking.guest.lastName}`
        : "Guest";
      const bookingRef = booking?.bookingRef || "";
      notifyRoles(["STAFF", "MANAGER", "ADMIN"], {
        title: "Upgrade Paid",
        message: `${guestName} paid ₦${Number(pending.amount).toLocaleString()} for upgrade to ${data.requestedTypeName} — now in Room ${data.newRoomNumber} (${bookingRef}).`,
        type: "UPGRADE_APPROVED",
        bookingId: data.bookingId,
      }).catch((e) => console.error("notifyRoles (upgrade paid) failed:", e));

      return successResponse({ status: "COMPLETED" });
    } catch (error) {
      console.error("Upgrade payment status error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
