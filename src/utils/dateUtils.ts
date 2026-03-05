// src/utils/dateUtils.ts
// Centralized date utility to ensure consistent local-timezone date handling.
// IMPORTANT: Never use `new Date().toISOString().split('T')[0]` for "today" —
// that returns UTC date, which diverges from local time after 7 PM EST (midnight UTC).

/**
 * Returns a YYYY-MM-DD string in the user's local timezone.
 * Drop-in replacement for `new Date().toISOString().split('T')[0]`.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a Date to YYYY-MM-DD in local timezone.
 * Use this instead of `someDate.toISOString().split('T')[0]`
 * when the date was constructed from local values (e.g. new Date(year, month, day)).
 */
export function toLocalDateString(date: Date): string {
  return getLocalDateString(date);
}

/**
 * Returns UTC ISO boundaries (start/end) for a given local-timezone date string.
 * Use this when filtering Supabase `created_at` / `updated_at` timestamps,
 * which are stored in UTC.
 *
 * For example, for "2026-03-05" in EST (UTC-5):
 *   start = "2026-03-05T05:00:00.000Z"  (midnight EST in UTC)
 *   end   = "2026-03-06T04:59:59.999Z"  (11:59:59 PM EST in UTC)
 */
export function getUTCBoundariesForLocalDate(dateStr: string): { start: string; end: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Midnight local time on the given date
  const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
  // End of day local time (23:59:59.999)
  const endLocal = new Date(year, month - 1, day, 23, 59, 59, 999);
  return {
    start: startLocal.toISOString(),
    end: endLocal.toISOString(),
  };
}
