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
    permissions: '644',
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
    permissions: '644',
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
          license: 'MIT',
          compatibility: '>=1.0',
          allowedTools: 'Read, Write',
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
          permissions: '644',
          isBase64: true,
        },
      ]);

      expect(result).toEqual({
        success: true,
        payload: {
          name: 'My Skill',
          description: 'A useful skill',
          prompt: 'This is the prompt body.',
          files: [
            {
              path: 'helper.py',
              content: 'print("hello")',
              permissions: '644',
              isBase64: false,
            },
            {
              path: 'data/image.png',
              content: 'base64data',
              permissions: '644',
              isBase64: true,
            },
          ],
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
          files: [],
        },
      });
    });
  });
});
