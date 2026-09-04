import {
  commandSummary,
  parseCommandFrontmatter,
} from './parseCommandFrontmatter';

describe('parseCommandFrontmatter', () => {
  describe('when the content has no frontmatter', () => {
    it('returns the content as the body', () => {
      const content = '# Release app\n\nDo the thing.';

      expect(parseCommandFrontmatter(content)).toEqual({
        fields: null,
        raw: null,
        body: content,
      });
    });
  });

  describe('when the opening delimiter is never closed', () => {
    const content = '---\ndescription: unfinished\n\nDo the thing.';

    it('reports no block', () => {
      expect(parseCommandFrontmatter(content).raw).toBeNull();
    });

    it('leaves the content alone', () => {
      expect(parseCommandFrontmatter(content).body).toBe(content);
    });
  });

  describe('when the content opens with a frontmatter block', () => {
    const content = [
      '---',
      "description: 'Automate creating a release'",
      'argument-hint: <version>',
      '---',
      '',
      'Create a great release with version {{version}}.',
    ].join('\n');

    it('keeps the block out of the body', () => {
      expect(parseCommandFrontmatter(content).body).toBe(
        'Create a great release with version {{version}}.',
      );
    });

    it('reads the declared keys in order', () => {
      expect(parseCommandFrontmatter(content).fields).toEqual([
        ['description', 'Automate creating a release'],
        ['argument-hint', '<version>'],
      ]);
    });

    it('keeps the block as written', () => {
      expect(parseCommandFrontmatter(content).raw).toBe(
        "description: 'Automate creating a release'\nargument-hint: <version>",
      );
    });
  });

  describe('when the block is not readable YAML', () => {
    const content = '---\ndescription: "unterminated\n---\n\nDo the thing.';

    it('reports no fields', () => {
      expect(parseCommandFrontmatter(content).fields).toBeNull();
    });

    it('still keeps the block out of the body', () => {
      expect(parseCommandFrontmatter(content).body).toBe('Do the thing.');
    });

    it('keeps the block as written so it can still be shown', () => {
      expect(parseCommandFrontmatter(content).raw).toBe(
        'description: "unterminated',
      );
    });
  });

  describe('when the block is a YAML list', () => {
    it('reports no fields', () => {
      const content = '---\n- one\n- two\n---\n\nDo the thing.';

      expect(parseCommandFrontmatter(content).fields).toBeNull();
    });
  });

  describe('when the content uses CRLF line endings', () => {
    it('finds the block all the same', () => {
      const content = '---\r\ndescription: Ship it\r\n---\r\n\r\nDo the thing.';

      expect(parseCommandFrontmatter(content).fields).toEqual([
        ['description', 'Ship it'],
      ]);
    });
  });
});

describe('commandSummary', () => {
  describe('when the frontmatter declares a description', () => {
    it('returns it', () => {
      const content = '---\ndescription: Ship a release\n---\n\n# Release app';

      expect(commandSummary(content)).toBe('Ship a release');
    });
  });

  describe('when the description is blank', () => {
    it('falls back to the instructions', () => {
      const content = "---\ndescription: '   '\n---\n\nShip the release.";

      expect(commandSummary(content)).toBe('Ship the release.');
    });
  });

  describe('when there is no frontmatter', () => {
    it('returns the first line that reads as prose', () => {
      const content = '# Release app\n\n- a bullet\n\nShip the release.';

      expect(commandSummary(content)).toBe('Ship the release.');
    });
  });

  describe('when the instructions are only structure', () => {
    it('returns nothing rather than a heading', () => {
      expect(commandSummary('# Release app\n\n1. Do it\n')).toBe('');
    });
  });

  describe('when the content is empty', () => {
    it('returns nothing', () => {
      expect(commandSummary('')).toBe('');
    });
  });
});
