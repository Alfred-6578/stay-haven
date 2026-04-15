import { prisma } from "@/lib/prisma";

/**
 * Room service follows a "charge to room" model: guests order freely during
 * their stay and settle the accumulated bill at check-out. A charge is
 * "unsettled" if the order was delivered (goods received) but not yet paid for.
 */

export interface RoomServiceBalance {
  unsettledTotal: number;
  settledTotal: number;
  unsettledOrders: Array<{
    id: string;
    totalAmount: number;
    createdAt: Date;
    deliveredAt: Date | null;
    status: string;
  }>;
}

export async function getRoomServiceBalance(
  bookingId: string
): Promise<RoomServiceBalance> {
  const orders = await prisma.roomServiceOrder.findMany({
    where: {
      bookingId,
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      isSettled: true,
      createdAt: true,
      deliveredAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let unsettledTotal = 0;
  let settledTotal = 0;
  const unsettledOrders: RoomServiceBalance["unsettledOrders"] = [];

  for (const o of orders) {
    const amount = Number(o.totalAmount);
    if (o.isSettled) {
      settledTotal += amount;
    } else {
      unsettledTotal += amount;
      unsettledOrders.push({
        id: o.id,
        totalAmount: amount,
        createdAt: o.createdAt,
        deliveredAt: o.deliveredAt,
        status: o.status,
      });
    }
  }

  return { unsettledTotal, settledTotal, unsettledOrders };
}
