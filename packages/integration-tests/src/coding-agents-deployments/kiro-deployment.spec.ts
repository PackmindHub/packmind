import { accountsSchemas } from '@packmind/accounts';
import { DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { commandsSchemas } from '@packmind/commands';
import { skillsSchemas } from '@packmind/skills';
import { skillVersionFactory } from '@packmind/skills/test';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import {
  createTargetId,
  FileModification,
  FileUpdates,
  GitProviderVendors,
  GitRepo,
  IGitPort,
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

const STEERING_DIR = '.kiro/steering/';
const SKILLS_DIR = '.kiro/skills/';

describe('Kiro Deployment Integration', () => {
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
  let gitPort: IGitPort;
  let deployerService: DeployerService;

  let recipe: Command;
  let scopedStandard: Standard;
  let globalStandard: Standard;
  let organization: Organization;
  let user: User;
  let space: Space;
  let gitRepo: GitRepo;
  let defaultTarget: Target;

  const standardVersionOf = (
    standard: Standard,
    id: string,
  ): StandardVersion => ({
    id: id as StandardVersionId,
    standardId: standard.id,
    name: standard.name,
    slug: standard.slug,
    description: standard.description,
    version: standard.version,
    userId: user.id,
    scope: standard.scope,
  });

  // Every test in this file starts from the same fixture data, so it is seeded
  // once here and rewound by fixture.cleanup() rather than rebuilt per test.
  beforeAll(async () => {
    await fixture.initialize();

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

    recipe = await testApp.commandsHexa.getAdapter().captureCommand({
      name: 'Test Recipe for Kiro',
      content: 'This is test recipe content for Kiro deployment',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
    });

    scopedStandard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'Test Standard for Kiro',
      description: 'A test standard for Kiro deployment',
      rules: [
        { content: 'Use meaningful variable names in TypeScript' },
        { content: 'Write comprehensive tests for all components' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: '**/*.{ts,tsx}, docs/**/*.md',
      spaceId: space.id,
    });

    globalStandard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'Global Standard for Kiro',
      description: 'A global standard without scope',
      rules: [{ content: 'Always use consistent formatting' }],
      organizationId: organization.id,
      userId: user.id,
      scope: '',
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

  beforeEach(() => {
    defaultTarget = {
      id: createTargetId('default-target-id'),
      name: 'Default',
      path: '/',
      gitRepoId: gitRepo.id,
    };
    jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when deploying a scoped standard', () => {
    let steeringFile: FileModification | undefined;

    beforeEach(async () => {
      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        [standardVersionOf(scopedStandard, 'standard-version-1')],
        gitRepo,
        [defaultTarget],
        ['kiro'],
      );

      steeringFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.startsWith(STEERING_DIR),
      );
    });

    it('writes one steering file named after the standard', () => {
      expect(steeringFile?.path).toBe(
        `${STEERING_DIR}packmind-standard-${scopedStandard.slug}.md`,
      );
    });

    it('includes the standard on file match', () => {
      expect(steeringFile?.content).toContain('inclusion: fileMatch');
    });

    it('lists every glob of the scope, keeping brace groups intact', () => {
      expect(steeringFile?.content).toContain(
        "fileMatchPattern: ['**/*.{ts,tsx}', 'docs/**/*.md']",
      );
    });

    it('includes the standard description', () => {
      expect(steeringFile?.content).toContain(
        `${scopedStandard.description} :`,
      );
    });

    it('includes the standard rules', () => {
      expect(steeringFile?.content).toContain(
        '* Use meaningful variable names in TypeScript',
      );
    });

    it('links back to the Packmind standard', () => {
      expect(steeringFile?.content).toContain(
        `Full standard is available here for further request: [${scopedStandard.name}](../../.packmind/standards/${scopedStandard.slug}.md)`,
      );
    });

    it('leaves AGENTS.md alone', () => {
      expect(steeringFile?.path).not.toBe('AGENTS.md');
    });
  });

  describe('when deploying an unscoped standard', () => {
    let steeringFile: FileModification | undefined;

    beforeEach(async () => {
      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        [standardVersionOf(globalStandard, 'standard-version-2')],
        gitRepo,
        [defaultTarget],
        ['kiro'],
      );

      steeringFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.startsWith(STEERING_DIR),
      );
    });

    it('includes the standard always', () => {
      expect(steeringFile?.content).toContain('inclusion: always');
    });

    it('omits the file match pattern', () => {
      expect(steeringFile?.content).not.toContain('fileMatchPattern');
    });
  });

  describe('when deploying a skill', () => {
    let skillFile: FileModification | undefined;
    const skillSlug = 'my-kiro-skill';

    beforeEach(async () => {
      const skillVersion = skillVersionFactory({
        name: 'My Kiro Skill',
        slug: skillSlug,
        description: 'A skill for testing Kiro deployment',
        prompt: 'Do the skill thing',
      });

      const fileUpdates = await deployerService.aggregateSkillDeployments(
        [skillVersion],
        gitRepo,
        [defaultTarget],
        ['kiro'],
      );

      skillFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.startsWith(SKILLS_DIR),
      );
    });

    it('writes the skill under its own directory', () => {
      expect(skillFile?.path).toBe(`${SKILLS_DIR}${skillSlug}/SKILL.md`);
    });

    it('carries the skill prompt', () => {
      expect(skillFile?.content).toContain('Do the skill thing');
    });
  });

  describe('when deploying a command', () => {
    let fileUpdates: FileUpdates;

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
        ['kiro'],
      );
    });

    it('writes nothing under .kiro/, since Kiro has no command directory', () => {
      expect(
        fileUpdates.createOrUpdate.filter((file) =>
          file.path.startsWith('.kiro/'),
        ),
      ).toEqual([]);
    });

    it('writes nothing to AGENTS.md', () => {
      expect(
        fileUpdates.createOrUpdate.find((file) => file.path === 'AGENTS.md'),
      ).toBeUndefined();
    });
  });
});
