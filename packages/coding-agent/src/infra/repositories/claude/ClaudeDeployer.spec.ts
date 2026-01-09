import { ClaudeDeployer } from './ClaudeDeployer';
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

describe('ClaudeDeployer', () => {
  let deployer: ClaudeDeployer;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    mockStandardsPort = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    deployer = new ClaudeDeployer(mockStandardsPort);

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

        expect(result.createOrUpdate).toHaveLength(2);
        expect(
          result.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/commands/packmind/'),
          ),
        ).toHaveLength(1);
      });

      describe('when clearing legacy CLAUDE.md recipes section', () => {
        let claudeMdUpdate: (typeof result.createOrUpdate)[number] | undefined;
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
            content: 'This is the recipe content',
            version: 1,
            summary: 'A test recipe summary',
            userId: createUserId('user-1'),
          };

          result = await deployer.deployRecipes(
            [recipeVersion],
            mockGitRepo,
            mockTarget,
          );

          claudeMdUpdate = result.createOrUpdate.find(
            (f) => f.path === 'CLAUDE.md',
          );
        });

        it('includes CLAUDE.md in updates', () => {
          expect(claudeMdUpdate).toBeDefined();
        });

        it('has sections defined', () => {
          expect(claudeMdUpdate?.sections).toBeDefined();
        });

        it('has exactly one section', () => {
          expect(claudeMdUpdate?.sections).toHaveLength(1);
        });

        it('has Packmind recipes section key', () => {
          expect(claudeMdUpdate?.sections?.[0].key).toBe('Packmind recipes');
        });

        it('sets section content to empty string', () => {
          expect(claudeMdUpdate?.sections?.[0].content).toBe('');
        });
      });

      it('does not delete any files', async () => {
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

        expect(result.delete).toHaveLength(0);
      });

      it('creates file at correct path', async () => {
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

        const recipeFile = result.createOrUpdate[0];
        expect(recipeFile.path).toBe(
          '.claude/commands/packmind/test-recipe.md',
        );
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

        const recipeFile = result.createOrUpdate[0];
        expect(recipeFile.content).toContain(
          'description: A test recipe summary',
        );
      });

      it('includes YAML frontmatter delimiters', async () => {
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

        const recipeFile = result.createOrUpdate[0];
        expect(recipeFile.content).toMatch(/^---\n/);
      });

      it('includes recipe content after frontmatter', async () => {
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

        const recipeFile = result.createOrUpdate[0];
        expect(recipeFile.content).toContain('This is the recipe content');
      });
    });

    describe('when summary is not available', () => {
      it('uses recipe name as description fallback', async () => {
        const recipe = recipeFactory({
          name: 'Recipe Without Summary',
          slug: 'recipe-without-summary',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe content',
          version: 1,
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );

        const recipeFile = result.createOrUpdate[0];
        expect(recipeFile.content).toContain(
          'description: Recipe Without Summary',
        );
      });
    });

    describe('when deploying empty recipe list', () => {
      let result: Awaited<ReturnType<typeof deployer.deployRecipes>>;

      beforeEach(async () => {
        result = await deployer.deployRecipes([], mockGitRepo, mockTarget);
      });

      it('returns one file update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('returns CLAUDE.md as the file path', () => {
        expect(result.createOrUpdate[0].path).toBe('CLAUDE.md');
      });

      it('returns one section in the update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('returns no file deletions', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when deploying multiple recipes', () => {
      it('creates file for each recipe', async () => {
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

        expect(result.createOrUpdate).toHaveLength(3);
        expect(
          result.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/commands/packmind/'),
          ),
        ).toHaveLength(2);
      });

      it('creates first recipe file at correct path', async () => {
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

        const firstRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-1'),
        );
        expect(firstRecipeFile?.path).toBe(
          '.claude/commands/packmind/test-recipe-1.md',
        );
      });

      it('creates second recipe file at correct path', async () => {
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

        const secondRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-2'),
        );
        expect(secondRecipeFile?.path).toBe(
          '.claude/commands/packmind/test-recipe-2.md',
        );
      });

      it('includes first recipe content in its file', async () => {
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

        const firstRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-1'),
        );
        expect(firstRecipeFile?.content).toContain('Recipe 1 instructions');
      });

      it('includes second recipe content in its file', async () => {
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

        const secondRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-2'),
        );
        expect(secondRecipeFile?.content).toContain('Recipe 2 instructions');
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

        expect(result.createOrUpdate).toHaveLength(2);
        expect(
          result.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/rules/packmind/'),
          ),
        ).toHaveLength(1);
      });

      describe('when clearing legacy CLAUDE.md standards section', () => {
        let claudeMdUpdate: (typeof result.createOrUpdate)[number] | undefined;
        let result: Awaited<ReturnType<typeof deployer.deployStandards>>;

        beforeEach(async () => {
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

          result = await deployer.deployStandards(
            [standardVersion],
            mockGitRepo,
            mockTarget,
          );

          claudeMdUpdate = result.createOrUpdate.find(
            (f) => f.path === 'CLAUDE.md',
          );
        });

        it('includes CLAUDE.md in updates', () => {
          expect(claudeMdUpdate).toBeDefined();
        });

        it('has sections defined', () => {
          expect(claudeMdUpdate?.sections).toBeDefined();
        });

        it('has exactly one section', () => {
          expect(claudeMdUpdate?.sections).toHaveLength(1);
        });

        it('has Packmind standards section key', () => {
          expect(claudeMdUpdate?.sections?.[0].key).toBe('Packmind standards');
        });

        it('sets section content to empty string', () => {
          expect(claudeMdUpdate?.sections?.[0].content).toBe('');
        });
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

        const standardFile = result.createOrUpdate.find((f) =>
          f.path.startsWith('.claude/rules/packmind/'),
        );
        expect(standardFile?.path).toBe(
          '.claude/rules/packmind/standard-test-standard.md',
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
        expect(standardFile.content).toContain(`name: ${standard.name}`);
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

        it('does not split commas inside braces', async () => {
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
          expect(standardFile.content).toContain('globs: "**/*.{ts,tsx}"');
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
          'description: A test standard summary',
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
          '../../../.packmind/standards/test-standard.md',
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
            `description: ${standard.name}`,
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
            `description: ${standard.name}`,
          );
        });
      });
    });

    describe('when deploying empty standards list', () => {
      let result: Awaited<ReturnType<typeof deployer.deployStandards>>;

      beforeEach(async () => {
        result = await deployer.deployStandards([], mockGitRepo, mockTarget);
      });

      it('returns one file update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('returns CLAUDE.md as the file path', () => {
        expect(result.createOrUpdate[0].path).toBe('CLAUDE.md');
      });

      it('returns one section in the update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('returns no file deletions', () => {
        expect(result.delete).toHaveLength(0);
      });
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
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion,
        ]);

        expect(result.createOrUpdate).toHaveLength(2);
        expect(
          result.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/commands/packmind/'),
          ),
        ).toHaveLength(1);
      });

      it('creates file at correct path without target prefix', async () => {
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

        const recipeFile = result.createOrUpdate.find((f) =>
          f.path.startsWith('.claude/commands/packmind/'),
        );
        expect(recipeFile?.path).toBe(
          '.claude/commands/packmind/test-recipe.md',
        );
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
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion,
        ]);

        expect(result.createOrUpdate[0].content).toContain(
          'description: Recipe summary',
        );
      });

      it('includes YAML frontmatter delimiters', async () => {
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

        expect(result.createOrUpdate[0].content).toMatch(/^---\n/);
      });

      it('includes recipe content after frontmatter', async () => {
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

        expect(result.createOrUpdate[0].content).toContain('Recipe content');
      });
    });

    describe('when summary is not available', () => {
      it('uses recipe name as description fallback', async () => {
        const recipe = recipeFactory({
          name: 'Recipe Without Summary',
          slug: 'recipe-without-summary',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'Recipe content',
          version: 1,
          userId: createUserId('user-1'),
        };

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion,
        ]);

        expect(result.createOrUpdate[0].content).toContain(
          'description: Recipe Without Summary',
        );
      });
    });

    describe('when no recipes', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForRecipes>
      >;

      beforeEach(async () => {
        result = await deployer.generateFileUpdatesForRecipes([]);
      });

      it('returns one file update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('returns CLAUDE.md as the file path', () => {
        expect(result.createOrUpdate[0].path).toBe('CLAUDE.md');
      });

      it('returns one section in the update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('returns no file deletions', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when deploying multiple recipes', () => {
      it('creates file for each recipe', async () => {
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

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion1,
          recipeVersion2,
        ]);

        expect(result.createOrUpdate).toHaveLength(3);
        expect(
          result.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/commands/packmind/'),
          ),
        ).toHaveLength(2);
      });

      it('creates first recipe file at correct path', async () => {
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

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion1,
          recipeVersion2,
        ]);

        const firstRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-1'),
        );
        expect(firstRecipeFile?.path).toBe(
          '.claude/commands/packmind/test-recipe-1.md',
        );
      });

      it('creates second recipe file at correct path', async () => {
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

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion1,
          recipeVersion2,
        ]);

        const secondRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-2'),
        );
        expect(secondRecipeFile?.path).toBe(
          '.claude/commands/packmind/test-recipe-2.md',
        );
      });

      it('includes first recipe content in its file', async () => {
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

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion1,
          recipeVersion2,
        ]);

        const firstRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-1'),
        );
        expect(firstRecipeFile?.content).toContain('Recipe 1 instructions');
      });

      it('includes second recipe content in its file', async () => {
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

        const result = await deployer.generateFileUpdatesForRecipes([
          recipeVersion1,
          recipeVersion2,
        ]);

        const secondRecipeFile = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-2'),
        );
        expect(secondRecipeFile?.content).toContain('Recipe 2 instructions');
      });
    });
  });

  describe('generateFileUpdatesForStandards', () => {
    it('generates file at correct path without target prefix', async () => {
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
        '.claude/rules/packmind/standard-test-standard.md',
      );
    });

    describe('when no standards', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForStandards>
      >;

      beforeEach(async () => {
        result = await deployer.generateFileUpdatesForStandards([]);
      });

      it('returns one file update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('returns CLAUDE.md as the file path', () => {
        expect(result.createOrUpdate[0].path).toBe('CLAUDE.md');
      });

      it('returns one section in the update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('returns no file deletions', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deployArtifacts', () => {
    describe('when deploying both recipes and standards', () => {
      describe('when verifying file update count', () => {
        let result: Awaited<ReturnType<typeof deployer.deployArtifacts>>;

        beforeEach(async () => {
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

          result = await deployer.deployArtifacts(
            [recipeVersion],
            [standardVersion],
          );
        });

        it('creates three file updates', () => {
          expect(result.createOrUpdate).toHaveLength(3);
        });

        it('creates two artifact files', () => {
          expect(
            result.createOrUpdate.filter(
              (f) =>
                f.path.startsWith('.claude/commands/packmind/') ||
                f.path.startsWith('.claude/rules/packmind/'),
            ),
          ).toHaveLength(2);
        });
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
          result.createOrUpdate.some(
            (f) => f.path === '.claude/commands/packmind/test-recipe.md',
          ),
        ).toBe(true);
      });

      describe('when clearing legacy CLAUDE.md sections', () => {
        let claudeMdUpdate: (typeof result.createOrUpdate)[number] | undefined;
        let result: Awaited<ReturnType<typeof deployer.deployArtifacts>>;

        beforeEach(async () => {
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

          result = await deployer.deployArtifacts(
            [recipeVersion],
            [standardVersion],
          );

          claudeMdUpdate = result.createOrUpdate.find(
            (f) => f.path === 'CLAUDE.md',
          );
        });

        it('includes CLAUDE.md in updates', () => {
          expect(claudeMdUpdate).toBeDefined();
        });

        it('has sections defined', () => {
          expect(claudeMdUpdate?.sections).toBeDefined();
        });

        it('has exactly two sections', () => {
          expect(claudeMdUpdate?.sections).toHaveLength(2);
        });

        it('includes Packmind standards section', () => {
          expect(
            claudeMdUpdate?.sections?.find(
              (s) => s.key === 'Packmind standards',
            ),
          ).toBeDefined();
        });

        it('includes Packmind recipes section', () => {
          expect(
            claudeMdUpdate?.sections?.find((s) => s.key === 'Packmind recipes'),
          ).toBeDefined();
        });
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
      describe('when verifying file update count', () => {
        let result: Awaited<ReturnType<typeof deployer.deployArtifacts>>;

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
            content: 'Recipe content',
            version: 1,
            summary: 'Recipe summary',
            userId: createUserId('user-1'),
          };

          result = await deployer.deployArtifacts([recipeVersion], []);
        });

        it('creates two file updates', () => {
          expect(result.createOrUpdate).toHaveLength(2);
        });

        it('creates one command file', () => {
          expect(
            result.createOrUpdate.filter((f) =>
              f.path.startsWith('.claude/commands/packmind/'),
            ),
          ).toHaveLength(1);
        });
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
          content: 'Recipe content',
          version: 1,
          summary: 'Recipe summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployArtifacts([recipeVersion], []);

        const recipeFile = result.createOrUpdate.find((f) =>
          f.path.startsWith('.claude/commands/packmind/'),
        );
        expect(recipeFile?.path).toBe(
          '.claude/commands/packmind/test-recipe.md',
        );
      });

      it('includes frontmatter with description', async () => {
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

        expect(result.createOrUpdate[0].content).toContain(
          'description: Recipe summary',
        );
      });

      it('includes recipe content', async () => {
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

        expect(result.createOrUpdate[0].content).toContain('Recipe content');
      });
    });

    describe('when deploying multiple recipes', () => {
      it('creates file for each recipe', async () => {
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
          content: 'Recipe 1 content',
          version: 1,
          summary: 'Recipe 1 summary',
          userId: createUserId('user-1'),
        };

        const recipeVersion2: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe 2 content',
          version: 1,
          summary: 'Recipe 2 summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployArtifacts(
          [recipeVersion1, recipeVersion2],
          [],
        );

        expect(result.createOrUpdate).toHaveLength(3);
        expect(
          result.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/commands/packmind/'),
          ),
        ).toHaveLength(2);
      });

      it('creates first recipe at correct path', async () => {
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
          content: 'Recipe 1 content',
          version: 1,
          summary: 'Recipe 1 summary',
          userId: createUserId('user-1'),
        };

        const recipeVersion2: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe 2 content',
          version: 1,
          summary: 'Recipe 2 summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployArtifacts(
          [recipeVersion1, recipeVersion2],
          [],
        );

        const firstRecipe = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-1'),
        );
        expect(firstRecipe?.path).toBe(
          '.claude/commands/packmind/test-recipe-1.md',
        );
      });

      it('creates second recipe at correct path', async () => {
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
          content: 'Recipe 1 content',
          version: 1,
          summary: 'Recipe 1 summary',
          userId: createUserId('user-1'),
        };

        const recipeVersion2: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: 'Recipe 2 content',
          version: 1,
          summary: 'Recipe 2 summary',
          userId: createUserId('user-1'),
        };

        const result = await deployer.deployArtifacts(
          [recipeVersion1, recipeVersion2],
          [],
        );

        const secondRecipe = result.createOrUpdate.find((f) =>
          f.path.includes('test-recipe-2'),
        );
        expect(secondRecipe?.path).toBe(
          '.claude/commands/packmind/test-recipe-2.md',
        );
      });
    });

    describe('when deploying only standards', () => {
      describe('when verifying file update count', () => {
        let result: Awaited<ReturnType<typeof deployer.deployArtifacts>>;

        beforeEach(async () => {
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

          result = await deployer.deployArtifacts([], [standardVersion]);
        });

        it('creates two file updates', () => {
          expect(result.createOrUpdate).toHaveLength(2);
        });

        it('creates one rule file', () => {
          expect(
            result.createOrUpdate.filter((f) =>
              f.path.startsWith('.claude/rules/packmind/'),
            ),
          ).toHaveLength(1);
        });
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

        const standardFile = result.createOrUpdate.find((f) =>
          f.path.startsWith('.claude/rules/packmind/'),
        );
        expect(standardFile?.path).toContain('standard-test-standard');
      });
    });

    describe('when deploying empty lists', () => {
      let result: Awaited<ReturnType<typeof deployer.deployArtifacts>>;

      beforeEach(async () => {
        result = await deployer.deployArtifacts([], []);
      });

      it('returns one file update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('returns CLAUDE.md as the file path', () => {
        expect(result.createOrUpdate[0].path).toBe('CLAUDE.md');
      });

      it('returns two sections in the update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('returns no file deletions', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when removing recipes with other recipes remaining', () => {
      it('deletes command file for removed recipe', async () => {
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

        expect(
          result.delete.some(
            (f) => f.path === '.claude/commands/packmind/removed-recipe.md',
          ),
        ).toBe(true);
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

        expect(
          result.delete.some((f) => f.path === '.claude/commands/packmind/'),
        ).toBe(false);
      });

      it('does not update CLAUDE.md', async () => {
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

        expect(result.createOrUpdate).toHaveLength(0);
      });
    });

    describe('when removing last recipe with no standards', () => {
      it('deletes command file for removed recipe', async () => {
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
          result.delete.some(
            (f) => f.path === '.claude/commands/packmind/removed-recipe.md',
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

        expect(
          result.delete.some((f) => f.path === '.claude/commands/packmind/'),
        ).toBe(true);
      });

      it('deletes rules folder', async () => {
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
          result.delete.some((f) => f.path === '.claude/rules/packmind/'),
        ).toBe(true);
      });

      it('does not update CLAUDE.md', async () => {
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

        expect(result.createOrUpdate).toHaveLength(0);
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
          result.delete.some((f) => f.path === '.claude/rules/packmind/'),
        ).toBe(true);
      });
    });

    describe('when removing last recipe but standards remain', () => {
      it('deletes command file for removed recipe', async () => {
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
          result.delete.some(
            (f) => f.path === '.claude/commands/packmind/removed-recipe.md',
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

        expect(
          result.delete.some((f) => f.path === '.claude/commands/packmind/'),
        ).toBe(true);
      });

      it('does not delete rules folder', async () => {
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
          result.delete.some((f) => f.path === '.claude/rules/packmind/'),
        ).toBe(false);
      });

      it('does not update CLAUDE.md', async () => {
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

        expect(result.createOrUpdate).toHaveLength(0);
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
          result.delete.some((f) => f.path === '.claude/rules/packmind/'),
        ).toBe(false);
      });
    });

    describe('when nothing is removed', () => {
      it('returns no file updates', async () => {
        const result = await deployer.generateRemovalFileUpdates(
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('returns no file deletions', async () => {
        const result = await deployer.generateRemovalFileUpdates(
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
          { recipeVersions: [], standardVersions: [], skillVersions: [] },
        );

        expect(result.delete).toHaveLength(0);
      });
    });
  });
});
