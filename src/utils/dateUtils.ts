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
