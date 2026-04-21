import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns";

type Period = "7d" | "30d" | "90d" | "12m";
const VALID_PERIODS: Period[] = ["7d", "30d", "90d", "12m"];

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const periodParam = (searchParams.get("period") || "30d") as Period;

      if (!VALID_PERIODS.includes(periodParam)) {
        return errorResponse(
          `period must be one of: ${VALID_PERIODS.join(", ")}`,
          422
        );
      }

      const now = new Date();

      if (periodParam === "12m") {
        // Monthly buckets
        const start = startOfMonth(subMonths(now, 11));
        const end = endOfMonth(now);

        const payments = await prisma.payment.findMany({
          where: {
            status: "COMPLETED",
            updatedAt: { gte: start, lte: end },
          },
          select: { amount: true, updatedAt: true },
        });

        const months = eachMonthOfInterval({ start, end });
        const data = months.map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          const total = payments.reduce((sum, p) => {
            if (p.updatedAt >= monthStart && p.updatedAt <= monthEnd) {
              return sum + Number(p.amount);
            }
            return sum;
          }, 0);
          return {
            date: format(monthStart, "MMM yyyy"),
            revenue: total,
          };
        });

        return successResponse({ period: periodParam, data });
      }

      // Daily buckets for 7d/30d/90d
      const daysBack = periodParam === "7d" ? 6 : periodParam === "30d" ? 29 : 89;
      const start = startOfDay(subDays(now, daysBack));
      const end = endOfDay(now);

      const payments = await prisma.payment.findMany({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: start, lte: end },
        },
        select: { amount: true, updatedAt: true },
      });

      const days = eachDayOfInterval({ start, end });
      const data = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const total = payments.reduce((sum, p) => {
          if (p.updatedAt >= dayStart && p.updatedAt <= dayEnd) {
            return sum + Number(p.amount);
          }
          return sum;
        }, 0);
        return {
          date: format(day, "MMM dd"),
          revenue: total,
        };
      });

      return successResponse({ period: periodParam, data });
    } catch (error) {
      console.error("Admin revenue stats error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
