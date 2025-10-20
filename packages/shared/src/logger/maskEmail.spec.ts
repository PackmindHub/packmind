import { maskEmail } from './maskEmail';

describe('maskEmail', () => {
  it('masks email with ***@***', () => {
    const result = maskEmail('john.doe@example.com');

    expect(result).toBe('***@***');
  });

  it('masks short email with ***@***', () => {
    const result = maskEmail('test@e');

    expect(result).toBe('***@***');
  });

  it('masks very short email with ***@***', () => {
    const result = maskEmail('abc');

    expect(result).toBe('***@***');
  });

  it('returns ***@*** for null email', () => {
    const result = maskEmail(null);

    expect(result).toBe('***@***');
  });

  it('returns ***@*** for undefined email', () => {
    const result = maskEmail(undefined);

    expect(result).toBe('***@***');
  });

  it('returns ***@*** for empty string', () => {
    const result = maskEmail('');

    expect(result).toBe('***@***');
  });

  it('masks all email addresses consistently', () => {
    expect(maskEmail('alice@example.com')).toBe('***@***');
    expect(maskEmail('bob.smith@company.com')).toBe('***@***');
    expect(maskEmail('user123@test.org')).toBe('***@***');
  });
});
