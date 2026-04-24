import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * POST /api/bookings/[id]/upgrade/pay-link
 * Called by the guest when they click "Pay Now" on an admin-approved upgrade.
 * Initializes Paystack against the existing PendingPayment reference and
 * returns the authorization URL for the popup.
 */
export const POST = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

      const upgrade = await prisma.roomUpgradeRequest.findUnique({
        where: { bookingId: id },
        include: {
          booking: {
            select: {
              id: true,
              guestId: true,
              bookingRef: true,
              guest: { select: { email: true } },
            },
          },
          requestedType: { select: { name: true } },
        },
      });

      if (!upgrade) return errorResponse("Upgrade request not found", 404);
      if (upgrade.booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }
      if (upgrade.status !== "PENDING" || !upgrade.paymentReference) {
        return errorResponse("No payment is pending for this upgrade", 422);
      }

      // Find the linked PendingPayment (the admin created it when approving)
      const pending = await prisma.pendingPayment.findUnique({
        where: { reference: upgrade.paymentReference },
      });
      if (!pending || pending.status !== "pending") {
        return errorResponse(
          "This upgrade payment is no longer valid. Please re-request the upgrade.",
          422
        );
      }
      if (new Date(pending.expiresAt) < new Date()) {
        return errorResponse(
          "This upgrade approval has expired. Please request a new upgrade.",
          422
        );
      }

      const paystackRes = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: upgrade.booking.guest.email,
            amount: Math.round(Number(pending.amount) * 100),
            reference: pending.reference,
            callback_url: `${process.env.CLIENT_URL}/payment/close`,
            metadata: {
              type: "UPGRADE",
              upgradeRequestId: upgrade.id,
              bookingRef: upgrade.booking.bookingRef,
            },
          }),
        }
      );

      const paystackData = await paystackRes.json();
      if (!paystackData.status) {
        return errorResponse(
          paystackData.message || "Failed to initialize payment",
          500
        );
      }

      return successResponse({
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        amount: Number(pending.amount),
        requestedType: upgrade.requestedType.name,
      });
    } catch (error) {
      console.error("Upgrade pay-link error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
