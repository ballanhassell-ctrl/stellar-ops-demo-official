/**
 * Sanitize patient names for HIPAA-mindful display.
 * Converts full names to "F. LastName" format.
 *
 * Handles:
 *   "Smith, John"       → "J. Smith"
 *   "John Smith"        → "J. Smith"
 *   "John Michael Smith" → "J. Smith"
 *   "Smith, John Michael" → "J. Smith"
 *   "John"              → "John"  (single name kept as-is, likely already a last name)
 *   ""                  → ""
 */
export function sanitizePatientName(name: string): string {
  if (!name || !name.trim()) return '';

  const trimmed = name.trim();

  // Check for "Last, First" format (comma-separated)
  if (trimmed.includes(',')) {
    const [last, firstPart] = trimmed.split(',', 2);
    const lastName = last.trim();
    const firstName = firstPart?.trim().split(/\s+/)[0]; // Take first word after comma
    if (firstName && lastName) {
      return `${firstName[0].toUpperCase()}. ${lastName}`;
    }
    // If only last name portion exists
    return lastName;
  }

  // "First Last" or "First Middle Last" format (space-separated)
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    // Single name — keep as-is (likely a last name or mononym)
    return parts[0];
  }

  // First name initial + last name
  const firstInitial = parts[0][0].toUpperCase();
  const lastName = parts[parts.length - 1];

  return `${firstInitial}. ${lastName}`;
}
