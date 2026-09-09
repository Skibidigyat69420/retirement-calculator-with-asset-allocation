/** Small date helpers (no external dep). */

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** ISO date string for a person aged `age` at roughly the middle of the year. */
export function dobForAge(age: number, now = new Date()): string {
  const year = now.getFullYear() - age;
  return `${year}-06-15`;
}
