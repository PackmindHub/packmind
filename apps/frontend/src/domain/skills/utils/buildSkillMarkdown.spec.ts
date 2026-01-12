import { skillVersionFactory } from '@packmind/skills/test';
import { buildSkillMarkdown } from './buildSkillMarkdown';

describe('buildSkillMarkdown', () => {
  describe('with all fields populated', () => {
    const skillVersion = skillVersionFactory({
      name: 'Test Skill',
      description: 'A test skill description',
      prompt: 'This is the skill prompt content',
      license: 'MIT',
      compatibility: 'claude-code v1.0+',
      metadata: { category: 'testing', version: '1.0' },
      allowedTools: 'Read, Write, Bash',
    });

    it('includes YAML frontmatter delimiters', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toMatch(/^---\n[\s\S]*\n---\n/);
    });

    it('includes name field with single quotes', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("name: 'Test Skill'");
    });

    it('includes description field with single quotes', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("description: 'A test skill description'");
    });

    it('includes license field with single quotes', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("license: 'MIT'");
    });

    it('includes compatibility field with single quotes', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("compatibility: 'claude-code v1.0+'");
    });

    it('includes metadata header in YAML', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('metadata:');
    });

    it('includes metadata category as nested YAML', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("  category: 'testing'");
    });

    it('includes metadata version as nested YAML', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("  version: '1.0'");
    });

    it('includes allowed-tools field with single quotes', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("allowed-tools: 'Read, Write, Bash'");
    });

    it('includes prompt content after frontmatter', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('This is the skill prompt content');
    });

    it('separates frontmatter from prompt with blank line', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toMatch(/---\n\nThis is the skill prompt content/);
    });
  });

  describe('with only required fields', () => {
    const skillVersion = skillVersionFactory({
      name: 'Minimal Skill',
      description: 'Minimal description',
      prompt: 'Minimal prompt',
      license: undefined,
      compatibility: undefined,
      metadata: undefined,
      allowedTools: undefined,
    });

    it('omits license field', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).not.toContain('license:');
    });

    it('omits compatibility field', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).not.toContain('compatibility:');
    });

    it('omits metadata field', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).not.toContain('metadata:');
    });

    it('omits allowed-tools field', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).not.toContain('allowed-tools:');
    });

    it('includes name field with single quotes', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("name: 'Minimal Skill'");
    });

    it('includes description field', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("description: 'Minimal description'");
    });
  });

  describe('with single quotes in values', () => {
    const skillVersion = skillVersionFactory({
      name: 'Skill with quotes',
      description: "This skill's description has 'single quotes'",
      prompt: 'Test prompt',
      license: "O'Reilly License",
      compatibility: undefined,
      metadata: { author: "John's Company" },
      allowedTools: undefined,
    });

    it('escapes single quotes in description', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain(
        "description: 'This skill''s description has ''single quotes'''",
      );
    });

    it('escapes single quotes in license', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("license: 'O''Reilly License'");
    });

    it('escapes single quotes in metadata values', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("  author: 'John''s Company'");
    });
  });

  describe('with double quotes in values', () => {
    const skillVersion = skillVersionFactory({
      name: 'Skill with double quotes',
      description: 'This skill has "double quotes" in description',
      prompt: 'Test prompt',
      license: undefined,
      compatibility: undefined,
      metadata: undefined,
      allowedTools: undefined,
    });

    it('preserves double quotes in YAML values', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain(
        'description: \'This skill has "double quotes" in description\'',
      );
    });
  });

  describe('with special characters in name', () => {
    const skillVersion = skillVersionFactory({
      name: "What's This: A Test",
      description: 'Description',
      prompt: 'Test prompt',
      license: undefined,
      compatibility: undefined,
      metadata: undefined,
      allowedTools: undefined,
    });

    it('escapes single quotes in name', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain("name: 'What''s This: A Test'");
    });
  });

  describe('with empty metadata object', () => {
    const skillVersion = skillVersionFactory({
      name: 'Skill with empty metadata',
      description: 'Description',
      prompt: 'Prompt',
      license: undefined,
      compatibility: undefined,
      metadata: {},
      allowedTools: undefined,
    });

    it('omits metadata field when object is empty', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).not.toContain('metadata:');
    });
  });

  describe('with multiline prompt', () => {
    const skillVersion = skillVersionFactory({
      name: 'Multiline Skill',
      description: 'A skill with multiline prompt',
      prompt: `# Skill Instructions

This is a multiline prompt.

## Steps
1. First step
2. Second step

Done.`,
      license: undefined,
      compatibility: undefined,
      metadata: undefined,
      allowedTools: undefined,
    });

    it('preserves heading in multiline prompt', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('# Skill Instructions');
    });

    it('preserves paragraph text in multiline prompt', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('This is a multiline prompt.');
    });

    it('preserves subheading in multiline prompt', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('## Steps');
    });

    it('preserves list items in multiline prompt', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('1. First step');
    });
  });

  describe('with multiline description', () => {
    const skillVersion = skillVersionFactory({
      name: 'Multiline Description Skill',
      description: `This is line 1
This is line 2`,
      prompt: 'Test prompt',
      license: undefined,
      compatibility: undefined,
      metadata: undefined,
      allowedTools: undefined,
    });

    it('uses YAML block scalar syntax for multiline description', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('description: |');
    });

    it('indents first line of multiline description', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('  This is line 1');
    });

    it('indents second line of multiline description', () => {
      const result = buildSkillMarkdown(skillVersion);

      expect(result).toContain('  This is line 2');
    });
  });
});
