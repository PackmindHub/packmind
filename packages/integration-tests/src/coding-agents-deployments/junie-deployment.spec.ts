import { accountsSchemas } from '@packmind/accounts';
import { DeployerService, JunieDeployer } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { commandsSchemas } from '@packmind/commands';
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
  Command,
  CommandVersion,
  CommandVersionId,
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
    ...commandsSchemas,
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

  let recipe: Command;
  let standard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;
  let gitRepo: GitRepo;

  beforeAll(async () => {
    await fixture.initialize();

    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    deployerService = testApp.codingAgentHexa.getDeployerService();

    standardsPort = testApp.standardsHexa.getAdapter();
    gitPort = testApp.gitHexa.getAdapter();

    const signUpResult = await testApp.accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        email: 'testuser@packmind.com',
        password: 's3cret!@',
        method: 'password',
      });
    user = signUpResult.user;
    organization = signUpResult.organization;

    const spaces = await testApp.spacesHexa
      .getAdapter()
      .listSpacesByOrganization(organization.id);
    const foundSpace = spaces.find((s) => s.name === 'Global');
    assert(foundSpace, 'Default Global space should exist');
    space = foundSpace;

    recipe = await testApp.commandsHexa.getAdapter().captureCommand({
      name: 'Test Recipe',
      content: 'This is test recipe content for deployment',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id,
    });

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

    const gitProvider = await testApp.gitHexa.getAdapter().addGitProvider({
      userId: user.id,
      organizationId: organization.id,
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://api.github.com',
        token: 'test-github-token',
        authMethod: 'token' as const,
        displayName: '',
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

    fixture.snapshot();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when .junie/guidelines.md does not exist', () => {
    let defaultTarget: Target;

    beforeEach(() => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when clearing recipes section for single-file deployers', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployerService.aggregateCommandDeployments>
      >;

      beforeEach(async () => {
        const recipeVersions: CommandVersion[] = [
          {
            id: 'recipe-version-1' as CommandVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            userId: user.id,
          },
        ];

        fileUpdates = await deployerService.aggregateCommandDeployments(
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
        const sectionContent = guidelinesFile?.sections?.[0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('contains standard description', () => {
        const sectionContent = guidelinesFile?.sections?.[0].content;
        expect(sectionContent).toContain(`${standard.description} :`);
      });

      it('contains first rule content', () => {
        const sectionContent = guidelinesFile?.sections?.[0].content;
        expect(sectionContent).toContain('* Use meaningful variable names');
      });

      it('contains second rule content', () => {
        const sectionContent = guidelinesFile?.sections?.[0].content;
        expect(sectionContent).toContain('* Write comprehensive tests');
      });

      it('contains link to full standard', () => {
        const sectionContent = guidelinesFile?.sections?.[0].content;
        expect(sectionContent).toContain(
          'Full standard is available here for further request: [Test Standard](../.packmind/standards/test-standard.md)',
        );
      });

      it('does not contain recipes content', () => {
        const sectionContent = guidelinesFile?.sections?.[0].content;
        expect(sectionContent).not.toContain('# Packmind Recipes');
      });
    });

    describe('when merging recipes and standards for combined deployment', () => {
      let pathMap: Map<string, FileModification>;
      let finalFile: FileModification | undefined;

      beforeEach(async () => {
        const recipeVersions: CommandVersion[] = [
          {
            id: 'recipe-version-1' as CommandVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
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

        const commandUpdates =
          await deployerService.aggregateCommandDeployments(
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

        const allUpdates = [commandUpdates, standardsUpdates];
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

  // Deployers always emit their sections and never read the file already in the
  // repo, so nothing here can assert content preservation; that is the merge
  // layer's job, covered by CommitToGitUseCase.spec.ts in @packmind/git.

  describe('when .junie/guidelines.md exists but is missing recipe instructions', () => {
    let defaultTarget: Target;

    beforeEach(() => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };
      jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('when clearing recipes section for single-file deployers', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployerService.aggregateCommandDeployments>
      >;

      beforeEach(async () => {
        const recipeVersions: CommandVersion[] = [
          {
            id: 'recipe-version-1' as CommandVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            userId: user.id,
          },
        ];

        fileUpdates = await deployerService.aggregateCommandDeployments(
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
        assert(
          guidelinesFile.sections,
          'Junie renders guidelines.md as sections',
        );
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

        const recipeVersions: CommandVersion[] = [
          {
            id: 'recipe-version-1' as CommandVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            userId: user.id,
          },
        ];

        fileUpdates = await junieDeployer.deployCommands(
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
