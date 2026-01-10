import { accountsSchemas } from '@packmind/accounts';
import { CopilotDeployer, DeployerService } from '@packmind/coding-agent';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { recipesSchemas } from '@packmind/recipes';
import { skillsSchemas } from '@packmind/skills';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
import {
  GitProviderVendors,
  GitRepo,
  IGitPort,
  IStandardsPort,
  Organization,
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  Skill,
  SkillFile,
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
import { DataSource } from 'typeorm';
import { TestApp } from '../helpers/TestApp';

describe('GitHub Copilot Deployment Integration', () => {
  let testApp: TestApp;
  let dataSource: DataSource;
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

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...recipesSchemas,
      ...standardsSchemas,
      ...skillsSchemas,
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
    await dataSource.destroy();
  });

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
        });
      });
    });

    it('creates multiple .github/instructions/packmind-*.instructions.md files for standards', async () => {
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

      const fileUpdates = await deployerService.aggregateStandardsDeployments(
        standardVersions,
        gitRepo,
        [defaultTarget],
        ['copilot'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);
      expect(fileUpdates.delete).toHaveLength(0);

      const copilotStandardFile = fileUpdates.createOrUpdate.find(
        (file) =>
          file.path ===
          `.github/instructions/packmind-${standard.slug}.instructions.md`,
      );

      expect(copilotStandardFile).toBeDefined();
      if (copilotStandardFile) {
        // Check Copilot configuration format
        expect(copilotStandardFile.content).toContain('---');
        expect(copilotStandardFile.content).toContain(
          "applyTo: '**/*.{js,ts}'",
        );
        expect(copilotStandardFile.content).toContain('---');
        expect(copilotStandardFile.content).toContain(
          'Test standard for GitHub Copilot deployment :',
        );
        expect(copilotStandardFile.content).toContain(
          '* Use meaningful variable names in JavaScript',
        );
        expect(copilotStandardFile.content).toContain(
          '* Write comprehensive tests for all functions',
        );
        expect(copilotStandardFile.content).toContain(
          `Full standard is available here for further request: [${standard.name}](../../.packmind/standards/${standard.slug}.md)`,
        );
      }
    });

    it('handles standard without scope (uses ** as default)', async () => {
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
        ['copilot'],
      );

      expect(fileUpdates.createOrUpdate).toHaveLength(1);

      const copilotStandardFile = fileUpdates.createOrUpdate[0];
      expect(copilotStandardFile.path).toBe(
        `.github/instructions/packmind-${globalStandard.slug}.instructions.md`,
      );

      // Should use ** when no scope
      expect(copilotStandardFile.content).toContain("applyTo: '**'");
      expect(copilotStandardFile.content).toContain(
        'Global standard for all files :',
      );
      expect(copilotStandardFile.content).toContain(
        '* Always use consistent formatting',
      );
      expect(copilotStandardFile.content).toContain(
        `Full standard is available here for further request: [${globalStandard.name}](../../.packmind/standards/${globalStandard.slug}.md)`,
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
        ['copilot'],
      );

      // Deploy standards
      const standardsUpdates =
        await deployerService.aggregateStandardsDeployments(
          standardVersions,
          gitRepo,
          [defaultTarget],
          ['copilot'],
        );

      expect(recipeUpdates.createOrUpdate).toHaveLength(1);
      expect(standardsUpdates.createOrUpdate).toHaveLength(1);

      // Recipes should create individual .github/prompts/*.prompt.md files
      expect(recipeUpdates.createOrUpdate[0].path).toBe(
        `.github/prompts/${recipe.slug}.prompt.md`,
      );

      // Standards should create .github/instructions/packmind-*.instructions.md
      expect(standardsUpdates.createOrUpdate[0].path).toBe(
        `.github/instructions/packmind-${standard.slug}.instructions.md`,
      );
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
        });
      });
    });

    it('handles empty standards list gracefully', async () => {
      const fileUpdates = await copilotDeployer.deployStandards(
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

      const fileUpdates = await copilotDeployer.deployRecipes(
        recipeVersions,
        gitRepo,
        defaultTarget,
      );

      // Should still work despite the error, creating individual prompt files
      expect(fileUpdates.createOrUpdate).toHaveLength(1);

      // Verify legacy file deletion
      expect(fileUpdates.delete).toContainEqual({
        path: '.github/instructions/packmind-recipes-index.instructions.md',
      });

      const copilotFile = fileUpdates.createOrUpdate[0];
      // Check YAML frontmatter
      expect(copilotFile.content).toContain("description: 'Test recipe'");
      expect(copilotFile.content).toContain("agent: 'agent'");
      // Check recipe content is included
      expect(copilotFile.content).toContain(
        'This is test recipe content for GitHub Copilot deployment',
      );
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
          scope: '', // No scope - uses **
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

      const fileUpdates = await copilotDeployer.deployStandards(
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
        expect(frontendFile.content).toContain(
          "applyTo: '**/*.{ts,tsx,js,jsx}'",
        );
        expect(frontendFile.content).toContain('Frontend standard :');
        expect(frontendFile.content).toContain('* Use TypeScript');
        expect(frontendFile.content).toContain(
          `Full standard is available here for further request: [${standard1.name}](../../.packmind/standards/${standard1.slug}.md)`,
        );
      }

      // Check second standard (no scope - uses **)
      const backendFile = fileUpdates.createOrUpdate.find((file) =>
        file.path.includes(standard2.slug),
      );
      expect(backendFile).toBeDefined();
      if (backendFile) {
        expect(backendFile.content).toContain("applyTo: '**'");
        expect(backendFile.content).toContain('Backend standard :');
        expect(backendFile.content).toContain('* Use dependency injection');
        expect(backendFile.content).toContain(
          `Full standard is available here for further request: [${standard2.name}](../../.packmind/standards/${standard2.slug}.md)`,
        );
      }
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

        it('creates one SKILL.md file in a folder', () => {
          expect(fileUpdates.createOrUpdate).toHaveLength(1);
          expect(fileUpdates.createOrUpdate[0].path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });

        it('includes name in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            `name: ${skill.name}`,
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

        it('includes metadata in frontmatter', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain('metadata:');
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            "category: 'testing'",
          );
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            "version: '1.0'",
          );
        });

        it('includes prompt content in body', () => {
          expect(fileUpdates.createOrUpdate[0].content).toContain(
            'This is the skill prompt content for testing',
          );
        });

        it('has proper YAML frontmatter structure', () => {
          const content = fileUpdates.createOrUpdate[0].content;
          expect(content).toMatch(/^---\n/);
          expect(content).toMatch(/\n---\n/);
        });
      });

      describe('when calling generateFileUpdatesForSkills', () => {
        let fileUpdates: FileUpdates;

        beforeEach(async () => {
          fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(skillVersions);
        });

        it('creates one SKILL.md file', () => {
          expect(fileUpdates.createOrUpdate).toHaveLength(1);
          expect(fileUpdates.createOrUpdate[0].path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });

        it('includes all frontmatter fields', () => {
          const content = fileUpdates.createOrUpdate[0].content;
          expect(content).toContain(`name: ${skill.name}`);
          expect(content).toContain(`description: '${skill.description}'`);
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

        it('creates multiple SKILL.md files in separate folders', async () => {
          const fileUpdates = await copilotDeployer.deploySkills(
            multipleSkillVersions,
            gitRepo,
            defaultTarget,
          );

          expect(fileUpdates.createOrUpdate).toHaveLength(2);
          expect(fileUpdates.createOrUpdate[0].path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
          expect(fileUpdates.createOrUpdate[1].path).toBe(
            `.github/skills/${skill2.slug}/SKILL.md`,
          );
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
          skillWithFiles = await testApp.skillsHexa.getAdapter().uploadSkill({
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

        it('creates SKILL.md and all additional files', async () => {
          const fileUpdates = await copilotDeployer.deploySkills(
            [skillVersionWithFiles],
            gitRepo,
            defaultTarget,
          );

          expect(fileUpdates.createOrUpdate).toHaveLength(3);

          const paths = fileUpdates.createOrUpdate.map((f) => f.path);
          expect(paths).toContain(
            `.github/skills/${skillWithFiles.slug}/SKILL.md`,
          );
          expect(paths).toContain(
            `.github/skills/${skillWithFiles.slug}/reference.md`,
          );
          expect(paths).toContain(
            `.github/skills/${skillWithFiles.slug}/forms.md`,
          );
        });

        it('includes correct content for each file', async () => {
          const fileUpdates = await copilotDeployer.deploySkills(
            [skillVersionWithFiles],
            gitRepo,
            defaultTarget,
          );

          const referenceFile = fileUpdates.createOrUpdate.find((f) =>
            f.path.endsWith('reference.md'),
          );
          expect(referenceFile?.content).toContain(
            'This is additional reference documentation',
          );

          const formsFile = fileUpdates.createOrUpdate.find((f) =>
            f.path.endsWith('forms.md'),
          );
          expect(formsFile?.content).toContain(
            'Instructions for working with forms',
          );
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
        it('creates only SKILL.md', async () => {
          const skillVersionWithoutFiles: SkillVersion = {
            ...skillVersions[0],
            files: undefined,
          };

          const fileUpdates = await copilotDeployer.deploySkills(
            [skillVersionWithoutFiles],
            gitRepo,
            defaultTarget,
          );

          expect(fileUpdates.createOrUpdate).toHaveLength(1);
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

        it('creates skill file in correct location', () => {
          const skillFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('.github/skills/'),
          );
          expect(skillFile).toBeDefined();
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
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          expect(fileUpdates.createOrUpdate).toHaveLength(3);
        });

        it('places SKILL.md in correct directory', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper.ts',
                  content: 'export const helper = () => {}',
                  permissions: '644',
                },
              ],
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          const skillMdFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.endsWith('SKILL.md'),
          );
          expect(skillMdFile?.path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });

        it('places helper file in correct path', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          const helperFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('helper.ts'),
          );
          expect(helperFile?.path).toBe(
            `.github/skills/${skill.slug}/helper.ts`,
          );
        });

        it('places formatter file in correct nested path', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          const helperFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('helper.ts'),
          );
          expect(helperFile?.content).toBe(helperContent);
        });

        it('preserves formatter file content', async () => {
          const helperContent = 'export const helper = () => {}';
          const formatterContent = 'export const format = (s: string) => s';

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          const formatterFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('formatter.ts'),
          );
          expect(formatterFile?.content).toBe(formatterContent);
        });

        it('creates only two files when SKILL.md is in SkillFile table', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          expect(fileUpdates.createOrUpdate).toHaveLength(2);
        });

        it('creates only one SKILL.md file when duplicate exists in SkillFile table', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          const skillMdFiles = fileUpdates.createOrUpdate.filter((file) =>
            file.path.endsWith('SKILL.md'),
          );
          expect(skillMdFiles).toHaveLength(1);
        });

        it('ignores SKILL.md content from SkillFile table', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          const skillMdFiles = fileUpdates.createOrUpdate.filter((file) =>
            file.path.endsWith('SKILL.md'),
          );
          expect(skillMdFiles[0].content).not.toContain(
            'This should be ignored',
          );
        });

        it('creates one file when skill has no additional files', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [skillVersions[0].id, []],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          expect(fileUpdates.createOrUpdate).toHaveLength(1);
        });

        it('creates SKILL.md file when skill has no additional files', async () => {
          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [skillVersions[0].id, []],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              skillVersions,
              skillFilesMap,
            );

          expect(fileUpdates.createOrUpdate[0].path).toBe(
            `.github/skills/${skill.slug}/SKILL.md`,
          );
        });

        it('creates four files when deploying two skills with one additional file each', async () => {
          const skill2 = await testApp.skillsHexa.getAdapter().createSkill({
            name: 'Second Test Skill',
            description: 'Another test skill',
            prompt: 'Second skill prompt',
            organizationId: organization.id,
            userId: user.id,
            spaceId: space.id.toString(),
          });

          const multipleSkillVersions: SkillVersion[] = [
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper1.ts',
                  content: 'export const helper1 = () => {}',
                  permissions: '644',
                },
              ],
            ],
            [
              multipleSkillVersions[1].id,
              [
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: multipleSkillVersions[1].id,
                  path: 'helper2.ts',
                  content: 'export const helper2 = () => {}',
                  permissions: '644',
                },
              ],
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              multipleSkillVersions,
              skillFilesMap,
            );

          expect(fileUpdates.createOrUpdate).toHaveLength(4);
        });

        it('creates two files for first skill when deploying multiple skills', async () => {
          const skill2 = await testApp.skillsHexa.getAdapter().createSkill({
            name: 'Second Test Skill',
            description: 'Another test skill',
            prompt: 'Second skill prompt',
            organizationId: organization.id,
            userId: user.id,
            spaceId: space.id.toString(),
          });

          const multipleSkillVersions: SkillVersion[] = [
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper1.ts',
                  content: 'export const helper1 = () => {}',
                  permissions: '644',
                },
              ],
            ],
            [
              multipleSkillVersions[1].id,
              [
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: multipleSkillVersions[1].id,
                  path: 'helper2.ts',
                  content: 'export const helper2 = () => {}',
                  permissions: '644',
                },
              ],
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              multipleSkillVersions,
              skillFilesMap,
            );

          const skill1Files = fileUpdates.createOrUpdate.filter((file) =>
            file.path.includes(skill.slug),
          );
          expect(skill1Files).toHaveLength(2);
        });

        it('creates two files for second skill when deploying multiple skills', async () => {
          const skill2 = await testApp.skillsHexa.getAdapter().createSkill({
            name: 'Second Test Skill',
            description: 'Another test skill',
            prompt: 'Second skill prompt',
            organizationId: organization.id,
            userId: user.id,
            spaceId: space.id.toString(),
          });

          const multipleSkillVersions: SkillVersion[] = [
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
                {
                  id: createSkillFileId('file-1'),
                  skillVersionId: skillVersions[0].id,
                  path: 'helper1.ts',
                  content: 'export const helper1 = () => {}',
                  permissions: '644',
                },
              ],
            ],
            [
              multipleSkillVersions[1].id,
              [
                {
                  id: createSkillFileId('file-2'),
                  skillVersionId: multipleSkillVersions[1].id,
                  path: 'helper2.ts',
                  content: 'export const helper2 = () => {}',
                  permissions: '644',
                },
              ],
            ],
          ]);

          const fileUpdates =
            await copilotDeployer.generateFileUpdatesForSkills(
              multipleSkillVersions,
              skillFilesMap,
            );

          const skill2Files = fileUpdates.createOrUpdate.filter((file) =>
            file.path.includes(skill2.slug),
          );
          expect(skill2Files).toHaveLength(2);
        });
      });

      describe('when deploying artifacts with multi-file skills', () => {
        it('creates five files when deploying recipe, standard, and skill with additional files', async () => {
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates = await copilotDeployer.deployArtifacts(
            recipeVersions,
            standardVersions,
            skillVersions,
            skillFilesMap,
          );

          expect(fileUpdates.createOrUpdate).toHaveLength(5);
        });

        it('includes SKILL.md file when deploying with recipes and standards', async () => {
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates = await copilotDeployer.deployArtifacts(
            recipeVersions,
            standardVersions,
            skillVersions,
            skillFilesMap,
          );

          const skillMdFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.endsWith('SKILL.md'),
          );
          expect(skillMdFile).toBeDefined();
        });

        it('includes helper.ts file when deploying with recipes and standards', async () => {
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates = await copilotDeployer.deployArtifacts(
            recipeVersions,
            standardVersions,
            skillVersions,
            skillFilesMap,
          );

          const helperFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('helper.ts'),
          );
          expect(helperFile).toBeDefined();
        });

        it('includes README.md file when deploying with recipes and standards', async () => {
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

          const skillFilesMap = new Map<SkillVersionId, SkillFile[]>([
            [
              skillVersions[0].id,
              [
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
            ],
          ]);

          const fileUpdates = await copilotDeployer.deployArtifacts(
            recipeVersions,
            standardVersions,
            skillVersions,
            skillFilesMap,
          );

          const readmeFile = fileUpdates.createOrUpdate.find((file) =>
            file.path.includes('README.md'),
          );
          expect(readmeFile).toBeDefined();
        });
      });
    });
  });
});
