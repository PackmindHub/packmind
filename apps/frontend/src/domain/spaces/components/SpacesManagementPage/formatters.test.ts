import { EMPTY_PLACEHOLDER, formatCount, formatCreatedAt } from './formatters';

describe('formatCount', () => {
  it('returns the placeholder for null', () => {
    expect(formatCount(null)).toBe(EMPTY_PLACEHOLDER);
  });

  it('returns "0" for zero rather than the placeholder', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('formats positive integers as their string representation', () => {
    expect(formatCount(42)).toBe('42');
  });

  it('formats negative integers as their string representation', () => {
    expect(formatCount(-3)).toBe('-3');
  });

  it('returns the placeholder for NaN', () => {
    expect(formatCount(Number.NaN)).toBe(EMPTY_PLACEHOLDER);
  });

  it('returns the placeholder for Infinity', () => {
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe(EMPTY_PLACEHOLDER);
    expect(formatCount(Number.NEGATIVE_INFINITY)).toBe(EMPTY_PLACEHOLDER);
  });
});

describe('formatCreatedAt', () => {
  it('returns the placeholder for null', () => {
    expect(formatCreatedAt(null)).toBe(EMPTY_PLACEHOLDER);
  });

  it('formats a valid ISO date in en-GB short form', () => {
    expect(formatCreatedAt('2025-02-03')).toBe('03 Feb 2025');
  });

  it('formats a full ISO datetime down to the day', () => {
    expect(formatCreatedAt('2025-02-03T23:59:59.000Z')).toBe('03 Feb 2025');
  });

  it('returns the placeholder for an unparseable string', () => {
    expect(formatCreatedAt('not-a-date')).toBe(EMPTY_PLACEHOLDER);
  });

  it('returns the placeholder for an empty string', () => {
    expect(formatCreatedAt('')).toBe(EMPTY_PLACEHOLDER);
  });
});
