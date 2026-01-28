import { accountsSchemas } from '@packmind/accounts';
import { DeployerService, JunieDeployer } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { skillsSchemas } from '@packmind/skills';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import {
  createTargetId,
  FileModification,
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
import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { TestApp } from '../helpers/TestApp';

describe('Junie Deployment Integration', () => {
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
      name: 'Test Recipe',
      content: 'This is test recipe content for deployment',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
    });

    // Create test standard
    standard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'Test Standard',
      description: 'A test standard for deployment',
      rules: [
        { content: 'Use meaningful variable names' },
        { content: 'Write comprehensive tests' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: 'backend',
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

  describe('when .junie/guidelines.md does not exist', () => {
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
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when clearing recipes section for single-file deployers', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployerService.aggregateRecipeDeployments>
      >;

      beforeEach(async () => {
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

        fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['junie'],
        );
      });

      it('returns exactly one file to create or update', async () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('targets the .junie/guidelines.md file', async () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe('.junie/guidelines.md');
      });

      it('sets the Packmind recipes section to empty content', async () => {
        expect(fileUpdates.createOrUpdate[0].sections).toEqual([
          { key: 'Packmind recipes', content: '' },
        ]);
      });

      it('returns no files to delete', async () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });
    });

    describe('when creating .junie/guidelines.md with standards instructions only', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployerService.aggregateStandardsDeployments>
      >;
      let guidelinesFile:
        | (typeof fileUpdates.createOrUpdate)[number]
        | undefined;

      beforeEach(async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['junie'],
        );

        guidelinesFile = fileUpdates.createOrUpdate.find(
          (file) => file.path === '.junie/guidelines.md',
        );
      });

      it('returns exactly one file to create or update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('returns no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('finds the guidelines file', () => {
        expect(guidelinesFile).toBeDefined();
      });

      it('includes sections in the guidelines file', () => {
        expect(guidelinesFile?.sections).toBeDefined();
      });

      it('contains Packmind Standards header', () => {
        const sectionContent = guidelinesFile?.sections[0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('contains standard summary', () => {
        const sectionContent = guidelinesFile?.sections[0].content;
        expect(sectionContent).toContain('Test standard for deployment :');
      });

      it('contains first rule content', () => {
        const sectionContent = guidelinesFile?.sections[0].content;
        expect(sectionContent).toContain('* Use meaningful variable names');
      });

      it('contains second rule content', () => {
        const sectionContent = guidelinesFile?.sections[0].content;
        expect(sectionContent).toContain('* Write comprehensive tests');
      });

      it('contains link to full standard', () => {
        const sectionContent = guidelinesFile?.sections[0].content;
        expect(sectionContent).toContain(
          'Full standard is available here for further request: [Test Standard](../.packmind/standards/test-standard.md)',
        );
      });

      it('does not contain recipes content', () => {
        const sectionContent = guidelinesFile?.sections[0].content;
        expect(sectionContent).not.toContain('# Packmind Recipes');
      });
    });

    describe('when merging recipes and standards for combined deployment', () => {
      let pathMap: Map<string, FileModification>;
      let finalFile: FileModification | undefined;

      beforeEach(async () => {
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

        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        const localDefaultTarget = {
          id: createTargetId('default-target-id'),
          name: 'Default',
          path: '/',
          gitRepoId: gitRepo.id,
        };

        const recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [localDefaultTarget],
          ['junie'],
        );

        const standardsUpdates =
          await deployerService.aggregateStandardsDeployments(
            standardVersions,
            gitRepo,
            [localDefaultTarget],
            ['junie'],
          );

        const allUpdates = [recipeUpdates, standardsUpdates];
        pathMap = new Map<string, FileModification>();

        for (const update of allUpdates) {
          for (const file of update.createOrUpdate) {
            pathMap.set(file.path, file);
          }
        }

        finalFile = pathMap.get('.junie/guidelines.md');
      });

      it('merges to a single file path', () => {
        expect(pathMap.size).toBe(1);
      });

      it('targets the .junie/guidelines.md file', () => {
        expect(pathMap.has('.junie/guidelines.md')).toBe(true);
      });

      it('produces a defined final file', () => {
        expect(finalFile).toBeDefined();
      });

      it('contains Packmind Standards in the final content', () => {
        const sectionContent = finalFile?.sections?.[0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });
    });
  });

  // NOTE: In the new section-based architecture, deployers ALWAYS generate sections.
  // They don't check for existing content - that's handled by the merge layer.
  // Tests for content preservation belong in merge layer tests (commitToGit.usecase.spec.ts or PullDataUseCase.spec.ts)

  describe('when .junie/guidelines.md exists but is missing recipe instructions', () => {
    let defaultTarget: Target;

    beforeEach(() => {
      // Create a default target for testing
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // Mock GitHexa.getFileFromRepo to return null (new architecture doesn't check existing content)
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when clearing recipes section for single-file deployers', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployerService.aggregateRecipeDeployments>
      >;

      beforeEach(async () => {
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

        fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['junie'],
        );
      });

      it('returns exactly one file to create or update', async () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('targets the .junie/guidelines.md file', async () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe('.junie/guidelines.md');
      });

      it('sets the Packmind recipes section to empty content', async () => {
        expect(fileUpdates.createOrUpdate[0].sections).toEqual([
          { key: 'Packmind recipes', content: '' },
        ]);
      });

      it('returns no files to delete', async () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });
    });

    describe('when generating standards section content', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployerService.aggregateStandardsDeployments>
      >;
      let guidelinesFile: (typeof fileUpdates.createOrUpdate)[number];
      let sectionContent: string;

      beforeEach(async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['junie'],
        );

        guidelinesFile = fileUpdates.createOrUpdate[0];
        sectionContent = guidelinesFile.sections[0].content;
      });

      it('returns exactly one file to create or update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('returns no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('targets the .junie/guidelines.md file', () => {
        expect(guidelinesFile.path).toBe('.junie/guidelines.md');
      });

      it('includes sections in the guidelines file', () => {
        expect(guidelinesFile.sections).toBeDefined();
      });

      it('contains Packmind Standards header', () => {
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('contains standards review instruction', () => {
        expect(sectionContent).toContain(
          'Before starting your work, make sure to review the coding standards relevant to your current task',
        );
      });

      it('contains first rule content', () => {
        expect(sectionContent).toContain('* Use meaningful variable names');
      });

      it('contains second rule content', () => {
        expect(sectionContent).toContain('* Write comprehensive tests');
      });

      it('does not contain user instructions', () => {
        expect(sectionContent).not.toContain('# Some User Instructions');
      });

      it('does not contain recipes content', () => {
        expect(sectionContent).not.toContain('# Packmind Recipes');
      });
    });
  });

  describe('unit tests for JunieDeployer', () => {
    let defaultTarget: Target;
    let junieDeployer: JunieDeployer;

    beforeEach(async () => {
      // Ensure hexas are initialized before getting adapters
      // Hexas are already initialized by testApp.initialize()

      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };

      standardsPort = testApp.standardsHexa.getAdapter();
      gitPort = testApp.gitHexa.getAdapter();
      junieDeployer = new JunieDeployer(standardsPort, gitPort);
    });

    describe('when clearing recipes section for single-file deployers', () => {
      let fileUpdates: FileUpdates;

      beforeEach(async () => {
        jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

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

        fileUpdates = await junieDeployer.deployRecipes(
          recipeVersions,
          gitRepo,
          defaultTarget,
        );
      });

      it('returns exactly one file to create or update', async () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('targets the .junie/guidelines.md file', async () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe('.junie/guidelines.md');
      });

      it('sets the Packmind recipes section to empty content', async () => {
        expect(fileUpdates.createOrUpdate[0].sections).toEqual([
          { key: 'Packmind recipes', content: '' },
        ]);
      });

      it('returns no files to delete', async () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });
    });

    describe('when handling empty standards list', () => {
      let fileUpdates: FileUpdates;

      beforeEach(async () => {
        jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

        fileUpdates = await junieDeployer.deployStandards(
          [],
          gitRepo,
          defaultTarget,
        );
      });

      it('returns no files to create or update', async () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(0);
      });

      it('returns no files to delete', async () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });
    });
  });
});
