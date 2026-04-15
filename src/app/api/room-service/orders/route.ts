import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

const ORDER_STATUSES = [
  "PENDING",
  "PREPARING",
  "DELIVERED",
  "CANCELLED",
] as const;

interface OrderItemLine {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// ─── POST ────────────────────────────────────────────

const createOrderSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1, "Order must contain at least one item"),
  instructions: z.string().max(500).optional(),
});

export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const body = await request.json();
      const parsed = createOrderSchema.safeParse(body);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i: { message: string }) => i.message)
          .join(", ");
        return errorResponse(msg, 422);
      }

      const { bookingId, items, instructions } = parsed.data;

      // Validate booking belongs to guest AND is CHECKED_IN
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          guestId: true,
          status: true,
          room: { select: { number: true } },
        },
      });

      if (!booking) return errorResponse("Booking not found", 404);
      if (booking.guestId !== user.id) {
        return errorResponse(
          "You can only order to your own active stay",
          403
        );
      }
      if (booking.status !== "CHECKED_IN") {
        return errorResponse(
          "Room service is only available for checked-in guests",
          422
        );
      }

      // Fetch all menu items
      const itemIds = items.map((i) => i.itemId);
      const menuItems = await prisma.serviceMenuItem.findMany({
        where: { id: { in: itemIds } },
      });

      if (menuItems.length !== itemIds.length) {
        return errorResponse("One or more items do not exist", 422);
      }
      const unavailable = menuItems.filter((m) => !m.isAvailable);
      if (unavailable.length > 0) {
        return errorResponse(
          `Unavailable: ${unavailable.map((u) => u.name).join(", ")}`,
          422
        );
      }

      // Calculate totals + snapshot item lines
      const itemMap = new Map(menuItems.map((m) => [m.id, m]));
      const lines: OrderItemLine[] = items.map((line) => {
        const m = itemMap.get(line.itemId)!;
        const price = Number(m.price);
        return {
          itemId: m.id,
          name: m.name,
          price,
          quantity: line.quantity,
          subtotal: price * line.quantity,
        };
      });

      const totalAmount = lines.reduce((sum, l) => sum + l.subtotal, 0);
      const longestPrep = Math.max(...menuItems.map((m) => m.prepMinutes));
      const estimatedAt = new Date(
        Date.now() + (longestPrep + 15) * 60 * 1000
      );

      const order = await prisma.roomServiceOrder.create({
        data: {
          bookingId: booking.id,
          guestId: user.id,
          items: lines as unknown as Prisma.InputJsonValue,
          totalAmount,
          status: "PENDING",
          instructions: instructions || null,
          estimatedAt,
        },
      });

      // Notification
      const etaFormatted = estimatedAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      await createNotification({
        userId: user.id,
        title: "Order Received",
        message: `Your order is confirmed. Estimated delivery: ${etaFormatted}.`,
        type: "ROOM_SERVICE_UPDATE",
        bookingId: booking.id,
      });

      return successResponse(
        {
          ...order,
          items: lines,
          roomNumber: booking.room.number,
        },
        "Order placed",
        201
      );
    } catch (error) {
      console.error("Order POST error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);

// ─── GET ─────────────────────────────────────────────

export const GET = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const statusParam = searchParams.get("status");
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
      );

      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);

      const where: Prisma.RoomServiceOrderWhereInput = {};
      if (!isStaff) where.guestId = user.id;
      if (statusParam && ORDER_STATUSES.includes(statusParam as typeof ORDER_STATUSES[number])) {
        where.status = statusParam as (typeof ORDER_STATUSES)[number];
      }

      const [total, orders] = await Promise.all([
        prisma.roomServiceOrder.count({ where }),
        prisma.roomServiceOrder.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            booking: {
              select: { bookingRef: true, room: { select: { number: true } } },
            },
            guest: isStaff
              ? { select: { firstName: true, lastName: true, email: true } }
              : undefined,
          },
        }),
      ]);

      const shaped = orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        items: o.items as unknown as OrderItemLine[],
        instructions: o.instructions,
        estimatedAt: o.estimatedAt,
        deliveredAt: o.deliveredAt,
        createdAt: o.createdAt,
        bookingRef: o.booking.bookingRef,
        roomNumber: o.booking.room.number,
        ...(isStaff && o.guest
          ? {
              guestName: `${o.guest.firstName} ${o.guest.lastName}`,
              guestEmail: o.guest.email,
            }
          : {}),
      }));

      return successResponse({
        orders: shaped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Orders GET error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
