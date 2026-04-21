/** Each point is worth ₦1 when redeemed */
export const POINTS_VALUE_NGN = 1;

export const LOYALTY_TIERS = {
  BRONZE: { name: "Bronze", threshold: 0 },
  SILVER: { name: "Silver", threshold: 500 },
  GOLD: { name: "Gold", threshold: 1500 },
  PLATINUM: { name: "Platinum", threshold: 5000 },
} as const;

export type TierKey = keyof typeof LOYALTY_TIERS;

const TIER_ORDER: TierKey[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

/**
 * Points earned per ₦1,000 spent, by tier.
 * At POINTS_VALUE_NGN = ₦1 per point:
 *   BRONZE:   30 pts/₦1,000 = ₦30 back = 3.0% return
 *   SILVER:   35 pts/₦1,000 = ₦35 back = 3.5% return
 *   GOLD:     40 pts/₦1,000 = ₦40 back = 4.0% return
 *   PLATINUM: 50 pts/₦1,000 = ₦50 back = 5.0% return
 */
export const TIER_EARN_RATES: Record<TierKey, number> = {
  BRONZE: 30,
  SILVER: 35,
  GOLD: 40,
  PLATINUM: 50,
};

/**
 * Calculate points earned on a given naira amount for a given tier.
 * Floors the result so partial points don't accumulate.
 */
export function calculatePointsEarned(
  amountNgn: number,
  tier: TierKey | string
): number {
  const rate = TIER_EARN_RATES[tier as TierKey] || TIER_EARN_RATES.BRONZE;
  return Math.floor((amountNgn / 1000) * rate);
}

/**
 * Determine the tier for a given lifetime-points total.
 * Walks the tiers top-down so the highest qualifying tier wins.
 */
export function calculateTier(lifetimePoints: number): TierKey {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (lifetimePoints >= LOYALTY_TIERS[TIER_ORDER[i]].threshold) {
      return TIER_ORDER[i];
    }
  }
  return "BRONZE";
}

/**
 * Return the next tier above the current one.
 */
export function getNextTier(
  currentTier: string,
  lifetimePoints: number
): {
  name: string;
  pointsNeeded: number;
  pointsAway: number;
  isMax: boolean;
} {
  const currentIdx = TIER_ORDER.indexOf(currentTier as TierKey);
  if (currentIdx === -1 || currentIdx >= TIER_ORDER.length - 1) {
    return { name: "Platinum", pointsNeeded: 0, pointsAway: 0, isMax: true };
  }

  const nextKey = TIER_ORDER[currentIdx + 1];
  const nextTier = LOYALTY_TIERS[nextKey];

  return {
    name: nextTier.name,
    pointsNeeded: nextTier.threshold,
    pointsAway: Math.max(0, nextTier.threshold - lifetimePoints),
    isMax: false,
  };
}

/**
 * Calculate progress toward the next tier as a percentage + metadata.
 */
export function calculateTierProgress(lifetimePoints: number): {
  percentage: number;
  pointsAway: number;
  nextTier: string | null;
} {
  const tier = calculateTier(lifetimePoints);
  const currentIdx = TIER_ORDER.indexOf(tier);
  if (currentIdx >= TIER_ORDER.length - 1) {
    return { percentage: 100, pointsAway: 0, nextTier: null };
  }

  const currentThreshold = LOYALTY_TIERS[TIER_ORDER[currentIdx]].threshold;
  const nextKey = TIER_ORDER[currentIdx + 1];
  const nextThreshold = LOYALTY_TIERS[nextKey].threshold;
  const range = nextThreshold - currentThreshold;
  if (range <= 0) {
    return { percentage: 100, pointsAway: 0, nextTier: null };
  }

  return {
    percentage: Math.min(
      ((lifetimePoints - currentThreshold) / range) * 100,
      100
    ),
    pointsAway: Math.max(0, nextThreshold - lifetimePoints),
    nextTier: LOYALTY_TIERS[nextKey].name,
  };
}

/**
 * Legacy alias — some callers use `getTierProgress` returning just a number.
 */
export function getTierProgress(
  currentTier: string,
  lifetimePoints: number
): number {
  const currentIdx = TIER_ORDER.indexOf(currentTier as TierKey);
  if (currentIdx >= TIER_ORDER.length - 1) return 100;

  const currentThreshold = LOYALTY_TIERS[TIER_ORDER[currentIdx]].threshold;
  const nextThreshold = LOYALTY_TIERS[TIER_ORDER[currentIdx + 1]].threshold;
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 100;

  return Math.min(((lifetimePoints - currentThreshold) / range) * 100, 100);
}
