import { accountsSchemas } from '@packmind/accounts';
import { DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { skillsSchemas } from '@packmind/skills';
import { skillVersionFactory } from '@packmind/skills/test';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import {
  createTargetId,
  FileModification,
  GitProviderVendors,
  GitRepo,
  IGitPort,
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

describe('OpenCode Deployment Integration', () => {
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
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    deployerService = testApp.codingAgentHexa.getDeployerService();
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

    recipe = await testApp.recipesHexa.getAdapter().captureRecipe({
      name: 'Test Recipe for OpenCode',
      content:
        '---\ndescription: "Test recipe"\nagent: build\n---\nThis is test recipe content for OpenCode',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
    });

    standard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'Test Standard for OpenCode',
      description: 'A test standard for OpenCode deployment',
      rules: [
        { content: 'Use meaningful variable names in TypeScript' },
        { content: 'Write comprehensive tests for all components' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: '**/*.{ts,tsx}',
      spaceId: space.id,
    });

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
    let commandFile: FileModification | undefined;

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
          summary: 'Test recipe summary',
          userId: user.id,
        },
      ];

      fileUpdates = await deployerService.aggregateRecipeDeployments(
        recipeVersions,
        gitRepo,
        [defaultTarget],
        ['opencode'],
      );

      commandFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.startsWith('.opencode/commands/'),
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('creates the command file in .opencode/commands/', () => {
      expect(commandFile).toBeDefined();
    });

    it('uses correct path for command file', () => {
      expect(commandFile?.path).toBe(`.opencode/commands/${recipe.slug}.md`);
    });

    it('writes recipe content as-is to command file', () => {
      expect(commandFile?.content).toBe(recipe.content);
    });

    it('does not write to AGENTS.md', () => {
      const agentsMdFile = fileUpdates.createOrUpdate.find(
        (f) => f.path === 'AGENTS.md',
      );
      expect(agentsMdFile).toBeUndefined();
    });
  });

  describe('when deploying a single standard', () => {
    let defaultTarget: Target;
    let fileUpdates: {
      createOrUpdate: FileModification[];
      delete: { path: string }[];
    };
    let agentsMdFile: FileModification | undefined;

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
          summary: 'Test standard summary',
          userId: user.id,
          scope: standard.scope,
        },
      ];

      fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['opencode'],
      );

      agentsMdFile = fileUpdates.createOrUpdate.find(
        (f) => f.path === 'AGENTS.md',
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('targets AGENTS.md', () => {
      expect(agentsMdFile).toBeDefined();
    });

    it('writes standards as sections in AGENTS.md', () => {
      expect(agentsMdFile?.sections).toBeDefined();
    });

    it('includes Packmind standards section key', () => {
      const section = agentsMdFile?.sections?.find(
        (s) => s.key === 'Packmind standards',
      );
      expect(section).toBeDefined();
    });

    it('includes standard name in section content', () => {
      const section = agentsMdFile?.sections?.find(
        (s) => s.key === 'Packmind standards',
      );
      expect(section?.content).toContain(standard.name);
    });
  });

  describe('when deploying a single skill', () => {
    let defaultTarget: Target;
    let fileUpdates: {
      createOrUpdate: FileModification[];
      delete: { path: string }[];
    };
    let skillFile: FileModification | undefined;
    const skillSlug = 'my-opencode-skill';

    beforeEach(async () => {
      defaultTarget = {
        id: createTargetId('default-target-id'),
        name: 'Default',
        path: '/',
        gitRepoId: gitRepo.id,
      };

      const skillVersion = skillVersionFactory({
        name: 'My OpenCode Skill',
        slug: skillSlug,
        description: 'A skill for testing OpenCode deployment',
        prompt: 'Do the skill thing',
      });

      fileUpdates = await deployerService.aggregateSkillDeployments(
        [skillVersion],
        gitRepo,
        [defaultTarget],
        ['opencode'],
      );

      skillFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.startsWith('.opencode/skills/'),
      );
    });

    it('creates the skill file in .opencode/skills/', () => {
      expect(skillFile).toBeDefined();
    });

    it('uses correct path for SKILL.md', () => {
      expect(skillFile?.path).toBe(`.opencode/skills/${skillSlug}/SKILL.md`);
    });
  });
});
