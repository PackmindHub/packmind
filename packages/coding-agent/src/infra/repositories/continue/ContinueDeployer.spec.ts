import { ContinueDeployer } from './ContinueDeployer';
import { createUserId } from '@packmind/types';
import {
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  StandardVersion,
  createStandardVersionId,
  RecipeVersion,
  createRecipeVersionId,
  Target,
  createTargetId,
  IStandardsPort,
  Rule,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { recipeFactory } from '@packmind/recipes/test';
import { standardFactory } from '@packmind/standards/test';

describe('ContinueDeployer', () => {
  let deployer: ContinueDeployer;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    mockStandardsPort = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    deployer = new ContinueDeployer(mockStandardsPort);

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
    describe('when deploying a single recipe', () => {
      it('creates one file update', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('deletes one legacy file', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        expect(result.delete).toHaveLength(1);
      });

      it('deletes legacy recipes-index.md file', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        expect(result.delete[0].path).toBe(
          '.continue/rules/packmind/recipes-index.md',
        );
      });

      it('creates command file at correct path', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        const commandFile = result.createOrUpdate[0];
        expect(commandFile.path).toBe('.continue/prompts/test-recipe.md');
      });

      it('includes frontmatter with description from summary', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        const commandFile = result.createOrUpdate[0];
        expect(commandFile.content).toContain(
          "description: 'A test recipe summary'",
        );
      });

      it('includes frontmatter with name', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        const commandFile = result.createOrUpdate[0];
        expect(commandFile.content).toContain("name: 'Test Recipe'");
      });

      it('includes frontmatter with invokable set to true', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        const commandFile = result.createOrUpdate[0];
        expect(commandFile.content).toContain('invokable: true');
      });

      it('includes recipe content in command file', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        const commandFile = result.createOrUpdate[0];
        expect(commandFile.content).toContain('This is the recipe content');
      });

      describe('when summary is missing', () => {
        it('uses recipe name as description', async () => {
          const recipe = recipeFactory({
            name: 'Test Recipe',
            slug: 'test-recipe',
          });

          const recipeVersion: RecipeVersion = {
            id: createRecipeVersionId('recipe-version-1'),
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: 'This is the recipe content',
            version: 1,
            userId: createUserId('user-1'),
          };

          const result = await deployer.deployRecipes(
            [recipeVersion],
            mockGitRepo,
            mockTarget,
          );

          const commandFile = result.createOrUpdate[0];
          expect(commandFile.content).toContain("description: 'Test Recipe'");
        });
      });
    });

    it('returns no file updates for empty recipe list', async () => {
      const result = await deployer.deployRecipes([], mockGitRepo, mockTarget);

      expect(result.createOrUpdate).toHaveLength(0);
    });

    describe('when deploying empty recipe list', () => {
      it('deletes one legacy file', async () => {
        const result = await deployer.deployRecipes(
          [],
          mockGitRepo,
          mockTarget,
        );

        expect(result.delete).toHaveLength(1);
      });

      it('deletes legacy recipes-index.md file', async () => {
        const result = await deployer.deployRecipes(
          [],
          mockGitRepo,
          mockTarget,
        );

        expect(result.delete[0].path).toBe(
          '.continue/rules/packmind/recipes-index.md',
        );
      });
    });

    describe('when deploying multiple recipes', () => {
      it('creates file update for each recipe', async () => {
        const recipe1 = recipeFactory({
          name: 'Test Recipe 1',
          slug: 'test-recipe-1',
        });

        const recipe2 = recipeFactory({
          name: 'Test Recipe 2',
          slug: 'test-recipe-2',
        });

        const recipeVersion1: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe1.id,
          name: recipe1.name,
          slug: recipe1.slug,
          content: 'Recipe 1 instructions',
          version: 1,
          summary: 'Recipe 1 summary',
          userId: createUserId('user-1'),
        };

        const recipeVersion2: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe 2 instructions',
          version: 1,
          summary: 'Recipe 2 summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion1, recipeVersion2],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('creates first recipe command file at correct path', async () => {
        const recipe1 = recipeFactory({
          name: 'Test Recipe 1',
          slug: 'test-recipe-1',
        });

        const recipe2 = recipeFactory({
          name: 'Test Recipe 2',
          slug: 'test-recipe-2',
        });

        const recipeVersion1: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe1.id,
          name: recipe1.name,
          slug: recipe1.slug,
          content: 'Recipe 1 instructions',
          version: 1,
          summary: 'Recipe 1 summary',
          userId: createUserId('user-1'),
        };

        const recipeVersion2: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe 2 instructions',
          version: 1,
          summary: 'Recipe 2 summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion1, recipeVersion2],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate[0].path).toBe(
          '.continue/prompts/test-recipe-1.md',
        );
      });

      it('creates second recipe command file at correct path', async () => {
        const recipe1 = recipeFactory({
          name: 'Test Recipe 1',
          slug: 'test-recipe-1',
        });

        const recipe2 = recipeFactory({
          name: 'Test Recipe 2',
          slug: 'test-recipe-2',
        });

        const recipeVersion1: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe1.id,
          name: recipe1.name,
          slug: recipe1.slug,
          content: 'Recipe 1 instructions',
          version: 1,
          summary: 'Recipe 1 summary',
          userId: createUserId('user-1'),
        };

        const recipeVersion2: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe 2 instructions',
          version: 1,
          summary: 'Recipe 2 summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion1, recipeVersion2],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate[1].path).toBe(
          '.continue/prompts/test-recipe-2.md',
        );
      });
    });
  });

  describe('deployStandards', () => {
    describe('when deploying standard with scope', () => {
      it('creates one file update', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [
            { content: 'Use TypeScript' },
            { content: 'Write tests' },
          ] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('creates file at correct path', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.path).toBe(
          '.continue/rules/packmind/standard-test-standard.md',
        );
      });

      it('includes frontmatter with name', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).toContain(`name: '${standard.name}'`);
      });

      describe('when scope exists', () => {
        it('includes frontmatter with globs', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: '**/*.{ts,tsx}',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain(`globs: "${standard.scope}"`);
        });

        it('quotes globs starting with **/', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: '**/*.spec.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain('globs: "**/*.spec.ts"');
        });

        it('quotes globs starting with *', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: '*.spec.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain('globs: "*.spec.ts"');
        });

        it('includes unquoted globs not starting with *', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: 'src/**/*.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain(`globs: ${standard.scope}`);
        });

        it('does not quote globs not starting with *', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: 'src/**/*.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).not.toContain(
            `globs: "${standard.scope}"`,
          );
        });

        it('formats multiple comma-separated globs as array', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: '**/*.spec.ts, **/*.test.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain(
            'globs: ["**/*.spec.ts", "**/*.test.ts"]',
          );
        });

        it('formats multiple globs with mixed quoting requirements', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: '**/*.spec.ts, src/**/*.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain(
            'globs: ["**/*.spec.ts", src/**/*.ts]',
          );
        });

        it('sets alwaysApply to false', async () => {
          const standard = standardFactory({
            name: 'Test Standard',
            slug: 'test-standard',
            scope: '**/*.{ts,tsx}',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: 1,
            summary: 'A test standard summary',
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain('alwaysApply: false');
        });
      });

      it('includes frontmatter with description from summary', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).toContain(
          "description: 'A test standard summary'",
        );
      });

      it('includes standard header in content', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).toContain('## Standard: Test Standard');
      });

      it('includes first rule in content', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [
            { content: 'Use TypeScript' },
            { content: 'Write tests' },
          ] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).toContain('* Use TypeScript');
      });

      it('includes second rule in content', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [
            { content: 'Use TypeScript' },
            { content: 'Write tests' },
          ] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).toContain('* Write tests');
      });

      it('includes link to full standard', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).toContain(
          '../../.packmind/standards/test-standard.md',
        );
      });
    });

    describe('when deploying standard without scope', () => {
      it('sets alwaysApply to true', async () => {
        const standard = standardFactory({
          name: 'Global Standard',
          slug: 'global-standard',
          scope: '',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-2'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A global standard',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [{ content: 'Always use consistent formatting' }] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).toContain('alwaysApply: true');
      });

      it('does not include globs in frontmatter', async () => {
        const standard = standardFactory({
          name: 'Global Standard',
          slug: 'global-standard',
          scope: '',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-2'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'A global standard',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        const standardFile = result.createOrUpdate[0];
        expect(standardFile.content).not.toContain('globs:');
      });
    });

    describe('when summary is not available', () => {
      describe('when description is null', () => {
        it('uses standard name as description', async () => {
          const standard = standardFactory({
            name: 'Standard Without Summary',
            slug: 'standard-without-summary',
            scope: '**/*.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-3'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: '',
            version: 1,
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain(
            `description: '${standard.name}'`,
          );
        });
      });

      describe('when description exists but summary does not', () => {
        it('uses standard name as description', async () => {
          const standard = standardFactory({
            name: 'Standard With Description Only',
            slug: 'standard-with-description-only',
            scope: '**/*.ts',
          });

          const standardVersion: StandardVersion = {
            id: createStandardVersionId('standard-version-4'),
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: 'This is a description that should not be used',
            version: 1,
            summary: null,
            userId: createUserId('user-1'),
            scope: standard.scope,
            rules: [] as Rule[],
          };

          const result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          const standardFile = result.createOrUpdate[0];
          expect(standardFile.content).toContain(
            `description: '${standard.name}'`,
          );
        });
      });
    });

    it('returns no file updates for empty standards list', async () => {
      const result = await deployer.deployStandards(
        [],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toHaveLength(0);
    });

    it('returns no file deletions for empty standards list', async () => {
      const result = await deployer.deployStandards(
        [],
        mockGitRepo,
        mockTarget,
      );

      expect(result.delete).toHaveLength(0);
    });

    describe('when deploying multiple standards', () => {
      it('creates file for first standard with scope', async () => {
        const standard1 = standardFactory({
          name: 'Frontend Standard',
          slug: 'frontend-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standard2 = standardFactory({
          name: 'Backend Standard',
          slug: 'backend-standard',
          scope: '',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: standard1.description,
            version: 1,
            summary: 'Frontend standard',
            userId: createUserId('user-1'),
            scope: standard1.scope,
            rules: [] as Rule[],
          },
          {
            id: createStandardVersionId('standard-version-2'),
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: standard2.description,
            version: 1,
            summary: 'Backend standard',
            userId: createUserId('user-1'),
            scope: standard2.scope,
            rules: [] as Rule[],
          },
        ];

        const result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );

        const frontendFile = result.createOrUpdate.find((file) =>
          file.path.includes('frontend-standard'),
        );
        expect(frontendFile).toBeDefined();
      });

      it('includes globs in first standard file', async () => {
        const standard1 = standardFactory({
          name: 'Frontend Standard',
          slug: 'frontend-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standard2 = standardFactory({
          name: 'Backend Standard',
          slug: 'backend-standard',
          scope: '',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: standard1.description,
            version: 1,
            summary: 'Frontend standard',
            userId: createUserId('user-1'),
            scope: standard1.scope,
            rules: [] as Rule[],
          },
          {
            id: createStandardVersionId('standard-version-2'),
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: standard2.description,
            version: 1,
            summary: 'Backend standard',
            userId: createUserId('user-1'),
            scope: standard2.scope,
            rules: [] as Rule[],
          },
        ];

        const result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );

        const frontendFile = result.createOrUpdate.find((file) =>
          file.path.includes('frontend-standard'),
        );
        if (frontendFile) {
          expect(frontendFile.content).toContain('globs: "**/*.{ts,tsx}"');
        }
      });

      it('sets alwaysApply false for first standard with scope', async () => {
        const standard1 = standardFactory({
          name: 'Frontend Standard',
          slug: 'frontend-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standard2 = standardFactory({
          name: 'Backend Standard',
          slug: 'backend-standard',
          scope: '',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: standard1.description,
            version: 1,
            summary: 'Frontend standard',
            userId: createUserId('user-1'),
            scope: standard1.scope,
            rules: [] as Rule[],
          },
          {
            id: createStandardVersionId('standard-version-2'),
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: standard2.description,
            version: 1,
            summary: 'Backend standard',
            userId: createUserId('user-1'),
            scope: standard2.scope,
            rules: [] as Rule[],
          },
        ];

        const result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );

        const frontendFile = result.createOrUpdate.find((file) =>
          file.path.includes('frontend-standard'),
        );
        if (frontendFile) {
          expect(frontendFile.content).toContain('alwaysApply: false');
        }
      });

      it('creates file for second standard without scope', async () => {
        const standard1 = standardFactory({
          name: 'Frontend Standard',
          slug: 'frontend-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standard2 = standardFactory({
          name: 'Backend Standard',
          slug: 'backend-standard',
          scope: '',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: standard1.description,
            version: 1,
            summary: 'Frontend standard',
            userId: createUserId('user-1'),
            scope: standard1.scope,
            rules: [] as Rule[],
          },
          {
            id: createStandardVersionId('standard-version-2'),
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: standard2.description,
            version: 1,
            summary: 'Backend standard',
            userId: createUserId('user-1'),
            scope: standard2.scope,
            rules: [] as Rule[],
          },
        ];

        const result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );

        const backendFile = result.createOrUpdate.find((file) =>
          file.path.includes('backend-standard'),
        );
        expect(backendFile).toBeDefined();
      });

      it('does not include globs in second standard file', async () => {
        const standard1 = standardFactory({
          name: 'Frontend Standard',
          slug: 'frontend-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standard2 = standardFactory({
          name: 'Backend Standard',
          slug: 'backend-standard',
          scope: '',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: standard1.description,
            version: 1,
            summary: 'Frontend standard',
            userId: createUserId('user-1'),
            scope: standard1.scope,
            rules: [] as Rule[],
          },
          {
            id: createStandardVersionId('standard-version-2'),
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: standard2.description,
            version: 1,
            summary: 'Backend standard',
            userId: createUserId('user-1'),
            scope: standard2.scope,
            rules: [] as Rule[],
          },
        ];

        const result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );

        const backendFile = result.createOrUpdate.find((file) =>
          file.path.includes('backend-standard'),
        );
        if (backendFile) {
          expect(backendFile.content).not.toContain('globs:');
        }
      });

      it('sets alwaysApply true for second standard without scope', async () => {
        const standard1 = standardFactory({
          name: 'Frontend Standard',
          slug: 'frontend-standard',
          scope: '**/*.{ts,tsx}',
        });

        const standard2 = standardFactory({
          name: 'Backend Standard',
          slug: 'backend-standard',
          scope: '',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: standard1.description,
            version: 1,
            summary: 'Frontend standard',
            userId: createUserId('user-1'),
            scope: standard1.scope,
            rules: [] as Rule[],
          },
          {
            id: createStandardVersionId('standard-version-2'),
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: standard2.description,
            version: 1,
            summary: 'Backend standard',
            userId: createUserId('user-1'),
            scope: standard2.scope,
            rules: [] as Rule[],
          },
        ];

        const result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );

        const backendFile = result.createOrUpdate.find((file) =>
          file.path.includes('backend-standard'),
        );
        if (backendFile) {
          expect(backendFile.content).toContain('alwaysApply: true');
        }
      });
    });
  });

  describe('generateFileUpdatesForRecipes', () => {
    it('generates command file at correct path', async () => {
      const recipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
      });

      const recipeVersion: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: 'Recipe content',
        version: 1,
        summary: 'Recipe summary',
        userId: createUserId('user-1'),
      };

      const result = await deployer.generateFileUpdatesForRecipes([
        recipeVersion,
      ]);

      expect(result.createOrUpdate[0].path).toBe(
        '.continue/prompts/test-recipe.md',
      );
    });

    it('deletes one legacy file', async () => {
      const recipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
      });

      const recipeVersion: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: 'Recipe content',
        version: 1,
        summary: 'Recipe summary',
        userId: createUserId('user-1'),
      };

      const result = await deployer.generateFileUpdatesForRecipes([
        recipeVersion,
      ]);

      expect(result.delete).toHaveLength(1);
    });

    it('deletes legacy recipes-index.md file', async () => {
      const recipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
      });

      const recipeVersion: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: 'Recipe content',
        version: 1,
        summary: 'Recipe summary',
        userId: createUserId('user-1'),
      };

      const result = await deployer.generateFileUpdatesForRecipes([
        recipeVersion,
      ]);

      expect(result.delete[0].path).toBe(
        '.continue/rules/packmind/recipes-index.md',
      );
    });

    describe('when no recipes', () => {
      it('returns no file updates', async () => {
        const result = await deployer.generateFileUpdatesForRecipes([]);

        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('deletes one legacy file', async () => {
        const result = await deployer.generateFileUpdatesForRecipes([]);

        expect(result.delete).toHaveLength(1);
      });

      it('deletes legacy recipes-index.md file', async () => {
        const result = await deployer.generateFileUpdatesForRecipes([]);

        expect(result.delete[0].path).toBe(
          '.continue/rules/packmind/recipes-index.md',
        );
      });
    });
  });

  describe('generateFileUpdatesForStandards', () => {
    it('generates file at correct path', async () => {
      const standard = standardFactory({
        name: 'Test Standard',
        slug: 'test-standard',
        scope: '**/*.ts',
      });

      const standardVersion: StandardVersion = {
        id: createStandardVersionId('standard-version-1'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: standard.description,
        version: 1,
        summary: 'Test standard',
        userId: createUserId('user-1'),
        scope: standard.scope,
        rules: [] as Rule[],
      };

      const result = await deployer.generateFileUpdatesForStandards([
        standardVersion,
      ]);

      expect(result.createOrUpdate[0].path).toBe(
        '.continue/rules/packmind/standard-test-standard.md',
      );
    });
  });

  describe('deployArtifacts', () => {
    it('deletes one legacy file', async () => {
      const recipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
      });

      const recipeVersion: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: 'Recipe content',
        version: 1,
        summary: 'Recipe summary',
        userId: createUserId('user-1'),
      };

      const result = await deployer.deployArtifacts([recipeVersion], []);

      expect(result.delete).toHaveLength(1);
    });

    it('deletes legacy recipes-index.md file', async () => {
      const recipe = recipeFactory({
        name: 'Test Recipe',
        slug: 'test-recipe',
      });

      const recipeVersion: RecipeVersion = {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: 'Recipe content',
        version: 1,
        summary: 'Recipe summary',
        userId: createUserId('user-1'),
      };

      const result = await deployer.deployArtifacts([recipeVersion], []);

      expect(result.delete[0].path).toBe(
        '.continue/rules/packmind/recipes-index.md',
      );
    });

    describe('when deploying both recipes and standards', () => {
      it('creates two file updates', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.ts',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'Test standard',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployArtifacts(
          [recipeVersion],
          [standardVersion],
        );

        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('creates recipe command file', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.ts',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'Test standard',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployArtifacts(
          [recipeVersion],
          [standardVersion],
        );

        expect(
          result.createOrUpdate.some((f) =>
            f.path.includes('.continue/prompts/test-recipe.md'),
          ),
        ).toBe(true);
      });

      it('creates standard file', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.ts',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'Test standard',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployArtifacts(
          [recipeVersion],
          [standardVersion],
        );

        expect(
          result.createOrUpdate.some((f) =>
            f.path.includes('standard-test-standard'),
          ),
        ).toBe(true);
      });
    });

    describe('when deploying only recipes', () => {
      it('creates one file update', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployArtifacts([recipeVersion], []);

        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('creates recipe command file', async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployArtifacts([recipeVersion], []);

        expect(result.createOrUpdate[0].path).toBe(
          '.continue/prompts/test-recipe.md',
        );
      });
    });

    describe('when deploying only standards', () => {
      it('creates one file update', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.ts',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'Test standard',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployArtifacts([], [standardVersion]);

        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('creates standard file', async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: '**/*.ts',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: 1,
          summary: 'Test standard',
          userId: createUserId('user-1'),
          scope: standard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.deployArtifacts([], [standardVersion]);

        expect(result.createOrUpdate[0].path).toContain(
          'standard-test-standard',
        );
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when removing recipes with other recipes remaining', () => {
      it('deletes one file', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const installedRecipe = recipeFactory({
          name: 'Installed Recipe',
          slug: 'installed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const installedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: installedRecipe.id,
          name: installedRecipe.name,
          slug: installedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [installedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
        );

        expect(result.delete).toHaveLength(1);
      });

      it('deletes removed recipe command file', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const installedRecipe = recipeFactory({
          name: 'Installed Recipe',
          slug: 'installed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const installedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: installedRecipe.id,
          name: installedRecipe.name,
          slug: installedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [installedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
        );

        expect(result.delete[0].path).toBe(
          '.continue/prompts/removed-recipe.md',
        );
      });

      it('does not delete commands folder', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const installedRecipe = recipeFactory({
          name: 'Installed Recipe',
          slug: 'installed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const installedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: installedRecipe.id,
          name: installedRecipe.name,
          slug: installedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [installedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
        );

        expect(result.delete.some((f) => f.path === '.continue/prompts/')).toBe(
          false,
        );
      });
    });

    describe('when removing last recipe with no standards', () => {
      it('deletes recipe command file', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(
          result.delete.some((f) =>
            f.path.includes('.continue/prompts/removed-recipe.md'),
          ),
        ).toBe(true);
      });

      it('deletes commands folder', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(result.delete.some((f) => f.path === '.continue/prompts/')).toBe(
          true,
        );
      });

      it('deletes legacy recipes-index.md', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(
          result.delete.some((f) => f.path.includes('recipes-index')),
        ).toBe(true);
      });

      it('deletes rules/packmind folder', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(
          result.delete.some((f) => f.path === '.continue/rules/packmind/'),
        ).toBe(true);
      });
    });

    describe('when removing standards', () => {
      it('deletes standard file', async () => {
        const removedStandard = standardFactory({
          name: 'Removed Standard',
          slug: 'removed-standard',
          scope: '**/*.ts',
        });

        const removedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: removedStandard.id,
          name: removedStandard.name,
          slug: removedStandard.slug,
          description: removedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: removedStandard.scope,
          rules: [] as Rule[],
        };

        const installedStandard = standardFactory({
          name: 'Installed Standard',
          slug: 'installed-standard',
          scope: '**/*.ts',
        });

        const installedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-2'),
          standardId: installedStandard.id,
          name: installedStandard.name,
          slug: installedStandard.slug,
          description: installedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: installedStandard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [removedStandardVersion],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [installedStandardVersion],
            skillVersions: [],
          },
        );

        expect(
          result.delete.some((f) =>
            f.path.includes('standard-removed-standard'),
          ),
        ).toBe(true);
      });
    });

    describe('when removing last standard with no recipes', () => {
      it('deletes standard file', async () => {
        const removedStandard = standardFactory({
          name: 'Removed Standard',
          slug: 'removed-standard',
          scope: '**/*.ts',
        });

        const removedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: removedStandard.id,
          name: removedStandard.name,
          slug: removedStandard.slug,
          description: removedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: removedStandard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [removedStandardVersion],
            skillVersions: [],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(
          result.delete.some((f) =>
            f.path.includes('standard-removed-standard'),
          ),
        ).toBe(true);
      });

      it('deletes packmind folder', async () => {
        const removedStandard = standardFactory({
          name: 'Removed Standard',
          slug: 'removed-standard',
          scope: '**/*.ts',
        });

        const removedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: removedStandard.id,
          name: removedStandard.name,
          slug: removedStandard.slug,
          description: removedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: removedStandard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [removedStandardVersion],
            skillVersions: [],
          },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(
          result.delete.some((f) => f.path === '.continue/rules/packmind/'),
        ).toBe(true);
      });
    });

    describe('when removing last recipe but standards remain', () => {
      it('deletes recipe command file', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const installedStandard = standardFactory({
          name: 'Installed Standard',
          slug: 'installed-standard',
          scope: '**/*.ts',
        });

        const installedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: installedStandard.id,
          name: installedStandard.name,
          slug: installedStandard.slug,
          description: installedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: installedStandard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [installedStandardVersion],
            skillVersions: [],
          },
        );

        expect(
          result.delete.some((f) =>
            f.path.includes('.continue/prompts/removed-recipe.md'),
          ),
        ).toBe(true);
      });

      it('deletes commands folder', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const installedStandard = standardFactory({
          name: 'Installed Standard',
          slug: 'installed-standard',
          scope: '**/*.ts',
        });

        const installedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: installedStandard.id,
          name: installedStandard.name,
          slug: installedStandard.slug,
          description: installedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: installedStandard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [installedStandardVersion],
            skillVersions: [],
          },
        );

        expect(result.delete.some((f) => f.path === '.continue/prompts/')).toBe(
          true,
        );
      });

      it('deletes legacy recipes-index', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const installedStandard = standardFactory({
          name: 'Installed Standard',
          slug: 'installed-standard',
          scope: '**/*.ts',
        });

        const installedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: installedStandard.id,
          name: installedStandard.name,
          slug: installedStandard.slug,
          description: installedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: installedStandard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [installedStandardVersion],
            skillVersions: [],
          },
        );

        expect(
          result.delete.some((f) => f.path.includes('recipes-index')),
        ).toBe(true);
      });

      it('does not delete rules/packmind folder', async () => {
        const removedRecipe = recipeFactory({
          name: 'Removed Recipe',
          slug: 'removed-recipe',
        });

        const removedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: removedRecipe.id,
          name: removedRecipe.name,
          slug: removedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const installedStandard = standardFactory({
          name: 'Installed Standard',
          slug: 'installed-standard',
          scope: '**/*.ts',
        });

        const installedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: installedStandard.id,
          name: installedStandard.name,
          slug: installedStandard.slug,
          description: installedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: installedStandard.scope,
          rules: [] as Rule[],
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [removedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [installedStandardVersion],
            skillVersions: [],
          },
        );

        expect(
          result.delete.some((f) => f.path === '.continue/rules/packmind/'),
        ).toBe(false);
      });
    });

    describe('when removing last standard but recipes remain', () => {
      it('deletes standard file', async () => {
        const removedStandard = standardFactory({
          name: 'Removed Standard',
          slug: 'removed-standard',
          scope: '**/*.ts',
        });

        const removedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: removedStandard.id,
          name: removedStandard.name,
          slug: removedStandard.slug,
          description: removedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: removedStandard.scope,
          rules: [] as Rule[],
        };

        const installedRecipe = recipeFactory({
          name: 'Installed Recipe',
          slug: 'installed-recipe',
        });

        const installedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: installedRecipe.id,
          name: installedRecipe.name,
          slug: installedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [removedStandardVersion],
            skillVersions: [],
          },
          {
            recipeVersions: [installedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
        );

        expect(
          result.delete.some((f) =>
            f.path.includes('standard-removed-standard'),
          ),
        ).toBe(true);
      });

      it('does not delete packmind folder', async () => {
        const removedStandard = standardFactory({
          name: 'Removed Standard',
          slug: 'removed-standard',
          scope: '**/*.ts',
        });

        const removedStandardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: removedStandard.id,
          name: removedStandard.name,
          slug: removedStandard.slug,
          description: removedStandard.description,
          version: 1,
          summary: 'Standard summary',
          userId: createUserId('user-1'),
          scope: removedStandard.scope,
          rules: [] as Rule[],
        };

        const installedRecipe = recipeFactory({
          name: 'Installed Recipe',
          slug: 'installed-recipe',
        });

        const installedRecipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: installedRecipe.id,
          name: installedRecipe.name,
          slug: installedRecipe.slug,
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [removedStandardVersion],
            skillVersions: [],
          },
          {
            recipeVersions: [installedRecipeVersion],
            standardVersions: [],
            skillVersions: [],
          },
        );

        expect(
          result.delete.some((f) => f.path === '.continue/rules/packmind/'),
        ).toBe(false);
      });
    });
  });
});
