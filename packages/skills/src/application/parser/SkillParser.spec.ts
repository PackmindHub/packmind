import { SkillParseError } from '../errors/SkillParseError';
import { SkillParser } from './SkillParser';

describe('SkillParser', () => {
  let parser: SkillParser;

  beforeEach(() => {
    parser = new SkillParser();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with valid SKILL.md content', () => {
    it('parses frontmatter with required fields', () => {
      const content = `---
name: my-skill
description: A sample skill for testing.
---

# My Skill

Instructions go here.
`;

      const result = parser.parse(content);

      expect(result.metadata).toEqual({
        name: 'my-skill',
        description: 'A sample skill for testing.',
      });
    });

    it('parses frontmatter with all optional fields', () => {
      const content = `---
name: pdf-processing
description: Extract text and tables from PDF files.
license: Apache-2.0
compatibility: Requires git, docker, jq
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(git:*) Read
---

# PDF Processing

Content here.
`;

      const result = parser.parse(content);

      expect(result.metadata).toEqual({
        name: 'pdf-processing',
        description: 'Extract text and tables from PDF files.',
        license: 'Apache-2.0',
        compatibility: 'Requires git, docker, jq',
        metadata: {
          author: 'example-org',
          version: '1.0',
        },
        'allowed-tools': 'Bash(git:*) Read',
      });
    });

    it('extracts body content containing skill title', () => {
      const content = `---
name: my-skill
description: A sample skill.
---

# My Skill

This is the body content.
`;

      const result = parser.parse(content);

      expect(result.body).toContain('# My Skill');
    });

    it('extracts body content containing paragraph text', () => {
      const content = `---
name: my-skill
description: A sample skill.
---

# My Skill

This is the body content.
`;

      const result = parser.parse(content);

      expect(result.body).toContain('This is the body content.');
    });

    describe('when no content follows frontmatter', () => {
      it('returns empty body', () => {
        const content = `---
name: my-skill
description: A sample skill.
---
`;

        const result = parser.parse(content);

        expect(result.body).toBe('');
      });
    });
  });

  describe('with missing frontmatter', () => {
    it('throws SkillParseError for content without opening delimiter', () => {
      const content = `# My Skill

Just some markdown without frontmatter.
`;

      expect(() => parser.parse(content)).toThrow(
        new SkillParseError(
          'Missing frontmatter: SKILL.md must start with ---',
        ),
      );
    });

    it('throws SkillParseError for empty content', () => {
      expect(() => parser.parse('')).toThrow(
        new SkillParseError(
          'Missing frontmatter: SKILL.md must start with ---',
        ),
      );
    });

    it('throws SkillParseError for whitespace-only content', () => {
      expect(() => parser.parse('   \n\n   ')).toThrow(
        new SkillParseError(
          'Missing frontmatter: SKILL.md must start with ---',
        ),
      );
    });
  });

  describe('with unclosed frontmatter', () => {
    it('throws SkillParseError for missing closing delimiter', () => {
      const content = `---
name: my-skill
description: A sample skill.

# My Skill

Content without closing delimiter.
`;

      expect(() => parser.parse(content)).toThrow(
        new SkillParseError(
          'Unclosed frontmatter: missing closing --- delimiter',
        ),
      );
    });

    it('throws SkillParseError for only opening delimiter', () => {
      const content = `---
name: my-skill
`;

      expect(() => parser.parse(content)).toThrow(
        new SkillParseError(
          'Unclosed frontmatter: missing closing --- delimiter',
        ),
      );
    });
  });

  describe('with invalid YAML syntax', () => {
    it('throws SkillParseError for malformed YAML with unclosed bracket', () => {
      const content = `---
name: my-skill
description: [unclosed bracket
---

# My Skill
`;

      expect(() => parser.parse(content)).toThrow(SkillParseError);
    });

    it('throws SkillParseError for invalid indentation', () => {
      const content = `---
name: my-skill
  description: bad indentation
---

# My Skill
`;

      expect(() => parser.parse(content)).toThrow(SkillParseError);
    });

    it('throws SkillParseError for empty frontmatter', () => {
      const content = `---
---

# My Skill
`;

      expect(() => parser.parse(content)).toThrow(
        new SkillParseError(
          'Invalid frontmatter: expected YAML object with key-value pairs',
        ),
      );
    });
  });
});
