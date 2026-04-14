import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const [todayArrivalsRaw, todayDeparturesRaw, overdueRaw, cleaningRaw] =
        await Promise.all([
          prisma.booking.findMany({
            where: {
              status: "CONFIRMED",
              checkIn: { gte: startOfToday, lte: endOfToday },
            },
            include: {
              guest: { select: { firstName: true, lastName: true } },
              room: {
                select: {
                  number: true,
                  roomType: { select: { name: true } },
                },
              },
            },
            orderBy: { checkIn: "asc" },
          }),
          prisma.booking.findMany({
            where: {
              status: "CHECKED_IN",
              checkOut: { gte: startOfToday, lte: endOfToday },
            },
            include: {
              guest: { select: { firstName: true, lastName: true } },
              room: { select: { number: true } },
            },
            orderBy: { checkOut: "asc" },
          }),
          prisma.booking.findMany({
            where: {
              status: "CHECKED_IN",
              checkOut: { lt: now },
            },
            include: {
              guest: { select: { firstName: true, lastName: true } },
              room: { select: { number: true } },
            },
            orderBy: { checkOut: "asc" },
          }),
          prisma.room.findMany({
            where: { status: "CLEANING", isActive: true },
            select: { id: true, number: true, floor: true, notes: true },
            orderBy: [{ floor: "asc" }, { number: "asc" }],
          }),
        ]);

      const todayArrivals = todayArrivalsRaw.map((b) => ({
        id: b.id,
        bookingRef: b.bookingRef,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        totalNights: b.totalNights,
        specialRequests: b.specialRequests,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
        roomType: b.room.roomType.name,
      }));

      const todayDepartures = todayDeparturesRaw.map((b) => ({
        id: b.id,
        bookingRef: b.bookingRef,
        checkOut: b.checkOut,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
      }));

      const overdueCheckouts = overdueRaw.map((b) => ({
        id: b.id,
        bookingRef: b.bookingRef,
        checkOut: b.checkOut,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
        hoursOverdue: Math.floor(
          (now.getTime() - b.checkOut.getTime()) / (1000 * 60 * 60)
        ),
      }));

      return successResponse({
        todayArrivals,
        todayDepartures,
        overdueCheckouts,
        pendingCleaning: cleaningRaw,
        counts: {
          arrivals: todayArrivals.length,
          departures: todayDepartures.length,
          overdue: overdueCheckouts.length,
          cleaning: cleaningRaw.length,
        },
      });
    } catch (error) {
      console.error("Staff dashboard error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
