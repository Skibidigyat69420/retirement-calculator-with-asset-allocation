/**
 * Row → API mappers. drizzle numeric columns arrive as strings; the API
 * surface exposes them as numbers (null stays null).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function num(v: string | null): number | null {
  return v === null ? null : Number(v);
}

const NUMERIC_FIELDS: Record<string, Set<string>> = {
  assets: new Set(['currentValue', 'costBasis', 'expectedReturn']),
  liabilities: new Set(['outstandingAmount', 'interestRate', 'monthlyPayment']),
  cashflowRules: new Set(['annualAmount', 'monthlyAmount', 'annualGrowthRate']),
  goals: new Set(['targetAmount', 'yearsToGoal', 'inflationRate']),
  riskAssessments: new Set(['rawScore']),
};

/** Convert known numeric-string fields of a row to numbers, in place-safe. */
export function mapRow(table: keyof typeof NUMERIC_FIELDS, row: Record<string, any>): any {
  const fields = NUMERIC_FIELDS[table];
  const out: Record<string, any> = { ...row };
  for (const f of fields) {
    if (typeof out[f] === 'string') out[f] = Number(out[f]);
  }
  return out;
}

export function mapRows(table: keyof typeof NUMERIC_FIELDS, rows: Record<string, any>[]): any[] {
  return rows.map((r) => mapRow(table, r));
}
