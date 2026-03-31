import { parseLenientStandard } from './parseLenientStandard';

describe('parseLenientStandard', () => {
  describe('when content is empty or whitespace-only', () => {
    it('returns null for empty string', () => {
      const result = parseLenientStandard('');

      expect(result).toBeNull();
    });

    it('returns null for whitespace-only content', () => {
      const result = parseLenientStandard('   \n  \n  ');

      expect(result).toBeNull();
    });
  });

  describe('when first non-empty line starts with # heading', () => {
    it('uses heading text as name and remaining content as description', () => {
      const content = '# My Standard\n\nSome description here';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Some description here',
        rules: [],
      });
    });

    it('trims whitespace from name and description', () => {
      const content = '#   Spaced Name   \n\n  Description with spaces  \n';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'Spaced Name',
        description: 'Description with spaces',
        rules: [],
      });
    });

    it('handles heading with empty description', () => {
      const content = '# Just a Name\n';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'Just a Name',
        description: '',
        rules: [],
      });
    });

    it('skips leading blank lines before heading', () => {
      const content = '\n\n# My Standard\n\nDescription';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Description',
        rules: [],
      });
    });

    it('preserves multi-line description', () => {
      const content = '# My Standard\n\nLine one\nLine two\n\nLine three';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Line one\nLine two\n\nLine three',
        rules: [],
      });
    });

    it('does not fail due to fontmatter', () => {
      const content = `---
name: 'My standard'
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "!test/**"
alwaysApply: false
description: 'Some description'
---
# My Standard

Line one
Line two

Line three`;

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Line one\nLine two\n\nLine three',
        rules: [],
      });
    });

    it('extracts bullet points as rules and separates them from the description', () => {
      const content = `# Packmind Standard Authoring

Enforce consistent conventions when writing Packmind coding standards to ensure they are actionable, precise, and correctly interpreted by the CLI.

## Rules

* Start every rule with an imperative action verb
* Keep each rule under 25 words and focused on a single concept
* Omit rationale phrases from rule text
* Set the scope field to comma-separated glob patterns only`;

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'Packmind Standard Authoring',
        description:
          'Enforce consistent conventions when writing Packmind coding standards to ensure they are actionable, precise, and correctly interpreted by the CLI.',
        rules: [
          'Start every rule with an imperative action verb',
          'Keep each rule under 25 words and focused on a single concept',
          'Omit rationale phrases from rule text',
          'Set the scope field to comma-separated glob patterns only',
        ],
      });
    });
  });

  describe('when heading uses # Standard: format', () => {
    it('extracts name by stripping the "Standard: " prefix', () => {
      const content = `# Standard: My Standard\n\nSome description`;

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Some description',
        rules: [],
      });
    });

    it('strips trailing " :" from description', () => {
      const content = `# Standard: My Standard\n\nSome description :`;

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Some description',
        rules: [],
      });
    });

    describe('when there is no text after the list', () => {
      it('treats list as rules', () => {
        const content = `---
name: 'Typescript good practices'
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "!test/**"
alwaysApply: false
description: 'Standardize TypeScript types and abstractions.'
---

# Standard: Typescript good practices

Standardize TypeScript types and abstractions by prefixing interfaces with "I", prefixing abstract classes with "Abstract", and preferring explicit nullability (key: string | null) over optional properties (key?: string) to improve clarity, intent, and safer typing. :
* Prefer explicit nullable fields (e.g., \`key: string | null\`) over optional properties (\`key?: string\`) in types and interfaces.
* Prefix abstract classes with the 'Abstract' keyword to make their intent explicit and prevent direct instantiation.
* prefix interfaces with I`;

        const result = parseLenientStandard(content);

        expect(result).toEqual({
          name: 'Typescript good practices',
          description:
            'Standardize TypeScript types and abstractions by prefixing interfaces with "I", prefixing abstract classes with "Abstract", and preferring explicit nullability (key: string | null) over optional properties (key?: string) to improve clarity, intent, and safer typing.',
          rules: [
            'Prefer explicit nullable fields (e.g., `key: string | null`) over optional properties (`key?: string`) in types and interfaces.',
            "Prefix abstract classes with the 'Abstract' keyword to make their intent explicit and prevent direct instantiation.",
            'prefix interfaces with I',
          ],
        });
      });
    });

    describe('when text follows the last list', () => {
      it('puts all content into description', () => {
        const content = `---
name: 'Typescript good practices'
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "!test/**"
alwaysApply: false
description: 'Standardize TypeScript types and abstractions.'
---

# Standard: Typescript good practices

Standardize TypeScript types and abstractions by prefixing interfaces with "I", prefixing abstract classes with "Abstract", and preferring explicit nullability (key: string | null) over optional properties (key?: string) to improve clarity, intent, and safer typing. :
* Prefer explicit nullable fields (e.g., \`key: string | null\`) over optional properties (\`key?: string\`) in types and interfaces.
* Prefix abstract classes with the 'Abstract' keyword to make their intent explicit and prevent direct instantiation.
* prefix interfaces with I

Full standard is available here for further request: [Typescript good practices](../../../.packmind/standards/sample-standard.md)`;

        const result = parseLenientStandard(content);

        expect(result).toEqual({
          name: 'Typescript good practices',
          description: `Standardize TypeScript types and abstractions by prefixing interfaces with "I", prefixing abstract classes with "Abstract", and preferring explicit nullability (key: string | null) over optional properties (key?: string) to improve clarity, intent, and safer typing. :
* Prefer explicit nullable fields (e.g., \`key: string | null\`) over optional properties (\`key?: string\`) in types and interfaces.
* Prefix abstract classes with the 'Abstract' keyword to make their intent explicit and prevent direct instantiation.
* prefix interfaces with I

Full standard is available here for further request: [Typescript good practices](../../../.packmind/standards/sample-standard.md)`,
          rules: [],
        });
      });
    });
  });

  describe('when there are multiple bullet lists', () => {
    it('uses only the last list as rules', () => {
      const content = `# My Standard

Some context:
* context item one
* context item two

The actual rules:
* rule one
* rule two
* rule three`;

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: `Some context:
* context item one
* context item two

The actual rules`,
        rules: ['rule one', 'rule two', 'rule three'],
      });
    });

    describe('when text follows the last list', () => {
      it('puts all content into description', () => {
        const content = `# My Standard

Some context:
* context item one
* context item two

The actual rules:
* rule one
* rule two

Footer note here`;

        const result = parseLenientStandard(content);

        expect(result).toEqual({
          name: 'My Standard',
          description: `Some context:
* context item one
* context item two

The actual rules:
* rule one
* rule two

Footer note here`,
          rules: [],
        });
      });
    });
  });

  describe('when no heading is present', () => {
    it('returns null for content without a heading', () => {
      const content = 'Just some content without a heading';

      const result = parseLenientStandard(content);

      expect(result).toBeNull();
    });

    it('returns null for content with only sub-headings', () => {
      const content = '## Sub heading\n\nSome content';

      const result = parseLenientStandard(content);

      expect(result).toBeNull();
    });

    it('returns null for bullet-only content', () => {
      const content = '* rule one\n* rule two';

      const result = parseLenientStandard(content);

      expect(result).toBeNull();
    });
  });
});
