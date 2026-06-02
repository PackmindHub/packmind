import {
  SkillVersion,
  createSkillId,
  createSkillVersionId,
  createUserId,
} from '@packmind/types';
import { generateSkillMdContent } from './SkillMdContentBuilder';

function makeSkill(overrides: Partial<SkillVersion> = {}): SkillVersion {
  return {
    id: createSkillVersionId('sv1'),
    skillId: createSkillId('s1'),
    version: 1,
    userId: createUserId('u1'),
    name: 'Threat Model',
    slug: 'threat-model',
    description: 'Threat modeling skill',
    prompt: '# body',
    ...overrides,
  };
}

describe('generateSkillMdContent', () => {
  it('wraps the prompt with name and description frontmatter', () => {
    const content = generateSkillMdContent(makeSkill());

    expect(content).toBe(
      `---
name: 'Threat Model'
description: 'Threat modeling skill'
---

# body`,
    );
  });

  describe('when present', () => {
    let content: string;

    beforeEach(() => {
      content = generateSkillMdContent(
        makeSkill({
          license: 'MIT',
          compatibility: 'Claude Code',
          allowedTools: 'Read,Write',
        }),
      );
    });

    it('emits license', () => {
      expect(content).toContain("license: 'MIT'");
    });

    it('emits compatibility', () => {
      expect(content).toContain("compatibility: 'Claude Code'");
    });

    it('emits allowed-tools', () => {
      expect(content).toContain("allowed-tools: 'Read,Write'");
    });
  });

  it('renders metadata as nested YAML', () => {
    const content = generateSkillMdContent(
      makeSkill({ metadata: { category: 'security' } }),
    );

    expect(content).toContain(`metadata:
  category: 'security'`);
  });

  it('renders additionalProperties with kebab-cased keys', () => {
    const content = generateSkillMdContent(
      makeSkill({ additionalProperties: { someKey: 'value' } }),
    );

    expect(content).toContain("some-key: 'value'");
  });

  it('escapes single quotes in field values', () => {
    const content = generateSkillMdContent(makeSkill({ name: "Bob's skill" }));

    expect(content).toContain("name: 'Bob''s skill'");
  });

  describe('omits empty metadata and additionalProperties keys', () => {
    let content: string;

    beforeEach(() => {
      content = generateSkillMdContent(
        makeSkill({ metadata: {}, additionalProperties: {} }),
      );
    });

    it('does not contain metadata key', () => {
      expect(content).not.toContain('metadata:');
    });

    it('renders only name and description frontmatter', () => {
      expect(content).toBe(
        `---
name: 'Threat Model'
description: 'Threat modeling skill'
---

# body`,
      );
    });
  });
});
