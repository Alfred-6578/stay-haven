import { NextRequest } from "next/server";
import { differenceInHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { overstayWarningEmail } from "@/lib/email";

export const POST = withAuth(
  async (_request: NextRequest) => {
    try {
      const now = new Date();

      const overstays = await prisma.booking.findMany({
        where: {
          status: "CHECKED_IN",
          checkOut: { lt: now },
        },
        select: {
          id: true,
          bookingRef: true,
          checkOut: true,
          guestId: true,
          guest: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      const details: Array<{
        bookingRef: string;
        guestName: string;
        hoursOverdue: number;
      }> = [];

      for (const b of overstays) {
        const checkOutFormatted = b.checkOut.toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        try {
          await prisma.notification.create({
            data: {
              userId: b.guestId,
              title: "Overstay Notice",
              message: `Your checkout was scheduled for ${checkOutFormatted}. Please contact the front desk.`,
              type: "OVERSTAY_WARNING",
              bookingId: b.id,
            },
          });
        } catch (err) {
          console.error(`Notification failed for ${b.bookingRef}:`, err);
          continue;
        }

        // Fire-and-forget email; don't block the batch on SMTP latency
        overstayWarningEmail(
          { firstName: b.guest.firstName, email: b.guest.email },
          { bookingRef: b.bookingRef, checkOut: b.checkOut }
        ).catch((err) =>
          console.error(`Overstay email failed for ${b.bookingRef}:`, err)
        );

        details.push({
          bookingRef: b.bookingRef,
          guestName: `${b.guest.firstName} ${b.guest.lastName}`,
          hoursOverdue: differenceInHours(now, b.checkOut),
        });
      }

      return successResponse({
        notified: details.length,
        details,
      }, `Notified ${details.length} overstayed guest(s)`);
    } catch (error) {
      console.error("Overstay notify-all error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
