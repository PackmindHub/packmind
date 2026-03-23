import {
  parseSkillMdContent,
  serializeSkillMetadata,
} from '@packmind/node-utils';
import {
  ChangeProposalType,
  createOrganizationId,
  createSpaceId,
  createUserId,
  ISkillsPort,
} from '@packmind/types';
import { changeProposalFactory } from '@packmind/playbook-change-management/test/changeProposalFactory';
import { skillFactory } from '@packmind/skills/test/skillFactory';
import { SkillCreateChangeProposalApplier } from './SkillCreateChangeProposalApplier';

describe('SkillCreateChangeProposalApplier', () => {
  const organizationId = createOrganizationId('org-id');
  const spaceId = createSpaceId('space-id');
  const userId = createUserId('user-id');

  let skillsPort: jest.Mocked<Pick<ISkillsPort, 'uploadSkill'>>;
  let applier: SkillCreateChangeProposalApplier;
  let capturedSkillMdContent: string;

  beforeEach(() => {
    capturedSkillMdContent = '';
    skillsPort = {
      uploadSkill: jest.fn().mockImplementation((cmd) => {
        const skillMdFile = cmd.files.find(
          (f: { path: string }) => f.path === 'SKILL.md',
        );
        capturedSkillMdContent = skillMdFile?.content ?? '';
        return Promise.resolve({ skill: skillFactory() });
      }),
    };
    applier = new SkillCreateChangeProposalApplier(
      skillsPort as unknown as ISkillsPort,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSkillMd — YAML injection safety', () => {
    describe('when name contains YAML special characters', () => {
      beforeEach(async () => {
        const proposal = changeProposalFactory({
          type: ChangeProposalType.createSkill,
          createdBy: userId,
          payload: {
            name: 'my: skill',
            description: 'A description',
            prompt: 'Do something',
          },
        });
        await applier.apply(proposal, spaceId, organizationId);
      });

      it('produces parseable YAML frontmatter', () => {
        const parsed = parseSkillMdContent(capturedSkillMdContent);

        expect(parsed?.properties.name).toBe('my: skill');
      });
    });

    describe('when description starts with a YAML special character', () => {
      beforeEach(async () => {
        const proposal = changeProposalFactory({
          type: ChangeProposalType.createSkill,
          createdBy: userId,
          payload: {
            name: 'test-skill',
            description: '{curly braces are special}',
            prompt: 'Do something',
          },
        });
        await applier.apply(proposal, spaceId, organizationId);
      });

      it('produces parseable YAML frontmatter', () => {
        const parsed = parseSkillMdContent(capturedSkillMdContent);

        expect(parsed?.properties.description).toBe(
          '{curly braces are special}',
        );
      });
    });

    describe('when license contains YAML special characters', () => {
      let parsed: ReturnType<typeof parseSkillMdContent>;

      beforeEach(async () => {
        const proposal = changeProposalFactory({
          type: ChangeProposalType.createSkill,
          createdBy: userId,
          payload: {
            name: 'test-skill',
            description: 'A description',
            prompt: 'Do something',
            license: 'MIT: v2',
            compatibility: '[cursor, claude]',
          },
        });
        await applier.apply(proposal, spaceId, organizationId);
        parsed = parseSkillMdContent(capturedSkillMdContent);
      });

      it('preserves the license value', () => {
        expect(parsed?.properties.license).toBe('MIT: v2');
      });

      it('preserves the compatibility value', () => {
        expect(parsed?.properties.compatibility).toBe('[cursor, claude]');
      });
    });

    describe('when allowedTools contains special characters', () => {
      beforeEach(async () => {
        const proposal = changeProposalFactory({
          type: ChangeProposalType.createSkill,
          createdBy: userId,
          payload: {
            name: 'test-skill',
            description: 'A description',
            prompt: 'Do something',
            allowedTools: 'tool: #1, tool: #2',
          },
        });
        await applier.apply(proposal, spaceId, organizationId);
      });

      it('produces parseable YAML frontmatter', () => {
        const parsed = parseSkillMdContent(capturedSkillMdContent);

        expect(parsed?.properties.allowedTools).toBe('tool: #1, tool: #2');
      });
    });
  });

  describe('generateSkillMd — metadata serialization', () => {
    describe('when metadata has unordered keys', () => {
      const metadata = { z: 'last', a: 'first', m: 'middle' };

      beforeEach(async () => {
        const proposal = changeProposalFactory({
          type: ChangeProposalType.createSkill,
          createdBy: userId,
          payload: {
            name: 'test-skill',
            description: 'A description',
            prompt: 'Do something',
            metadata,
          },
        });
        await applier.apply(proposal, spaceId, organizationId);
      });

      it('serializes metadata with keys sorted alphabetically', () => {
        expect(capturedSkillMdContent).toContain(
          `metadata: ${serializeSkillMetadata(metadata)}`,
        );
      });
    });
  });

  describe('generateSkillMd — additionalProperties', () => {
    describe('when payload has additionalProperties', () => {
      let parsed: ReturnType<typeof parseSkillMdContent>;

      beforeEach(async () => {
        const proposal = changeProposalFactory({
          type: ChangeProposalType.createSkill,
          createdBy: userId,
          payload: {
            name: 'test-skill',
            description: 'A description',
            prompt: 'Do something',
            additionalProperties: { model: 'opus', userInvocable: true },
          },
        });
        await applier.apply(proposal, spaceId, organizationId);
        parsed = parseSkillMdContent(capturedSkillMdContent);
      });

      it('includes model in frontmatter as kebab-case', () => {
        expect(parsed?.properties['model']).toBe('opus');
      });

      it('includes user-invocable in frontmatter as kebab-case', () => {
        expect(parsed?.properties['user-invocable']).toBe(true);
      });
    });

    describe('when payload has no additionalProperties', () => {
      let parsed: ReturnType<typeof parseSkillMdContent>;

      beforeEach(async () => {
        const proposal = changeProposalFactory({
          type: ChangeProposalType.createSkill,
          createdBy: userId,
          payload: {
            name: 'test-skill',
            description: 'A description',
            prompt: 'Do something',
          },
        });
        await applier.apply(proposal, spaceId, organizationId);
        parsed = parseSkillMdContent(capturedSkillMdContent);
      });

      it('does not include extra fields in frontmatter', () => {
        const keys = Object.keys(parsed?.properties ?? {});
        expect(keys).toEqual(['name', 'description']);
      });
    });
  });

  describe('generateSkillMd — happy path', () => {
    let parsed: ReturnType<typeof parseSkillMdContent>;

    beforeEach(async () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.createSkill,
        createdBy: userId,
        payload: {
          name: 'My Skill',
          description: 'A useful skill',
          prompt: 'Do the thing',
          license: 'MIT',
          compatibility: 'cursor',
          metadata: { author: 'test' },
          allowedTools: 'Read,Write',
        },
      });
      await applier.apply(proposal, spaceId, organizationId);
      parsed = parseSkillMdContent(capturedSkillMdContent);
    });

    it('parses the name correctly', () => {
      expect(parsed?.properties.name).toBe('My Skill');
    });

    it('parses the description correctly', () => {
      expect(parsed?.properties.description).toBe('A useful skill');
    });

    it('parses the license correctly', () => {
      expect(parsed?.properties.license).toBe('MIT');
    });

    it('parses the compatibility correctly', () => {
      expect(parsed?.properties.compatibility).toBe('cursor');
    });

    it('parses the allowedTools correctly', () => {
      expect(parsed?.properties.allowedTools).toBe('Read,Write');
    });

    it('parses the prompt body correctly', () => {
      expect(parsed?.body).toBe('Do the thing');
    });
  });
});
