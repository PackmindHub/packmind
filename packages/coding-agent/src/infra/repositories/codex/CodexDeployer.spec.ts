import { CodexDeployer } from './CodexDeployer';
import {
  createUserId,
  DeleteItemType,
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  StandardVersion,
  createStandardVersionId,
  RecipeVersion,
  createRecipeVersionId,
  Target,
  createTargetId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { recipeFactory } from '@packmind/recipes/test';
import { standardFactory } from '@packmind/standards/test';
import { skillVersionFactory } from '@packmind/skills/test';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

describe('CodexDeployer', () => {
  let deployer: CodexDeployer;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    deployer = new CodexDeployer();

    mockTarget = {
      id: createTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createGitRepoId(uuidv4()),
    };

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deployRecipes', () => {
    describe('with single recipe', () => {
      let result: Awaited<ReturnType<typeof deployer.deployRecipes>>;

      beforeEach(async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content:
            '---\ndescription: "A test recipe"\n---\nThis is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('clears recipes section in AGENTS.md instead of creating command files', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets AGENTS.md', () => {
        expect(result.createOrUpdate[0].path).toBe('AGENTS.md');
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when recipe list is empty', () => {
      let result: Awaited<ReturnType<typeof deployer.deployRecipes>>;

      beforeEach(async () => {
        result = await deployer.deployRecipes([], mockGitRepo, mockTarget);
      });

      it('creates one file update to clear recipes section', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deployStandards', () => {
    describe('with single standard', () => {
      let result: Awaited<ReturnType<typeof deployer.deployStandards>>;
      let standardVersion: StandardVersion;

      beforeEach(async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: 'backend',
        });

        standardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'This is the standard description',
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: 'backend',
        };

        result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets AGENTS.md', () => {
        expect(result.createOrUpdate[0].path).toBe('AGENTS.md');
      });

      it('includes standards header in section content', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('includes standards introduction', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });

      it('includes standard name', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(standardVersion.name);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when standards list is empty', () => {
      let result: Awaited<ReturnType<typeof deployer.deployStandards>>;

      beforeEach(async () => {
        result = await deployer.deployStandards([], mockGitRepo, mockTarget);
      });

      it('creates no files to update', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deploySkills', () => {
    describe('with single skill', () => {
      let result: Awaited<ReturnType<typeof deployer.deploySkills>>;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          name: 'test-skill',
          slug: 'test-skill',
          description: 'A test skill',
          prompt: 'Do this skill',
        });

        result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates a SKILL.md file in .agents/skills/', () => {
        const skillFile = result.createOrUpdate.find((f) =>
          f.path.includes('.agents/skills/'),
        );
        expect(skillFile?.path).toBe('.agents/skills/test-skill/SKILL.md');
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deployArtifacts', () => {
    describe('with recipes, standards, and skills', () => {
      let result: Awaited<ReturnType<typeof deployer.deployArtifacts>>;

      beforeEach(async () => {
        const recipe = recipeFactory({ name: 'My Recipe', slug: 'my-recipe' });
        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('rv-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: '---\ndescription: "My recipe"\n---\nDo things',
          version: 1,
          userId: createUserId('user-1'),
        };

        const standard = standardFactory({
          name: 'My Standard',
          slug: 'my-standard',
        });
        const standardVersion: StandardVersion = {
          id: createStandardVersionId('sv-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'Standard description',
          version: 1,
          userId: createUserId('user-1'),
        };

        const skillVersion = skillVersionFactory({
          name: 'my-skill',
          slug: 'my-skill',
          description: 'A skill',
          prompt: 'Do skill',
        });

        result = await deployer.deployArtifacts(
          [recipeVersion],
          [standardVersion],
          [skillVersion],
        );
      });

      it('does not create command files', () => {
        const commandFiles = result.createOrUpdate.filter((f) =>
          f.path.includes('/commands/'),
        );
        expect(commandFiles).toHaveLength(0);
      });

      it('includes AGENTS.md for standards', () => {
        const agentsMdFile = result.createOrUpdate.find(
          (f) => f.path === 'AGENTS.md',
        );
        expect(agentsMdFile).toBeDefined();
      });

      it('includes the skill file', () => {
        const skillFile = result.createOrUpdate.find((f) =>
          f.path.includes('.agents/skills/'),
        );
        expect(skillFile?.path).toBe('.agents/skills/my-skill/SKILL.md');
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when removing a skill', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateRemovalFileUpdates>
      >;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          name: 'old-skill',
          slug: 'old-skill',
          description: 'Old skill',
          prompt: 'Old skill prompt',
        });

        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [skillVersion],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );
      });

      it('includes the skill directory in delete list', () => {
        const deletedDir = result.delete.find(
          (d) => d.path === '.agents/skills/old-skill',
        );
        expect(deletedDir).toBeDefined();
      });

      it('deletes the skill directory as a Directory type', () => {
        const deletedDir = result.delete.find(
          (d) => d.path === '.agents/skills/old-skill',
        );
        expect(deletedDir?.type).toBe(DeleteItemType.Directory);
      });
    });
  });

  describe('generateAgentCleanupFileUpdates', () => {
    describe('with all artifact types', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          name: 'skill-1',
          slug: 'skill-1',
          description: 'A skill',
          prompt: 'Do skill',
        });

        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [skillVersion],
        });
      });

      it('includes the user skill directory in delete list', () => {
        const deletedDir = result.delete.find(
          (d) => d.path === '.agents/skills/skill-1',
        );
        expect(deletedDir).toBeDefined();
      });

      it('deletes the user skill directory as a Directory type', () => {
        const deletedDir = result.delete.find(
          (d) => d.path === '.agents/skills/skill-1',
        );
        expect(deletedDir?.type).toBe(DeleteItemType.Directory);
      });

      it('deletes default skill directories', () => {
        const defaultSlugs = DefaultSkillsDeployer.getDefaultSkillSlugs();
        for (const slug of defaultSlugs) {
          expect(
            result.delete.some((d) => d.path === `.agents/skills/${slug}`),
          ).toBe(true);
        }
      });

      it('clears AGENTS.md sections', () => {
        const agentsMdFile = result.createOrUpdate.find(
          (f) => f.path === 'AGENTS.md',
        );
        expect(agentsMdFile).toBeDefined();
      });
    });
  });

  describe('getSkillsFolderPath', () => {
    it('returns the codex skills folder path', () => {
      expect(deployer.getSkillsFolderPath()).toBe('.agents/skills/');
    });
  });
});
