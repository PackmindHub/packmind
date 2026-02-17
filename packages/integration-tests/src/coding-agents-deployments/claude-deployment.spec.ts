import { accountsSchemas } from '@packmind/accounts';
import { ClaudeDeployer, DeployerService } from '@packmind/coding-agent';
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

describe('Claude Deployment Integration', () => {
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

  describe('when CLAUDE.md does not exist', () => {
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

    describe('when deploying a single recipe', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };
      let recipeFile: FileModification | undefined;

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
          ['claude'],
        );

        recipeFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.startsWith('.claude/commands/packmind/'),
        );
      });

      it('creates two files to update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('includes one recipe command file', () => {
        expect(
          fileUpdates.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/commands/packmind/'),
          ),
        ).toHaveLength(1);
      });

      it('has no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('creates recipe file in .claude/commands/packmind/', () => {
        expect(recipeFile).toBeDefined();
      });

      it('uses correct path for recipe file', () => {
        expect(recipeFile?.path).toBe(
          `.claude/commands/packmind/${recipe.slug}.md`,
        );
      });

      it('includes frontmatter delimiter', () => {
        expect(recipeFile?.content).toContain('---');
      });

      it('includes recipe description in frontmatter', () => {
        expect(recipeFile?.content).toContain(
          'description: Test recipe for deployment',
        );
      });

      it('includes recipe content', () => {
        expect(recipeFile?.content).toContain(recipe.content);
      });

      it('excludes standards content', () => {
        expect(recipeFile?.content).not.toContain('## Packmind Standards');
      });
    });

    describe('when deploying standards', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };
      let standardFile: FileModification | undefined;

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
          ['claude'],
        );

        standardFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.startsWith('.claude/rules/packmind/standard-'),
        );
      });

      it('creates two files to update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('includes one standard rule file', () => {
        expect(
          fileUpdates.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/rules/packmind/'),
          ),
        ).toHaveLength(1);
      });

      it('has no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('creates individual standard file in .claude/rules/packmind/', () => {
        expect(standardFile).toBeDefined();
      });

      it('uses correct path for standard file', () => {
        expect(standardFile?.path).toBe(
          '.claude/rules/packmind/standard-test-standard.md',
        );
      });

      it('includes frontmatter delimiter', () => {
        expect(standardFile?.content).toContain('---');
      });

      it('includes standard name in frontmatter', () => {
        expect(standardFile?.content).toContain('name: Test Standard');
      });

      it('includes paths in frontmatter', () => {
        expect(standardFile?.content).toContain('paths:');
      });

      it('includes alwaysApply setting', () => {
        expect(standardFile?.content).toContain('alwaysApply: false');
      });

      it('includes standard description', () => {
        expect(standardFile?.content).toContain(
          'description: Test standard for deployment',
        );
      });

      it('includes standard header', () => {
        expect(standardFile?.content).toContain('## Standard: Test Standard');
      });

      it('includes first rule content', () => {
        expect(standardFile?.content).toContain(
          '* Use meaningful variable names',
        );
      });

      it('includes second rule content', () => {
        expect(standardFile?.content).toContain('* Write comprehensive tests');
      });

      it('includes link to full standard', () => {
        expect(standardFile?.content).toContain(
          'Full standard is available here for further request: [Test Standard](../../../.packmind/standards/test-standard.md)',
        );
      });
    });

    describe('when deploying recipes and standards together', () => {
      let pathMap: Map<string, FileModification>;

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

        // Deploy recipes first
        const recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['claude'],
        );

        // Deploy standards second
        const standardsUpdates =
          await deployerService.aggregateStandardsDeployments(
            standardVersions,
            gitRepo,
            [defaultTarget],
            ['claude'],
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

      it('creates three files (recipe, standard, CLAUDE.md clearing)', () => {
        expect(pathMap.size).toBe(3);
      });

      it('creates recipe command file in .claude/commands/packmind/', () => {
        expect(pathMap.has(`.claude/commands/packmind/${recipe.slug}.md`)).toBe(
          true,
        );
      });

      it('creates standard file in .claude/rules/packmind/', () => {
        expect(
          pathMap.has('.claude/rules/packmind/standard-test-standard.md'),
        ).toBe(true);
      });

      it('creates CLAUDE.md section clearing', () => {
        expect(pathMap.has('CLAUDE.md')).toBe(true);
      });

      describe('recipe file content', () => {
        let recipeFile: FileModification | undefined;

        beforeEach(() => {
          recipeFile = pathMap.get(
            `.claude/commands/packmind/${recipe.slug}.md`,
          );
        });

        it('includes frontmatter delimiter', () => {
          expect(recipeFile?.content).toContain('---');
        });

        it('includes recipe description in frontmatter', () => {
          expect(recipeFile?.content).toContain(
            'description: Test recipe for deployment',
          );
        });
      });

      it('includes standard header in standard file', () => {
        const standardFile = pathMap.get(
          '.claude/rules/packmind/standard-test-standard.md',
        );
        expect(standardFile?.content).toContain('## Standard: Test Standard');
      });
    });
  });

  // NOTE: In the new section-based architecture, deployers ALWAYS generate sections.
  // They don't check for existing content - that's handled by the merge layer.
  // Tests for content preservation belong in merge layer tests (commitToGit.usecase.spec.ts or PullDataUseCase.spec.ts)

  describe('when CLAUDE.md exists but is missing recipe instructions', () => {
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

    describe('when generating recipe command file', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };
      let recipeFile: FileModification;

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
          ['claude'],
        );

        const foundRecipeFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.startsWith('.claude/commands/packmind/'),
        );
        assert(foundRecipeFile, 'Recipe file should exist');
        recipeFile = foundRecipeFile;
      });

      it('creates two files to update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('includes one recipe command file', () => {
        expect(
          fileUpdates.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/commands/packmind/'),
          ),
        ).toHaveLength(1);
      });

      it('has no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('uses correct path for recipe file', () => {
        expect(recipeFile?.path).toBe(
          `.claude/commands/packmind/${recipe.slug}.md`,
        );
      });

      it('includes frontmatter delimiter', () => {
        expect(recipeFile.content).toContain('---');
      });

      it('includes recipe description in frontmatter', () => {
        expect(recipeFile.content).toContain(
          'description: Test recipe for deployment',
        );
      });

      it('includes recipe content', () => {
        expect(recipeFile.content).toContain(recipe.content);
      });

      it('excludes user content', () => {
        expect(recipeFile.content).not.toContain('# Some User Instructions');
      });

      it('excludes standards content', () => {
        expect(recipeFile.content).not.toContain('# Packmind Standards');
      });
    });

    describe('when generating individual standard file', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };
      let standardFile: FileModification;

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
          ['claude'],
        );

        const foundStandardFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.startsWith('.claude/rules/packmind/'),
        );
        assert(foundStandardFile, 'Standard file should exist');
        standardFile = foundStandardFile;
      });

      it('creates two files to update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('includes one standard rule file', () => {
        expect(
          fileUpdates.createOrUpdate.filter((f) =>
            f.path.startsWith('.claude/rules/packmind/'),
          ),
        ).toHaveLength(1);
      });

      it('has no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('uses correct path for standard file', () => {
        expect(standardFile?.path).toBe(
          '.claude/rules/packmind/standard-test-standard.md',
        );
      });

      it('includes frontmatter delimiter', () => {
        expect(standardFile.content).toContain('---');
      });

      it('includes standard name in frontmatter', () => {
        expect(standardFile.content).toContain('name: Test Standard');
      });

      it('includes standard header', () => {
        expect(standardFile.content).toContain('## Standard: Test Standard');
      });

      it('includes first rule content', () => {
        expect(standardFile.content).toContain(
          '* Use meaningful variable names',
        );
      });

      it('includes second rule content', () => {
        expect(standardFile.content).toContain('* Write comprehensive tests');
      });

      it('excludes user content', () => {
        expect(standardFile.content).not.toContain('# Some User Instructions');
      });

      it('excludes recipes content', () => {
        expect(standardFile.content).not.toContain('# Packmind Recipes');
      });
    });
  });

  describe('unit tests for ClaudeDeployer', () => {
    let defaultTarget: Target;
    let claudeDeployer: ClaudeDeployer;

    beforeEach(() => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      // standardsPort and gitPort are already initialized in the main beforeEach
      claudeDeployer = new ClaudeDeployer(standardsPort, gitPort);
    });

    describe('when deploying empty recipe list', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };

      beforeEach(async () => {
        jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

        fileUpdates = await claudeDeployer.deployRecipes(
          [],
          gitRepo,
          defaultTarget,
        );
      });

      it('creates one file to update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('includes CLAUDE.md clearing section', () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe('CLAUDE.md');
      });

      it('has no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });
    });

    describe('when deploying empty standards list', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };

      beforeEach(async () => {
        jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

        fileUpdates = await claudeDeployer.deployStandards(
          [],
          gitRepo,
          defaultTarget,
        );
      });

      it('creates one file to update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('includes CLAUDE.md clearing section', () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe('CLAUDE.md');
      });

      it('has no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });
    });

    describe('when GitHexa errors occur', () => {
      let fileUpdates: {
        createOrUpdate: FileModification[];
        delete: { path: string }[];
      };
      let recipeFile: FileModification | undefined;

      beforeEach(async () => {
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

        fileUpdates = await claudeDeployer.deployRecipes(
          recipeVersions,
          gitRepo,
          defaultTarget,
        );

        recipeFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.startsWith('.claude/commands/packmind/'),
        );
      });

      it('creates two files to update', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('has no files to delete', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('sets correct recipe file path', () => {
        expect(recipeFile?.path).toBe(
          `.claude/commands/packmind/${recipe.slug}.md`,
        );
      });

      it('includes frontmatter delimiter', () => {
        expect(recipeFile?.content).toContain('---');
      });

      it('includes recipe description in frontmatter', () => {
        expect(recipeFile?.content).toContain('description: Test recipe');
      });
    });
  });
});
