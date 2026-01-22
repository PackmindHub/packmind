import { validatePlaybook } from './playbookValidator';

describe('playbookValidator', () => {
  it('returns valid result for correct playbook', () => {
    const playbook = {
      name: 'Test',
      description: 'Test description',
      scope: 'Test scope',
      rules: [{ content: 'Use something' }],
    };

    const result = validatePlaybook(playbook);
    expect(result.isValid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('returns error messages for invalid playbook', () => {
    const invalidPlaybook = {
      name: 'Test',
      rules: [],
    };

    const result = validatePlaybook(invalidPlaybook);
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
