import { accountsSchemas } from '@packmind/accounts';
import { ContinueDeployer, DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { skillsSchemas } from '@packmind/skills';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import {
  createTargetId,
  FileModification,
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
import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { TestApp } from '../helpers/TestApp';

describe('Continue Deployment Integration', () => {
  const fixture = createIntegrationTestFixture([
    ...accountsSchemas,
    ...recipesSchemas,
    ...standardsSchemas,
    ...spacesSchemas,
    ...gitSchemas,
    ...deploymentsSchemas,
    ...skillsSchemas,
  ]);

  let testApp: TestApp;
  let standardsPort: IStandardsPort;
  let gitPort: IGitPort;
  let deployerService: DeployerService;

  let recipe: Recipe;
  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;
  let gitRepo: GitRepo;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    // Use TestApp which handles all hexa registration and initialization
    testApp = new TestApp(fixture.datasource);
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
        email: 'testuser@packmind.com',
        password: 's3cret!@',
        authType: 'password',
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
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when deploying a single recipe', () => {
    let defaultTarget: Target;
    let fileUpdates: {
      createOrUpdate: FileModification[];
      delete: { path: string }[];
    };
    let recipeFile: FileModification | undefined;

    beforeEach(async () => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

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

      fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['continue'],
      );

      recipeFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.startsWith('.continue/prompts/'),
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates one file update', () => {
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
    });

    it('includes one recipe command file', () => {
      expect(
        fileUpdates.createOrUpdate.filter((f) =>
          f.path.startsWith('.continue/prompts/'),
        ),
      ).toHaveLength(1);
    });

    it('deletes one legacy file', () => {
      expect(fileUpdates.delete).toHaveLength(1);
    });

    it('deletes legacy recipes-index.md file', () => {
      expect(fileUpdates.delete[0].path).toBe(
        '.continue/rules/packmind/recipes-index.md',
      );
    });

    it('creates recipe file in .continue/prompts/', () => {
      expect(recipeFile).toBeDefined();
    });

    it('uses correct path for recipe file', () => {
      expect(recipeFile?.path).toBe(`.continue/prompts/${recipe.slug}.md`);
    });

    it('includes frontmatter delimiter', () => {
      expect(recipeFile?.content).toContain('---');
    });

    it('includes recipe description in frontmatter', () => {
      expect(recipeFile?.content).toContain(
        'description: Test recipe for Continue deployment with detailed instructions',
      );
    });

    it('includes recipe name in frontmatter', () => {
      expect(recipeFile?.content).toContain(`name: ${recipe.name}`);
    });

    it('includes invokable set to true in frontmatter', () => {
      expect(recipeFile?.content).toContain('invokable: true');
    });

    it('includes recipe content', () => {
      expect(recipeFile?.content).toContain(recipe.content);
    });
  });

  describe('when deploying multiple recipes', () => {
    let defaultTarget: Target;
    let fileUpdates: {
      createOrUpdate: FileModification[];
      delete: { path: string }[];
    };
    let recipe2: Recipe;

    beforeEach(async () => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

      // Create second recipe
      recipe2 = await testApp.recipesHexa.getAdapter().captureRecipe({
        name: 'Second Recipe for Continue',
        content: 'This is the second recipe content',
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
          summary: 'First recipe summary',
          userId: user.id,
        },
        {
          id: 'recipe-version-2' as RecipeVersionId,
          recipeId: recipe2.id,
          name: recipe2.name,
          slug: recipe2.slug,
          content: recipe2.content,
          version: recipe2.version,
          summary: 'Second recipe summary',
          userId: user.id,
        },
      ];

      fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['continue'],
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates two file updates', () => {
      expect(fileUpdates.createOrUpdate).toHaveLength(2);
    });

    it('creates first recipe command file at correct path', () => {
      const firstFile = fileUpdates.createOrUpdate.find(
        (f) => f.path === `.continue/prompts/${recipe.slug}.md`,
      );
      expect(firstFile).toBeDefined();
    });

    it('creates second recipe command file at correct path', () => {
      const secondFile = fileUpdates.createOrUpdate.find(
        (f) => f.path === `.continue/prompts/${recipe2.slug}.md`,
      );
      expect(secondFile).toBeDefined();
    });
  });

  describe('when deploying standards', () => {
    let defaultTarget: Target;
    let fileUpdates: {
      createOrUpdate: FileModification[];
      delete: { path: string }[];
    };
    let standardFile: FileModification | undefined;

    beforeEach(async () => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

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

      fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['continue'],
      );

      standardFile = fileUpdates.createOrUpdate.find(
        (file) =>
          file.path === `.continue/rules/packmind/standard-${standard.slug}.md`,
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates one file update', () => {
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
    });

    it('creates file at correct path', () => {
      expect(standardFile).toBeDefined();
    });

    it('includes frontmatter with name', () => {
      expect(standardFile?.content).toContain(`name: ${standard.name}`);
    });

    describe('when scope exists', () => {
      it('includes frontmatter with globs', () => {
        expect(standardFile?.content).toContain('globs: "**/*.{ts,tsx}"');
      });

      it('sets alwaysApply to false', () => {
        expect(standardFile?.content).toContain('alwaysApply: false');
      });
    });

    it('includes frontmatter with description from summary', () => {
      expect(standardFile?.content).toContain(
        'description: Test standard for Continue deployment',
      );
    });

    it('includes first rule in content', () => {
      expect(standardFile?.content).toContain(
        '* Use meaningful variable names in TypeScript',
      );
    });

    it('includes second rule in content', () => {
      expect(standardFile?.content).toContain(
        '* Write comprehensive tests for all components',
      );
    });

    it('includes link to full standard', () => {
      expect(standardFile?.content).toContain(
        `Full standard is available here for further request: [${standard.name}](../../../.packmind/standards/${standard.slug}.md)`,
      );
    });
  });

  describe('when deploying standard without scope', () => {
    let defaultTarget: Target;
    let fileUpdates: {
      createOrUpdate: FileModification[];
      delete: { path: string }[];
    };
    let globalStandard: Standard;
    let standardFile: FileModification | undefined;

    beforeEach(async () => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

      globalStandard = await testApp.standardsHexa.getAdapter().createStandard({
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

      fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['continue'],
      );

      standardFile = fileUpdates.createOrUpdate[0];
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('sets alwaysApply to true', () => {
      expect(standardFile.content).toContain('alwaysApply: true');
    });

    it('does not include globs in frontmatter', () => {
      expect(standardFile.content).not.toContain('globs:');
    });
  });

  describe('when deploying both recipes and standards', () => {
    let defaultTarget: Target;
    let pathMap: Map<string, FileModification>;

    beforeEach(async () => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

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

      // Deploy recipes first
      const recipeUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['continue'],
      );

      // Deploy standards second
      const standardsUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['continue'],
        );

      // Simulate the file merging that DeployerService does
      const allUpdates = [recipeUpdates, standardsUpdates];
      pathMap = new Map<string, FileModification>();

      for (const update of allUpdates) {
        for (const file of update.createOrUpdate) {
          pathMap.set(file.path, file);
        }
      }
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates two files (recipe command and standard)', () => {
      expect(pathMap.size).toBe(2);
    });

    it('creates recipe command file in .continue/prompts/', () => {
      expect(pathMap.has(`.continue/prompts/${recipe.slug}.md`)).toBe(true);
    });

    it('creates standard file in .continue/rules/packmind/', () => {
      expect(
        pathMap.has(`.continue/rules/packmind/standard-${standard.slug}.md`),
      ).toBe(true);
    });

    describe('recipe file content', () => {
      let recipeFile: FileModification | undefined;

      beforeEach(() => {
        recipeFile = pathMap.get(`.continue/prompts/${recipe.slug}.md`);
      });

      it('includes frontmatter delimiter', () => {
        expect(recipeFile?.content).toContain('---');
      });

      it('includes recipe description in frontmatter', () => {
        expect(recipeFile?.content).toContain(
          'description: Test recipe for combined deployment',
        );
      });
    });

    it('includes standard header in standard file', () => {
      const standardFile = pathMap.get(
        `.continue/rules/packmind/standard-${standard.slug}.md`,
      );
      expect(standardFile?.content).toContain(`## Standard: ${standard.name}`);
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

    describe('when deploying empty recipe list', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };

      beforeEach(async () => {
        jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

        fileUpdates = await continueDeployer.deployRecipes(
          [],
          gitRepo,
          defaultTarget,
        );
      });

      it('deletes one legacy file', () => {
        expect(fileUpdates.delete).toHaveLength(1);
      });

      it('deletes legacy recipes-index.md file', () => {
        expect(fileUpdates.delete[0].path).toBe(
          '.continue/rules/packmind/recipes-index.md',
        );
      });
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

    describe('when deploying multiple standards', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };
      let standard1: Standard;
      let standard2: Standard;

      beforeEach(async () => {
        standard1 = await testApp.standardsHexa.getAdapter().createStandard({
          name: 'Frontend Standard',
          description: 'Frontend coding standard',
          rules: [{ content: 'Use TypeScript' }],
          organizationId: organization.id,
          userId: user.id,
          scope: '**/*.{ts,tsx,js,jsx}',
          spaceId: space.id,
        });

        standard2 = await testApp.standardsHexa.getAdapter().createStandard({
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

        fileUpdates = await continueDeployer.deployStandards(
          standardVersions,
          gitRepo,
          defaultTarget,
        );
      });

      it('creates two file updates', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      describe('for first standard with scope', () => {
        let frontendFile: FileModification | undefined;

        beforeEach(() => {
          frontendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard1.slug),
          );
        });

        it('includes name in frontmatter', () => {
          expect(frontendFile?.content).toContain(`name: ${standard1.name}`);
        });

        it('includes globs in frontmatter', () => {
          expect(frontendFile?.content).toContain(
            'globs: "**/*.{ts,tsx,js,jsx}"',
          );
        });

        it('sets alwaysApply to false', () => {
          expect(frontendFile?.content).toContain('alwaysApply: false');
        });
      });

      describe('for second standard without scope', () => {
        let backendFile: FileModification | undefined;

        beforeEach(() => {
          backendFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes(standard2.slug),
          );
        });

        it('includes name in frontmatter', () => {
          expect(backendFile?.content).toContain(`name: ${standard2.name}`);
        });

        it('does not include globs in frontmatter', () => {
          expect(backendFile?.content).not.toContain('globs:');
        });

        it('sets alwaysApply to true', () => {
          expect(backendFile?.content).toContain('alwaysApply: true');
        });
      });
    });
  });
});
