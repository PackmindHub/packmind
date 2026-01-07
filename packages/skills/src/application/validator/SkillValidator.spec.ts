import { SkillValidationError } from '../errors/SkillValidationError';
import { SkillParser } from '../parser/SkillParser';
import { SkillValidator } from './SkillValidator';

describe('SkillValidator', () => {
  let validator: SkillValidator;
  let parser: SkillParser;

  beforeEach(() => {
    validator = new SkillValidator();
    parser = new SkillParser();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with valid metadata', () => {
    it('returns empty errors array for valid skill with required fields only', () => {
      const content = `---
name: my-skill
description: A sample skill for testing purposes.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toEqual([]);
    });

    it('returns empty errors array for skill with all optional fields', () => {
      const content = `---
name: pdf-processing
description: Extract text and tables from PDF files.
license: Apache-2.0
compatibility: Requires git and docker
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(git:*) Read
---

# PDF Processing
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toEqual([]);
    });
  });

  describe('with missing name field', () => {
    const content = `---
description: A sample skill without a name.
---

# My Skill
`;

    it('returns "name field is missing" error', () => {
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message: 'name field is missing',
      });
    });
  });

  describe('with missing description field', () => {
    const content = `---
name: my-skill
---

# My Skill
`;

    it('returns "description field is missing" error', () => {
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'description',
        message: 'description field is missing',
      });
    });
  });

  describe('with both name and description missing', () => {
    const content = `---
license: MIT
---

# My Skill
`;

    it('returns two errors for missing required fields', () => {
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toEqual([
        { field: 'name', message: 'name field is missing' },
        { field: 'description', message: 'description field is missing' },
      ]);
    });
  });

  describe('with name exceeding 64 characters', () => {
    it('returns length error', () => {
      const longName = 'a'.repeat(65);
      const content = `---
name: ${longName}
description: A sample skill.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message: 'name must not exceed 64 characters',
      });
    });
  });

  describe('with uppercase letters in name', () => {
    it('returns lowercase error', () => {
      const content = `---
name: My-Skill
description: A sample skill.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message: 'name must contain only lowercase characters',
      });
    });
  });

  describe('with name starting with hyphen', () => {
    it('returns hyphen position error', () => {
      const content = `---
name: -my-skill
description: A sample skill.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message: 'name must not start or end with a hyphen',
      });
    });
  });

  describe('with name ending with hyphen', () => {
    it('returns hyphen position error', () => {
      const content = `---
name: my-skill-
description: A sample skill.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message: 'name must not start or end with a hyphen',
      });
    });
  });

  describe('with consecutive hyphens in name', () => {
    it('returns consecutive hyphen error', () => {
      const content = `---
name: my--skill
description: A sample skill.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message: 'name must not contain consecutive hyphens',
      });
    });
  });

  describe('with underscore in name', () => {
    it('returns invalid characters error', () => {
      const content = `---
name: my_skill
description: A sample skill.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message:
          'name must contain only lowercase alphanumeric characters and hyphens',
      });
    });
  });

  describe('with space in name', () => {
    it('returns invalid characters error', () => {
      const content = `---
name: my skill
description: A sample skill.
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'name',
        message:
          'name must contain only lowercase alphanumeric characters and hyphens',
      });
    });
  });

  describe('with description exceeding 1024 characters', () => {
    it('returns length error', () => {
      const longDescription = 'a'.repeat(1025);
      const content = `---
name: my-skill
description: ${longDescription}
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'description',
        message: 'description must not exceed 1024 characters',
      });
    });
  });

  describe('with compatibility exceeding 500 characters', () => {
    it('returns length error', () => {
      const longCompatibility = 'a'.repeat(501);
      const content = `---
name: my-skill
description: A sample skill.
compatibility: ${longCompatibility}
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'compatibility',
        message: 'compatibility must not exceed 500 characters',
      });
    });
  });

  describe('with single unknown frontmatter field', () => {
    it('returns unexpected fields error', () => {
      const content = `---
name: my-skill
description: A sample skill.
foo: bar
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'frontmatter',
        message: 'unexpected fields in frontmatter: foo',
      });
    });
  });

  describe('with multiple unknown frontmatter fields', () => {
    it('returns error listing all unknown fields', () => {
      const content = `---
name: my-skill
description: A sample skill.
foo: bar
baz: qux
---

# My Skill
`;
      const { metadata } = parser.parse(content);

      const errors = validator.validate(metadata);

      expect(errors).toContainEqual({
        field: 'frontmatter',
        message: 'unexpected fields in frontmatter: foo, baz',
      });
    });
  });

  describe('validateOrThrow', () => {
    describe('with valid metadata', () => {
      it('does not throw', () => {
        const content = `---
name: my-skill
description: A sample skill.
---

# My Skill
`;
        const { metadata } = parser.parse(content);

        expect(() => validator.validateOrThrow(metadata)).not.toThrow();
      });
    });

    describe('with missing name', () => {
      it('throws SkillValidationError', () => {
        const content = `---
description: A sample skill without a name.
---

# My Skill
`;
        const { metadata } = parser.parse(content);

        expect(() => validator.validateOrThrow(metadata)).toThrow(
          SkillValidationError,
        );
      });
    });

    describe('with missing name and description', () => {
      it('throws error containing name field is missing message', () => {
        const content = `---
license: MIT
---

# My Skill
`;
        const { metadata } = parser.parse(content);

        expect(() => validator.validateOrThrow(metadata)).toThrow(
          'name field is missing',
        );
      });
    });
  });
});
