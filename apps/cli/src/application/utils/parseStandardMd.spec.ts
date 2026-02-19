import { parseStandardMd } from './parseStandardMd';

describe('parseStandardMd', () => {
  describe('when file is in Packmind format', () => {
    const filePath = '.packmind/standards/my-standard.md';

    it('extracts name from H1 heading', () => {
      const content = '# My Standard\n\nSome description\n\n## Rules\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Some description',
        scope: '',
      });
    });

    it('extracts multi-line description', () => {
      const content =
        '# My Standard\n\nLine one\nLine two\n\n## Rules\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Line one\nLine two',
        scope: '',
      });
    });

    describe('when no content between name and rules', () => {
      it('returns empty description', () => {
        const content = '# My Standard\n\n## Rules\n* Rule 1';

        const result = parseStandardMd(content, filePath);

        expect(result).toEqual({
          name: 'My Standard',
          description: '',
          scope: '',
        });
      });
    });

    describe('when no ## heading exists', () => {
      it('returns all remaining content as description', () => {
        const content = '# My Standard\n\nJust a description with no rules';

        const result = parseStandardMd(content, filePath);

        expect(result).toEqual({
          name: 'My Standard',
          description: 'Just a description with no rules',
          scope: '',
        });
      });
    });

    describe('when no heading found', () => {
      it('returns null', () => {
        const content = 'No heading here';

        const result = parseStandardMd(content, filePath);

        expect(result).toBeNull();
      });
    });

    it('trims whitespace from name', () => {
      const content = '#   Spaced Name   \n\nDescription';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Spaced Name',
        description: 'Description',
        scope: '',
      });
    });

    it('returns empty scope always', () => {
      const content = '# Name\n\nDesc\n\n## Rules\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result?.scope).toBe('');
    });
  });

  describe('when file is in Claude format', () => {
    const filePath = '.claude/rules/packmind/standard-my-standard.md';

    it('extracts name from ## Standard: heading', () => {
      const content =
        '---\nalwaysApply: true\n---\n## Standard: My Standard\n\nSome description :\n\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Some description',
        scope: '',
      });
    });

    it('extracts scope from paths key', () => {
      const content =
        '---\npaths: "**/*.ts"\nalwaysApply: false\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '**/*.ts',
      });
    });

    it('handles paths as YAML array', () => {
      const content =
        '---\npaths: ["**/*.ts", "**/*.tsx"]\nalwaysApply: false\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '**/*.ts, **/*.tsx',
      });
    });

    describe('when alwaysApply true and no paths key', () => {
      it('returns empty scope', () => {
        const content =
          '---\nalwaysApply: true\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1';

        const result = parseStandardMd(content, filePath);

        expect(result).toEqual({
          name: 'Name',
          description: 'Desc',
          scope: '',
        });
      });
    });

    it('strips trailing colon from description', () => {
      const content =
        '---\nalwaysApply: true\n---\n## Standard: Name\n\nMy description :\n\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'My description',
        scope: '',
      });
    });

    it('excludes Full standard link from description', () => {
      const content =
        '---\nalwaysApply: true\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1\n\nFull standard is available here for further request: [Name](link)';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '',
      });
    });

    describe('when frontmatter has name and description', () => {
      const content =
        '---\nname: FM Name\ndescription: FM Desc\nalwaysApply: true\n---\n## Standard: Body Name\n\nBody desc :\n\n* Rule 1';

      it('returns body name as name', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.name).toBe('Body Name');
      });

      it('returns frontmatter name as frontmatterName', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.frontmatterName).toBe('FM Name');
      });

      it('returns body description as description', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.description).toBe('Body desc');
      });

      it('returns frontmatter description as frontmatterDescription', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.frontmatterDescription).toBe('FM Desc');
      });
    });
  });

  describe('when file is in Cursor format', () => {
    const filePath = '.cursor/rules/packmind/standard-my-standard.mdc';

    it('extracts scope from globs key', () => {
      const content =
        '---\nglobs: **/*.ts\nalwaysApply: false\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '**/*.ts',
      });
    });

    describe('when alwaysApply true and no globs key', () => {
      it('returns empty scope', () => {
        const content =
          '---\nalwaysApply: true\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1';

        const result = parseStandardMd(content, filePath);

        expect(result).toEqual({
          name: 'Name',
          description: 'Desc',
          scope: '',
        });
      });
    });
  });

  describe('when file is in Continue format', () => {
    const filePath = '.continue/rules/packmind/standard-my-standard.md';

    it('extracts scope from globs key', () => {
      const content =
        '---\nglobs: "**/*.ts"\nalwaysApply: false\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '**/*.ts',
      });
    });

    it('handles globs as YAML array', () => {
      const content =
        '---\nglobs: ["**/*.ts", "**/*.tsx"]\nalwaysApply: false\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1';

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '**/*.ts, **/*.tsx',
      });
    });

    describe('when frontmatter has name and description', () => {
      const content =
        '---\nname: FM Name\ndescription: FM Desc\nglobs: "**/*.ts"\nalwaysApply: false\n---\n## Standard: Body Name\n\nBody desc :\n\n* Rule 1';

      it('returns body name as name', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.name).toBe('Body Name');
      });

      it('returns frontmatter name as frontmatterName', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.frontmatterName).toBe('FM Name');
      });

      it('returns body description as description', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.description).toBe('Body desc');
      });

      it('returns frontmatter description as frontmatterDescription', () => {
        const result = parseStandardMd(content, filePath);

        expect(result?.frontmatterDescription).toBe('FM Desc');
      });
    });
  });

  describe('when file is in Copilot format', () => {
    const filePath =
      '.github/instructions/packmind-my-standard.instructions.md';

    it('extracts scope from applyTo key', () => {
      const content =
        "---\napplyTo: '**/*.ts'\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1";

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '**/*.ts',
      });
    });

    it('returns empty scope for default applyTo value', () => {
      const content =
        "---\napplyTo: '**'\n---\n## Standard: Name\n\nDesc :\n\n* Rule 1";

      const result = parseStandardMd(content, filePath);

      expect(result).toEqual({
        name: 'Name',
        description: 'Desc',
        scope: '',
      });
    });
  });

  describe('when file path is unknown', () => {
    it('returns null', () => {
      const content = '# Some Standard\n\nDescription';

      const result = parseStandardMd(content, 'unknown/path/file.md');

      expect(result).toBeNull();
    });
  });
});
