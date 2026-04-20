import { prisma } from "@/lib/prisma";
import { TAX_RATE } from "@/lib/pricing";

interface RoomTypeForPricing {
  basePrice: number | string | { toNumber?: () => number };
  weekendMultiplier: number | string | { toNumber?: () => number };
}

interface NightBreakdown {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  price: number;
}

interface BookingPriceResult {
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalNights: number;
  nightBreakdown: NightBreakdown[];
}

function toNum(val: number | string | { toNumber?: () => number }): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val);
  if (val && typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
}

export function calculateBookingPrice(
  roomType: RoomTypeForPricing,
  checkIn: Date,
  checkOut: Date
): BookingPriceResult {
  const basePrice = toNum(roomType.basePrice);
  const weekendMultiplier = toNum(roomType.weekendMultiplier);

  const nightBreakdown: NightBreakdown[] = [];
  const current = new Date(checkIn);

  while (current < checkOut) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const price = isWeekend ? basePrice * weekendMultiplier : basePrice;

    nightBreakdown.push({
      date: current.toISOString().split("T")[0],
      dayOfWeek,
      isWeekend,
      price: Math.round(price * 100) / 100,
    });

    current.setDate(current.getDate() + 1);
  }

  const baseAmount =
    Math.round(nightBreakdown.reduce((sum, n) => sum + n.price, 0) * 100) /
    100;
  const taxAmount = Math.round(baseAmount * TAX_RATE * 100) / 100;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

  return {
    baseAmount,
    taxAmount,
    totalAmount,
    totalNights: nightBreakdown.length,
    nightBreakdown,
  };
}

export async function generateBookingRef(): Promise<string> {
  const count = await prisma.booking.count();
  const year = new Date().getFullYear();
  return `BK-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function checkRoomAvailability(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflicting = await prisma.booking.findFirst({
    where: {
      roomId,
      status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
      NOT: [
        { checkOut: { lte: checkIn } },
        { checkIn: { gte: checkOut } },
        ...(excludeBookingId ? [{ id: excludeBookingId }] : []),
      ],
    },
    select: { id: true },
  });

  return !conflicting;
}
