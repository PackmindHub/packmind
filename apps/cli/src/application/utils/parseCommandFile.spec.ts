import { parseCommandFile } from './parseCommandFile';

describe('parseCommandFile', () => {
  describe('when content is empty', () => {
    it('returns error', () => {
      const result = parseCommandFile('', 'commands/my-command.md');

      expect(result).toEqual({
        success: false,
        error: 'File is empty',
      });
    });
  });

  describe('when content is whitespace-only', () => {
    it('returns error', () => {
      const result = parseCommandFile('   \n\n  ', 'commands/my-command.md');

      expect(result).toEqual({
        success: false,
        error: 'File is empty',
      });
    });
  });

  describe('when frontmatter is malformed (opening --- without closing)', () => {
    it('returns error', () => {
      const content = '---\nname: My Command\nThis has no closing delimiter';

      const result = parseCommandFile(content, 'commands/my-command.md');

      expect(result).toEqual({
        success: false,
        error: 'Malformed frontmatter: opening --- without closing ---',
      });
    });
  });

  describe('when frontmatter has empty body', () => {
    it('returns error', () => {
      const content = '---\nname: My Command\n---\n';

      const result = parseCommandFile(content, 'commands/my-command.md');

      expect(result).toEqual({
        success: false,
        error: 'Command body is empty',
      });
    });

    it('returns error for whitespace-only body', () => {
      const content = '---\nname: My Command\n---\n\n  \n';

      const result = parseCommandFile(content, 'commands/my-command.md');

      expect(result).toEqual({
        success: false,
        error: 'Command body is empty',
      });
    });
  });

  describe('when content has no frontmatter', () => {
    it('uses humanized filename as name and returns full content', () => {
      const content = 'This is a plain command file\nwith some instructions.';

      const result = parseCommandFile(content, 'commands/my-command.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My command',
          content,
        },
      });
    });
  });

  describe('when frontmatter has name field', () => {
    it('uses frontmatter name', () => {
      const content =
        "---\nname: 'My Custom Command'\ndescription: 'A description'\n---\n\nBody content";

      const result = parseCommandFile(content, 'commands/some-file.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My Custom Command',
          content: 'Body content',
        },
      });
    });

    it('handles unquoted name', () => {
      const content = '---\nname: My Command\n---\n\nBody content';

      const result = parseCommandFile(content, 'commands/some-file.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My Command',
          content: 'Body content',
        },
      });
    });

    it('handles double-quoted name', () => {
      const content = '---\nname: "My Command"\n---\n\nBody content';

      const result = parseCommandFile(content, 'commands/some-file.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My Command',
          content: 'Body content',
        },
      });
    });
  });

  describe('when frontmatter has description but no name', () => {
    it('uses filename slug as name', () => {
      const content =
        "---\ndescription: 'Conventional Commits'\n---\n\nBody content";

      const result = parseCommandFile(content, 'commands/some-file.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'Some file',
          content: 'Body content',
        },
      });
    });
  });

  describe('when frontmatter has neither name nor description', () => {
    it('uses humanized filename as name', () => {
      const content = '---\nagent: copilot\nmode: ask\n---\n\nBody content';

      const result = parseCommandFile(
        content,
        '.github/prompts/conventional-commits.prompt.md',
      );

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'Conventional commits',
          content: 'Body content',
        },
      });
    });
  });

  describe('filename slug extraction', () => {
    it('handles .prompt.md extension (Copilot files)', () => {
      const content = 'Some content';

      const result = parseCommandFile(
        content,
        '.github/prompts/conventional-commits.prompt.md',
      );

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'Conventional commits',
          content,
        },
      });
    });

    it('handles regular .md extension', () => {
      const content = 'Some content';

      const result = parseCommandFile(content, 'commands/my-command.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My command',
          content,
        },
      });
    });

    it('handles path with directories', () => {
      const content = 'Some content';

      const result = parseCommandFile(content, 'deep/nested/path/run-tests.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'Run tests',
          content,
        },
      });
    });

    it('handles underscores in filename', () => {
      const content = 'Some content';

      const result = parseCommandFile(content, 'commands/new_command_local.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'New command local',
          content,
        },
      });
    });
  });

  describe('when content has CRLF line endings', () => {
    it('detects frontmatter and extracts name correctly', () => {
      const content = '---\r\nname: My Command\r\n---\r\n\r\nBody content';

      const result = parseCommandFile(content, 'commands/some-file.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My Command',
          content: 'Body content',
        },
      });
    });

    it('returns error for malformed frontmatter with CRLF', () => {
      const content = '---\r\nname: My Command\r\nNo closing delimiter';

      const result = parseCommandFile(content, 'commands/some-file.md');

      expect(result).toEqual({
        success: false,
        error: 'Malformed frontmatter: opening --- without closing ---',
      });
    });
  });

  describe('content stripping', () => {
    it('returns body without frontmatter', () => {
      const content = "---\nname: 'My Command'\n---\n\nBody with instructions";

      const result = parseCommandFile(content, 'commands/test.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My Command',
          content: 'Body with instructions',
        },
      });
    });

    it('strips leading newlines between frontmatter and body', () => {
      const content = "---\nname: 'My Command'\n---\n\n\n\nBody after gaps";

      const result = parseCommandFile(content, 'commands/test.md');

      expect(result).toEqual({
        success: true,
        parsed: {
          name: 'My Command',
          content: 'Body after gaps',
        },
      });
    });
  });
});
