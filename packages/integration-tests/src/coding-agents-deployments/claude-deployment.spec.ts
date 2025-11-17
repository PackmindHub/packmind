import { accountsSchemas } from '@packmind/accounts';
import { ClaudeDeployer, DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
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
import { DataSource } from 'typeorm';
import { TestApp } from '../helpers/TestApp';

describe('Claude Deployment Integration', () => {
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
    await dataSource.destroy();
  });

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

    it('creates CLAUDE.md with recipes instructions only', async () => {
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
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate.find(
        (file) => file.path === 'CLAUDE.md',
      );

      expect(claudeFile).toBeDefined();
      if (claudeFile) {
        const sectionContent = claudeFile.sections![0].content;
        expect(sectionContent).toContain('# Packmind Recipes');
        expect(sectionContent).toContain('🚨 **MANDATORY STEP** 🚨');
        expect(sectionContent).toContain('ALWAYS READ');
        expect(sectionContent).toContain(recipeVersions[0].name);
        expect(sectionContent).toContain('aiAgent: "Claude Code"');
        expect(sectionContent).toContain('gitRepo: "test-owner/test-repo"');

        // Should NOT contain standards content yet
        expect(sectionContent).not.toContain('## Packmind Standards');
      }
    });

    it('creates CLAUDE.md with standards instructions only', async () => {
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

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate.find(
        (file) => file.path === 'CLAUDE.md',
      );

      expect(claudeFile).toBeDefined();
      if (claudeFile) {
        const sectionContent = claudeFile.sections![0].content;
        expect(sectionContent).toContain('# Packmind Standards');
        expect(sectionContent).toContain(
          'Before starting your work, make sure to review the coding standards relevant to your current task',
        );
        expect(sectionContent).toContain('Test standard for deployment :');
        expect(sectionContent).toContain('* Use meaningful variable names');
        expect(sectionContent).toContain('* Write comprehensive tests');
        expect(sectionContent).toContain(
          'Full standard is available here for further request: [Test Standard](.packmind/standards/test-standard.md)',
        );

        // Should NOT contain recipes content yet
        expect(sectionContent).not.toContain('# Packmind Recipes');
      }
    });

    it('merges recipes and standards for combined deployment', async () => {
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
      const pathMap = new Map<string, FileModification>();

      for (const update of allUpdates) {
        for (const file of update.createOrUpdate) {
          pathMap.set(file.path, file);
        }
      }

      // Since both write to the same file, the last one wins in this simulation
      // This demonstrates the issue that was fixed by implementing content checking
      expect(pathMap.size).toBe(1);
      expect(pathMap.has('CLAUDE.md')).toBe(true);

      // The final content should be from the standards deployment (last one wins)
      const finalFile = pathMap.get('CLAUDE.md');
      expect(finalFile).toBeDefined();
      if (finalFile && finalFile.sections) {
        const sectionContent = finalFile.sections[0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      }
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

    it('generates recipe section content', async () => {
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
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      expect(claudeFile.path).toBe('CLAUDE.md');

      const sectionContent = claudeFile.sections![0].content;

      // Should generate recipe section with Packmind content only
      expect(sectionContent).toContain('# Packmind Recipes');
      expect(sectionContent).toContain('🚨 **MANDATORY STEP** 🚨');
      expect(sectionContent).toContain('aiAgent: "Claude Code"');
      expect(sectionContent).toContain('gitRepo: "test-owner/test-repo"');

      // Should NOT contain user content (that's preserved by merge layer)
      expect(sectionContent).not.toContain('# Some User Instructions');
      expect(sectionContent).not.toContain('# Packmind Standards');
    });

    it('generates standards section content', async () => {
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

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['claude'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      expect(claudeFile.path).toBe('CLAUDE.md');

      const sectionContent = claudeFile.sections![0].content;

      // Should generate standards section with Packmind content only
      expect(sectionContent).toContain('# Packmind Standards');
      expect(sectionContent).toContain(
        'Before starting your work, make sure to review the coding standards relevant to your current task',
      );
      expect(sectionContent).toContain('* Use meaningful variable names');
      expect(sectionContent).toContain('* Write comprehensive tests');

      // Should NOT contain user content (that's preserved by merge layer)
      expect(sectionContent).not.toContain('# Some User Instructions');
      expect(sectionContent).not.toContain('# Packmind Recipes');
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

    it('handles empty recipe list gracefully', async () => {
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await claudeDeployer.deployRecipes(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('handles empty standards list gracefully', async () => {
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

      const fileUpdates = await claudeDeployer.deployStandards(
        [],
        gitRepo,
        defaultTarget,
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(0);
      expect(fileUpdates.delete).toHaveLength(0);
    });

    it('handles GitHexa errors gracefully', async () => {
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

      const fileUpdates = await claudeDeployer.deployRecipes(
        recipeVersions,
        gitRepo,
        defaultTarget,
      );

      // Should still work despite the error, treating it as if file doesn't exist
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const claudeFile = fileUpdates.createOrUpdate[0];
      const sectionContent = claudeFile.sections![0].content;
      expect(sectionContent).toContain('# Packmind Recipes');
      expect(sectionContent).toContain('🚨 **MANDATORY STEP** 🚨');
    });
  });
});
