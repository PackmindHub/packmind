import { parseSkillMd } from './parseSkillMd';

describe('parseSkillMd', () => {
  describe('when parsing a valid SKILL.md', () => {
    const content = `---
name: 'My Skill'
description: 'A helpful skill'
license: 'MIT'
compatibility: 'Claude Code'
allowed-tools: 'Read,Write'
metadata:
  category: 'testing'
  version: '1.0'
---

This is the prompt body.`;

    it('extracts the name', () => {
      const result = parseSkillMd(content);

      expect(result?.name).toBe('My Skill');
    });

    it('extracts the description', () => {
      const result = parseSkillMd(content);

      expect(result?.description).toBe('A helpful skill');
    });

    it('extracts the body as prompt', () => {
      const result = parseSkillMd(content);

      expect(result?.body).toBe('This is the prompt body.');
    });

    it('serializes remaining fields as sorted JSON metadata', () => {
      const result = parseSkillMd(content);
      const metadata = JSON.parse(result!.metadataJson);

      expect(metadata).toEqual({
        allowedTools: 'Read,Write',
        compatibility: 'Claude Code',
        license: 'MIT',
        metadata: { category: 'testing', version: '1.0' },
      });
    });
  });

  describe('when name or description is missing', () => {
    const content = `---
license: 'MIT'
---

Body content.`;

    it('returns empty string for name', () => {
      const result = parseSkillMd(content);

      expect(result?.name).toBe('');
    });

    it('returns empty string for description', () => {
      const result = parseSkillMd(content);

      expect(result?.description).toBe('');
    });
  });

  describe('when frontmatter is malformed', () => {
    it('returns null for content without frontmatter', () => {
      const result = parseSkillMd('No frontmatter here');

      expect(result).toBeNull();
    });

    it('returns null for unclosed frontmatter', () => {
      const result = parseSkillMd('---\nname: test\nNo closing');

      expect(result).toBeNull();
    });
  });

  describe('when metadata has no extra fields', () => {
    const content = `---
name: 'Simple Skill'
description: 'Just name and desc'
---

Prompt.`;

    it('serializes empty metadata as empty JSON object', () => {
      const result = parseSkillMd(content);

      expect(result?.metadataJson).toBe('{}');
    });
  });
});
