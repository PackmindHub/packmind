import { accountsSchemas } from '@packmind/accounts';
import { ContinueDeployer, DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
import {
  createTargetId,
  GitProviderVendors,
  GitRepo,
  IGitPort,
  IStandardsPort,
  Organization,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  Space,
  Standard,
  StandardVersion,
  StandardVersionId,
  Target,
  User,
} from '@packmind/types';
import assert from 'assert';
import { DataSource } from 'typeorm';
import { TestApp } from '../helpers/TestApp';

describe('Continue Deployment Integration', () => {
  let testApp: TestApp;
  let dataSource: DataSource;
  let standardsPort: IStandardsPort;
  let gitPort: IGitPort;
  let deployerService: DeployerService;

  let recipe: Recipe;
  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;
  let gitRepo: GitRepo;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...recipesSchemas,
      ...standardsSchemas,
      ...spacesSchemas,
      ...gitSchemas,
      ...deploymentsSchemas,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    // Use TestApp which handles all hexa registration and initialization
    testApp = new TestApp(dataSource);
    await testApp.initialize();

    // Get deployer service from hexa
    deployerService = testApp.codingAgentHexa.getDeployerService();

    // Get adapters
    standardsPort = testApp.standardsHexa.getAdapter();
    gitPort = testApp.gitHexa.getAdapter();

    // Create test data
    const signUpResult = await testApp.accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        organizationName: 'test organization',
        email: 'testuser@packmind.com',
        password: 's3cret!@',
      });
    user = signUpResult.user;
    organization = signUpResult.organization;

    // Get the default "Global" space created during signup
    const spaces = await testApp.spacesHexa
      .getAdapter()
      .listSpacesByOrganization(organization.id);
    const foundSpace = spaces.find((s) => s.name === 'Global');
    assert(foundSpace, 'Default Global space should exist');
    space = foundSpace;

    // Create test recipe
    recipe = await testApp.recipesHexa.getAdapter().captureRecipe({
      name: 'Test Recipe for Continue',
      content: 'This is test recipe content for Continue deployment',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
    });

    // Create test standard
    standard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'Test Standard for Continue',
      description: 'A test standard for Continue deployment',
      rules: [
        { content: 'Use meaningful variable names in TypeScript' },
        { content: 'Write comprehensive tests for all components' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: '**/*.{ts,tsx}',
      spaceId: space.id,
    });

    // Create git provider and repository
    const gitProvider = await testApp.gitHexa.getAdapter().addGitProvider({
      userId: user.id,
      organizationId: organization.id,
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://api.github.com',
        token: 'test-github-token',
      },
    });

    gitRepo = await testApp.gitHexa.getAdapter().addGitRepo({
      userId: user.id,
      organizationId: organization.id,
      gitProviderId: gitProvider.id,
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
    });
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('when .continue/rules/packmind/recipes-index.md does not exist', () => {
    let defaultTarget: Target;

    beforeEach(() => {
      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // Mock GitHexa.getFileFromRepo to return null (file doesn't exist)
      // Mock gitPort.getFileFromRepo (gitPort is initialized in main beforeEach)
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when deploying recipes', () => {
      it('creates one file update', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('does not delete any files', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('creates file at correct path', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.continue/rules/packmind/recipes-index.md',
        );

        expect(continueFile).toBeDefined();
      });

      it('includes frontmatter with name', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.continue/rules/packmind/recipes-index.md',
        );

        if (continueFile) {
          expect(continueFile.content).toContain('name: Packmind Recipes');
        }
      });

      it('includes frontmatter with alwaysApply true', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.continue/rules/packmind/recipes-index.md',
        );

        if (continueFile) {
          expect(continueFile.content).toContain('alwaysApply: true');
        }
      });

      it('includes frontmatter with description', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.continue/rules/packmind/recipes-index.md',
        );

        if (continueFile) {
          expect(continueFile.content).toContain(
            'description: Packmind recipes for Continue',
          );
        }
      });

      it('includes Packmind Recipes header', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.continue/rules/packmind/recipes-index.md',
        );

        if (continueFile) {
          expect(continueFile.content).toContain('# Packmind Recipes');
        }
      });

      it('includes mandatory step warning', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.continue/rules/packmind/recipes-index.md',
        );

        if (continueFile) {
          expect(continueFile.content).toContain('🚨 **MANDATORY STEP** 🚨');
        }
      });

      it('includes recipe name in content', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Continue deployment with detailed instructions',
            userId: user.id,
          },
        ];

        const fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.continue/rules/packmind/recipes-index.md',
        );

        if (continueFile) {
          expect(continueFile.content).toContain('Test Recipe for Continue');
        }
      });
    });

    describe('when deploying standards', () => {
      it('creates one file update', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('does not delete any files', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('creates file at correct path', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            `.continue/rules/packmind/standard-${standard.slug}.md`,
        );

        expect(continueStandardFile).toBeDefined();
      });

      it('includes frontmatter with name', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            `.continue/rules/packmind/standard-${standard.slug}.md`,
        );

        if (continueStandardFile) {
          expect(continueStandardFile.content).toContain(
            `name: ${standard.name}`,
          );
        }
      });

      describe('when scope exists', () => {
        it('includes frontmatter with globs', async () => {
          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard.id,
              name: standard.name,
              slug: standard.slug,
              description: standard.description,
              version: standard.version,
              summary: 'Test standard for Continue deployment',
              userId: user.id,
              scope: standard.scope,
            },
          ];

          const fileUpdates =
            await deployerService.aggregateStandardsDeployments(
              standardVersions,
              gitRepo,
              [defaultTarget],
              ['continue'],
            );

          const continueStandardFile = fileUpdates.createOrUpdate.find(
            (file) =>
              file.path ===
              `.continue/rules/packmind/standard-${standard.slug}.md`,
          );

          if (continueStandardFile) {
            expect(continueStandardFile.content).toContain(
              'globs: **/*.{ts,tsx}',
            );
          }
        });

        it('sets alwaysApply to false', async () => {
          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard.id,
              name: standard.name,
              slug: standard.slug,
              description: standard.description,
              version: standard.version,
              summary: 'Test standard for Continue deployment',
              userId: user.id,
              scope: standard.scope,
            },
          ];

          const fileUpdates =
            await deployerService.aggregateStandardsDeployments(
              standardVersions,
              gitRepo,
              [defaultTarget],
              ['continue'],
            );

          const continueStandardFile = fileUpdates.createOrUpdate.find(
            (file) =>
              file.path ===
              `.continue/rules/packmind/standard-${standard.slug}.md`,
          );

          if (continueStandardFile) {
            expect(continueStandardFile.content).toContain(
              'alwaysApply: false',
            );
          }
        });
      });

      it('includes frontmatter with description from summary', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            `.continue/rules/packmind/standard-${standard.slug}.md`,
        );

        if (continueStandardFile) {
          expect(continueStandardFile.content).toContain(
            'description: Test standard for Continue deployment',
          );
        }
      });

      it('includes first rule in content', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            `.continue/rules/packmind/standard-${standard.slug}.md`,
        );

        if (continueStandardFile) {
          expect(continueStandardFile.content).toContain(
            '* Use meaningful variable names in TypeScript',
          );
        }
      });

      it('includes second rule in content', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            `.continue/rules/packmind/standard-${standard.slug}.md`,
        );

        if (continueStandardFile) {
          expect(continueStandardFile.content).toContain(
            '* Write comprehensive tests for all components',
          );
        }
      });

      it('includes link to full standard', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for Continue deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            `.continue/rules/packmind/standard-${standard.slug}.md`,
        );

        if (continueStandardFile) {
          expect(continueStandardFile.content).toContain(
            `Full standard is available here for further request: [${standard.name}](../../../.packmind/standards/${standard.slug}.md)`,
          );
        }
      });
    });

    describe('when deploying standard without scope', () => {
      it('sets alwaysApply to true', async () => {
        const globalStandard = await testApp.standardsHexa
          .getAdapter()
          .createStandard({
            name: 'Global Standard',
            description: 'A global standard without scope',
            rules: [{ content: 'Always use consistent formatting' }],
            organizationId: organization.id,
            userId: user.id,
            scope: '',
            spaceId: space.id,
          });

        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-2' as StandardVersionId,
            standardId: globalStandard.id,
            name: globalStandard.name,
            slug: globalStandard.slug,
            description: globalStandard.description,
            version: globalStandard.version,
            summary: 'Global standard for all files',
            userId: user.id,
            scope: globalStandard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate[0];
        expect(continueStandardFile.content).toContain('alwaysApply: true');
      });

      it('does not include globs in frontmatter', async () => {
        const globalStandard = await testApp.standardsHexa
          .getAdapter()
          .createStandard({
            name: 'Global Standard',
            description: 'A global standard without scope',
            rules: [{ content: 'Always use consistent formatting' }],
            organizationId: organization.id,
            userId: user.id,
            scope: '',
            spaceId: space.id,
          });

        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-2' as StandardVersionId,
            standardId: globalStandard.id,
            name: globalStandard.name,
            slug: globalStandard.slug,
            description: globalStandard.description,
            version: globalStandard.version,
            summary: 'Global standard for all files',
            userId: user.id,
            scope: globalStandard.scope,
          },
        ];

        const fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        const continueStandardFile = fileUpdates.createOrUpdate[0];
        expect(continueStandardFile.content).not.toContain('globs:');
      });
    });

    describe('when deploying both recipes and standards', () => {
      it('creates one file update for recipes', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'Test recipe for combined deployment',
            userId: user.id,
          },
        ];

        const defaultTarget = {
          id: createTargetId('default-target-id'),
          name: 'Default',
          path: '/',
          gitRepoId: gitRepo.id,
        };

        const recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        expect(recipeUpdates.createOrUpdate).toHaveLength(1);
      });

      it('creates one file update for standards', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for combined deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const defaultTarget = {
          id: createTargetId('default-target-id'),
          name: 'Default',
          path: '/',
          gitRepoId: gitRepo.id,
        };

        const standardsUpdates =
          await deployerService.aggregateStandardsDeployments(
            standardVersions,
            gitRepo,
            [defaultTarget],
            ['continue'],
          );

        expect(standardsUpdates.createOrUpdate).toHaveLength(1);
      });

      it('creates recipes file at correct path', async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'Test recipe for combined deployment',
            userId: user.id,
          },
        ];

        const defaultTarget = {
          id: createTargetId('default-target-id'),
          name: 'Default',
          path: '/',
          gitRepoId: gitRepo.id,
        };

        const recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

        expect(recipeUpdates.createOrUpdate[0].path).toBe(
          '.continue/rules/packmind/recipes-index.md',
        );
      });

      it('creates standards file at correct path', async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for combined deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const defaultTarget = {
          id: createTargetId('default-target-id'),
          name: 'Default',
          path: '/',
          gitRepoId: gitRepo.id,
        };

        const standardsUpdates =
          await deployerService.aggregateStandardsDeployments(
            standardVersions,
            gitRepo,
            [defaultTarget],
            ['continue'],
          );

        expect(standardsUpdates.createOrUpdate[0].path).toBe(
          `.continue/rules/packmind/standard-${standard.slug}.md`,
        );
      });
    });
  });

  describe('when .continue/rules/packmind/recipes-index.md already exists', () => {
    let defaultTarget: Target;
    const existingContent = `---
name: Packmind Recipes
alwaysApply: true
description: Packmind recipes for Continue
---

# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: the available recipes below to see what recipes are available

## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**\`

## Available recipes

- [Test Recipe for Continue](.packmind/recipes/test-recipe-for-continue.md) : Test recipe for deployment`;

    beforeEach(async () => {
      const gitPort = testApp.gitHexa.getAdapter();

      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      const existingFile = {
        content: existingContent,
        sha: 'abc123',
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(existingFile);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not create any file updates', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'Test recipe for deployment',
          userId: user.id,
        },
      ];

      const fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['continue'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
    });

    it('does not delete any files', async () => {
      const recipeVersions: RecipeVersion[] = [
        {
          id: 'recipe-version-1' as RecipeVersionId,
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: recipe.version,
          summary: 'Test recipe for deployment',
          userId: user.id,
        },
      ];

      const fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['continue'],
      );

      expect(fileUpdates.delete).toHaveLength(0);
    });
  });

  describe('unit tests for ContinueDeployer', () => {
    let defaultTarget: Target;
    let continueDeployer: ContinueDeployer;

    beforeEach(async () => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      standardsPort = testApp.standardsHexa.getAdapter();
      gitPort = testApp.gitHexa.getAdapter();
      continueDeployer = new ContinueDeployer(standardsPort, gitPort);
    });

    it('returns no file updates for empty recipe list', async () => {
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await continueDeployer.deployRecipes(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
    });

    it('returns no file deletions for empty recipe list', async () => {
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await continueDeployer.deployRecipes(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('returns no file updates for empty standards list', async () => {
      const fileUpdates = await continueDeployer.deployStandards(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
    });

    it('returns no file deletions for empty standards list', async () => {
      const fileUpdates = await continueDeployer.deployStandards(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.delete).toHaveLength(0);
    });

    describe('when GitHexa throws an error', () => {
      it('creates file update despite error', async () => {
        jest
          .spyOn(testApp.gitHexa.getAdapter(), 'getFileFromRepo')
          .mockRejectedValue(new Error('GitHub API error'));

        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'Test recipe',
            userId: user.id,
          },
        ];

        const fileUpdates = await continueDeployer.deployRecipes(
          recipeVersions,
          gitRepo,
          defaultTarget,
        );

        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('includes Packmind Recipes header in generated file', async () => {
        jest
          .spyOn(testApp.gitHexa.getAdapter(), 'getFileFromRepo')
          .mockRejectedValue(new Error('GitHub API error'));

        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'Test recipe',
            userId: user.id,
          },
        ];

        const fileUpdates = await continueDeployer.deployRecipes(
          recipeVersions,
          gitRepo,
          defaultTarget,
        );

        const continueFile = fileUpdates.createOrUpdate[0];
        expect(continueFile.content).toContain('# Packmind Recipes');
      });
    });

    describe('when deploying multiple standards', () => {
      it('creates two file updates', async () => {
        const standard1 = await testApp.standardsHexa
          .getAdapter()
          .createStandard({
            name: 'Frontend Standard',
            description: 'Frontend coding standard',
            rules: [{ content: 'Use TypeScript' }],
            organizationId: organization.id,
            userId: user.id,
            scope: '**/*.{ts,tsx,js,jsx}',
            spaceId: space.id,
          });

        const standard2 = await testApp.standardsHexa
          .getAdapter()
          .createStandard({
            name: 'Backend Standard',
            description: 'Backend coding standard',
            rules: [{ content: 'Use dependency injection' }],
            organizationId: organization.id,
            userId: user.id,
            scope: '',
            spaceId: space.id,
          });

        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: standard1.description,
            version: standard1.version,
            summary: 'Frontend standard',
            userId: user.id,
            scope: standard1.scope,
          },
          {
            id: 'standard-version-2' as StandardVersionId,
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: standard2.description,
            version: standard2.version,
            summary: 'Backend standard',
            userId: user.id,
            scope: standard2.scope,
          },
        ];

        const fileUpdates = await continueDeployer.deployStandards(
          standardVersions,
          gitRepo,
          defaultTarget,
        );

        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      describe('for first standard with scope', () => {
        it('includes name in frontmatter', async () => {
          const standard1 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Frontend Standard',
              description: 'Frontend coding standard',
              rules: [{ content: 'Use TypeScript' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '**/*.{ts,tsx,js,jsx}',
              spaceId: space.id,
            });

          const standard2 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Backend Standard',
              description: 'Backend coding standard',
              rules: [{ content: 'Use dependency injection' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '',
              spaceId: space.id,
            });

          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard1.id,
              name: standard1.name,
              slug: standard1.slug,
              description: standard1.description,
              version: standard1.version,
              summary: 'Frontend standard',
              userId: user.id,
              scope: standard1.scope,
            },
            {
              id: 'standard-version-2' as StandardVersionId,
              standardId: standard2.id,
              name: standard2.name,
              slug: standard2.slug,
              description: standard2.description,
              version: standard2.version,
              summary: 'Backend standard',
              userId: user.id,
              scope: standard2.scope,
            },
          ];

          const fileUpdates = await continueDeployer.deployStandards(
            standardVersions,
            gitRepo,
            defaultTarget,
          );

          const frontendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard1.slug),
          );

          if (frontendFile) {
            expect(frontendFile.content).toContain(`name: ${standard1.name}`);
          }
        });

        it('includes globs in frontmatter', async () => {
          const standard1 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Frontend Standard',
              description: 'Frontend coding standard',
              rules: [{ content: 'Use TypeScript' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '**/*.{ts,tsx,js,jsx}',
              spaceId: space.id,
            });

          const standard2 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Backend Standard',
              description: 'Backend coding standard',
              rules: [{ content: 'Use dependency injection' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '',
              spaceId: space.id,
            });

          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard1.id,
              name: standard1.name,
              slug: standard1.slug,
              description: standard1.description,
              version: standard1.version,
              summary: 'Frontend standard',
              userId: user.id,
              scope: standard1.scope,
            },
            {
              id: 'standard-version-2' as StandardVersionId,
              standardId: standard2.id,
              name: standard2.name,
              slug: standard2.slug,
              description: standard2.description,
              version: standard2.version,
              summary: 'Backend standard',
              userId: user.id,
              scope: standard2.scope,
            },
          ];

          const fileUpdates = await continueDeployer.deployStandards(
            standardVersions,
            gitRepo,
            defaultTarget,
          );

          const frontendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard1.slug),
          );

          if (frontendFile) {
            expect(frontendFile.content).toContain(
              'globs: **/*.{ts,tsx,js,jsx}',
            );
          }
        });

        it('sets alwaysApply to false', async () => {
          const standard1 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Frontend Standard',
              description: 'Frontend coding standard',
              rules: [{ content: 'Use TypeScript' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '**/*.{ts,tsx,js,jsx}',
              spaceId: space.id,
            });

          const standard2 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Backend Standard',
              description: 'Backend coding standard',
              rules: [{ content: 'Use dependency injection' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '',
              spaceId: space.id,
            });

          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard1.id,
              name: standard1.name,
              slug: standard1.slug,
              description: standard1.description,
              version: standard1.version,
              summary: 'Frontend standard',
              userId: user.id,
              scope: standard1.scope,
            },
            {
              id: 'standard-version-2' as StandardVersionId,
              standardId: standard2.id,
              name: standard2.name,
              slug: standard2.slug,
              description: standard2.description,
              version: standard2.version,
              summary: 'Backend standard',
              userId: user.id,
              scope: standard2.scope,
            },
          ];

          const fileUpdates = await continueDeployer.deployStandards(
            standardVersions,
            gitRepo,
            defaultTarget,
          );

          const frontendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard1.slug),
          );

          if (frontendFile) {
            expect(frontendFile.content).toContain('alwaysApply: false');
          }
        });
      });

      describe('for second standard without scope', () => {
        it('includes name in frontmatter', async () => {
          const standard1 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Frontend Standard',
              description: 'Frontend coding standard',
              rules: [{ content: 'Use TypeScript' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '**/*.{ts,tsx,js,jsx}',
              spaceId: space.id,
            });

          const standard2 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Backend Standard',
              description: 'Backend coding standard',
              rules: [{ content: 'Use dependency injection' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '',
              spaceId: space.id,
            });

          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard1.id,
              name: standard1.name,
              slug: standard1.slug,
              description: standard1.description,
              version: standard1.version,
              summary: 'Frontend standard',
              userId: user.id,
              scope: standard1.scope,
            },
            {
              id: 'standard-version-2' as StandardVersionId,
              standardId: standard2.id,
              name: standard2.name,
              slug: standard2.slug,
              description: standard2.description,
              version: standard2.version,
              summary: 'Backend standard',
              userId: user.id,
              scope: standard2.scope,
            },
          ];

          const fileUpdates = await continueDeployer.deployStandards(
            standardVersions,
            gitRepo,
            defaultTarget,
          );

          const backendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard2.slug),
          );

          if (backendFile) {
            expect(backendFile.content).toContain(`name: ${standard2.name}`);
          }
        });

        it('does not include globs in frontmatter', async () => {
          const standard1 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Frontend Standard',
              description: 'Frontend coding standard',
              rules: [{ content: 'Use TypeScript' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '**/*.{ts,tsx,js,jsx}',
              spaceId: space.id,
            });

          const standard2 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Backend Standard',
              description: 'Backend coding standard',
              rules: [{ content: 'Use dependency injection' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '',
              spaceId: space.id,
            });

          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard1.id,
              name: standard1.name,
              slug: standard1.slug,
              description: standard1.description,
              version: standard1.version,
              summary: 'Frontend standard',
              userId: user.id,
              scope: standard1.scope,
            },
            {
              id: 'standard-version-2' as StandardVersionId,
              standardId: standard2.id,
              name: standard2.name,
              slug: standard2.slug,
              description: standard2.description,
              version: standard2.version,
              summary: 'Backend standard',
              userId: user.id,
              scope: standard2.scope,
            },
          ];

          const fileUpdates = await continueDeployer.deployStandards(
            standardVersions,
            gitRepo,
            defaultTarget,
          );

          const backendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard2.slug),
          );

          if (backendFile) {
            expect(backendFile.content).not.toContain('globs:');
          }
        });

        it('sets alwaysApply to true', async () => {
          const standard1 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Frontend Standard',
              description: 'Frontend coding standard',
              rules: [{ content: 'Use TypeScript' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '**/*.{ts,tsx,js,jsx}',
              spaceId: space.id,
            });

          const standard2 = await testApp.standardsHexa
            .getAdapter()
            .createStandard({
              name: 'Backend Standard',
              description: 'Backend coding standard',
              rules: [{ content: 'Use dependency injection' }],
              organizationId: organization.id,
              userId: user.id,
              scope: '',
              spaceId: space.id,
            });

          const standardVersions: StandardVersion[] = [
            {
              id: 'standard-version-1' as StandardVersionId,
              standardId: standard1.id,
              name: standard1.name,
              slug: standard1.slug,
              description: standard1.description,
              version: standard1.version,
              summary: 'Frontend standard',
              userId: user.id,
              scope: standard1.scope,
            },
            {
              id: 'standard-version-2' as StandardVersionId,
              standardId: standard2.id,
              name: standard2.name,
              slug: standard2.slug,
              description: standard2.description,
              version: standard2.version,
              summary: 'Backend standard',
              userId: user.id,
              scope: standard2.scope,
            },
          ];

          const fileUpdates = await continueDeployer.deployStandards(
            standardVersions,
            gitRepo,
            defaultTarget,
          );

          const backendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard2.slug),
          );

          if (backendFile) {
            expect(backendFile.content).toContain('alwaysApply: true');
          }
        });
      });
    });
  });
});
