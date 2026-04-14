export const LOYALTY_TIERS = {
  BRONZE: { name: "Bronze", threshold: 0 },
  SILVER: { name: "Silver", threshold: 5000 },
  GOLD: { name: "Gold", threshold: 15000 },
  PLATINUM: { name: "Platinum", threshold: 50000 },
} as const;

type TierKey = keyof typeof LOYALTY_TIERS;

const TIER_ORDER: TierKey[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

export function getNextTier(currentTier: string, lifetimePoints: number) {
  const currentIdx = TIER_ORDER.indexOf(currentTier as TierKey);
  if (currentIdx === -1 || currentIdx >= TIER_ORDER.length - 1) {
    return { name: "Platinum", pointsNeeded: 0, pointsAway: 0, isMax: true };
  }

  const nextKey = TIER_ORDER[currentIdx + 1];
  const nextTier = LOYALTY_TIERS[nextKey];
  const currentThreshold = LOYALTY_TIERS[TIER_ORDER[currentIdx]].threshold;

  return {
    name: nextTier.name,
    pointsNeeded: nextTier.threshold,
    pointsAway: Math.max(0, nextTier.threshold - lifetimePoints),
    isMax: false,
  };
}

export function getTierProgress(currentTier: string, lifetimePoints: number): number {
  const currentIdx = TIER_ORDER.indexOf(currentTier as TierKey);
  if (currentIdx >= TIER_ORDER.length - 1) return 100;

  const currentThreshold = LOYALTY_TIERS[TIER_ORDER[currentIdx]].threshold;
  const nextThreshold = LOYALTY_TIERS[TIER_ORDER[currentIdx + 1]].threshold;
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 100;

  return Math.min(((lifetimePoints - currentThreshold) / range) * 100, 100);
}
