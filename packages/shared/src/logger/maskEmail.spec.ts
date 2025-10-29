import { maskEmail } from './maskEmail';

describe('maskEmail', () => {
  it('masks long email showing first 6 characters followed by asterisks', () => {
    const result = maskEmail('john.doe@example.com');

    expect(result).toBe('john.d**************');
  });

  it('masks email showing first 6 characters for medium length email', () => {
    const result = maskEmail('test@example');

    expect(result).toBe('test@e******');
  });

  it('returns original email for emails with 6 characters or less', () => {
    const result = maskEmail('test@e');

    expect(result).toBe('test@e');
  });

  it('returns original email for very short strings', () => {
    const result = maskEmail('abc');

    expect(result).toBe('abc');
  });

  it('returns empty string for null email', () => {
    const result = maskEmail(null);

    expect(result).toBe('');
  });

  it('returns empty string for undefined email', () => {
    const result = maskEmail(undefined);

    expect(result).toBe('');
  });

  it('returns empty string for empty string', () => {
    const result = maskEmail('');

    expect(result).toBe('');
  });

  it('masks all long email addresses consistently with first 6 characters visible', () => {
    expect(maskEmail('alice@example.com')).toBe('alice@***********');
    expect(maskEmail('bob.smith@company.com')).toBe('bob.sm***************');
    expect(maskEmail('user123@test.org')).toBe('user12**********');
  });
});
