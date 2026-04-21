import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification, notifyRoles } from "@/lib/notifications";
import { extensionConfirmedEmail } from "@/lib/email";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * GET /api/payments/extension/status/[reference]
 * Polls Paystack for extension payment status. On success, extends the booking.
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
      if (pending.type !== "EXTENSION") {
        return errorResponse("Not an extension payment", 422);
      }

      if (pending.status === "completed") {
        return successResponse({ status: "COMPLETED" });
      }
      if (pending.status === "failed") {
        return successResponse({ status: "FAILED" });
      }

      const data = pending.data as {
        extensionId: string;
        bookingId: string;
      };

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

      // ── Payment succeeded — apply extension ──
      const extension = await prisma.stayExtension.findUnique({
        where: { id: data.extensionId },
      });
      if (!extension) {
        return errorResponse("Extension record not found", 404);
      }

      await prisma.$transaction(async (tx) => {
        await tx.stayExtension.update({
          where: { id: extension.id },
          data: { status: "APPROVED", paymentReference: reference },
        });

        await tx.booking.update({
          where: { id: data.bookingId },
          data: {
            checkOut: extension.newCheckOut,
            totalNights: { increment: extension.additionalNights },
            totalAmount: { increment: extension.additionalAmount },
          },
        });

        await tx.pendingPayment.update({
          where: { id: pending.id },
          data: { status: "completed" },
        });
      });

      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        select: {
          bookingRef: true,
          guest: { select: { firstName: true, lastName: true, email: true } },
          room: { select: { number: true } },
        },
      });

      const newCheckoutStr = extension.newCheckOut.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      await createNotification({
        userId: user.id,
        title: "Stay Extended",
        message: `Your stay has been extended to ${newCheckoutStr}!`,
        type: "EXTENSION_APPROVED",
        bookingId: data.bookingId,
      });

      if (booking) {
        const guestName = `${booking.guest.firstName} ${booking.guest.lastName}`;
        const roomSuffix = booking.room ? ` (Room ${booking.room.number})` : "";
        try {
          await notifyRoles(["STAFF", "MANAGER", "ADMIN"], {
            title: "Stay Extended",
            message: `${guestName} extended ${booking.bookingRef}${roomSuffix} to ${newCheckoutStr} — paid ₦${Number(pending.amount).toLocaleString()}.`,
            type: "EXTENSION_APPROVED",
            bookingId: data.bookingId,
          });
        } catch (e) {
          console.error("notifyRoles (extension paid) failed:", e);
        }

        extensionConfirmedEmail(
          { firstName: booking.guest.firstName, email: booking.guest.email },
          { bookingRef: booking.bookingRef },
          extension.newCheckOut
        ).catch((e) =>
          console.error("[extension] confirmation email failed:", e)
        );
      }

      return successResponse({ status: "COMPLETED" });
    } catch (error) {
      console.error("Extension payment status error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
