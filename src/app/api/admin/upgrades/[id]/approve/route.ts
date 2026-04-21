import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

/**
 * Finds an available room of the requested type for the booking dates,
 * excluding the current booking from conflict checks (since it will be moved).
 */
async function findAvailableRoom(
  requestedTypeId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId: string
) {
  const rooms = await prisma.room.findMany({
    where: {
      roomTypeId: requestedTypeId,
      isActive: true,
      status: { in: ["AVAILABLE", "OCCUPIED"] },
    },
    select: { id: true, number: true, floor: true, status: true },
  });

  for (const room of rooms) {
    const conflicting = await prisma.booking.findFirst({
      where: {
        roomId: room.id,
        id: { not: excludeBookingId },
        status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
        NOT: [
          { checkOut: { lte: checkIn } },
          { checkIn: { gte: checkOut } },
        ],
      },
      select: { id: true },
    });
    if (!conflicting) return room;
  }
  return null;
}

/**
 * Applies the room swap: updates booking.roomId, adjusts room statuses,
 * marks the upgrade as APPROVED.
 */
async function applyUpgrade(
  upgradeId: string,
  bookingId: string,
  oldRoomId: string,
  newRoom: { id: string; number: string; status: string },
  guestId: string,
  processedById: string,
  requestedTypeName: string,
  bookingStatus: string
) {
  await prisma.$transaction(async (tx) => {
    // Move booking to new room
    await tx.booking.update({
      where: { id: bookingId },
      data: { roomId: newRoom.id },
    });

    // If guest is currently checked in, swap room statuses
    if (bookingStatus === "CHECKED_IN") {
      await tx.room.update({
        where: { id: oldRoomId },
        data: { status: "AVAILABLE" },
      });
      await tx.room.update({
        where: { id: newRoom.id },
        data: { status: "OCCUPIED" },
      });
    }

    // Mark upgrade approved
    await tx.roomUpgradeRequest.update({
      where: { id: upgradeId },
      data: {
        status: "APPROVED",
        processedById,
        processedAt: new Date(),
      },
    });
  });

  await createNotification({
    userId: guestId,
    title: "Upgrade Confirmed",
    message: `Your upgrade to ${requestedTypeName} is confirmed! You've been moved to Room ${newRoom.number}.`,
    type: "UPGRADE_APPROVED",
    bookingId,
  });
}

export const PATCH = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

      const upgrade = await prisma.roomUpgradeRequest.findUnique({
        where: { id },
        include: {
          booking: {
            select: {
              id: true,
              guestId: true,
              bookingRef: true,
              roomId: true,
              checkIn: true,
              checkOut: true,
              status: true,
              guest: { select: { email: true } },
            },
          },
          requestedType: {
            select: { id: true, name: true },
          },
        },
      });

      if (!upgrade) return errorResponse("Upgrade request not found", 404);
      if (upgrade.status !== "PENDING") {
        return errorResponse(
          `Cannot approve a ${upgrade.status} request`,
          422
        );
      }

      const checkIn = new Date(upgrade.booking.checkIn);
      const checkOut = new Date(upgrade.booking.checkOut);

      const newRoom = await findAvailableRoom(
        upgrade.requestedType.id,
        checkIn,
        checkOut,
        upgrade.booking.id
      );

      if (!newRoom) {
        return errorResponse(
          "No rooms of the requested type are available for these dates",
          409
        );
      }

      const priceDiff = Number(upgrade.priceDifference);

      // ── Free upgrade (complimentary or same price) ──
      if (priceDiff <= 0) {
        await applyUpgrade(
          id,
          upgrade.booking.id,
          upgrade.booking.roomId,
          newRoom,
          upgrade.booking.guestId,
          user.id,
          upgrade.requestedType.name,
          upgrade.booking.status
        );

        return successResponse(
          { requiresPayment: false, newRoom: newRoom.number },
          "Upgrade applied"
        );
      }

      // ── Paid upgrade — mark as "awaiting payment" and notify the guest ──
      // We don't call Paystack here; we defer that to when the guest clicks
      // "Pay Now" on their booking page. That way the authorization URL
      // belongs to the guest's session and won't expire before they see it.
      const reference = `UPG-${upgrade.booking.bookingRef}-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        await tx.pendingPayment.create({
          data: {
            reference,
            userId: upgrade.booking.guestId,
            type: "UPGRADE",
            data: {
              upgradeRequestId: id,
              bookingId: upgrade.booking.id,
              oldRoomId: upgrade.booking.roomId,
              newRoomId: newRoom.id,
              newRoomNumber: newRoom.number,
              newRoomStatus: newRoom.status,
              requestedTypeName: upgrade.requestedType.name,
              bookingStatus: upgrade.booking.status,
            },
            amount: priceDiff,
            status: "pending",
            // 7-day window for the guest to pay before the approval expires
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        // Mark the upgrade as processed + record reference, but keep PENDING
        // status since final approval depends on payment.
        await tx.roomUpgradeRequest.update({
          where: { id },
          data: {
            processedById: user.id,
            processedAt: new Date(),
            paymentReference: reference,
          },
        });
      });

      await createNotification({
        userId: upgrade.booking.guestId,
        title: "Upgrade Approved — Payment Required",
        message: `Your upgrade to ${upgrade.requestedType.name} is approved. Pay ₦${priceDiff.toLocaleString()} to confirm your new room.`,
        type: "UPGRADE_APPROVED",
        bookingId: upgrade.booking.id,
      });

      return successResponse({
        requiresPayment: true,
        reference,
        amount: priceDiff,
        newRoom: newRoom.number,
      });
    } catch (error) {
      console.error("Upgrade approve error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
