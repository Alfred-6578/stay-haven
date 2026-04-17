import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";
import { serviceBookingEmail } from "@/lib/email";

export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { serviceId, bookingId, scheduledAt, notes } =
        (await request.json()) as {
          serviceId?: string;
          bookingId?: string;
          scheduledAt?: string;
          notes?: string;
        };

      if (!serviceId || !bookingId || !scheduledAt) {
        return errorResponse(
          "serviceId, bookingId, and scheduledAt are required",
          422
        );
      }

      // Validate service
      const service = await prisma.hotelService.findUnique({
        where: { id: serviceId },
      });
      if (!service) return errorResponse("Service not found", 404);
      if (!service.isAvailable) {
        return errorResponse("This service is currently unavailable", 422);
      }

      // Validate booking belongs to guest & is active
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          guestId: true,
          bookingRef: true,
          status: true,
          checkIn: true,
          checkOut: true,
        },
      });
      if (!booking) return errorResponse("Booking not found", 404);
      if (booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }
      if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
        return errorResponse(
          "Booking must be CONFIRMED or CHECKED_IN to request services",
          422
        );
      }

      // Validate scheduledAt is in the future & within the stay range
      const scheduled = new Date(scheduledAt);
      if (isNaN(scheduled.getTime())) {
        return errorResponse("Invalid scheduledAt date", 422);
      }
      if (scheduled <= new Date()) {
        return errorResponse(
          "Scheduled time must be in the future",
          422
        );
      }
      if (
        scheduled < new Date(booking.checkIn) ||
        scheduled > new Date(booking.checkOut)
      ) {
        return errorResponse(
          "Scheduled time must be within your check-in and check-out dates",
          422
        );
      }

      const serviceBooking = await prisma.serviceBooking.create({
        data: {
          serviceId,
          bookingId,
          guestId: user.id,
          scheduledAt: scheduled,
          amount: service.price,
          status: "PENDING",
          notes: notes?.trim() || null,
        },
        include: {
          service: {
            select: { name: true, category: true, price: true, image: true },
          },
          booking: {
            select: {
              bookingRef: true,
              room: {
                select: {
                  number: true,
                  roomType: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      const dateStr = scheduled.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const timeStr = scheduled.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      await createNotification({
        userId: user.id,
        title: "Service Requested",
        message: `Your ${service.name} request has been submitted for ${dateStr} at ${timeStr}.`,
        type: "GENERAL",
        bookingId,
      });

      // Fire-and-forget email
      const guest = await prisma.user.findUnique({
        where: { id: user.id },
        select: { firstName: true, email: true },
      });
      if (guest) {
        serviceBookingEmail(
          guest,
          { name: service.name, category: service.category },
          { bookingRef: booking.bookingRef },
          scheduled,
          Number(service.price)
        ).catch((e) =>
          console.error("[services] booking email failed:", e)
        );
      }

      return successResponse(serviceBooking, "Service booking created", 201);
    } catch (error) {
      console.error("Service booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
