import { OpenCodeDeployer } from './OpenCodeDeployer';
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

describe('OpenCodeDeployer', () => {
  let deployer: OpenCodeDeployer;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    deployer = new OpenCodeDeployer();

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

  describe('deployRecipes', () => {
    describe('with single recipe', () => {
      let result: Awaited<ReturnType<typeof deployer.deployRecipes>>;
      let recipeVersion: RecipeVersion;

      beforeEach(async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        recipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content:
            '---\ndescription: "A test recipe"\nagent: build\n---\nThis is the recipe content',
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

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('creates the command file at the correct path', () => {
        expect(result.createOrUpdate[0].path).toBe(
          '.opencode/commands/test-recipe.md',
        );
      });

      it('writes recipe content as-is to command file', () => {
        expect(result.createOrUpdate[0].content).toBe(recipeVersion.content);
      });

      it('does not write to AGENTS.md', () => {
        const agentsMdFile = result.createOrUpdate.find(
          (f) => f.path === 'AGENTS.md',
        );
        expect(agentsMdFile).toBeUndefined();
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

      it('creates no files to update', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('generateFileUpdatesForRecipes', () => {
    describe('with single recipe', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForRecipes>
      >;
      let recipeVersion: RecipeVersion;

      beforeEach(async () => {
        const recipe = recipeFactory({
          name: 'My Command',
          slug: 'my-command',
        });

        recipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: '---\ndescription: "My command"\n---\nDo the thing',
          version: 1,
          userId: createUserId('user-1'),
        };

        result = await deployer.generateFileUpdatesForRecipes([recipeVersion]);
      });

      it('creates the command file without target prefix', () => {
        const commandFile = result.createOrUpdate.find((f) =>
          f.path.includes('.opencode/commands/'),
        );
        expect(commandFile?.path).toBe('.opencode/commands/my-command.md');
      });

      it('writes recipe content as-is', () => {
        const commandFile = result.createOrUpdate.find((f) =>
          f.path.includes('.opencode/commands/'),
        );
        expect(commandFile?.content).toBe(recipeVersion.content);
      });

      it('does not write to AGENTS.md', () => {
        const agentsMdFile = result.createOrUpdate.find(
          (f) => f.path === 'AGENTS.md',
        );
        expect(agentsMdFile).toBeUndefined();
      });
    });

    describe('with all four OpenCode frontmatter fields', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForRecipes>
      >;
      const fullFrontmatterContent =
        '---\ndescription: "Full command"\nagent: build\nmodel: gpt-4o\nsubtask: true\n---\nDo the full thing';

      beforeEach(async () => {
        const recipe = recipeFactory({
          name: 'Full Command',
          slug: 'full-command',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-full'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: fullFrontmatterContent,
          version: 1,
          userId: createUserId('user-1'),
        };

        result = await deployer.generateFileUpdatesForRecipes([recipeVersion]);
      });

      it('writes the command file with all four frontmatter fields preserved', () => {
        const commandFile = result.createOrUpdate.find((f) =>
          f.path.includes('.opencode/commands/'),
        );
        expect(commandFile?.content).toBe(fullFrontmatterContent);
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

      it('creates a SKILL.md file in .opencode/skills/', () => {
        const skillFile = result.createOrUpdate.find((f) =>
          f.path.includes('.opencode/skills/'),
        );
        expect(skillFile?.path).toBe('.opencode/skills/test-skill/SKILL.md');
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

      it('includes the command file for the recipe', () => {
        const commandFile = result.createOrUpdate.find((f) =>
          f.path.includes('.opencode/commands/'),
        );
        expect(commandFile?.path).toBe('.opencode/commands/my-recipe.md');
      });

      it('includes AGENTS.md for standards', () => {
        const agentsMdFile = result.createOrUpdate.find(
          (f) => f.path === 'AGENTS.md',
        );
        expect(agentsMdFile).toBeDefined();
      });

      it('includes the skill file', () => {
        const skillFile = result.createOrUpdate.find((f) =>
          f.path.includes('.opencode/skills/'),
        );
        expect(skillFile?.path).toBe('.opencode/skills/my-skill/SKILL.md');
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when removing a recipe', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateRemovalFileUpdates>
      >;

      beforeEach(async () => {
        const recipe = recipeFactory({
          name: 'Old Recipe',
          slug: 'old-recipe',
        });
        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('rv-old'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'content',
          version: 1,
          userId: createUserId('user-1'),
        };

        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [recipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );
      });

      it('includes the command file in delete list', () => {
        const deletedFile = result.delete.find(
          (d) => d.path === '.opencode/commands/old-recipe.md',
        );
        expect(deletedFile).toBeDefined();
      });

      it('deletes the command file as a File type', () => {
        const deletedFile = result.delete.find(
          (d) => d.path === '.opencode/commands/old-recipe.md',
        );
        expect(deletedFile?.type).toBe(DeleteItemType.File);
      });
    });

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
          (d) => d.path === '.opencode/skills/old-skill',
        );
        expect(deletedDir).toBeDefined();
      });

      it('deletes the skill directory as a Directory type', () => {
        const deletedDir = result.delete.find(
          (d) => d.path === '.opencode/skills/old-skill',
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
        const recipe = recipeFactory({ name: 'Recipe', slug: 'recipe-1' });
        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('rv-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'content',
          version: 1,
          userId: createUserId('user-1'),
        };

        const skillVersion = skillVersionFactory({
          name: 'skill-1',
          slug: 'skill-1',
          description: 'A skill',
          prompt: 'Do skill',
        });

        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [recipeVersion],
          standardVersions: [],
          skillVersions: [skillVersion],
        });
      });

      it('includes the command file in delete list', () => {
        const deletedFile = result.delete.find(
          (d) => d.path === '.opencode/commands/recipe-1.md',
        );
        expect(deletedFile).toBeDefined();
      });

      it('deletes the command file as a File type', () => {
        const deletedFile = result.delete.find(
          (d) => d.path === '.opencode/commands/recipe-1.md',
        );
        expect(deletedFile?.type).toBe(DeleteItemType.File);
      });

      it('includes the user skill directory in delete list', () => {
        const deletedDir = result.delete.find(
          (d) => d.path === '.opencode/skills/skill-1',
        );
        expect(deletedDir).toBeDefined();
      });

      it('deletes the user skill directory as a Directory type', () => {
        const deletedDir = result.delete.find(
          (d) => d.path === '.opencode/skills/skill-1',
        );
        expect(deletedDir?.type).toBe(DeleteItemType.Directory);
      });

      it('deletes default skill directories', () => {
        const defaultSlugs = DefaultSkillsDeployer.getDefaultSkillSlugs();
        for (const slug of defaultSlugs) {
          expect(
            result.delete.some((d) => d.path === `.opencode/skills/${slug}`),
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
    it('returns the opencode skills folder path', () => {
      expect(deployer.getSkillsFolderPath()).toBe('.opencode/skills/');
    });
  });
});
