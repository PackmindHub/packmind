import { validatePlaybook, ValidationResult } from './playbookValidator';

describe('playbookValidator', () => {
  describe('when playbook is valid', () => {
    let result: ValidationResult;

    beforeEach(() => {
      const playbook = {
        name: 'Test',
        description: 'Test description',
        scope: 'Test scope',
        rules: [{ content: 'Use something' }],
      };

      result = validatePlaybook(playbook);
    });

    it('returns isValid as true', () => {
      expect(result.isValid).toBe(true);
    });

    it('returns data', () => {
      expect(result.data).toBeDefined();
    });
  });

  describe('when playbook is invalid', () => {
    let result: ValidationResult;

    beforeEach(() => {
      const invalidPlaybook = {
        name: 'Test',
        rules: [],
      };

      result = validatePlaybook(invalidPlaybook);
    });

    it('returns isValid as false', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });

    it('returns at least one error', () => {
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });
});
