import { isTrialEmail } from './email.utils';

describe('isTrialEmail', () => {
  describe('when email starts with trial-', () => {
    it('returns true for standard trial email format', () => {
      const email = 'trial-550e8400-e29b-41d4-a716-446655440000@packmind.trial';

      const result = isTrialEmail(email);

      expect(result).toBe(true);
    });

    it('returns true for trial email with different domain', () => {
      const email = 'trial-123@example.com';

      const result = isTrialEmail(email);

      expect(result).toBe(true);
    });
  });

  describe('when email does not start with trial-', () => {
    it('returns false for regular email', () => {
      const email = 'user@example.com';

      const result = isTrialEmail(email);

      expect(result).toBe(false);
    });

    it('returns false for email containing trial but not as prefix', () => {
      const email = 'user-trial@example.com';

      const result = isTrialEmail(email);

      expect(result).toBe(false);
    });

    it('returns false for empty string', () => {
      const email = '';

      const result = isTrialEmail(email);

      expect(result).toBe(false);
    });
  });
});
