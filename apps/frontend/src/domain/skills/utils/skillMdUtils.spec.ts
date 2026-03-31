import type { SkillVersion } from '@packmind/types';

import { buildSkillMdContent } from './skillMdUtils';

const makeVersion = (overrides: Partial<SkillVersion> = {}): SkillVersion =>
  ({
    id: 'v1' as SkillVersion['id'],
    skillId: 's1' as SkillVersion['skillId'],
    version: 1,
    name: 'My Skill',
    slug: 'my-skill',
    description: 'A useful skill',
    prompt: 'This is the skill body.',
    userId: 'u1' as SkillVersion['userId'],
    ...overrides,
  }) as SkillVersion;

describe('buildSkillMdContent', () => {
  describe('regression: copying SKILL.md file omits frontmatter', () => {
    it('produces content that is not just the raw prompt', () => {
      const version = makeVersion();

      const content = buildSkillMdContent(version);

      expect(content).not.toBe(version.prompt);
    });

    it('raw prompt does not contain the name', () => {
      const version = makeVersion({
        name: 'My Skill',
        prompt: 'Just the body',
      });

      expect(version.prompt).not.toContain('My Skill');
    });

    it('reconstructed content includes the name absent from the raw prompt', () => {
      const version = makeVersion({
        name: 'My Skill',
        prompt: 'Just the body',
      });

      const content = buildSkillMdContent(version);

      expect(content).toContain('My Skill');
    });

    it('raw prompt does not contain the description', () => {
      const version = makeVersion({
        description: 'A useful skill',
        prompt: 'Just the body',
      });

      expect(version.prompt).not.toContain('A useful skill');
    });

    it('reconstructed content includes the description absent from the raw prompt', () => {
      const version = makeVersion({
        description: 'A useful skill',
        prompt: 'Just the body',
      });

      const content = buildSkillMdContent(version);

      expect(content).toContain('A useful skill');
    });
  });

  describe('frontmatter structure', () => {
    it('starts with the opening --- delimiter', () => {
      const content = buildSkillMdContent(makeVersion());

      expect(content).toMatch(/^---\n/);
    });

    it('contains a closing --- delimiter', () => {
      const content = buildSkillMdContent(makeVersion());

      expect(content).toContain('\n---\n');
    });

    it('includes name', () => {
      const content = buildSkillMdContent(makeVersion({ name: 'My Skill' }));

      expect(content).toContain('My Skill');
    });

    it('includes description', () => {
      const content = buildSkillMdContent(
        makeVersion({ description: 'A useful skill' }),
      );

      expect(content).toContain('A useful skill');
    });

    describe('when license is set', () => {
      it('includes it in the frontmatter', () => {
        const content = buildSkillMdContent(makeVersion({ license: 'MIT' }));

        expect(content).toContain('MIT');
      });
    });

    describe('when license is not set', () => {
      it('omits it from the frontmatter', () => {
        const content = buildSkillMdContent(
          makeVersion({ license: undefined }),
        );

        expect(content).not.toContain('license');
      });
    });

    describe('when compatibility is set', () => {
      it('includes it in the frontmatter', () => {
        const content = buildSkillMdContent(
          makeVersion({ compatibility: 'Node 22+' }),
        );

        expect(content).toContain('Node 22+');
      });
    });

    describe('when compatibility is not set', () => {
      it('omits it from the frontmatter', () => {
        const content = buildSkillMdContent(
          makeVersion({ compatibility: undefined }),
        );

        expect(content).not.toContain('compatibility');
      });
    });

    describe('when allowedTools is set', () => {
      it('uses the allowed-tools key', () => {
        const content = buildSkillMdContent(
          makeVersion({ allowedTools: 'Read,Write' }),
        );

        expect(content).toContain('allowed-tools');
      });

      it('includes the allowedTools value', () => {
        const content = buildSkillMdContent(
          makeVersion({ allowedTools: 'Read,Write' }),
        );

        expect(content).toContain('Read,Write');
      });
    });

    describe('when allowedTools is not set', () => {
      it('omits allowed-tools from the frontmatter', () => {
        const content = buildSkillMdContent(
          makeVersion({ allowedTools: undefined }),
        );

        expect(content).not.toContain('allowed-tools');
      });
    });

    describe('when metadata is set', () => {
      it('includes the metadata key', () => {
        const content = buildSkillMdContent(
          makeVersion({ metadata: { category: 'testing' } }),
        );

        expect(content).toContain('metadata');
      });

      it('includes the metadata entry key', () => {
        const content = buildSkillMdContent(
          makeVersion({ metadata: { category: 'testing' } }),
        );

        expect(content).toContain('category');
      });

      it('includes the metadata entry value', () => {
        const content = buildSkillMdContent(
          makeVersion({ metadata: { category: 'testing' } }),
        );

        expect(content).toContain('testing');
      });
    });

    describe('when metadata is not set', () => {
      it('omits metadata from the frontmatter', () => {
        const content = buildSkillMdContent(
          makeVersion({ metadata: undefined }),
        );

        expect(content).not.toContain('metadata');
      });
    });

    describe('when additionalProperties is set', () => {
      describe('includes a simple scalar property with kebab-case key', () => {
        let content: string;

        beforeEach(() => {
          content = buildSkillMdContent(
            makeVersion({
              additionalProperties: { argumentHint: '<url>' },
            }),
          );
        });

        it('includes the kebab-case key', () => {
          expect(content).toContain('argument-hint');
        });

        it('includes the value', () => {
          expect(content).toContain('<url>');
        });
      });

      it('includes a boolean additional property', () => {
        const content = buildSkillMdContent(
          makeVersion({
            additionalProperties: { userInvocable: true },
          }),
        );

        expect(content).toContain('user-invocable');
      });

      describe('includes a complex nested additional property', () => {
        let content: string;

        beforeEach(() => {
          content = buildSkillMdContent(
            makeVersion({
              additionalProperties: {
                hooks: {
                  preToolUse: [{ matcher: 'Bash', command: 'echo hi' }],
                },
              },
            }),
          );
        });

        it('includes the top-level key', () => {
          expect(content).toContain('hooks');
        });

        it('includes the nested key', () => {
          expect(content).toContain('preToolUse');
        });
      });
    });

    describe('when additionalProperties is not set', () => {
      describe('omits additional properties from the frontmatter', () => {
        let content: string;

        beforeEach(() => {
          content = buildSkillMdContent(
            makeVersion({ additionalProperties: undefined }),
          );
        });

        it('does not contain argument-hint', () => {
          expect(content).not.toContain('argument-hint');
        });

        it('does not contain user-invocable', () => {
          expect(content).not.toContain('user-invocable');
        });
      });
    });
  });

  describe('body', () => {
    it('includes the prompt content', () => {
      const version = makeVersion({ prompt: 'Skill body content here.' });

      const content = buildSkillMdContent(version);

      expect(content).toContain('Skill body content here.');
    });

    it('places the prompt after the closing ---', () => {
      const version = makeVersion({ prompt: 'Skill body content here.' });

      const content = buildSkillMdContent(version);

      const closingDelimiterIndex = content.indexOf('\n---\n', 1);
      const bodyPart = content.slice(closingDelimiterIndex);
      expect(bodyPart).toContain('Skill body content here.');
    });
  });
});
