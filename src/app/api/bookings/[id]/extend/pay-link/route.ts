import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * POST /api/bookings/[id]/extend/pay-link
 * Called by the guest when they click "Pay Now" on an admin-approved extension.
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

      const extension = await prisma.stayExtension.findUnique({
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
        },
      });

      if (!extension) return errorResponse("Extension not found", 404);
      if (extension.booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }
      if (extension.status !== "PENDING" || !extension.paymentReference) {
        return errorResponse(
          "No payment is pending for this extension",
          422
        );
      }

      const pending = await prisma.pendingPayment.findUnique({
        where: { reference: extension.paymentReference },
      });
      if (!pending || pending.status !== "pending") {
        return errorResponse(
          "This extension payment is no longer valid. Please re-request the extension.",
          422
        );
      }
      if (new Date(pending.expiresAt) < new Date()) {
        return errorResponse(
          "This extension approval has expired. Please request a new extension.",
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
            email: extension.booking.guest.email,
            amount: Math.round(Number(pending.amount) * 100),
            reference: pending.reference,
            callback_url: `${process.env.CLIENT_URL}/payment/close`,
            metadata: {
              type: "EXTENSION",
              extensionId: extension.id,
              bookingRef: extension.booking.bookingRef,
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
      });
    } catch (error) {
      console.error("Extension pay-link error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
