import { CopilotPluginDeployer } from './CopilotPluginDeployer';
import {
  GitRepo,
  CommandVersion,
  SkillFile,
  SkillVersion,
  StandardVersion,
  Target,
  createCommandId,
  createCommandVersionId,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createTargetId,
  createUserId,
} from '@packmind/types';

function makeTarget(path: string): Target {
  return {
    id: createTargetId('t1'),
    name: 'plugin-root',
    path,
    gitRepoId: 'g1' as Target['gitRepoId'],
  };
}

function makeCommand(overrides: Partial<CommandVersion> = {}): CommandVersion {
  return {
    id: createCommandVersionId('rv1'),
    recipeId: createCommandId('r1'),
    name: 'audit',
    slug: 'audit',
    content: '# audit\n',
    version: 1,
    userId: null,
    ...overrides,
  };
}

function makeSkillFile(overrides: Partial<SkillFile> = {}): SkillFile {
  return {
    id: createSkillFileId('sf1'),
    skillVersionId: createSkillVersionId('sv1'),
    path: 'SKILL.md',
    content: '# skill\n',
    permissions: '0644',
    isBase64: false,
    ...overrides,
  };
}

function makeSkill(overrides: Partial<SkillVersion> = {}): SkillVersion {
  return {
    id: createSkillVersionId('sv1'),
    skillId: createSkillId('s1'),
    version: 1,
    userId: createUserId('u1'),
    name: 'Threat Model',
    slug: 'threat-model',
    description: 'Threat modeling skill',
    prompt: '# prompt\n',
    ...overrides,
  };
}

describe('CopilotPluginDeployer', () => {
  describe('constructor', () => {
    it('instantiates without throwing', () => {
      expect(() => new CopilotPluginDeployer()).not.toThrow();
    });
  });

  describe('deployCommands', () => {
    it('renders one .prompt.md per command under <plugin-root>/.github/prompts/', async () => {
      const deployer = new CopilotPluginDeployer();
      const command = makeCommand({ slug: 'audit' });

      const result = await deployer.deployCommands(
        [command],
        {} as GitRepo,
        makeTarget('/'),
      );

      const paths = result.createOrUpdate.map((f) => f.path);
      expect(paths).toEqual(['.github/prompts/audit.prompt.md']);
    });

    it('does not render the Claude-style commands/<slug>.md path', async () => {
      const result = await new CopilotPluginDeployer().deployCommands(
        [makeCommand({ slug: 'audit' })],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(result.createOrUpdate.map((f) => f.path)).not.toContain(
        'commands/audit.md',
      );
    });

    it('renders one .prompt.md per command for multiple commands', async () => {
      const result = await new CopilotPluginDeployer().deployCommands(
        [makeCommand({ slug: 'audit' }), makeCommand({ slug: 'refactor' })],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(result.createOrUpdate.map((f) => f.path).sort()).toEqual([
        '.github/prompts/audit.prompt.md',
        '.github/prompts/refactor.prompt.md',
      ]);
    });

    describe('when no commands', () => {
      it('returns an empty createOrUpdate', async () => {
        const result = await new CopilotPluginDeployer().deployCommands(
          [],
          {} as GitRepo,
          makeTarget('/'),
        );
        expect(result.createOrUpdate).toEqual([]);
      });
    });

    describe('when Target.path is "/"', () => {
      it('uses no prefix', async () => {
        const result = await new CopilotPluginDeployer().deployCommands(
          [makeCommand({ slug: 'audit' })],
          {} as GitRepo,
          makeTarget('/'),
        );
        expect(result.createOrUpdate[0].path).toBe(
          '.github/prompts/audit.prompt.md',
        );
      });
    });

    describe('when Target.path is empty', () => {
      it('uses no prefix', async () => {
        const result = await new CopilotPluginDeployer().deployCommands(
          [makeCommand({ slug: 'audit' })],
          {} as GitRepo,
          makeTarget(''),
        );
        expect(result.createOrUpdate[0].path).toBe(
          '.github/prompts/audit.prompt.md',
        );
      });
    });

    describe('when Target.path has no trailing slash', () => {
      it('appends a trailing slash to the plugin root prefix', async () => {
        const result = await new CopilotPluginDeployer().deployCommands(
          [makeCommand({ slug: 'audit' })],
          {} as GitRepo,
          makeTarget('plugins/foo'),
        );
        expect(result.createOrUpdate[0].path).toBe(
          'plugins/foo/.github/prompts/audit.prompt.md',
        );
      });
    });

    describe('when Target.path has a trailing slash', () => {
      it('does not duplicate the trailing slash', async () => {
        const result = await new CopilotPluginDeployer().deployCommands(
          [makeCommand({ slug: 'audit' })],
          {} as GitRepo,
          makeTarget('plugins/foo/'),
        );
        expect(result.createOrUpdate[0].path).toBe(
          'plugins/foo/.github/prompts/audit.prompt.md',
        );
      });
    });

    it('propagates command content into the file body', async () => {
      const result = await new CopilotPluginDeployer().deployCommands(
        [makeCommand({ slug: 'audit', content: '# hello' })],
        {} as GitRepo,
        makeTarget('/'),
      );
      const file = result.createOrUpdate[0];
      if (file.content === undefined) throw new Error('expected content');
      expect(file.content).toBe('# hello');
    });

    describe('tags the file with command metadata', () => {
      let result: Awaited<ReturnType<CopilotPluginDeployer['deployCommands']>>;

      beforeEach(async () => {
        const command = makeCommand({
          slug: 'audit',
          name: 'Audit',
          recipeId: createCommandId('recipe-abc'),
        });
        result = await new CopilotPluginDeployer().deployCommands(
          [command],
          {} as GitRepo,
          makeTarget('/'),
        );
      });

      it('tags the file with artifactType "command"', () => {
        expect(result.createOrUpdate[0].artifactType).toBe('command');
      });

      it('tags the file with the command name', () => {
        expect(result.createOrUpdate[0].artifactName).toBe('Audit');
      });

      it('tags the file with the command id', () => {
        expect(result.createOrUpdate[0].artifactId).toBe('recipe-abc');
      });
    });
  });

  describe('deploySkills', () => {
    it('renders SKILL.md per skill under <plugin-root>/skills/<slug>/', async () => {
      const skill = makeSkill({
        slug: 'threat-model',
        files: [
          makeSkillFile({ path: 'SKILL.md', content: '# main skill body' }),
        ],
      });

      const result = await new CopilotPluginDeployer().deploySkills(
        [skill],
        {} as GitRepo,
        makeTarget('plugins/security/'),
      );

      expect(result.createOrUpdate.map((f) => f.path)).toEqual([
        'plugins/security/skills/threat-model/SKILL.md',
      ]);
    });

    it('renders nested skill files preserving relative paths', async () => {
      const skill = makeSkill({
        slug: 'threat-model',
        files: [
          makeSkillFile({ path: 'SKILL.md', content: '# main' }),
          makeSkillFile({
            id: createSkillFileId('sf2'),
            path: 'references/example.md',
            content: 'ex',
          }),
        ],
      });

      const result = await new CopilotPluginDeployer().deploySkills(
        [skill],
        {} as GitRepo,
        makeTarget('/'),
      );

      expect(result.createOrUpdate.map((f) => f.path).sort()).toEqual([
        'skills/threat-model/SKILL.md',
        'skills/threat-model/references/example.md',
      ]);
    });

    describe('when no files are provided', () => {
      let result: Awaited<ReturnType<CopilotPluginDeployer['deploySkills']>>;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          name: 'Threat Model',
          description: 'Threat modeling skill',
          prompt: '# prompt body',
          files: undefined,
        });

        result = await new CopilotPluginDeployer().deploySkills(
          [skill],
          {} as GitRepo,
          makeTarget('/'),
        );
      });

      it('generates exactly one SKILL.md', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('generates SKILL.md at the correct path', () => {
        expect(result.createOrUpdate[0].path).toBe(
          'skills/threat-model/SKILL.md',
        );
      });

      it('generates SKILL.md with name in frontmatter from the skill version', () => {
        const file = result.createOrUpdate[0];
        if (file.content === undefined) throw new Error('expected content');
        expect(file.content).toContain("name: 'Threat Model'");
      });

      it('generates SKILL.md with prompt body from the skill version', () => {
        const file = result.createOrUpdate[0];
        if (file.content === undefined) throw new Error('expected content');
        expect(file.content).toContain('# prompt body');
      });
    });

    describe('when no skills', () => {
      it('returns empty', async () => {
        const result = await new CopilotPluginDeployer().deploySkills(
          [],
          {} as GitRepo,
          makeTarget('/'),
        );
        expect(result.createOrUpdate).toEqual([]);
      });
    });

    describe('tags each file with skill metadata', () => {
      let result: Awaited<ReturnType<CopilotPluginDeployer['deploySkills']>>;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          skillId: createSkillId('skill-abc'),
          files: [makeSkillFile({ path: 'SKILL.md' })],
        });
        result = await new CopilotPluginDeployer().deploySkills(
          [skill],
          {} as GitRepo,
          makeTarget('/'),
        );
      });

      it('tags each file with artifactType "skill"', () => {
        expect(result.createOrUpdate[0].artifactType).toBe('skill');
      });

      it('tags each file with the skill id', () => {
        expect(result.createOrUpdate[0].artifactId).toBe('skill-abc');
      });
    });
  });

  describe('deployStandards', () => {
    describe('when standards are present', () => {
      let result: Awaited<ReturnType<CopilotPluginDeployer['deployStandards']>>;

      beforeEach(async () => {
        const standards = [
          {} as StandardVersion,
          {} as StandardVersion,
          {} as StandardVersion,
        ];
        result = await new CopilotPluginDeployer().deployStandards(
          standards,
          {} as GitRepo,
          makeTarget('/'),
        );
      });

      it('returns empty createOrUpdate', () => {
        expect(result.createOrUpdate).toEqual([]);
      });

      it('returns empty delete', () => {
        expect(result.delete).toEqual([]);
      });
    });

    it('exposes the skipped count via getLastSkippedStandardsCount()', async () => {
      const deployer = new CopilotPluginDeployer();
      await deployer.deployStandards(
        [{} as StandardVersion, {} as StandardVersion],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(deployer.getLastSkippedStandardsCount()).toBe(2);
    });

    it('resets the skipped count on a subsequent empty call', async () => {
      const deployer = new CopilotPluginDeployer();
      await deployer.deployStandards(
        [{} as StandardVersion],
        {} as GitRepo,
        makeTarget('/'),
      );
      await deployer.deployStandards([], {} as GitRepo, makeTarget('/'));
      expect(deployer.getLastSkippedStandardsCount()).toBe(0);
    });

    it('starts with a skipped count of zero before any call', () => {
      const deployer = new CopilotPluginDeployer();
      expect(deployer.getLastSkippedStandardsCount()).toBe(0);
    });
  });

  describe('getSkillsFolderPath', () => {
    it('returns the plugin-relative skills folder so the capability flag matches', () => {
      expect(new CopilotPluginDeployer().getSkillsFolderPath()).toBe('skills/');
    });
  });
});
