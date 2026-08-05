import { ClaudePluginDeployer } from './ClaudePluginDeployer';
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

describe('ClaudePluginDeployer', () => {
  describe('constructor', () => {
    it('instantiates without throwing', () => {
      expect(() => new ClaudePluginDeployer()).not.toThrow();
    });
  });

  describe('deployRecipes', () => {
    it('renders one .md per recipe under <plugin-root>/commands/', async () => {
      const deployer = new ClaudePluginDeployer();
      const recipe = makeCommand({ slug: 'audit' });

      const result = await deployer.deployCommands(
        [recipe],
        {} as GitRepo,
        makeTarget('/'),
      );

      const paths = result.createOrUpdate.map((f) => f.path);
      expect(paths).toEqual(['commands/audit.md']);
    });

    describe('when no recipes', () => {
      it('returns an empty createOrUpdate', async () => {
        const result = await new ClaudePluginDeployer().deployCommands(
          [],
          {} as GitRepo,
          makeTarget('/'),
        );
        expect(result.createOrUpdate).toEqual([]);
      });
    });

    describe('when Target.path is set', () => {
      it('uses Target.path as the plugin root prefix', async () => {
        const result = await new ClaudePluginDeployer().deployCommands(
          [makeCommand({ slug: 'audit' })],
          {} as GitRepo,
          makeTarget('plugins/security/'),
        );
        expect(result.createOrUpdate[0].path).toBe(
          'plugins/security/commands/audit.md',
        );
      });
    });

    it('propagates recipe content into the file body', async () => {
      const result = await new ClaudePluginDeployer().deployCommands(
        [makeCommand({ slug: 'audit', content: '# hello' })],
        {} as GitRepo,
        makeTarget('/'),
      );
      const file = result.createOrUpdate[0];
      if (file.content === undefined) throw new Error('expected content');
      expect(file.content).toBe('# hello');
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

      const result = await new ClaudePluginDeployer().deploySkills(
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

      const result = await new ClaudePluginDeployer().deploySkills(
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
      let result: Awaited<ReturnType<ClaudePluginDeployer['deploySkills']>>;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          name: 'Threat Model',
          description: 'Threat modeling skill',
          prompt: '# prompt body',
          files: undefined,
        });

        result = await new ClaudePluginDeployer().deploySkills(
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

      it('generates SKILL.md with description in frontmatter from the skill version', () => {
        const file = result.createOrUpdate[0];
        if (file.content === undefined) throw new Error('expected content');
        expect(file.content).toContain("description: 'Threat modeling skill'");
      });

      it('generates SKILL.md with prompt body from the skill version', () => {
        const file = result.createOrUpdate[0];
        if (file.content === undefined) throw new Error('expected content');
        expect(file.content).toContain('# prompt body');
      });
    });

    describe('always generates SKILL.md with frontmatter, ignoring any SKILL.md in files', () => {
      let result: Awaited<ReturnType<ClaudePluginDeployer['deploySkills']>>;
      let skillMd: (typeof result.createOrUpdate)[0] | undefined;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          name: 'Threat Model',
          description: 'Threat modeling skill',
          prompt: '# generated body',
          files: [
            makeSkillFile({
              path: 'SKILL.md',
              content: '# raw without frontmatter',
            }),
            makeSkillFile({
              id: createSkillFileId('sf2'),
              path: 'references/example.md',
              content: 'ex',
            }),
          ],
        });

        result = await new ClaudePluginDeployer().deploySkills(
          [skill],
          {} as GitRepo,
          makeTarget('/'),
        );

        skillMd = result.createOrUpdate.find(
          (f) => f.path === 'skills/threat-model/SKILL.md',
        );
      });

      it('includes name frontmatter in generated SKILL.md', () => {
        if (!skillMd?.content) throw new Error('expected SKILL.md');
        expect(skillMd.content).toContain("name: 'Threat Model'");
      });

      it('includes the generated prompt body in SKILL.md', () => {
        if (!skillMd?.content) throw new Error('expected SKILL.md');
        expect(skillMd.content).toContain('# generated body');
      });

      it('does not include the raw SKILL.md content', () => {
        if (!skillMd?.content) throw new Error('expected SKILL.md');
        expect(skillMd.content).not.toContain('# raw without frontmatter');
      });

      it('outputs all expected file paths', () => {
        expect(result.createOrUpdate.map((f) => f.path).sort()).toEqual([
          'skills/threat-model/SKILL.md',
          'skills/threat-model/references/example.md',
        ]);
      });
    });

    describe('when no skills', () => {
      it('returns empty', async () => {
        const result = await new ClaudePluginDeployer().deploySkills(
          [],
          {} as GitRepo,
          makeTarget('/'),
        );
        expect(result.createOrUpdate).toEqual([]);
      });
    });

    describe('tags each file with skill metadata', () => {
      let result: Awaited<ReturnType<ClaudePluginDeployer['deploySkills']>>;

      beforeEach(async () => {
        const skill = makeSkill({
          slug: 'threat-model',
          skillId: createSkillId('skill-abc'),
          files: [makeSkillFile({ path: 'SKILL.md' })],
        });
        result = await new ClaudePluginDeployer().deploySkills(
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
      let result: Awaited<ReturnType<ClaudePluginDeployer['deployStandards']>>;

      beforeEach(async () => {
        const standards = [
          {} as StandardVersion,
          {} as StandardVersion,
          {} as StandardVersion,
        ];
        result = await new ClaudePluginDeployer().deployStandards(
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
      const deployer = new ClaudePluginDeployer();
      await deployer.deployStandards(
        [{} as StandardVersion, {} as StandardVersion],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(deployer.getLastSkippedStandardsCount()).toBe(2);
    });

    it('resets the skipped count on a subsequent empty call', async () => {
      const deployer = new ClaudePluginDeployer();
      await deployer.deployStandards(
        [{} as StandardVersion],
        {} as GitRepo,
        makeTarget('/'),
      );
      await deployer.deployStandards([], {} as GitRepo, makeTarget('/'));
      expect(deployer.getLastSkippedStandardsCount()).toBe(0);
    });

    it('starts with a skipped count of zero before any call', () => {
      const deployer = new ClaudePluginDeployer();
      expect(deployer.getLastSkippedStandardsCount()).toBe(0);
    });
  });

  describe('deployPluginManifest', () => {
    describe('returns a FileUpdates with .claude-plugin/plugin.json under plugin root', () => {
      let updates: ReturnType<ClaudePluginDeployer['deployPluginManifest']>;

      beforeEach(() => {
        updates = new ClaudePluginDeployer().deployPluginManifest(
          {
            name: 'security',
            description: 'Security helpers',
            version: '0.1.0',
          },
          makeTarget('plugins/security/'),
        );
      });

      it('creates exactly one file', () => {
        expect(updates.createOrUpdate).toHaveLength(1);
      });

      it('places the file at the correct path under plugin root', () => {
        expect(updates.createOrUpdate[0].path).toBe(
          'plugins/security/.claude-plugin/plugin.json',
        );
      });
    });

    describe('when target.path is "/"', () => {
      it('places plugin.json at the workspace root', () => {
        const updates = new ClaudePluginDeployer().deployPluginManifest(
          { name: 'security', version: '0.1.0' },
          makeTarget('/'),
        );
        expect(updates.createOrUpdate[0].path).toBe(
          '.claude-plugin/plugin.json',
        );
      });
    });

    it('includes name, description, and version in the manifest content', () => {
      const updates = new ClaudePluginDeployer().deployPluginManifest(
        { name: 'security', description: 'desc', version: '0.1.0' },
        makeTarget('/'),
      );
      const file = updates.createOrUpdate[0];
      if (file.content === undefined) throw new Error('expected content');
      const parsed = JSON.parse(file.content);
      expect(parsed).toEqual({
        name: 'security',
        description: 'desc',
        version: '0.1.0',
      });
    });

    describe('tags the file with the plugin name', () => {
      let updates: ReturnType<ClaudePluginDeployer['deployPluginManifest']>;

      beforeEach(() => {
        updates = new ClaudePluginDeployer().deployPluginManifest(
          { name: 'security', version: '0.1.0' },
          makeTarget('/'),
        );
      });

      it('tags with artifact id', () => {
        expect(updates.createOrUpdate[0].artifactId).toBe('security');
      });

      it('tags with artifact name', () => {
        expect(updates.createOrUpdate[0].artifactName).toBe('security');
      });
    });
  });

  describe('getSkillsFolderPath', () => {
    it('returns the plugin-relative skills folder so the capability flag matches', () => {
      expect(new ClaudePluginDeployer().getSkillsFolderPath()).toBe('skills/');
    });
  });
});
