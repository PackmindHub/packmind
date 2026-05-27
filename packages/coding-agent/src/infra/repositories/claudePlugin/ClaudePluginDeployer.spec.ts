import { ClaudePluginDeployer } from './ClaudePluginDeployer';
import {
  GitRepo,
  RecipeVersion,
  SkillFile,
  SkillVersion,
  StandardVersion,
  Target,
  createRecipeId,
  createRecipeVersionId,
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

function makeRecipe(overrides: Partial<RecipeVersion> = {}): RecipeVersion {
  return {
    id: createRecipeVersionId('rv1'),
    recipeId: createRecipeId('r1'),
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
      const recipe = makeRecipe({ slug: 'audit' });

      const result = await deployer.deployRecipes(
        [recipe],
        {} as GitRepo,
        makeTarget('/'),
      );

      const paths = result.createOrUpdate.map((f) => f.path);
      expect(paths).toEqual(['commands/audit.md']);
    });

    it('returns an empty createOrUpdate when no recipes', async () => {
      const result = await new ClaudePluginDeployer().deployRecipes(
        [],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(result.createOrUpdate).toEqual([]);
    });

    it('uses Target.path as the plugin root prefix when set', async () => {
      const result = await new ClaudePluginDeployer().deployRecipes(
        [makeRecipe({ slug: 'audit' })],
        {} as GitRepo,
        makeTarget('plugins/security/'),
      );
      expect(result.createOrUpdate[0].path).toBe(
        'plugins/security/commands/audit.md',
      );
    });

    it('propagates recipe content into the file body', async () => {
      const result = await new ClaudePluginDeployer().deployRecipes(
        [makeRecipe({ slug: 'audit', content: '# hello' })],
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

    it('falls back to the skill prompt when no files are provided', async () => {
      const skill = makeSkill({
        slug: 'threat-model',
        prompt: '# prompt body',
        files: undefined,
      });

      const result = await new ClaudePluginDeployer().deploySkills(
        [skill],
        {} as GitRepo,
        makeTarget('/'),
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe(
        'skills/threat-model/SKILL.md',
      );
      const file = result.createOrUpdate[0];
      if (file.content === undefined) throw new Error('expected content');
      expect(file.content).toBe('# prompt body');
    });

    it('returns empty when no skills', async () => {
      const result = await new ClaudePluginDeployer().deploySkills(
        [],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(result.createOrUpdate).toEqual([]);
    });

    it('tags each file with artifactType "skill" and the skill id', async () => {
      const skill = makeSkill({
        slug: 'threat-model',
        skillId: createSkillId('skill-abc'),
        files: [makeSkillFile({ path: 'SKILL.md' })],
      });
      const result = await new ClaudePluginDeployer().deploySkills(
        [skill],
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(result.createOrUpdate[0].artifactType).toBe('skill');
      expect(result.createOrUpdate[0].artifactId).toBe('skill-abc');
    });
  });

  describe('deployStandards', () => {
    it('returns empty createOrUpdate even when standards are present', async () => {
      const standards = [
        {} as StandardVersion,
        {} as StandardVersion,
        {} as StandardVersion,
      ];
      const result = await new ClaudePluginDeployer().deployStandards(
        standards,
        {} as GitRepo,
        makeTarget('/'),
      );
      expect(result.createOrUpdate).toEqual([]);
      expect(result.delete).toEqual([]);
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
    it('returns a FileUpdates with .claude-plugin/plugin.json under plugin root', () => {
      const updates = new ClaudePluginDeployer().deployPluginManifest(
        {
          name: 'security',
          description: 'Security helpers',
          version: '0.1.0',
        },
        makeTarget('plugins/security/'),
      );
      expect(updates.createOrUpdate).toHaveLength(1);
      expect(updates.createOrUpdate[0].path).toBe(
        'plugins/security/.claude-plugin/plugin.json',
      );
    });

    it('places plugin.json at the workspace root when target.path is "/"', () => {
      const updates = new ClaudePluginDeployer().deployPluginManifest(
        { name: 'security', version: '0.1.0' },
        makeTarget('/'),
      );
      expect(updates.createOrUpdate[0].path).toBe('.claude-plugin/plugin.json');
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

    it('tags the file with the plugin name as artifact name and id', () => {
      const updates = new ClaudePluginDeployer().deployPluginManifest(
        { name: 'security', version: '0.1.0' },
        makeTarget('/'),
      );
      expect(updates.createOrUpdate[0].artifactId).toBe('security');
      expect(updates.createOrUpdate[0].artifactName).toBe('security');
    });
  });
});
