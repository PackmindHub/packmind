import { parseSkillDirectory } from './parseSkillDirectory';

const VALID_SKILL_MD = [
  '---',
  'name: My Skill',
  'description: A useful skill',
  '---',
  'This is the prompt body.',
].join('\n');

function buildSkillMdFile(content = VALID_SKILL_MD) {
  return {
    relativePath: 'SKILL.md',
    content,
    permissions: 'rw-r--r--',
    isBase64: false,
  };
}

function buildSupportingFile(
  relativePath = 'helper.py',
  content = 'print("hello")',
) {
  return {
    relativePath,
    content,
    permissions: 'rw-r--r--',
    isBase64: false,
  };
}

describe('parseSkillDirectory', () => {
  describe('when SKILL.md is missing', () => {
    it('returns an error', () => {
      const result = parseSkillDirectory([
        buildSupportingFile('readme.txt', 'some content'),
      ]);

      expect(result).toEqual({
        success: false,
        error: 'Skill directory does not contain a SKILL.md file.',
      });
    });
  });

  describe('when SKILL.md has invalid frontmatter', () => {
    it('returns an error', () => {
      const result = parseSkillDirectory([
        buildSkillMdFile('No frontmatter here'),
      ]);

      expect(result).toEqual({
        success: false,
        error:
          'Failed to parse SKILL.md: file must have valid YAML frontmatter.',
      });
    });
  });

  describe('when name is missing', () => {
    it('returns an error', () => {
      const content = [
        '---',
        'description: A description',
        '---',
        'Prompt body.',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: false,
        error: 'SKILL.md is missing a required "name" property in frontmatter.',
      });
    });
  });

  describe('when name is empty', () => {
    it('returns an error', () => {
      const content = [
        '---',
        'name: ""',
        'description: A description',
        '---',
        'Prompt body.',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: false,
        error: 'SKILL.md is missing a required "name" property in frontmatter.',
      });
    });
  });

  describe('when description is missing', () => {
    it('returns an error', () => {
      const content = ['---', 'name: My Skill', '---', 'Prompt body.'].join(
        '\n',
      );

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: false,
        error:
          'SKILL.md is missing a required "description" property in frontmatter.',
      });
    });
  });

  describe('when description is empty', () => {
    it('returns an error', () => {
      const content = [
        '---',
        'name: My Skill',
        'description: ""',
        '---',
        'Prompt body.',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: false,
        error:
          'SKILL.md is missing a required "description" property in frontmatter.',
      });
    });
  });

  describe('when body is empty', () => {
    it('returns an error', () => {
      const content = [
        '---',
        'name: My Skill',
        'description: A description',
        '---',
        '',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: false,
        error: 'SKILL.md body (prompt) cannot be empty.',
      });
    });
  });

  describe('when SKILL.md is valid with no supporting files', () => {
    it('returns a payload with name, description, prompt, and empty files array', () => {
      const result = parseSkillDirectory([buildSkillMdFile()]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'My Skill',
          description: 'A useful skill',
          prompt: 'This is the prompt body.',
          skillMdPermissions: 'rw-r--r--',
          files: [],
        },
      });
    });
  });

  describe('when SKILL.md has optional properties', () => {
    it('includes license, compatibility, and allowedTools', () => {
      const content = [
        '---',
        'name: Full Skill',
        'description: Has everything',
        'license: MIT',
        'compatibility: ">=1.0"',
        'allowed-tools: Read, Write',
        '---',
        'The prompt.',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'Full Skill',
          description: 'Has everything',
          prompt: 'The prompt.',
          skillMdPermissions: 'rw-r--r--',
          license: 'MIT',
          compatibility: '>=1.0',
          allowedTools: 'Read, Write',
          files: [],
        },
      });
    });
  });

  describe('when SKILL.md has metadata', () => {
    it('includes metadata in the payload', () => {
      const content = [
        '---',
        'name: Skill With Meta',
        'description: Has metadata',
        'metadata:',
        '  category: testing',
        '  version: "1.0"',
        '---',
        'The prompt.',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'Skill With Meta',
          description: 'Has metadata',
          prompt: 'The prompt.',
          skillMdPermissions: 'rw-r--r--',
          metadata: { category: 'testing', version: '1.0' },
          files: [],
        },
      });
    });
  });

  describe('when there are supporting files', () => {
    it('maps them to the files array', () => {
      const result = parseSkillDirectory([
        buildSkillMdFile(),
        buildSupportingFile('helper.py', 'print("hello")'),
        {
          relativePath: 'data/image.png',
          content: 'base64data',
          permissions: 'rw-r--r--',
          isBase64: true,
        },
      ]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'My Skill',
          description: 'A useful skill',
          prompt: 'This is the prompt body.',
          skillMdPermissions: 'rw-r--r--',
          files: [
            {
              path: 'helper.py',
              content: 'print("hello")',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
            {
              path: 'data/image.png',
              content: 'base64data',
              permissions: 'rw-r--r--',
              isBase64: true,
            },
          ],
        },
      });
    });
  });

  describe('when SKILL.md has Claude Code additional properties', () => {
    it('populates additionalProperties with all supported camelCase keys', () => {
      const content = [
        '---',
        'name: My Skill',
        'description: A useful skill',
        'model: opus',
        'user-invocable: true',
        'argument-hint: "<query>"',
        'disable-model-invocation: true',
        'context: fork',
        'agent: plan',
        'hooks:',
        '  preToolCall: echo hello',
        '---',
        'The prompt.',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'My Skill',
          description: 'A useful skill',
          prompt: 'The prompt.',
          skillMdPermissions: 'rw-r--r--',
          additionalProperties: {
            model: 'opus',
            userInvocable: true,
            argumentHint: '<query>',
            disableModelInvocation: true,
            context: 'fork',
            agent: 'plan',
            hooks: { preToolCall: 'echo hello' },
          },
          files: [],
        },
      });
    });
  });

  describe('when SKILL.md has no Claude Code additional properties', () => {
    it('does not include additionalProperties', () => {
      const result = parseSkillDirectory([buildSkillMdFile()]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'My Skill',
          description: 'A useful skill',
          prompt: 'This is the prompt body.',
          skillMdPermissions: 'rw-r--r--',
          files: [],
        },
      });
    });
  });

  describe('when name and description have whitespace', () => {
    it('trims them', () => {
      const content = [
        '---',
        'name: "  Trimmed Name  "',
        'description: "  Trimmed Desc  "',
        '---',
        'Prompt.',
      ].join('\n');

      const result = parseSkillDirectory([buildSkillMdFile(content)]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'Trimmed Name',
          description: 'Trimmed Desc',
          prompt: 'Prompt.',
          skillMdPermissions: 'rw-r--r--',
          files: [],
        },
      });
    });
  });
});
