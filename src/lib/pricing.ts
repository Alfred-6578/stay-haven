/**
 * Shared pricing constants. Kept in its own client-safe file (no Prisma
 * imports) so both server routes and React components can use the same
 * values — changing the tax rate in one place updates the whole app.
 */

/** Consumption tax applied on top of room base + weekend-adjusted totals. */
export const TAX_RATE = 0.1;

/** Display label for price breakdowns — derived from TAX_RATE. */
export const TAX_LABEL = `Tax (${Math.round(TAX_RATE * 100)}%)`;
