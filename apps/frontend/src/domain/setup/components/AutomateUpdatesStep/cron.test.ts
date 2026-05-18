import { isValidCron } from './cron';

describe('isValidCron', () => {
  const VALID_EXPRESSIONS = [
    '0 2 * * 1-5',
    '* * * * *',
    '*/5 * * * *',
    '0 0 1 1 *',
    '0 9,17 * * *',
    '15 10 1-15 * *',
    '0 0 * * 0-6',
    '0 */2 * * *',
    '0 8-18/2 * * 1-5',
  ];

  const INVALID_EXPRESSIONS = [
    '',
    '   ',
    '0 2 * *',
    '0 2 * * * *',
    'abc def * * *',
    '60-* * * * *',
    '*//5 * * * *',
    '0 2 -- * *',
    '0 2 * * ,',
  ];

  it.each(VALID_EXPRESSIONS)('accepts a valid cron: %s', (cron) => {
    expect(isValidCron(cron)).toBe(true);
  });

  it.each(INVALID_EXPRESSIONS)('rejects an invalid cron: %s', (cron) => {
    expect(isValidCron(cron)).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidCron('  0 2 * * 1-5  ')).toBe(true);
  });

  it('tolerates multiple internal whitespaces between fields', () => {
    expect(isValidCron('0   2   *   *   1-5')).toBe(true);
  });
});
