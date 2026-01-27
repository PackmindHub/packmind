import {
  commandPlaybookDTOSchema,
  commandStepSchema,
} from './CommandPlaybookDTO';

describe('CommandPlaybookDTO', () => {
  const validPlaybook = {
    name: 'Add React Component',
    summary: 'Creates a new React component with tests and styling',
    whenToUse: [
      'Creating a new UI component',
      'Adding reusable component to design system',
    ],
    contextValidationCheckpoints: [
      'Is the component name specified?',
      'Should it include tests?',
    ],
    steps: [
      {
        name: 'Create component file',
        description:
          'Create the component TypeScript file with proper structure',
        codeSnippet: 'export const MyComponent = () => <div>Hello</div>',
      },
      {
        name: 'Add unit tests',
        description: 'Create test file with basic rendering test',
      },
    ],
  };

  describe('commandStepSchema', () => {
    it('validates a step with all fields', () => {
      const step = {
        name: 'Setup Dependencies',
        description: 'Install required npm packages',
        codeSnippet: 'npm install react',
      };

      const result = commandStepSchema.safeParse(step);

      expect(result.success).toBe(true);
    });

    it('validates a step without optional codeSnippet', () => {
      const step = {
        name: 'Setup Dependencies',
        description: 'Install required npm packages',
      };

      const result = commandStepSchema.safeParse(step);

      expect(result.success).toBe(true);
    });

    it('rejects a step with empty name', () => {
      const step = {
        name: '',
        description: 'Some description',
      };

      const result = commandStepSchema.safeParse(step);

      expect(result.success).toBe(false);
    });

    it('rejects a step with empty description', () => {
      const step = {
        name: 'Valid name',
        description: '',
      };

      const result = commandStepSchema.safeParse(step);

      expect(result.success).toBe(false);
    });

    it('rejects a step missing required name', () => {
      const step = {
        description: 'Some description',
      };

      const result = commandStepSchema.safeParse(step);

      expect(result.success).toBe(false);
    });

    it('rejects a step missing required description', () => {
      const step = {
        name: 'Valid name',
      };

      const result = commandStepSchema.safeParse(step);

      expect(result.success).toBe(false);
    });
  });

  describe('commandPlaybookDTOSchema', () => {
    it('validates a correct command playbook structure', () => {
      const result = commandPlaybookDTOSchema.safeParse(validPlaybook);

      expect(result.success).toBe(true);
    });

    it('validates a playbook with steps without codeSnippet', () => {
      const playbookWithoutSnippets = {
        ...validPlaybook,
        steps: [
          {
            name: 'First step',
            description: 'Do something important',
          },
        ],
      };

      const result = commandPlaybookDTOSchema.safeParse(
        playbookWithoutSnippets,
      );

      expect(result.success).toBe(true);
    });

    describe('when required fields are missing', () => {
      it('rejects playbook missing name', () => {
        const playbook = {
          summary: validPlaybook.summary,
          whenToUse: validPlaybook.whenToUse,
          contextValidationCheckpoints:
            validPlaybook.contextValidationCheckpoints,
          steps: validPlaybook.steps,
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook missing summary', () => {
        const playbook = {
          name: validPlaybook.name,
          whenToUse: validPlaybook.whenToUse,
          contextValidationCheckpoints:
            validPlaybook.contextValidationCheckpoints,
          steps: validPlaybook.steps,
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook missing whenToUse', () => {
        const playbook = {
          name: validPlaybook.name,
          summary: validPlaybook.summary,
          contextValidationCheckpoints:
            validPlaybook.contextValidationCheckpoints,
          steps: validPlaybook.steps,
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook missing contextValidationCheckpoints', () => {
        const playbook = {
          name: validPlaybook.name,
          summary: validPlaybook.summary,
          whenToUse: validPlaybook.whenToUse,
          steps: validPlaybook.steps,
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook missing steps', () => {
        const playbook = {
          name: validPlaybook.name,
          summary: validPlaybook.summary,
          whenToUse: validPlaybook.whenToUse,
          contextValidationCheckpoints:
            validPlaybook.contextValidationCheckpoints,
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });
    });

    describe('when arrays are empty', () => {
      it('rejects playbook with empty whenToUse array', () => {
        const playbook = {
          ...validPlaybook,
          whenToUse: [],
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook with empty contextValidationCheckpoints array', () => {
        const playbook = {
          ...validPlaybook,
          contextValidationCheckpoints: [],
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook with empty steps array', () => {
        const playbook = {
          ...validPlaybook,
          steps: [],
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });
    });

    describe('when strings are empty', () => {
      it('rejects playbook with empty name', () => {
        const playbook = {
          ...validPlaybook,
          name: '',
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook with empty summary', () => {
        const playbook = {
          ...validPlaybook,
          summary: '',
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook with empty string in whenToUse array', () => {
        const playbook = {
          ...validPlaybook,
          whenToUse: ['Valid scenario', ''],
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });

      it('rejects playbook with empty string in contextValidationCheckpoints array', () => {
        const playbook = {
          ...validPlaybook,
          contextValidationCheckpoints: ['Valid checkpoint', ''],
        };

        const result = commandPlaybookDTOSchema.safeParse(playbook);

        expect(result.success).toBe(false);
      });
    });
  });
});
