import {
  validateCommandPlaybook,
  CommandValidationResult,
} from './commandPlaybookValidator';

describe('commandPlaybookValidator', () => {
  describe('when command playbook is valid', () => {
    let result: CommandValidationResult;

    beforeEach(() => {
      const playbook = {
        name: 'Setup React Component',
        summary: 'Creates a new React component with tests',
        whenToUse: ['When creating a new UI component'],
        contextValidationCheckpoints: ['Is this a frontend project?'],
        steps: [
          {
            name: 'Create component file',
            description: 'Create the component TSX file',
          },
        ],
      };

      result = validateCommandPlaybook(playbook);
    });

    it('returns isValid as true', () => {
      expect(result.isValid).toBe(true);
    });

    it('returns data', () => {
      expect(result.data).toBeDefined();
    });
  });

  describe('when command playbook has optional codeSnippet', () => {
    let result: CommandValidationResult;

    beforeEach(() => {
      const playbook = {
        name: 'Setup React Component',
        summary: 'Creates a new React component with tests',
        whenToUse: ['When creating a new UI component'],
        contextValidationCheckpoints: ['Is this a frontend project?'],
        steps: [
          {
            name: 'Create component file',
            description: 'Create the component TSX file',
            codeSnippet: 'export const MyComponent = () => <div>Hello</div>;',
          },
        ],
      };

      result = validateCommandPlaybook(playbook);
    });

    it('returns isValid as true', () => {
      expect(result.isValid).toBe(true);
    });

    it('includes the codeSnippet in data', () => {
      expect(result.data?.steps[0].codeSnippet).toBe(
        'export const MyComponent = () => <div>Hello</div>;',
      );
    });
  });

  describe('when command playbook is missing required fields', () => {
    let result: CommandValidationResult;

    beforeEach(() => {
      const invalidPlaybook = {
        name: 'Test',
        summary: 'Test summary',
        // missing whenToUse, contextValidationCheckpoints, and steps
      };

      result = validateCommandPlaybook(invalidPlaybook);
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

  describe('when command playbook has empty arrays', () => {
    let result: CommandValidationResult;

    beforeEach(() => {
      const invalidPlaybook = {
        name: 'Test',
        summary: 'Test summary',
        whenToUse: [],
        contextValidationCheckpoints: [],
        steps: [],
      };

      result = validateCommandPlaybook(invalidPlaybook);
    });

    it('returns isValid as false', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors for empty arrays', () => {
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('when command playbook step is missing required fields', () => {
    let result: CommandValidationResult;

    beforeEach(() => {
      const invalidPlaybook = {
        name: 'Test',
        summary: 'Test summary',
        whenToUse: ['When testing'],
        contextValidationCheckpoints: ['Is valid?'],
        steps: [
          {
            name: 'Step name',
            // missing description
          },
        ],
      };

      result = validateCommandPlaybook(invalidPlaybook);
    });

    it('returns isValid as false', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });
  });
});
