import { accountsSchemas } from '@packmind/accounts';
import { CopilotDeployer, DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { skillsSchemas } from '@packmind/skills';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import {
  DeleteItemType,
  FileUpdates,
  GitProviderVendors,
  GitRepo,
  IGitPort,
  IStandardsPort,
  Organization,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  Skill,
  SkillVersion,
  SkillVersionId,
  Space,
  Standard,
  StandardVersion,
  StandardVersionId,
  Target,
  User,
  createSkillFileId,
  createTargetId,
} from '@packmind/types';

import assert from 'assert';
import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { TestApp } from '../helpers/TestApp';

describe('GitHub Copilot Deployment Integration', () => {
  const fixture = createIntegrationTestFixture([
    ...accountsSchemas,
    ...recipesSchemas,
    ...standardsSchemas,
    ...skillsSchemas,
    ...spacesSchemas,
    ...gitSchemas,
    ...deploymentsSchemas,
  ]);

  let testApp: TestApp;
  let standardsPort: IStandardsPort;
  let gitPort: IGitPort;
  let deployerService: DeployerService;

  let recipe: Recipe;
  let standard: Standard;
  let skill: Skill;
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
      name: 'Test Recipe for Copilot',
      content: 'This is test recipe content for GitHub Copilot deployment',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
    });

    // Create test standard
    standard = await testApp.standardsHexa.getAdapter().createStandard({
      name: 'Test Standard for Copilot',
      description: 'A test standard for GitHub Copilot deployment',
      rules: [
        { content: 'Use meaningful variable names in JavaScript' },
        { content: 'Write comprehensive tests for all functions' },
      ],
      organizationId: organization.id,
      userId: user.id,
      scope: '**/*.{js,ts}',
      spaceId: space.id,
    });

    // Create test skill
    skill = await testApp.skillsHexa.getAdapter().createSkill({
      name: 'Test Skill for Copilot',
      description: 'A test skill for GitHub Copilot deployment',
      prompt: 'This is the skill prompt content for testing',
      license: 'MIT',
      compatibility: 'copilot',
      metadata: { category: 'testing', version: '1.0' },
      allowedTools: 'read,write,execute',
      organizationId: organization.id,
      userId: user.id,
      spaceId: space.id.toString(),
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

  describe('when .github/instructions/packmind-recipes-index.instructions.md does not exist', () => {
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

    describe('when deploying recipe', () => {
      let recipeVersions: RecipeVersion[];
      let fileUpdates: FileUpdates;

      beforeEach(async () => {
        recipeVersions = [
          {
            id: 'recipe-version-1' as RecipeVersionId,
            recipeId: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            content: recipe.content,
            version: recipe.version,
            summary:
              'Test recipe for GitHub Copilot deployment with detailed instructions',
            userId: user.id,
          },
        ];

        fileUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [defaultTarget],
          ['copilot'],
        );
      });

      it('creates one prompt file', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('uses correct prompt file path', () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe(
          `.github/prompts/${recipe.slug}.prompt.md`,
        );
      });

      it('includes description in YAML frontmatter', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          "description: 'Test recipe for GitHub Copilot deployment with detailed instructions'",
        );
      });

      it('sets agent mode in YAML frontmatter', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          "agent: 'agent'",
        );
      });

      it('includes recipe content in prompt file', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          'This is test recipe content for GitHub Copilot deployment',
        );
      });

      it('deletes legacy recipes-index.instructions.md file', () => {
        expect(fileUpdates.delete).toContainEqual({
          path: '.github/instructions/packmind-recipes-index.instructions.md',
          type: DeleteItemType.File,
        });
      });
    });

    describe('when deploying standards', () => {
      let fileUpdates: FileUpdates;
      let copilotStandardFile: { path: string; content: string } | undefined;

      beforeEach(async () => {
        const standardVersions: StandardVersion[] = [
          {
            id: 'standard-version-1' as StandardVersionId,
            standardId: standard.id,
            name: standard.name,
            slug: standard.slug,
            description: standard.description,
            version: standard.version,
            summary: 'Test standard for GitHub Copilot deployment',
            userId: user.id,
            scope: standard.scope,
          },
        ];

        fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['copilot'],
        );

        copilotStandardFile = fileUpdates.createOrUpdate.find(
          (file) =>
            file.path ===
            `.github/instructions/packmind-${standard.slug}.instructions.md`,
        );
      });

      it('creates one standard file', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('deletes no files', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });

      it('creates file at correct path', () => {
        expect(copilotStandardFile).toBeDefined();
      });

      it('includes YAML frontmatter opening delimiter', () => {
        expect(copilotStandardFile?.content).toContain('---');
      });

      it('includes applyTo scope in YAML frontmatter', () => {
        expect(copilotStandardFile?.content).toContain(
          "applyTo: '**/*.{js,ts}'",
        );
      });

      it('includes standard summary', () => {
        expect(copilotStandardFile?.content).toContain(
          'Test standard for GitHub Copilot deployment :',
        );
      });

      it('includes first rule', () => {
        expect(copilotStandardFile?.content).toContain(
          '* Use meaningful variable names in JavaScript',
        );
      });

      it('includes second rule', () => {
        expect(copilotStandardFile?.content).toContain(
          '* Write comprehensive tests for all functions',
        );
      });

      it('includes link to full standard', () => {
        expect(copilotStandardFile?.content).toContain(
          `Full standard is available here for further request: [${standard.name}](../../.packmind/standards/${standard.slug}.md)`,
        );
      });
    });

    describe('when standard has no scope', () => {
      let fileUpdates: FileUpdates;
      let copilotStandardFile: { path: string; content: string };
      let globalStandard: Standard;

      beforeEach(async () => {
        globalStandard = await testApp.standardsHexa
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

        fileUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['copilot'],
        );

        copilotStandardFile = fileUpdates.createOrUpdate[0];
      });

      it('creates one standard file', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('uses correct file path', () => {
        expect(copilotStandardFile.path).toBe(
          `.github/instructions/packmind-${globalStandard.slug}.instructions.md`,
        );
      });

      it('uses ** as default applyTo scope', () => {
        expect(copilotStandardFile.content).toContain("applyTo: '**'");
      });

      it('includes standard summary', () => {
        expect(copilotStandardFile.content).toContain(
          'Global standard for all files :',
        );
      });

      it('includes rule content', () => {
        expect(copilotStandardFile.content).toContain(
          '* Always use consistent formatting',
        );
      });

      it('includes link to full standard', () => {
        expect(copilotStandardFile.content).toContain(
          `Full standard is available here for further request: [${globalStandard.name}](../../.packmind/standards/${globalStandard.slug}.md)`,
        );
      });
    });

    describe('when combining recipes and standards deployments', () => {
      let recipeUpdates: FileUpdates;
      let standardsUpdates: FileUpdates;

      beforeEach(async () => {
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

        const combinedDefaultTarget = {
          id: createTargetId('default-target-id'),
          name: 'Default',
          path: '/',
          gitRepoId: gitRepo.id,
        };

        recipeUpdates = await deployerService.aggregateRecipeDeployments(
          recipeVersions,
          gitRepo,
          [combinedDefaultTarget],
          ['copilot'],
        );

        standardsUpdates = await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [combinedDefaultTarget],
          ['copilot'],
        );
      });

      it('creates one recipe file', () => {
        expect(recipeUpdates.createOrUpdate).toHaveLength(1);
      });

      it('creates one standard file', () => {
        expect(standardsUpdates.createOrUpdate).toHaveLength(1);
      });

      it('creates recipe file in .github/prompts directory', () => {
        expect(recipeUpdates.createOrUpdate[0].path).toBe(
          `.github/prompts/${recipe.slug}.prompt.md`,
        );
      });

      it('creates standard file in .github/instructions directory', () => {
        expect(standardsUpdates.createOrUpdate[0].path).toBe(
          `.github/instructions/packmind-${standard.slug}.instructions.md`,
        );
      });
    });
  });

  describe('migration from index to prompt files', () => {
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

    let recipeVersions: RecipeVersion[];
    let fileUpdates: FileUpdates;

    beforeEach(async () => {
      recipeVersions = [
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
        ['copilot'],
      );
    });

    it('creates one prompt file', async () => {
      expect(fileUpdates.createOrUpdate).toHaveLength(1);
    });

    it('uses correct prompt file path', async () => {
      expect(fileUpdates.createOrUpdate[0].path).toBe(
        `.github/prompts/${recipe.slug}.prompt.md`,
      );
    });

    it('includes description in YAML frontmatter', async () => {
      expect(fileUpdates.createOrUpdate[0].content).toContain(
        "description: 'Test recipe for deployment'",
      );
    });

    it('sets agent mode in YAML frontmatter', async () => {
      expect(fileUpdates.createOrUpdate[0].content).toContain("agent: 'agent'");
    });
  });

  describe('unit tests for CopilotDeployer', () => {
    let defaultTarget: Target;
    let copilotDeployer: CopilotDeployer;

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
      copilotDeployer = new CopilotDeployer(standardsPort, gitPort);
    });

    describe('when deploying empty recipe list', () => {
      let fileUpdates: FileUpdates;

      beforeEach(async () => {
        jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

        fileUpdates = await copilotDeployer.deployRecipes(
          [],
          gitRepo,
          defaultTarget,
        );
      });

      it('creates no prompt files', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(0);
      });

      it('still deletes legacy recipes-index.instructions.md file', () => {
        expect(fileUpdates.delete).toContainEqual({
          path: '.github/instructions/packmind-recipes-index.instructions.md',
          type: DeleteItemType.File,
        });
      });
    });

    describe('when deploying empty standards list', () => {
      let fileUpdates: FileUpdates;

      beforeEach(async () => {
        fileUpdates = await copilotDeployer.deployStandards(
          [],
          gitRepo,
          defaultTarget,
        );
      });

      it('creates no standard files', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(0);
      });

      it('deletes no files', () => {
        expect(fileUpdates.delete).toHaveLength(0);
      });
    });

    describe('when GitHexa throws an error', () => {
      let fileUpdates: FileUpdates;
      let copilotFile: { path: string; content: string };

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

        fileUpdates = await copilotDeployer.deployRecipes(
          recipeVersions,
          gitRepo,
          defaultTarget,
        );

        copilotFile = fileUpdates.createOrUpdate[0];
      });

      it('still creates one prompt file', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('still deletes legacy recipes-index.instructions.md file', () => {
        expect(fileUpdates.delete).toContainEqual({
          path: '.github/instructions/packmind-recipes-index.instructions.md',
          type: DeleteItemType.File,
        });
      });

      it('includes description in YAML frontmatter', () => {
        expect(copilotFile.content).toContain("description: 'Test recipe'");
      });

      it('includes agent mode in YAML frontmatter', () => {
        expect(copilotFile.content).toContain("agent: 'agent'");
      });

      it('includes recipe content in file', () => {
        expect(copilotFile.content).toContain(
          'This is test recipe content for GitHub Copilot deployment',
        );
      });
    });

    describe('when generating multiple standard files', () => {
      let fileUpdates: FileUpdates;
      let frontendFile: { path: string; content: string } | undefined;
      let backendFile: { path: string; content: string } | undefined;
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

        fileUpdates = await copilotDeployer.deployStandards(
          standardVersions,
          gitRepo,
          defaultTarget,
        );

        frontendFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes(standard1.slug),
        );
        backendFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes(standard2.slug),
        );
      });

      it('creates two standard files', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('creates frontend standard file', () => {
        expect(frontendFile).toBeDefined();
      });

      it('includes applyTo scope in frontend standard', () => {
        expect(frontendFile?.content).toContain(
          "applyTo: '**/*.{ts,tsx,js,jsx}'",
        );
      });

      it('includes summary in frontend standard', () => {
        expect(frontendFile?.content).toContain('Frontend standard :');
      });

      it('includes rule in frontend standard', () => {
        expect(frontendFile?.content).toContain('* Use TypeScript');
      });

      it('includes link in frontend standard', () => {
        expect(frontendFile?.content).toContain(
          `Full standard is available here for further request: [${standard1.name}](../../.packmind/standards/${standard1.slug}.md)`,
        );
      });

      it('creates backend standard file', () => {
        expect(backendFile).toBeDefined();
      });

      it('uses ** as default applyTo scope in backend standard', () => {
        expect(backendFile?.content).toContain("applyTo: '**'");
      });

      it('includes summary in backend standard', () => {
        expect(backendFile?.content).toContain('Backend standard :');
      });

      it('includes rule in backend standard', () => {
        expect(backendFile?.content).toContain('* Use dependency injection');
      });

      it('includes link in backend standard', () => {
        expect(backendFile?.content).toContain(
          `Full standard is available here for further request: [${standard2.name}](../../.packmind/standards/${standard2.slug}.md)`,
        );
      });
    });

    describe('when deploying skills', () => {
      let skillVersions: SkillVersion[];

      beforeEach(async () => {
        skillVersions = [
          {
            id: 'skill-version-1' as SkillVersionId,
            skillId: skill.id,
            name: skill.name,
            slug: skill.slug,
            description: skill.description,
            prompt: skill.prompt,
            version: skill.version,
            userId: user.id,
            license: skill.license,
            compatibility: skill.compatibility,
            metadata: skill.metadata,
            allowedTools: skill.allowedTools,
          },
        ];
      });

      describe('when calling deploySkills', () => {
        let fileUpdates: FileUpdates;

        beforeEach(async () => {
          fileUpdates = await copilotDeployer.deploySkills(
            skillVersions,
            gitRepo,
            defaultTarget,
          );
        });

        it('creates one SKILL.md file', () => {
          expect(fileUpdates.createOrUpdate).toHaveLength(1);
        });

        it('uses correct SKILL.md file path', () => {
          expect(fileUpdates.createOrUpdate[0].path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });

        it('includes name in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            `name: '${skill.name}'`,
          );
        });

        it('includes description in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            `description: '${skill.description}'`,
          );
        });

        it('includes license in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            `license: '${skill.license}'`,
          );
        });

        it('includes compatibility in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            `compatibility: '${skill.compatibility}'`,
          );
        });

        it('includes allowed-tools in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            `allowed-tools: '${skill.allowedTools}'`,
          );
        });

        it('includes metadata section in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain('metadata:');
        });

        it('includes metadata category in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            "category: 'testing'",
          );
        });

        it('includes metadata version in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            "version: '1.0'",
          );
        });

        it('includes prompt content in body', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            'This is the skill prompt content for testing',
          );
        });

        it('starts with YAML frontmatter delimiter', () => {
          const content = fileUpdates.createOrUpdate[0].content;
          expect(content).toMatch(/^---\n/);
        });

        it('has YAML frontmatter closing delimiter', () => {
          const content = fileUpdates.createOrUpdate[0].content;
          expect(content).toMatch(/\n---\n/);
        });
      });

      describe('when calling generateFileUpdatesForSkills', () => {
        let fileUpdates: FileUpdates;

        beforeEach(async () => {
          fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(skillVersions);
        });

        it('creates one file', () => {
          expect(fileUpdates.createOrUpdate).toHaveLength(1);
        });

        it('uses correct SKILL.md file path', () => {
          expect(fileUpdates.createOrUpdate[0].path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });

        it('includes name in frontmatter', () => {
          const content = fileUpdates.createOrUpdate[0].content;
          expect(content).toContain(`name: '${skill.name}'`);
        });

        it('includes description in frontmatter', () => {
          const content = fileUpdates.createOrUpdate[0].content;
          expect(content).toContain(`description: '${skill.description}'`);
        });

        it('includes license in frontmatter', () => {
          const content = fileUpdates.createOrUpdate[0].content;
          expect(content).toContain(`license: '${skill.license}'`);
        });
      });

      describe('when deploying multiple skills', () => {
        let skill2: Skill;
        let multipleSkillVersions: SkillVersion[];

        beforeEach(async () => {
          skill2 = await testApp.skillsHexa.getAdapter().createSkill({
            name: 'Second Test Skill',
            description: 'Another test skill',
            prompt: 'Second skill prompt',
            organizationId: organization.id,
            userId: user.id,
            spaceId: space.id.toString(),
          });

          multipleSkillVersions = [
            skillVersions[0],
            {
              id: 'skill-version-2' as SkillVersionId,
              skillId: skill2.id,
              name: skill2.name,
              slug: skill2.slug,
              description: skill2.description,
              prompt: skill2.prompt,
              version: skill2.version,
              userId: user.id,
            },
          ];
        });

        describe('when calling deploySkills', () => {
          let fileUpdates: FileUpdates;

          beforeEach(async () => {
            fileUpdates = await copilotDeployer.deploySkills(
              multipleSkillVersions,
              gitRepo,
              defaultTarget,
            );
          });

          it('creates two SKILL.md files', () => {
            expect(fileUpdates.createOrUpdate).toHaveLength(2);
          });

          it('creates first skill file at correct path', () => {
            expect(fileUpdates.createOrUpdate[0].path).toBe(
              `.github/skills/${skill.slug}/SKILL.md`,
            );
          });

          it('creates second skill file at correct path', () => {
            expect(fileUpdates.createOrUpdate[1].path).toBe(
              `.github/skills/${skill2.slug}/SKILL.md`,
            );
          });
        });
      });

      describe('when skill has special characters in description', () => {
        let skillWithQuotes: Skill;

        beforeEach(async () => {
          skillWithQuotes = await testApp.skillsHexa.getAdapter().createSkill({
            name: 'Skill with quotes',
            description: "This skill's description has 'single quotes'",
            prompt: 'Test prompt',
            organizationId: organization.id,
            userId: user.id,
            spaceId: space.id.toString(),
          });
        });

        it('escapes single quotes in YAML frontmatter', async () => {
          const skillVersion: SkillVersion = {
            id: 'skill-version-quotes' as SkillVersionId,
            skillId: skillWithQuotes.id,
            name: skillWithQuotes.name,
            slug: skillWithQuotes.slug,
            description: skillWithQuotes.description,
            prompt: skillWithQuotes.prompt,
            version: skillWithQuotes.version,
            userId: user.id,
          };

          const fileUpdates = await copilotDeployer.deploySkills(
            [skillVersion],
            gitRepo,
            defaultTarget,
          );

          // Single quotes should be escaped as ''
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            "description: 'This skill''s description has ''single quotes'''",
          );
        });
      });

      describe('when skill has multiple files', () => {
        let skillWithFiles: Skill;
        let skillVersionWithFiles: SkillVersion;

        beforeEach(async () => {
          const uploadResult = await testApp.skillsHexa
            .getAdapter()
            .uploadSkill({
              files: [
                {
                  path: 'SKILL.md',
                  content: `---
name: multi-file-skill
description: A skill with multiple files
---

# Multi-file Skill

See reference.md and forms.md for more information.`,
                  permissions: 'rw-r--r--',
                },
                {
                  path: 'reference.md',
                  content:
                    '# Reference\n\nThis is additional reference documentation.',
                  permissions: 'rw-r--r--',
                },
                {
                  path: 'forms.md',
                  content: '# Forms\n\nInstructions for working with forms.',
                  permissions: 'rw-r--r--',
                },
              ],
              organizationId: organization.id,
              userId: user.id,
              spaceId: space.id.toString(),
            });
          skillWithFiles = uploadResult.skill;

          // Get the latest version with files
          const versions = await testApp.skillsHexa
            .getAdapter()
            .listSkillVersions(skillWithFiles.id);
          const latestVersion = versions.sort(
            (a, b) => b.version - a.version,
          )[0];

          // Fetch skill files
          const files = await testApp.skillsHexa
            .getAdapter()
            .getSkillFiles(latestVersion.id);

          skillVersionWithFiles = {
            ...latestVersion,
            files,
          };
        });

        describe('when deploying skill with files', () => {
          let fileUpdates: FileUpdates;
          let paths: string[];
          let referenceFile: { path: string; content: string } | undefined;
          let formsFile: { path: string; content: string } | undefined;

          beforeEach(async () => {
            fileUpdates = await copilotDeployer.deploySkills(
              [skillVersionWithFiles],
              gitRepo,
              defaultTarget,
            );

            paths = fileUpdates.createOrUpdate.map((f) => f.path);
            referenceFile = fileUpdates.createOrUpdate.find((f) =>
              f.path.endsWith('reference.md'),
            );
            formsFile = fileUpdates.createOrUpdate.find((f) =>
              f.path.endsWith('forms.md'),
            );
          });

          it('creates three files', () => {
            expect(fileUpdates.createOrUpdate).toHaveLength(3);
          });

          it('includes SKILL.md file', () => {
            expect(paths).toContain(
              `.github/skills/${skillWithFiles.slug}/SKILL.md`,
            );
          });

          it('includes reference.md file', () => {
            expect(paths).toContain(
              `.github/skills/${skillWithFiles.slug}/reference.md`,
            );
          });

          it('includes forms.md file', () => {
            expect(paths).toContain(
              `.github/skills/${skillWithFiles.slug}/forms.md`,
            );
          });

          it('includes correct content in reference.md', () => {
            expect(referenceFile?.content).toContain(
              'This is additional reference documentation',
            );
          });

          it('includes correct content in forms.md', () => {
            expect(formsFile?.content).toContain(
              'Instructions for working with forms',
            );
          });
        });

        it('places all files in the skill directory', async () => {
          const fileUpdates = await copilotDeployer.deploySkills(
            [skillVersionWithFiles],
            gitRepo,
            defaultTarget,
          );

          fileUpdates.createOrUpdate.forEach((file) => {
            expect(file.path).toMatch(
              new RegExp(`^\\.github/skills/${skillWithFiles.slug}/`),
            );
          });
        });
      });

      describe('when skill has no additional files', () => {
        let fileUpdates: FileUpdates;

        beforeEach(async () => {
          const skillVersionWithoutFiles: SkillVersion = {
            ...skillVersions[0],
            files: undefined,
          };

          fileUpdates = await copilotDeployer.deploySkills(
            [skillVersionWithoutFiles],
            gitRepo,
            defaultTarget,
          );
        });

        it('creates one file', () => {
          expect(fileUpdates.createOrUpdate).toHaveLength(1);
        });

        it('creates SKILL.md file at correct path', () => {
          expect(fileUpdates.createOrUpdate[0].path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });
      });

      describe('when removing skills', () => {
        it('deletes skill directory', async () => {
          const fileUpdates = await copilotDeployer.generateRemovalFileUpdates(
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: skillVersions,
            },
            {
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [],
            },
          );

          expect(fileUpdates.delete).toContainEqual({
            path: `.github/skills/${skill.slug}`,
            type: DeleteItemType.Directory,
          });
        });
      });

      describe('when deploying artifacts with skills', () => {
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
              summary: 'Test recipe',
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
              summary: 'Test standard',
              userId: user.id,
              scope: standard.scope,
            },
          ];

          fileUpdates = await copilotDeployer.deployArtifacts(
            recipeVersions,
            standardVersions,
            skillVersions,
          );
        });

        it('creates recipe, standard, and skill files', () => {
          // 1 recipe + 1 standard + 1 skill = 3 files
          expect(fileUpdates.createOrUpdate).toHaveLength(3);
        });

        it('includes skill file in output', () => {
          const skillFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('.github/skills/'),
          );
          expect(skillFile).toBeDefined();
        });

        it('places skill file at correct path', () => {
          const skillFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('.github/skills/'),
          );
          expect(skillFile?.path).toBe(`.github/skills/${skill.slug}/SKILL.md`);
        });

        it('includes skill prompt in file content', () => {
          const skillFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('.github/skills/'),
          );
          expect(skillFile?.content).toContain(
            'This is the skill prompt content for testing',
          );
        });
      });

      describe('when deploying skills with multiple files', () => {
        it('creates SKILL.md from metadata and all additional files', async () => {
          const skillVersionsWithFiles = [
            {
              ...skillVersions[0],
              files: [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper.ts',
                  content: 'export const helper = () => {}',
                  permissions: '644',
                },
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: skillVersions[0].id,
                  path: 'utils/formatter.ts',
                  content: 'export const format = (s: string) => s',
                  permissions: '644',
                },
              ],
            },
          ];

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );

          expect(fileUpdates.createOrUpdate).toHaveLength(3);
        });

        it('places SKILL.md in correct directory', async () => {
          const skillVersionsWithFiles = [
            {
              ...skillVersions[0],
              files: [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper.ts',
                  content: 'export const helper = () => {}',
                  permissions: '644',
                },
              ],
            },
          ];

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );

          const skillMdFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.endsWith('SKILL.md'),
          );
          expect(skillMdFile?.path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });

        it('places helper file in correct path', async () => {
          const skillVersionsWithFiles = [
            {
              ...skillVersions[0],
              files: [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper.ts',
                  content: 'export const helper = () => {}',
                  permissions: '644',
                },
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: skillVersions[0].id,
                  path: 'utils/formatter.ts',
                  content: 'export const format = (s: string) => s',
                  permissions: '644',
                },
              ],
            },
          ];

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );

          const helperFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('helper.ts'),
          );
          expect(helperFile?.path).toBe(
            `.github/skills/${skill.slug}/helper.ts`,
          );
        });

        it('places formatter file in correct nested path', async () => {
          const skillVersionsWithFiles = [
            {
              ...skillVersions[0],
              files: [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper.ts',
                  content: 'export const helper = () => {}',
                  permissions: '644',
                },
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: skillVersions[0].id,
                  path: 'utils/formatter.ts',
                  content: 'export const format = (s: string) => s',
                  permissions: '644',
                },
              ],
            },
          ];

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );

          const formatterFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('formatter.ts'),
          );
          expect(formatterFile?.path).toBe(
            `.github/skills/${skill.slug}/utils/formatter.ts`,
          );
        });

        it('preserves helper file content', async () => {
          const helperContent = 'export const helper = () => {}';
          const formatterContent = 'export const format = (s: string) => s';

          const skillVersionsWithFiles = [
            {
              ...skillVersions[0],
              files: [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper.ts',
                  content: helperContent,
                  permissions: '644',
                },
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: skillVersions[0].id,
                  path: 'utils/formatter.ts',
                  content: formatterContent,
                  permissions: '644',
                },
              ],
            },
          ];

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );

          const helperFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('helper.ts'),
          );
          expect(helperFile?.content).toBe(helperContent);
        });

        it('preserves formatter file content', async () => {
          const helperContent = 'export const helper = () => {}';
          const formatterContent = 'export const format = (s: string) => s';

          const skillVersionsWithFiles = [
            {
              ...skillVersions[0],
              files: [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper.ts',
                  content: helperContent,
                  permissions: '644',
                },
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: skillVersions[0].id,
                  path: 'utils/formatter.ts',
                  content: formatterContent,
                  permissions: '644',
                },
              ],
            },
          ];

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );

          const formatterFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('formatter.ts'),
          );
          expect(formatterFile?.content).toBe(formatterContent);
        });

        describe('when SKILL.md is in SkillFile table', () => {
          let fileUpdates: FileUpdates;

          beforeEach(async () => {
            const skillVersionsWithFiles = [
              {
                ...skillVersions[0],
                files: [
                  {
                    id: createSkillFileId('file-0'),
                    skillVersionId: skillVersions[0].id,
                    path: 'SKILL.md',
                    content: 'This should be ignored',
                    permissions: '644',
                  },
                  {
                    id: createSkillFileId('file-1'),
                    skillVersionId: skillVersions[0].id,
                    path: 'helper.ts',
                    content: 'export const helper = () => {}',
                    permissions: '644',
                  },
                ],
              },
            ];

            fileUpdates = await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );
          });

          it('creates only two files', () => {
            expect(fileUpdates.createOrUpdate).toHaveLength(2);
          });

          it('creates only one SKILL.md file', () => {
            const skillMdFiles = fileUpdates.createOrUpdate.filter((file) =>
              file.path.endsWith('SKILL.md'),
            );
            expect(skillMdFiles).toHaveLength(1);
          });

          it('ignores SKILL.md content from SkillFile table', () => {
            const skillMdFiles = fileUpdates.createOrUpdate.filter((file) =>
              file.path.endsWith('SKILL.md'),
            );
            expect(skillMdFiles[0].content).not.toContain(
              'This should be ignored',
            );
          });
        });

        describe('when skill has no additional files', () => {
          let fileUpdates: FileUpdates;

          beforeEach(async () => {
            const skillVersionsWithFiles = [
              {
                ...skillVersions[0],
                files: [],
              },
            ];

            fileUpdates = await copilotDeployer.generateFileUpdatesForSkills(
              skillVersionsWithFiles,
            );
          });

          it('creates one file', () => {
            expect(fileUpdates.createOrUpdate).toHaveLength(1);
          });

          it('creates SKILL.md file', () => {
            expect(fileUpdates.createOrUpdate[0].path).toBe(
              `.github/skills/${skill.slug}/SKILL.md`,
            );
          });
        });

        describe('when deploying two skills with one additional file each', () => {
          let skill2: Skill;
          let fileUpdates: FileUpdates;

          beforeEach(async () => {
            skill2 = await testApp.skillsHexa.getAdapter().createSkill({
              name: 'Second Test Skill',
              description: 'Another test skill',
              prompt: 'Second skill prompt',
              organizationId: organization.id,
              userId: user.id,
              spaceId: space.id.toString(),
            });

            const skillVersion2 = {
              id: 'skill-version-2' as SkillVersionId,
              skillId: skill2.id,
              name: skill2.name,
              slug: skill2.slug,
              description: skill2.description,
              prompt: skill2.prompt,
              version: skill2.version,
              userId: user.id,
            };

            const multipleSkillVersionsWithFiles = [
              {
                ...skillVersions[0],
                files: [
                  {
                    id: createSkillFileId('file-1'),
                    skillVersionId: skillVersions[0].id,
                    path: 'helper1.ts',
                    content: 'export const helper1 = () => {}',
                    permissions: '644',
                  },
                ],
              },
              {
                ...skillVersion2,
                files: [
                  {
                    id: createSkillFileId('file-2'),
                    skillVersionId: skillVersion2.id,
                    path: 'helper2.ts',
                    content: 'export const helper2 = () => {}',
                    permissions: '644',
                  },
                ],
              },
            ];

            fileUpdates = await copilotDeployer.generateFileUpdatesForSkills(
              multipleSkillVersionsWithFiles,
            );
          });

          it('creates four files', () => {
            expect(fileUpdates.createOrUpdate).toHaveLength(4);
          });

          it('creates two files for first skill', () => {
            const skill1Files = fileUpdates.createOrUpdate.filter((file) =>
              file.path.includes(skill.slug),
            );
            expect(skill1Files).toHaveLength(2);
          });

          it('creates two files for second skill', () => {
            const skill2Files = fileUpdates.createOrUpdate.filter((file) =>
              file.path.includes(skill2.slug),
            );
            expect(skill2Files).toHaveLength(2);
          });
        });
      });

      describe('when deploying artifacts with multi-file skills', () => {
        describe('when deploying recipe, standard, and skill with additional files', () => {
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
                summary: 'Test recipe',
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
                summary: 'Test standard',
                userId: user.id,
                scope: standard.scope,
              },
            ];

            // Attach files to skill version
            const skillVersionsWithFiles = [
              {
                ...skillVersions[0],
                files: [
                  {
                    id: createSkillFileId('file-1'),
                    skillVersionId: skillVersions[0].id,
                    path: 'helper.ts',
                    content: 'export const helper = () => {}',
                    permissions: '644',
                  },
                  {
                    id: createSkillFileId('file-2'),
                    skillVersionId: skillVersions[0].id,
                    path: 'README.md',
                    content: '# Helper Documentation',
                    permissions: '644',
                  },
                ],
              },
            ];

            fileUpdates = await copilotDeployer.deployArtifacts(
              recipeVersions,
              standardVersions,
              skillVersionsWithFiles,
            );
          });

          it('creates five files', () => {
            expect(fileUpdates.createOrUpdate).toHaveLength(5);
          });

          it('includes SKILL.md file', () => {
            const skillMdFile = fileUpdates.createOrUpdate.find((file) =>
              file.path.endsWith('SKILL.md'),
            );
            expect(skillMdFile).toBeDefined();
          });

          it('includes helper.ts file', () => {
            const helperFile = fileUpdates.createOrUpdate.find((file) =>
              file.path.includes('helper.ts'),
            );
            expect(helperFile).toBeDefined();
          });

          it('includes README.md file', () => {
            const readmeFile = fileUpdates.createOrUpdate.find((file) =>
              file.path.includes('README.md'),
            );
            expect(readmeFile).toBeDefined();
          });
        });
      });
    });
  });
});
