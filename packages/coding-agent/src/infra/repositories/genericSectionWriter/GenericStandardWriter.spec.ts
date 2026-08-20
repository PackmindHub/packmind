import { ruleFactory, standardVersionFactory } from '@packmind/standards/test';

import { GenericStandardWriter } from './GenericStandardWriter';

describe('GenericStandardWriter', () => {
  describe('writeStandard', () => {
    describe('when the standard has a scope', () => {
      it('renders the scope in a ## Scope section the CLI parser reads back', () => {
        const standardVersion = standardVersionFactory({
          name: 'Testing Conventions',
          description: 'How we write specs.',
          scope: '**/*.spec.ts, **/*.test.ts',
        });

        const result = GenericStandardWriter.writeStandard(standardVersion, [
          ruleFactory({ content: 'Assert one behaviour per test' }),
        ]);

        expect(result).toBe(
          `# Testing Conventions

How we write specs.

## Scope

**/*.spec.ts, **/*.test.ts

## Rules

* Assert one behaviour per test
`,
        );
      });

      it('trims surrounding whitespace from the scope', () => {
        const standardVersion = standardVersionFactory({
          scope: '  **/*.ts  ',
        });

        const result = GenericStandardWriter.writeStandard(standardVersion, []);

        expect(result).toContain('## Scope\n\n**/*.ts\n');
      });
    });

    describe('when the standard has no scope', () => {
      it('omits the Scope section for a null scope', () => {
        const standardVersion = standardVersionFactory({ scope: null });

        const result = GenericStandardWriter.writeStandard(standardVersion, [
          ruleFactory({ content: 'A rule' }),
        ]);

        expect(result).not.toContain('## Scope');
      });

      it('omits the Scope section for a blank scope', () => {
        const standardVersion = standardVersionFactory({ scope: '   ' });

        const result = GenericStandardWriter.writeStandard(standardVersion, []);

        expect(result).not.toContain('## Scope');
      });
    });

    describe('when the standard has no rules', () => {
      it('omits the Rules section', () => {
        const standardVersion = standardVersionFactory({
          name: 'Empty Standard',
          description: 'Nothing yet.',
          scope: null,
        });

        const result = GenericStandardWriter.writeStandard(standardVersion, []);

        expect(result).toBe('# Empty Standard\n\nNothing yet.\n');
      });
    });
  });
});
