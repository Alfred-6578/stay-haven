import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { calculateTier, calculatePointsEarned } from "@/lib/loyalty";
import { createNotification } from "@/lib/notifications";
import { bookingConfirmationEmail } from "@/lib/email";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// calculateTier and calculatePointsEarned imported from @/lib/loyalty

export const GET = withAuth<{ reference: string }>(
  async (
    _req: NextRequest,
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
      if (pending.type !== "BOOKING_GROUP") {
        return errorResponse("Not a booking-group payment", 422);
      }

      if (pending.status === "completed") {
        return successResponse({ status: "COMPLETED" });
      }
      if (pending.status === "failed") {
        return successResponse({ status: "FAILED" });
      }

      const data = pending.data as {
        bookingIds: string[];
        groupRef: string | null;
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

      // ── Settlement ──
      const bookings = await prisma.booking.findMany({
        where: { id: { in: data.bookingIds } },
        include: {
          guest: { select: { firstName: true, email: true } },
          room: { include: { roomType: { select: { name: true } } } },
        },
      });
      const groupTotal = bookings.reduce(
        (s, b) => s + Number(b.totalAmount),
        0
      );
      const totalDiscount = bookings.reduce(
        (s, b) => s + Number(b.discountAmount),
        0
      );
      const totalPointsUsed = bookings.reduce(
        (s, b) => s + (b.pointsUsed || 0),
        0
      );
      const netPaid = Math.max(0, groupTotal - totalDiscount);
      // Earn points at the guest's current tier rate (3–5% effective return)
      const preProfile = await prisma.guestProfile.findUnique({
        where: { userId: user.id },
        select: { loyaltyTier: true },
      });
      const pointsEarned = calculatePointsEarned(
        netPaid,
        preProfile?.loyaltyTier || "BRONZE"
      );

      const firstBookingId = bookings[0]?.id;

      await prisma.$transaction(async (tx) => {
        // Mark all bookings CONFIRMED and create per-booking Payment rows
        for (const b of bookings) {
          const bookingAmount = Math.max(
            0,
            Number(b.totalAmount) - Number(b.discountAmount)
          );
          const perBookingRef = `PAY-${b.bookingRef}-${Date.now()}-${crypto
            .randomBytes(2)
            .toString("hex")
            .toUpperCase()}`;

          await tx.booking.update({
            where: { id: b.id },
            data: { status: "CONFIRMED" },
          });

          // Upsert a Payment record for this booking
          await tx.payment.upsert({
            where: { bookingId: b.id },
            update: {
              amount: bookingAmount,
              status: "COMPLETED",
              paystackData: {
                ...(paystackData.data ?? {}),
                groupRef: data.groupRef,
                groupReference: reference,
              },
            },
            create: {
              bookingId: b.id,
              reference: perBookingRef,
              amount: bookingAmount,
              currency: "NGN",
              type: "BOOKING",
              status: "COMPLETED",
              paystackData: {
                ...(paystackData.data ?? {}),
                groupRef: data.groupRef,
                groupReference: reference,
              },
            },
          });
        }

        // Mark pending payment complete
        await tx.pendingPayment.update({
          where: { id: pending.id },
          data: { status: "completed" },
        });

        // Loyalty — deduct used points once, then award based on net
        const profile = await tx.guestProfile.findUnique({
          where: { userId: user.id },
        });
        if (profile) {
          let newTotal = profile.totalPoints;
          let newLifetime = profile.lifetimePoints;

          if (totalPointsUsed > 0) {
            newTotal = Math.max(0, newTotal - totalPointsUsed);
            await tx.loyaltyTransaction.create({
              data: {
                guestId: user.id,
                points: -totalPointsUsed,
                type: "REDEEMED",
                description: data.groupRef
                  ? `Redeemed for group booking ${data.groupRef}`
                  : `Redeemed for booking ${bookings[0].bookingRef}`,
                bookingId: firstBookingId,
              },
            });
          }

          if (pointsEarned > 0) {
            newTotal += pointsEarned;
            newLifetime += pointsEarned;
            await tx.loyaltyTransaction.create({
              data: {
                guestId: user.id,
                points: pointsEarned,
                type: "EARNED",
                description: data.groupRef
                  ? `Earned from group booking ${data.groupRef}`
                  : `Earned from booking ${bookings[0].bookingRef}`,
                bookingId: firstBookingId,
              },
            });
          }

          await tx.guestProfile.update({
            where: { userId: user.id },
            data: {
              totalPoints: newTotal,
              lifetimePoints: newLifetime,
              totalSpend: { increment: netPaid },
              loyaltyTier: calculateTier(newLifetime),
            },
          });
        }
      });

      // Notifications + email (outside transaction)
      const isGroup = !!data.groupRef && bookings.length > 1;
      await createNotification({
        userId: user.id,
        title: "Booking Confirmed",
        message: isGroup
          ? `Your group booking (${bookings.length} rooms, ref ${data.groupRef}) has been confirmed.`
          : `Your booking ${bookings[0].bookingRef} has been confirmed.`,
        type: "BOOKING_CONFIRMED",
        bookingId: firstBookingId,
      });

      if (bookings[0]?.guest) {
        bookingConfirmationEmail(
          {
            firstName: bookings[0].guest.firstName,
            email: bookings[0].guest.email,
          },
          {
            bookingRef: isGroup ? data.groupRef! : bookings[0].bookingRef,
            checkIn: bookings[0].checkIn,
            checkOut: bookings[0].checkOut,
            totalAmount: netPaid,
          },
          isGroup
            ? `${bookings.length} rooms — ${bookings.map((b) => b.room.roomType.name).join(", ")}`
            : bookings[0].room.roomType.name
        ).catch(() => {});
      }

      return successResponse({ status: "COMPLETED" });
    } catch (error) {
      console.error("Group payment status error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
