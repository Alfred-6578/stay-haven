import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * Initialize Paystack for a multi-room booking group.
 * Tracks the session in PendingPayment (type="BOOKING_GROUP").
 * Accepts `bookingIds` — all must belong to the same user and be PENDING.
 */
export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { bookingIds, pointsUsed } = (await request.json()) as {
        bookingIds?: string[];
        pointsUsed?: number;
      };

      if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
        return errorResponse("bookingIds[] is required", 422);
      }

      const bookings = await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        include: { guest: { select: { email: true } } },
      });
      if (bookings.length !== bookingIds.length) {
        return errorResponse("One or more bookings not found", 404);
      }
      for (const b of bookings) {
        if (b.guestId !== user.id) return errorResponse("Forbidden", 403);
        if (b.status !== "PENDING") {
          return errorResponse(
            `Booking ${b.bookingRef} is not in PENDING state`,
            422
          );
        }
      }

      const groupRef = bookings[0].groupRef;
      // All must share the same groupRef (or all be null for a single booking)
      if (bookings.some((b) => b.groupRef !== groupRef)) {
        return errorResponse("Bookings do not share a group", 422);
      }

      const rawTotal = bookings.reduce(
        (s, b) => s + Number(b.totalAmount),
        0
      );

      // Loyalty discount on the group total
      const pts = Math.max(0, Number(pointsUsed) || 0);
      const discount = pts > 0 ? (pts / 100) * 10 : 0;
      const amount = Math.max(0, rawTotal - discount);
      const amountInKobo = Math.round(amount * 100);

      if (pts > 0) {
        // Check the guest has enough points
        const profile = await prisma.guestProfile.findUnique({
          where: { userId: user.id },
          select: { totalPoints: true },
        });
        if (!profile || profile.totalPoints < pts) {
          return errorResponse("Not enough loyalty points", 422);
        }
        // Distribute points/discount across bookings proportionally
        // (so each booking records its share; one big discount on the first
        // booking would mis-report per-booking totals elsewhere).
        const totalForSplit = rawTotal || 1;
        let allocatedPts = 0;
        let allocatedDisc = 0;
        for (let i = 0; i < bookings.length; i++) {
          const b = bookings[i];
          const isLast = i === bookings.length - 1;
          const share = Number(b.totalAmount) / totalForSplit;
          const bPts = isLast
            ? pts - allocatedPts
            : Math.floor(pts * share);
          const bDisc = isLast
            ? Math.round((discount - allocatedDisc) * 100) / 100
            : Math.round((discount * share) * 100) / 100;
          allocatedPts += bPts;
          allocatedDisc += bDisc;
          await prisma.booking.update({
            where: { id: b.id },
            data: { pointsUsed: bPts, discountAmount: bDisc },
          });
        }
      }

      // Reuse an in-flight pending session for the same group if one exists
      const existing = await prisma.pendingPayment.findFirst({
        where: {
          userId: user.id,
          type: "BOOKING_GROUP",
          status: "pending",
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      let reference: string | undefined;
      if (existing) {
        const data = existing.data as { bookingIds?: string[] } | null;
        if (
          data &&
          Array.isArray(data.bookingIds) &&
          data.bookingIds.length === bookingIds.length &&
          data.bookingIds.every((id) => bookingIds.includes(id))
        ) {
          reference = existing.reference;
        }
      }

      if (!reference) {
        const suffix = groupRef
          ? groupRef
          : bookings[0].bookingRef;
        reference = `BKG-${suffix}-${Date.now()}`;
        await prisma.pendingPayment.create({
          data: {
            reference,
            userId: user.id,
            type: "BOOKING_GROUP",
            data: { bookingIds, groupRef },
            amount,
            status: "pending",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        });
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
            email: bookings[0].guest.email,
            amount: amountInKobo,
            reference,
            callback_url: `${process.env.CLIENT_URL}/book/confirmed?${groupRef ? `groupRef=${groupRef}` : `bookingId=${bookings[0].id}`}`,
            metadata: {
              type: "BOOKING_GROUP",
              groupRef,
              bookingCount: bookings.length,
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
        amount,
        groupRef,
        bookingCount: bookings.length,
      });
    } catch (error) {
      console.error("Group payment init error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
