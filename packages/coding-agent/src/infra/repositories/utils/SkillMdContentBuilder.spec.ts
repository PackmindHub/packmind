import {
  SkillVersion,
  createSkillId,
  createSkillVersionId,
  createUserId,
} from '@packmind/types';
import {
  generateSkillMdContent,
  generateSkillMdContentWithYamlFrontmatter,
} from './SkillMdContentBuilder';

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

  it('emits disallowed-tools after shell in canonical order', () => {
    const content = generateSkillMdContent(
      makeSkill({
        additionalProperties: { disallowedTools: ['Monitor'], shell: 'bash' },
      }),
    );

    expect(content.indexOf('disallowed-tools:')).toBeGreaterThan(
      content.indexOf('shell:'),
    );
  });

  it('produces identical output on two renders of the same skill', () => {
    const skill = makeSkill({
      additionalProperties: { disallowedTools: ['Monitor', 'AskUserQuestion'] },
    });

    expect(generateSkillMdContent(skill)).toBe(generateSkillMdContent(skill));
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

describe('generateSkillMdContentWithYamlFrontmatter', () => {
  it('wraps the prompt with unquoted name and description frontmatter', () => {
    const content = generateSkillMdContentWithYamlFrontmatter(makeSkill());

    expect(content).toBe(
      `---
name: Threat Model
description: Threat modeling skill
---

# body`,
    );
  });

  describe('when a value contains an apostrophe', () => {
    it('leaves it unquoted', () => {
      const content = generateSkillMdContentWithYamlFrontmatter(
        makeSkill({ name: "Bob's skill" }),
      );

      expect(content).toContain("name: Bob's skill");
    });
  });

  describe('when a value needs quoting to stay valid YAML', () => {
    it('quotes a description holding a colon', () => {
      const content = generateSkillMdContentWithYamlFrontmatter(
        makeSkill({ description: 'Use this: always' }),
      );

      expect(content).toContain('description: "Use this: always"');
    });

    it('quotes a name opening with a reserved indicator', () => {
      const content = generateSkillMdContentWithYamlFrontmatter(
        makeSkill({ name: '@scoped/thing' }),
      );

      expect(content).toContain('name: "@scoped/thing"');
    });
  });

  describe('when the description is longer than the default line width', () => {
    it('keeps it on a single line', () => {
      const description =
        'A deliberately long description that runs well past the eighty columns at which the yaml library folds a plain scalar by default';

      const content = generateSkillMdContentWithYamlFrontmatter(
        makeSkill({ description }),
      );

      expect(content).toContain(`description: ${description}\n`);
    });
  });

  describe('when license, compatibility and allowed-tools are present', () => {
    let content: string;

    beforeEach(() => {
      content = generateSkillMdContentWithYamlFrontmatter(
        makeSkill({
          license: 'MIT',
          compatibility: 'Claude Code',
          allowedTools: 'Read,Write',
        }),
      );
    });

    it('emits license unquoted', () => {
      expect(content).toContain('license: MIT');
    });

    it('emits compatibility unquoted', () => {
      expect(content).toContain('compatibility: Claude Code');
    });

    it('emits allowed-tools unquoted', () => {
      expect(content).toContain('allowed-tools: Read,Write');
    });
  });

  it('renders metadata as nested YAML', () => {
    const content = generateSkillMdContentWithYamlFrontmatter(
      makeSkill({ metadata: { category: 'security' } }),
    );

    expect(content).toContain(`metadata:
  category: security`);
  });

  it('renders additionalProperties with kebab-cased keys', () => {
    const content = generateSkillMdContentWithYamlFrontmatter(
      makeSkill({ additionalProperties: { someKey: 'value' } }),
    );

    expect(content).toContain('some-key: value');
  });

  it('emits disallowed-tools after shell in canonical order', () => {
    const content = generateSkillMdContentWithYamlFrontmatter(
      makeSkill({
        additionalProperties: { disallowedTools: ['Monitor'], shell: 'bash' },
      }),
    );

    expect(content.indexOf('disallowed-tools:')).toBeGreaterThan(
      content.indexOf('shell:'),
    );
  });

  it('produces identical output on two renders of the same skill', () => {
    const skill = makeSkill({
      additionalProperties: { disallowedTools: ['Monitor', 'AskUserQuestion'] },
    });

    expect(generateSkillMdContentWithYamlFrontmatter(skill)).toBe(
      generateSkillMdContentWithYamlFrontmatter(skill),
    );
  });

  describe('when metadata and additionalProperties are empty', () => {
    it('renders only name and description frontmatter', () => {
      const content = generateSkillMdContentWithYamlFrontmatter(
        makeSkill({ metadata: {}, additionalProperties: {} }),
      );

      expect(content).toBe(
        `---
name: Threat Model
description: Threat modeling skill
---

# body`,
      );
    });
  });
});
