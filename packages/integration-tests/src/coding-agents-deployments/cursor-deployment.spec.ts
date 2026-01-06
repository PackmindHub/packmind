import { accountsSchemas } from '@packmind/accounts';
import { CursorDeployer, DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
import {
  createTargetId,
  FileUpdates,
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

describe('Cursor Deployment Integration', () => {
  const CURSOR_COMMANDS_PATH = '.cursor/commands';
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
      name: 'Test Recipe for Cursor',
      content: 'This is test recipe content for Cursor deployment',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
    });

    // Create test standard
    standard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'Test Standard for Cursor',
      description: 'A test standard for Cursor deployment',
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

  describe('recipe deployment', () => {
    let defaultTarget: Target;

    beforeEach(() => {
      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when deploying a single recipe', () => {
      let fileUpdates: FileUpdates;

      beforeEach(async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for Cursor deployment with detailed instructions',
            userId: user.id,
          },
        ];

        fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['cursor'],
        );
      });

      it('creates one command file', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('uses correct path for command file', () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe(
          `${CURSOR_COMMANDS_PATH}/${recipe.slug}.md`,
        );
      });

      it('uses recipe content as command file content', () => {
        expect(fileUpdates.createOrUpdate[0].content).toBe(recipe.content);
      });
    });

    it('creates multiple .cursor/rules/packmind/standard-*.mdc files for standards', async () => {
      const standardVersions: StandardVersion[] = [
        {
          id: 'standard-version-1' as StandardVersionId,
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: standard.description,
          version: standard.version,
          summary: 'Test standard for Cursor deployment',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['cursor'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const cursorStandardFile = fileUpdates.createOrUpdate.find(
        (file) =>
          file.path === `.cursor/rules/packmind/standard-${standard.slug}.mdc`,
      );

      expect(cursorStandardFile).toBeDefined();
      if (cursorStandardFile) {
        // Check Cursor configuration format
        expect(cursorStandardFile.content).toContain('---');
        expect(cursorStandardFile.content).toContain('globs: **/*.{ts,tsx}');
        expect(cursorStandardFile.content).toContain('alwaysApply: false');
        expect(cursorStandardFile.content).toContain('---');
        expect(cursorStandardFile.content).toContain(
          'Test standard for Cursor deployment :',
        );
        expect(cursorStandardFile.content).toContain(
          '* Use meaningful variable names in TypeScript',
        );
        expect(cursorStandardFile.content).toContain(
          '* Write comprehensive tests for all components',
        );
        expect(cursorStandardFile.content).toContain(
          `Full standard is available here for further request: [${standard.name}](../../../.packmind/standards/${standard.slug}.md)`,
        );
      }
    });

    it('handles standard without scope (alwaysApply: true)', async () => {
      // Create a standard without scope
      const globalStandard = await testApp.standardsHexa
        .getAdapter()
        .createStandard({
          name: 'Global Standard',
          description: 'A global standard without scope',
          rules: [{ content: 'Always use consistent formatting' }],
          organizationId: organization.id,
          userId: user.id,
          scope: '', // Empty scope
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
        ['cursor'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);

      const cursorStandardFile = fileUpdates.createOrUpdate[0];
      expect(cursorStandardFile.path).toBe(
        `.cursor/rules/packmind/standard-${globalStandard.slug}.mdc`,
      );

      // Should use alwaysApply: true when no scope
      expect(cursorStandardFile.content).toContain('alwaysApply: true');
      expect(cursorStandardFile.content).not.toContain('globs:');
      expect(cursorStandardFile.content).toContain(
        'Global standard for all files :',
      );
      expect(cursorStandardFile.content).toContain(
        '* Always use consistent formatting',
      );
      expect(cursorStandardFile.content).toContain(
        `Full standard is available here for further request: [${globalStandard.name}](../../../.packmind/standards/${globalStandard.slug}.md)`,
      );
    });

    it('combines recipes and standards deployments', async () => {
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

      // Create a default target for testing
      const defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };

      // Deploy recipes
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['cursor'],
      );

      // Deploy standards
      const standardsUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['cursor'],
        );

      expect(recipeUpdates.createOrUpdate).toHaveLength(1);
      expect(standardsUpdates.createOrUpdate).toHaveLength(1);

      // Recipes should create .cursor/commands/<slug>.md
      expect(recipeUpdates.createOrUpdate[0].path).toBe(
        `${CURSOR_COMMANDS_PATH}/${recipe.slug}.md`,
      );

      // Standards should create .cursor/rules/packmind/standard-*.mdc
      expect(standardsUpdates.createOrUpdate[0].path).toBe(
        `.cursor/rules/packmind/standard-${standard.slug}.mdc`,
      );
    });
  });

  describe('unit tests for CursorDeployer', () => {
    let defaultTarget: Target;
    let cursorDeployer: CursorDeployer;

    beforeEach(async () => {
      // Hexas are already initialized by testApp.initialize()
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      standardsPort = testApp.standardsHexa.getAdapter();
      gitPort = testApp.gitHexa.getAdapter();
      cursorDeployer = new CursorDeployer(standardsPort, gitPort);
    });

    it('handles empty recipe list gracefully', async () => {
      const fileUpdates = await cursorDeployer.deployRecipes(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('handles empty standards list gracefully', async () => {
      const fileUpdates = await cursorDeployer.deployStandards(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    describe('when deploying multiple recipes', () => {
      let fileUpdates: FileUpdates;
      let recipe2: Recipe;

      beforeEach(async () => {
        recipe2 = await testApp.recipesHexa.getAdapter().captureRecipe({
          name: 'Second Test Recipe',
          content: 'Second recipe content for testing',
          organizationId: organization.id,
          userId: user.id,
          spaceId: space.id.toString(),
        });

        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'First test recipe',
            userId: user.id,
          },
          {
            id: 'recipe-version-2' as RecipeVersionId,
            recipeId: recipe2.id,
            name: recipe2.name,
            slug: recipe2.slug,
            content: recipe2.content,
            version: recipe2.version,
            summary: 'Second test recipe',
            userId: user.id,
          },
        ];

        fileUpdates = await cursorDeployer.deployRecipes(
          recipeVersions,
          gitRepo,
          defaultTarget,
        );
      });

      it('creates two command files', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates command file for first recipe with correct path', () => {
        const firstRecipeFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes(recipe.slug),
        );
        expect(firstRecipeFile?.path).toBe(
          `${CURSOR_COMMANDS_PATH}/${recipe.slug}.md`,
        );
      });

      it('creates command file for first recipe with correct content', () => {
        const firstRecipeFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes(recipe.slug),
        );
        expect(firstRecipeFile?.content).toBe(recipe.content);
      });

      it('creates command file for second recipe with correct path', () => {
        const secondRecipeFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes(recipe2.slug),
        );
        expect(secondRecipeFile?.path).toBe(
          `${CURSOR_COMMANDS_PATH}/${recipe2.slug}.md`,
        );
      });

      it('creates command file for second recipe with correct content', () => {
        const secondRecipeFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes(recipe2.slug),
        );
        expect(secondRecipeFile?.content).toBe(recipe2.content);
      });
    });

    it('generates multiple standard files correctly', async () => {
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
          scope: '', // No scope - applies to all files
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

      const fileUpdates = await cursorDeployer.deployStandards(
        standardVersions,
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(2);

      // Check first standard (with scope)
      const frontendFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.includes(standard1.slug),
      );
      expect(frontendFile).toBeDefined();
      if (frontendFile) {
        expect(frontendFile.content).toContain('globs: **/*.{ts,tsx,js,jsx}');
        expect(frontendFile.content).toContain('alwaysApply: false');
        expect(frontendFile.content).toContain('Frontend standard :');
        expect(frontendFile.content).toContain('* Use TypeScript');
        expect(frontendFile.content).toContain(
          `Full standard is available here for further request: [${standard1.name}](../../../.packmind/standards/${standard1.slug}.md)`,
        );
      }

      // Check second standard (no scope)
      const backendFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.includes(standard2.slug),
      );
      expect(backendFile).toBeDefined();
      if (backendFile) {
        expect(backendFile.content).not.toContain('globs:');
        expect(backendFile.content).toContain('alwaysApply: true');
        expect(backendFile.content).toContain('Backend standard :');
        expect(backendFile.content).toContain('* Use dependency injection');
        expect(backendFile.content).toContain(
          `Full standard is available here for further request: [${standard2.name}](../../../.packmind/standards/${standard2.slug}.md)`,
        );
      }
    });
  });
});
