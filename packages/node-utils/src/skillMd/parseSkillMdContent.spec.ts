import {
  parseSkillMdContent,
  serializeSkillMetadata,
} from './parseSkillMdContent';

describe('parseSkillMdContent', () => {
  describe('when content has valid frontmatter and body', () => {
    const content = [
      '---',
      'name: My Skill',
      'description: A useful skill',
      'license: MIT',
      '---',
      'This is the body.',
    ].join('\n');

    it('extracts properties from frontmatter', () => {
      const result = parseSkillMdContent(content);

      expect(result?.properties).toEqual({
        name: 'My Skill',
        description: 'A useful skill',
        license: 'MIT',
      });
    });

    it('extracts the body', () => {
      const result = parseSkillMdContent(content);

      expect(result?.body).toBe('This is the body.');
    });
  });

  describe('when frontmatter contains allowed-tools', () => {
    const content = [
      '---',
      'name: Tool Skill',
      'allowed-tools: Read, Write',
      '---',
      'Body here.',
    ].join('\n');

    it('normalises allowed-tools to allowedTools', () => {
      const result = parseSkillMdContent(content);

      expect(result?.properties.allowedTools).toBe('Read, Write');
    });

    it('does not include the original allowed-tools key', () => {
      const result = parseSkillMdContent(content);

      expect(result?.properties).not.toHaveProperty('allowed-tools');
    });
  });

  describe('when content does not start with ---', () => {
    it('returns null', () => {
      const result = parseSkillMdContent('No frontmatter here');

      expect(result).toBeNull();
    });
  });

  describe('when closing --- is missing', () => {
    it('returns null', () => {
      const result = parseSkillMdContent('---\nname: Test\nno closing');

      expect(result).toBeNull();
    });
  });

  describe('when YAML is invalid', () => {
    it('returns null', () => {
      const result = parseSkillMdContent('---\n: :\n---\nBody');

      expect(result).toBeNull();
    });
  });

  describe('when frontmatter is a scalar value', () => {
    it('returns null', () => {
      const result = parseSkillMdContent('---\njust a string\n---\nBody');

      expect(result).toBeNull();
    });
  });

  describe('when content has leading whitespace', () => {
    const content = '  \n---\nname: Trimmed\n---\nBody';

    it('trims content before parsing', () => {
      const result = parseSkillMdContent(content);

      expect(result?.properties.name).toBe('Trimmed');
    });
  });

  describe('when body is empty', () => {
    const content = '---\nname: No Body\n---\n';

    it('returns empty body string', () => {
      const result = parseSkillMdContent(content);

      expect(result?.body).toBe('');
    });
  });
});

describe('serializeSkillMetadata', () => {
  it('sorts keys alphabetically', () => {
    const result = serializeSkillMetadata({ zebra: 1, alpha: 2 });

    expect(result).toBe('{"alpha":2,"zebra":1}');
  });

  it('returns deterministic output regardless of insertion order', () => {
    const a = serializeSkillMetadata({ license: 'MIT', compatibility: 'v1' });
    const b = serializeSkillMetadata({ compatibility: 'v1', license: 'MIT' });

    expect(a).toBe(b);
  });

  it('returns empty object JSON for empty input', () => {
    const result = serializeSkillMetadata({});

    expect(result).toBe('{}');
  });
});
