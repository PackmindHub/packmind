import { accountsSchemas } from '@packmind/accounts';
import { DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { skillsSchemas } from '@packmind/skills';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import {
  createGitProviderId,
  createGitRepoId,
  createTargetId,
  FileModification,
  FileUpdates,
  GitRepo,
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
import { v4 as uuidv4 } from 'uuid';
import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { TestApp } from '../helpers/TestApp';

// Mock the Git provider adapter for file retrieval
jest.mock('@packmind/git', () => {
  const actual = jest.requireActual('@packmind/git');
  return {
    ...actual,
    GitProviderAdapter: jest.fn().mockImplementation(() => ({
      getFileFromRepo: jest.fn().mockImplementation((key: string) => {
        // Return null to simulate file doesn't exist
        if (key.includes('nonexistent')) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
    })),
  };
});

describe('Target-Specific Deployment Integration', () => {
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
  let deployerService: DeployerService;

  let recipe: Recipe;
  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;
  let gitRepo: GitRepo;
  let jetbrainsTarget: Target;
  let vscodeTarget: Target;
  let rootTarget: Target;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    // Use TestApp which handles all hexa registration and initialization
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    // Get deployer service from hexa
    deployerService = testApp.codingAgentHexa.getDeployerService();

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

    // Create test git repository (ide-plugins)
    gitRepo = {
      id: createGitRepoId(uuidv4()),
      owner: 'PackmindHub',
      repo: 'ide-plugins',
      branch: 'main',
      providerId: createGitProviderId('github-provider-id'),
    };

    // Create test recipe about JetBrains services
    recipe = await testApp.recipesHexa.getAdapter().captureRecipe({
      name: 'Writing Good JetBrains Services',
      content: `# Writing Good JetBrains Services

## Overview
This recipe provides best practices for writing services in JetBrains IDEs.

## Best Practices
1. Use dependency injection
2. Implement proper lifecycle management
3. Handle threading correctly
4. Follow JetBrains service patterns

## Example
\`\`\`kotlin
@Service
class MyService {
    fun doSomething() {
        // Implementation
    }
}
\`\`\`
`,
      userId: user.id,
      organizationId: organization.id,
      spaceId: space.id.toString(),
    });

    // Create test standard about code quality
    standard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'IDE Code Quality Standards',
      description:
        'Standards for maintaining high code quality across IDE plugins',
      rules: [
        { content: 'Always use meaningful variable names' },
        { content: 'Write unit tests for all public methods' },
        { content: 'Follow consistent indentation (2 or 4 spaces)' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: 'ide-plugins',
      spaceId: space.id,
    });

    // Create targets for the repository
    jetbrainsTarget = {
      id: createTargetId(uuidv4()),
      name: 'jetbrains',
      path: '/jetbrains/',
      gitRepoId: gitRepo.id,
    };

    vscodeTarget = {
      id: createTargetId(uuidv4()),
      name: 'vscode',
      path: '/vscode/',
      gitRepoId: gitRepo.id,
    };

    rootTarget = {
      id: createTargetId(uuidv4()),
      name: 'root',
      path: '/',
      gitRepoId: gitRepo.id,
    };
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('Standards Publishing: Example Mapping Scenario 1: Standard distributed to jetbrains target', () => {
    describe('when deploying standard to jetbrains/.packmind/standards path', () => {
      let standardUpdates: FileUpdates;
      let standardFile: FileModification | undefined;
      let indexFile: FileModification | undefined;

      beforeEach(async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'IDE code quality standards',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        standardUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [jetbrainsTarget],
          ['packmind'],
        );

        standardFile = standardUpdates.createOrUpdate.find((file) =>
          file.path.includes('standards/ide-code-quality-standards.md'),
        );

        indexFile = standardUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/standards-index.md',
        );
      });

      it('creates two files', () => {
        expect(standardUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates individual standard file in jetbrains path', () => {
        expect(standardFile).toBeDefined();
      });

      it('places standard file at correct path', () => {
        expect(standardFile?.path).toBe(
          'jetbrains/.packmind/standards/ide-code-quality-standards.md',
        );
      });

      it('includes standard name in content', () => {
        expect(standardFile?.content).toContain('IDE Code Quality Standards');
      });

      it('creates standards index file in jetbrains path', () => {
        expect(indexFile).toBeDefined();
      });

      it('includes standard name in index file', () => {
        expect(indexFile?.content).toContain('IDE Code Quality Standards');
      });

      it('includes standard filename in index file', () => {
        expect(indexFile?.content).toContain('ide-code-quality-standards.md');
      });
    });

    describe('when deploying standard to jetbrains path for Claude agent', () => {
      let standardUpdates: FileUpdates;
      let deployedFile: FileModification;

      beforeEach(async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'IDE code quality standards',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        // Deploy to jetbrains target for Claude
        standardUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [jetbrainsTarget],
          ['claude'],
        );

        const foundFile = standardUpdates.createOrUpdate.find(
          (f) =>
            f.path ===
            'jetbrains/.claude/rules/packmind/standard-ide-code-quality-standards.md',
        );
        assert(foundFile, 'Standard file should exist');
        deployedFile = foundFile;
      });

      it('creates two files (standard + CLAUDE.md clearing)', () => {
        expect(standardUpdates.createOrUpdate).toHaveLength(2);
      });

      describe('when clearing legacy CLAUDE.md section', () => {
        let claudeUpdate: FileModification | undefined;

        beforeEach(() => {
          claudeUpdate = standardUpdates.createOrUpdate.find(
            (f) => f.path === 'jetbrains/CLAUDE.md',
          );
        });

        it('includes CLAUDE.md in updates', () => {
          expect(claudeUpdate).toBeDefined();
        });

        it('sets Packmind standards section to empty content', () => {
          expect(claudeUpdate?.sections).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                key: 'Packmind standards',
                content: '',
              }),
            ]),
          );
        });
      });

      it('deploys to correct path', () => {
        expect(deployedFile.path).toBe(
          'jetbrains/.claude/rules/packmind/standard-ide-code-quality-standards.md',
        );
      });

      it('includes file content', () => {
        expect(deployedFile.content).toBeDefined();
      });

      it('includes frontmatter delimiter', () => {
        expect(deployedFile.content).toContain('---');
      });

      it('includes standard name in frontmatter', () => {
        expect(deployedFile.content).toContain(
          "name: 'IDE Code Quality Standards'",
        );
      });

      it('includes standard header', () => {
        expect(deployedFile.content).toContain(
          '## Standard: IDE Code Quality Standards',
        );
      });

      it('includes rule content', () => {
        expect(deployedFile.content).toContain(
          '* Always use meaningful variable names',
        );
      });
    });

    describe('when deploying standard to jetbrains path for Cursor agent', () => {
      let standardUpdates: FileUpdates;
      let deployedFile: FileModification;

      beforeEach(async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'IDE code quality standards',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        standardUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [jetbrainsTarget],
          ['cursor'],
        );

        deployedFile = standardUpdates.createOrUpdate[0];
      });

      it('creates one file', () => {
        expect(standardUpdates.createOrUpdate).toHaveLength(1);
      });

      it('deploys to correct Cursor path', () => {
        expect(deployedFile.path).toBe(
          'jetbrains/.cursor/rules/packmind/standard-ide-code-quality-standards.mdc',
        );
      });

      it('includes standard name in content', () => {
        expect(deployedFile.content).toContain(standard.name);
      });

      it('includes summary in content', () => {
        expect(deployedFile.content).toContain('IDE code quality standards :');
      });

      it('includes first rule', () => {
        expect(deployedFile.content).toContain(
          '* Always use meaningful variable names',
        );
      });

      it('includes second rule', () => {
        expect(deployedFile.content).toContain(
          '* Write unit tests for all public methods',
        );
      });

      it('includes third rule', () => {
        expect(deployedFile.content).toContain(
          '* Follow consistent indentation (2 or 4 spaces)',
        );
      });

      it('includes full standard reference link', () => {
        expect(deployedFile.content).toContain(
          'Full standard is available here for further request: [IDE Code Quality Standards](../../../.packmind/standards/ide-code-quality-standards.md)',
        );
      });
    });
  });

  describe('Standards Publishing: Example Mapping Scenario 2: Standard isolation', () => {
    describe('when standard distributed to jetbrains target', () => {
      let jetbrainsUpdates: FileUpdates;
      let vscodeUpdates: FileUpdates;
      let jetbrainsStandardFile: FileModification | undefined;
      let jetbrainsIndexFile: FileModification | undefined;

      beforeEach(async () => {
        const jetbrainsStandardVersions: StandardVersion[] = [
          {
            id: 'jetbrains-standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'IDE code quality standards',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        jetbrainsUpdates = await deployerService.aggregateStandardsDeployments(
          jetbrainsStandardVersions,
          gitRepo,
          [jetbrainsTarget],
          ['packmind'],
        );

        vscodeUpdates = await deployerService.aggregateStandardsDeployments(
          [],
          gitRepo,
          [vscodeTarget],
          ['packmind'],
        );

        jetbrainsStandardFile = jetbrainsUpdates.createOrUpdate.find((file) =>
          file.path.includes('standards/ide-code-quality-standards.md'),
        );

        jetbrainsIndexFile = jetbrainsUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/standards-index.md',
        );
      });

      it('creates two files for jetbrains deployment', () => {
        expect(jetbrainsUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates jetbrains standard file', () => {
        expect(jetbrainsStandardFile).toBeDefined();
      });

      it('places jetbrains standard file in correct path', () => {
        expect(jetbrainsStandardFile?.path.startsWith('jetbrains/')).toBe(true);
      });

      it('includes standard content in jetbrains file', () => {
        expect(jetbrainsStandardFile?.content).toContain(
          'IDE Code Quality Standards',
        );
      });

      it('creates one file for vscode deployment (empty index)', () => {
        expect(vscodeUpdates.createOrUpdate).toHaveLength(1);
      });

      it('places vscode index at correct path', () => {
        expect(vscodeUpdates.createOrUpdate[0].path).toBe(
          'vscode/.packmind/standards-index.md',
        );
      });

      it('includes no standards message in vscode index', () => {
        expect(vscodeUpdates.createOrUpdate[0].content).toContain(
          'No standards available',
        );
      });

      it('creates jetbrains index file', () => {
        expect(jetbrainsIndexFile).toBeDefined();
      });

      it('places jetbrains index in correct path', () => {
        expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      });

      it('keeps paths completely separate (no vscode in jetbrains path)', () => {
        expect(jetbrainsIndexFile?.path).not.toContain('vscode');
      });
    });
  });

  describe('Standards Publishing: Example Mapping Scenario 3: Standard distributed to multiple targets', () => {
    describe('when standard distributed to both jetbrains and vscode targets', () => {
      let multiTargetUpdates: FileUpdates;
      let jetbrainsStandardFile: FileModification | undefined;
      let jetbrainsIndexFile: FileModification | undefined;
      let vscodeStandardFile: FileModification | undefined;
      let vscodeIndexFile: FileModification | undefined;

      beforeEach(async () => {
        const universalStandard = await testApp.standardsHexa
          .getAdapter()
          .createStandard({
            name: 'Universal Testing Standards',
            description: 'Testing standards applicable to any IDE platform',
            rules: [
              { content: 'Write comprehensive unit tests' },
              { content: 'Use descriptive test names' },
              { content: 'Mock external dependencies' },
            ],
            organizationId: organization.id,
            userId: user.id,
            scope: 'universal',
            spaceId: space.id,
          });

        const universalStandardVersions: StandardVersion[] = [
          {
            id: 'universal-standard-version-1' as StandardVersionId,
            standardId: universalStandard.id,
            name: universalStandard.name,
            slug: universalStandard.slug,
            description: universalStandard.description,
            version: universalStandard.version,
            summary: 'Universal testing standards for all platforms',
            userId: user.id,
            scope: universalStandard.scope,
          },
        ];

        multiTargetUpdates =
          await deployerService.aggregateStandardsDeployments(
            universalStandardVersions,
            gitRepo,
            [jetbrainsTarget, vscodeTarget],
            ['packmind'],
          );

        jetbrainsStandardFile = multiTargetUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            'jetbrains/.packmind/standards/universal-testing-standards.md',
        );
        jetbrainsIndexFile = multiTargetUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/standards-index.md',
        );
        vscodeStandardFile = multiTargetUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            'vscode/.packmind/standards/universal-testing-standards.md',
        );
        vscodeIndexFile = multiTargetUpdates.createOrUpdate.find(
          (file) => file.path === 'vscode/.packmind/standards-index.md',
        );
      });

      it('creates four files (2 for each target)', () => {
        expect(multiTargetUpdates.createOrUpdate).toHaveLength(4);
      });

      it('creates jetbrains standard file', () => {
        expect(jetbrainsStandardFile).toBeDefined();
      });

      it('creates jetbrains index file', () => {
        expect(jetbrainsIndexFile).toBeDefined();
      });

      it('creates vscode standard file', () => {
        expect(vscodeStandardFile).toBeDefined();
      });

      it('creates vscode index file', () => {
        expect(vscodeIndexFile).toBeDefined();
      });

      it('includes universal standard in jetbrains standard file', () => {
        expect(jetbrainsStandardFile?.content).toContain(
          'Universal Testing Standards',
        );
      });

      it('includes universal standard in jetbrains index file', () => {
        expect(jetbrainsIndexFile?.content).toContain(
          'Universal Testing Standards',
        );
      });

      it('includes universal standard in vscode standard file', () => {
        expect(vscodeStandardFile?.content).toContain(
          'Universal Testing Standards',
        );
      });

      it('includes universal standard in vscode index file', () => {
        expect(vscodeIndexFile?.content).toContain(
          'Universal Testing Standards',
        );
      });
    });

    describe('when Vincent opens exclusively JetBrains folder', () => {
      let jetbrainsOnlyUpdates: FileUpdates;
      let jetbrainsIndexFile: FileModification | undefined;

      beforeEach(async () => {
        const universalStandardVersions: StandardVersion[] = [
          {
            id: 'universal-standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: 'Universal Testing Standards',
            slug: 'universal-testing-standards',
            description: 'Testing standards applicable to JetBrains and VSCode',
            version: 1,
            summary: 'Universal testing standards',
            userId: user.id,
            scope: 'universal',
          },
        ];

        await deployerService.aggregateStandardsDeployments(
          universalStandardVersions,
          gitRepo,
          [jetbrainsTarget, vscodeTarget],
          ['packmind'],
        );

        jetbrainsOnlyUpdates =
          await deployerService.aggregateStandardsDeployments(
            universalStandardVersions,
            gitRepo,
            [jetbrainsTarget],
            ['packmind'],
          );

        jetbrainsIndexFile = jetbrainsOnlyUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/standards-index.md',
        );
      });

      it('creates two files for jetbrains only', () => {
        expect(jetbrainsOnlyUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates jetbrains index file', () => {
        expect(jetbrainsIndexFile).toBeDefined();
      });

      it('includes universal standard in jetbrains index', () => {
        expect(jetbrainsIndexFile?.content).toContain(
          'Universal Testing Standards',
        );
      });

      it('places index in jetbrains path', () => {
        expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      });

      it('keeps paths separate (no vscode in path)', () => {
        expect(jetbrainsIndexFile?.path).not.toContain('vscode');
      });
    });
  });

  describe('Example Mapping Scenario 1: Recipe distributed to jetbrains target', () => {
    describe('when deploying recipe to jetbrains/.packmind/recipes path', () => {
      let recipeUpdates: FileUpdates;
      let recipeFile: FileModification | undefined;
      let indexFile: FileModification | undefined;

      beforeEach(async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'JetBrains services best practices',
            userId: user.id,
          },
        ];

        recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [jetbrainsTarget],
          ['packmind'],
        );

        recipeFile = recipeUpdates.createOrUpdate.find((file) =>
          file.path.includes('commands/writing-good-jetbrains-services.md'),
        );

        indexFile = recipeUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/commands-index.md',
        );
      });

      it('creates two files', () => {
        expect(recipeUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates individual recipe file in jetbrains path', () => {
        expect(recipeFile).toBeDefined();
      });

      it('places recipe file at correct path', () => {
        expect(recipeFile?.path).toBe(
          'jetbrains/.packmind/commands/writing-good-jetbrains-services.md',
        );
      });

      it('includes recipe name in content', () => {
        expect(recipeFile?.content).toContain(
          'Writing Good JetBrains Services',
        );
      });

      it('creates recipes index file in jetbrains path', () => {
        expect(indexFile).toBeDefined();
      });

      it('includes recipe name in index file', () => {
        expect(indexFile?.content).toContain('Writing Good JetBrains Services');
      });

      it('includes recipe filename in index file', () => {
        expect(indexFile?.content).toContain(
          'writing-good-jetbrains-services.md',
        );
      });
    });

    describe('when deploying recipe to jetbrains path for Claude agent', () => {
      let recipeUpdates: FileUpdates;
      let deployedFile: FileModification | undefined;

      beforeEach(async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'JetBrains services best practices',
            userId: user.id,
          },
        ];

        recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [jetbrainsTarget],
          ['claude'],
        );

        deployedFile = recipeUpdates.createOrUpdate.find(
          (f) =>
            f.path === `jetbrains/.claude/commands/packmind/${recipe.slug}.md`,
        );
      });

      it('creates two files', () => {
        expect(recipeUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates Claude command file', () => {
        expect(deployedFile).toBeDefined();
      });

      it('deploys to correct path', () => {
        expect(deployedFile?.path).toBe(
          `jetbrains/.claude/commands/packmind/${recipe.slug}.md`,
        );
      });

      it('includes frontmatter delimiter', () => {
        expect(deployedFile?.content).toContain('---');
      });

      it('includes description in frontmatter', () => {
        expect(deployedFile?.content).toContain(
          "description: 'JetBrains services best practices'",
        );
      });

      it('includes recipe content', () => {
        expect(deployedFile?.content).toContain(recipe.content);
      });
    });

    describe('when deploying recipe to jetbrains path for Cursor agent', () => {
      let recipeUpdates: FileUpdates;
      let deployedFile: FileModification;

      beforeEach(async () => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'JetBrains services best practices',
            userId: user.id,
          },
        ];

        recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [jetbrainsTarget],
          ['cursor'],
        );

        deployedFile = recipeUpdates.createOrUpdate[0];
      });

      it('creates one file', () => {
        expect(recipeUpdates.createOrUpdate).toHaveLength(1);
      });

      it('deploys to correct Cursor path', () => {
        expect(deployedFile.path).toBe(
          `jetbrains/.cursor/commands/packmind/${recipe.slug}.md`,
        );
      });

      it('includes recipe content', () => {
        expect(deployedFile.content).toBe(recipe.content);
      });
    });
  });

  describe('Example Mapping Scenario 2: Recipe isolation - jetbrains recipe not in vscode work', () => {
    describe('when recipe distributed to jetbrains target', () => {
      let jetbrainsUpdates: FileUpdates;
      let vscodeUpdates: FileUpdates;
      let jetbrainsRecipeFile: FileModification | undefined;
      let jetbrainsIndexFile: FileModification | undefined;

      beforeEach(async () => {
        const jetbrainsRecipeVersions: RecipeVersion[] = [
          {
            id: 'jetbrains-recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary: 'JetBrains services best practices',
            userId: user.id,
          },
        ];

        jetbrainsUpdates = await deployerService.aggregateRecipeDeployments(
          jetbrainsRecipeVersions,
          gitRepo,
          [jetbrainsTarget],
          ['packmind'],
        );

        vscodeUpdates = await deployerService.aggregateRecipeDeployments(
          [],
          gitRepo,
          [vscodeTarget],
          ['packmind'],
        );

        jetbrainsRecipeFile = jetbrainsUpdates.createOrUpdate.find((file) =>
          file.path.includes('commands/writing-good-jetbrains-services.md'),
        );

        jetbrainsIndexFile = jetbrainsUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/commands-index.md',
        );
      });

      it('creates two files for jetbrains deployment', () => {
        expect(jetbrainsUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates jetbrains recipe file', () => {
        expect(jetbrainsRecipeFile).toBeDefined();
      });

      it('places jetbrains recipe file in correct path', () => {
        expect(jetbrainsRecipeFile?.path.startsWith('jetbrains/')).toBe(true);
      });

      it('includes recipe content in jetbrains file', () => {
        expect(jetbrainsRecipeFile?.content).toContain(
          'Writing Good JetBrains Services',
        );
      });

      it('creates one file for vscode deployment (empty index)', () => {
        expect(vscodeUpdates.createOrUpdate).toHaveLength(1);
      });

      it('places vscode index at correct path', () => {
        expect(vscodeUpdates.createOrUpdate[0].path).toBe(
          'vscode/.packmind/commands-index.md',
        );
      });

      it('includes no commands message in vscode index', () => {
        expect(vscodeUpdates.createOrUpdate[0].content).toContain(
          'No commands available',
        );
      });

      it('creates jetbrains index file', () => {
        expect(jetbrainsIndexFile).toBeDefined();
      });

      it('places jetbrains index in correct path', () => {
        expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      });

      it('keeps paths completely separate (no vscode in jetbrains path)', () => {
        expect(jetbrainsIndexFile?.path).not.toContain('vscode');
      });
    });
  });

  describe('Example Mapping Scenario 3: Recipe distributed to multiple targets', () => {
    describe('when recipe distributed to both jetbrains and vscode targets', () => {
      let multiTargetUpdates: FileUpdates;
      let jetbrainsRecipeFile: FileModification | undefined;
      let jetbrainsIndexFile: FileModification | undefined;
      let vscodeRecipeFile: FileModification | undefined;
      let vscodeIndexFile: FileModification | undefined;

      beforeEach(async () => {
        const tddRecipe = await testApp.recipesHexa.getAdapter().captureRecipe({
          name: 'Test-Driven Development (TDD) Best Practices',
          content: `# Test-Driven Development (TDD) Best Practices

## Overview
This recipe provides TDD best practices applicable to any IDE platform.

## Best Practices
1. Write tests first
2. Red-Green-Refactor cycle
3. Keep tests simple and focused
4. Use descriptive test names

## Examples
- JetBrains: Use JUnit or TestNG
- VSCode: Use Jest, Mocha, or Vitest
`,
          userId: user.id,
          organizationId: organization.id,
          spaceId: space.id.toString(),
        });

        const tddRecipeVersions: RecipeVersion[] = [
          {
            id: 'tdd-recipe-version-1' as RecipeVersionId,
            recipeId: tddRecipe.id,
            name: tddRecipe.name,
            slug: tddRecipe.slug,
            content: tddRecipe.content,
            version: tddRecipe.version,
            summary: 'TDD best practices for all platforms',
            userId: user.id,
          },
        ];

        multiTargetUpdates = await deployerService.aggregateRecipeDeployments(
          tddRecipeVersions,
          gitRepo,
          [jetbrainsTarget, vscodeTarget],
          ['packmind'],
        );

        jetbrainsRecipeFile = multiTargetUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            'jetbrains/.packmind/commands/test-driven-development-tdd-best-practices.md',
        );
        jetbrainsIndexFile = multiTargetUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/commands-index.md',
        );
        vscodeRecipeFile = multiTargetUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            'vscode/.packmind/commands/test-driven-development-tdd-best-practices.md',
        );
        vscodeIndexFile = multiTargetUpdates.createOrUpdate.find(
          (file) => file.path === 'vscode/.packmind/commands-index.md',
        );
      });

      it('creates four files (2 for each target)', () => {
        expect(multiTargetUpdates.createOrUpdate).toHaveLength(4);
      });

      it('creates jetbrains recipe file', () => {
        expect(jetbrainsRecipeFile).toBeDefined();
      });

      it('creates jetbrains index file', () => {
        expect(jetbrainsIndexFile).toBeDefined();
      });

      it('creates vscode recipe file', () => {
        expect(vscodeRecipeFile).toBeDefined();
      });

      it('creates vscode index file', () => {
        expect(vscodeIndexFile).toBeDefined();
      });

      it('includes TDD recipe in jetbrains recipe file', () => {
        expect(jetbrainsRecipeFile?.content).toContain(
          'Test-Driven Development (TDD) Best Practices',
        );
      });

      it('includes TDD recipe in jetbrains index file', () => {
        expect(jetbrainsIndexFile?.content).toContain(
          'Test-Driven Development (TDD) Best Practices',
        );
      });

      it('includes TDD recipe in vscode recipe file', () => {
        expect(vscodeRecipeFile?.content).toContain(
          'Test-Driven Development (TDD) Best Practices',
        );
      });

      it('includes TDD recipe in vscode index file', () => {
        expect(vscodeIndexFile?.content).toContain(
          'Test-Driven Development (TDD) Best Practices',
        );
      });
    });

    describe('when Vincent opens exclusively JetBrains folder', () => {
      let jetbrainsOnlyUpdates: FileUpdates;
      let jetbrainsIndexFile: FileModification | undefined;

      beforeEach(async () => {
        const tddRecipeVersions: RecipeVersion[] = [
          {
            id: 'tdd-recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: 'Test-Driven Development (TDD) Best Practices',
            slug: 'tdd-best-practices',
            content: `# TDD Best Practices\n\nApplicable to JetBrains and VSCode.`,
            version: 1,
            summary: 'TDD best practices',
            userId: user.id,
          },
        ];

        await deployerService.aggregateRecipeDeployments(
          tddRecipeVersions,
          gitRepo,
          [jetbrainsTarget, vscodeTarget],
          ['packmind'],
        );

        jetbrainsOnlyUpdates = await deployerService.aggregateRecipeDeployments(
          tddRecipeVersions,
          gitRepo,
          [jetbrainsTarget],
          ['packmind'],
        );

        jetbrainsIndexFile = jetbrainsOnlyUpdates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/commands-index.md',
        );
      });

      it('creates two files for jetbrains only', () => {
        expect(jetbrainsOnlyUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates jetbrains index file', () => {
        expect(jetbrainsIndexFile).toBeDefined();
      });

      it('includes TDD recipe in jetbrains index', () => {
        expect(jetbrainsIndexFile?.content).toContain(
          'Test-Driven Development (TDD) Best Practices',
        );
      });

      it('places index in jetbrains path', () => {
        expect(jetbrainsIndexFile?.path.startsWith('jetbrains/')).toBe(true);
      });

      it('keeps paths separate (no vscode in path)', () => {
        expect(jetbrainsIndexFile?.path).not.toContain('vscode');
      });
    });
  });

  describe('Path prefix behavior', () => {
    describe('when removing leading slash from target path', () => {
      let updates: FileUpdates;
      let indexFile: FileModification | undefined;

      beforeEach(async () => {
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

        updates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [jetbrainsTarget],
          ['packmind'],
        );

        indexFile = updates.createOrUpdate.find(
          (file) => file.path === 'jetbrains/.packmind/commands-index.md',
        );
      });

      it('creates two files', () => {
        expect(updates.createOrUpdate).toHaveLength(2);
      });

      it('creates index file', () => {
        expect(indexFile).toBeDefined();
      });

      it('places index at correct path', () => {
        expect(indexFile?.path).toBe('jetbrains/.packmind/commands-index.md');
      });

      it('produces path without double slashes', () => {
        expect(indexFile?.path).not.toContain('//');
      });
    });

    describe('when handling root target', () => {
      let updates: FileUpdates;
      let indexFile: FileModification | undefined;

      beforeEach(async () => {
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

        updates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [rootTarget],
          ['packmind'],
        );

        indexFile = updates.createOrUpdate.find(
          (file) => file.path === '.packmind/commands-index.md',
        );
      });

      it('creates two files', () => {
        expect(updates.createOrUpdate).toHaveLength(2);
      });

      it('creates index file for root deployment', () => {
        expect(indexFile).toBeDefined();
      });

      it('places index at root path without prefix', () => {
        expect(indexFile?.path).toBe('.packmind/commands-index.md');
      });
    });
  });
});
