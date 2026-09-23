/**
 * Axios lowercases response header names, but the response may be an
 * `AxiosHeaders` instance, a plain object from a test double, or absent
 * altogether — and a header a provider sends can still be a blank or
 * non-numeric string. So: match the name case-insensitively, and only
 * believe a value that parses as a finite number.
 *
 * Shared by the GitHub and GitLab throttle detectors: the two read different
 * header names, but neither can trust the shape of what it is reading.
 */
export function headerAsNumber(
  headers: unknown,
  name: string,
): number | undefined {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const match = Object.entries(headers as Record<string, unknown>).find(
    ([key]) => key.toLowerCase() === name,
  );
  if (!match) {
    return undefined;
  }

  const raw = match[1];
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return undefined;
  }
  if (typeof raw === 'string' && raw.trim() === '') {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}
