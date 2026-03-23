import { GitlabDuoDeployer } from './GitlabDuoDeployer';
import {
  createUserId,
  DeleteItemType,
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  StandardVersion,
  createStandardVersionId,
  RecipeVersion,
  createRecipeVersionId,
  Target,
  createTargetId,
  SkillFile,
  SkillVersionId,
  createSkillFileId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { recipeFactory } from '@packmind/recipes/test';
import { standardFactory } from '@packmind/standards/test';
import { skillVersionFactory } from '@packmind/skills/test';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

describe('GitlabDuoDeployer', () => {
  let deployer: GitlabDuoDeployer;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    // Create deployer without StandardsHexa or GitHexa for basic tests
    deployer = new GitlabDuoDeployer();

    mockTarget = {
      id: createTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createGitRepoId(uuidv4()),
    };

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  describe('deployRecipes', () => {
    describe('with single recipe', () => {
      let result: Awaited<ReturnType<typeof deployer.deployRecipes>>;

      beforeEach(async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets the gitlab duo chat rules file', () => {
        expect(result.createOrUpdate[0].path).toBe('.gitlab/duo/chat-rules.md');
      });

      it('clears recipes section for single-file deployers', () => {
        expect(result.createOrUpdate[0].sections).toEqual([
          { key: 'Packmind recipes', content: '' },
        ]);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when recipe list is empty', () => {
      let result: Awaited<ReturnType<typeof deployer.deployRecipes>>;

      beforeEach(async () => {
        result = await deployer.deployRecipes([], mockGitRepo, mockTarget);
      });

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets the gitlab duo chat rules file', () => {
        expect(result.createOrUpdate[0].path).toBe('.gitlab/duo/chat-rules.md');
      });

      it('clears recipes section', () => {
        expect(result.createOrUpdate[0].sections).toEqual([
          { key: 'Packmind recipes', content: '' },
        ]);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deployStandards', () => {
    describe('with single standard', () => {
      let result: Awaited<ReturnType<typeof deployer.deployStandards>>;
      let standardVersion: StandardVersion;

      beforeEach(async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: 'backend',
        });

        standardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'This is the standard description',
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: 'backend',
        };

        result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });

      it('targets the gitlab duo chat rules file', () => {
        expect(result.createOrUpdate[0].path).toBe('.gitlab/duo/chat-rules.md');
      });

      it('includes standards header', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('includes standards introduction', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });

      it('includes standard name', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(standardVersion.name);
      });
    });

    describe('when standards list is empty', () => {
      let result: Awaited<ReturnType<typeof deployer.deployStandards>>;

      beforeEach(async () => {
        result = await deployer.deployStandards([], mockGitRepo, mockTarget);
      });

      it('creates no files to update', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when using StandardsHexa dependency', () => {
      let result: Awaited<ReturnType<typeof deployer.deployStandards>>;

      beforeEach(async () => {
        const mockStandardsHexa = {
          getRulesByStandardId: jest.fn().mockResolvedValue([
            {
              id: 'rule-1',
              content: 'Fetched rule 1',
              standardVersionId: 'standard-version-1',
            },
            {
              id: 'rule-2',
              content: 'Fetched rule 2',
              standardVersionId: 'standard-version-1',
            },
          ]),
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        const deployerWithHexa = new GitlabDuoDeployer(mockStandardsHexa);

        const standard = standardFactory({
          name: 'Standard Test',
          slug: 'standard-test',
          scope: 'backend',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'Standard description',
          version: 1,
          summary: 'Test summary',
          userId: createUserId('user-1'),
          scope: 'backend',
        };

        result = await deployerWithHexa.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates the guidelines file', () => {
        expect(result.createOrUpdate[0]).toBeDefined();
      });

      it('targets the gitlab duo chat rules file', () => {
        expect(result.createOrUpdate[0].path).toBe('.gitlab/duo/chat-rules.md');
      });

      it('includes standards header', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('includes standards introduction', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });
    });

    describe('with multiple standards', () => {
      let result: Awaited<ReturnType<typeof deployer.deployStandards>>;

      beforeEach(async () => {
        const standard1 = standardFactory({
          name: 'Standard One',
          slug: 'standard-one',
          scope: 'backend',
        });

        const standard2 = standardFactory({
          name: 'Standard Two',
          slug: 'standard-two',
          scope: 'frontend',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: standard1.id,
            name: standard1.name,
            slug: standard1.slug,
            description: 'Standard one description',
            version: 1,
            summary: 'Standard one summary',
            userId: createUserId('user-1'),
            scope: 'backend',
          },
          {
            id: createStandardVersionId('standard-version-2'),
            standardId: standard2.id,
            name: standard2.name,
            slug: standard2.slug,
            description: 'Standard two description',
            version: 1,
            summary: 'Standard two summary',
            userId: createUserId('user-1'),
            scope: 'frontend',
          },
        ];

        result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );
      });

      it('includes standards header', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('includes standards introduction', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });
    });
  });

  describe('getSkillsFolderPath', () => {
    it('returns the gitlab duo skills directory', () => {
      expect(deployer.getSkillsFolderPath()).toBe('.gitlab/duo/skills/');
    });
  });

  describe('deploySkills', () => {
    describe('with a single skill', () => {
      let result: Awaited<ReturnType<typeof deployer.deploySkills>>;
      let skillVersion: ReturnType<typeof skillVersionFactory>;

      beforeEach(async () => {
        skillVersion = skillVersionFactory({
          name: 'My Skill',
          slug: 'my-skill',
          description: 'A test skill',
          prompt: 'Skill prompt content',
        });

        result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates a SKILL.md file', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('places skill at the correct path', () => {
        expect(result.createOrUpdate[0].path).toBe(
          '.gitlab/duo/skills/my-skill/SKILL.md',
        );
      });

      it('includes YAML frontmatter with name', () => {
        expect(result.createOrUpdate[0].content).toContain("name: 'My Skill'");
      });

      it('includes YAML frontmatter with description', () => {
        expect(result.createOrUpdate[0].content).toContain(
          "description: 'A test skill'",
        );
      });

      it('includes skill prompt content', () => {
        expect(result.createOrUpdate[0].content).toContain(
          'Skill prompt content',
        );
      });

      it('has no files to delete', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when metadata contains non-string values', () => {
      it('coerces values to strings without crashing', async () => {
        const skillVersion = skillVersionFactory({
          metadata: {
            category: 'test',
            disableModelInvocation: true,
          } as unknown as Record<string, string>,
        });

        const result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate[0].content).toContain(
          "disableModelInvocation: 'true'",
        );
      });
    });

    describe('when skill has empty metadata', () => {
      let result: Awaited<ReturnType<typeof deployer.deploySkills>>;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          slug: 'no-metadata-skill',
          metadata: {},
        });

        result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('does not include metadata field in frontmatter', () => {
        expect(result.createOrUpdate[0].content).not.toContain('metadata:');
      });
    });

    describe('allowed-tools frontmatter key', () => {
      let result: Awaited<ReturnType<typeof deployer.deploySkills>>;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          allowedTools: 'Read,Write,Bash',
        });

        result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('renders in kebab-case', () => {
        expect(result.createOrUpdate[0].content).toContain('allowed-tools:');
      });

      it('does not render in camelCase', () => {
        expect(result.createOrUpdate[0].content).not.toContain('allowedTools:');
      });
    });

    describe('when skillVersion.files are present', () => {
      let result: Awaited<ReturnType<typeof deployer.deploySkills>>;
      let skillVersion: ReturnType<typeof skillVersionFactory>;

      beforeEach(async () => {
        const files: SkillFile[] = [
          {
            id: createSkillFileId('file-1'),
            skillVersionId: '' as SkillVersionId,
            path: 'helper.py',
            content: 'print("hello")',
            permissions: 'rw',
            isBase64: false,
          },
          {
            id: createSkillFileId('file-2'),
            skillVersionId: '' as SkillVersionId,
            path: 'SKILL.MD',
            content: 'should be skipped',
            permissions: 'r',
            isBase64: false,
          },
        ];

        skillVersion = skillVersionFactory({
          slug: 'files-skill',
          files,
        });

        result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('deploys SKILL.md and additional files', () => {
        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('places additional file at correct path', () => {
        const helperFile = result.createOrUpdate.find((f) =>
          f.path.includes('helper.py'),
        );
        expect(helperFile?.path).toBe(
          '.gitlab/duo/skills/files-skill/helper.py',
        );
      });

      it('includes isBase64 on additional files', () => {
        const helperFile = result.createOrUpdate.find((f) =>
          f.path.includes('helper.py'),
        );
        expect(helperFile?.isBase64).toBe(false);
      });

      it('includes skillFileId on additional files', () => {
        const helperFile = result.createOrUpdate.find((f) =>
          f.path.includes('helper.py'),
        );
        expect(helperFile?.skillFileId).toBe('file-1');
      });

      it('includes skillFilePermissions on additional files', () => {
        const helperFile = result.createOrUpdate.find((f) =>
          f.path.includes('helper.py'),
        );
        expect(helperFile?.skillFilePermissions).toBe('rw');
      });

      it('skips SKILL.MD from files', () => {
        const skillMdDuplicate = result.createOrUpdate.filter((f) =>
          f.path.toUpperCase().endsWith('SKILL.MD'),
        );
        expect(skillMdDuplicate).toHaveLength(1);
      });
    });

    describe('when skillVersion.files is absent and skillFilesMap is provided', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForSkills>
      >;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          slug: 'fallback-skill',
        });

        const skillFilesMap = new Map<SkillVersionId, SkillFile[]>();
        skillFilesMap.set(skillVersion.id, [
          {
            id: createSkillFileId('map-file-1'),
            skillVersionId: skillVersion.id,
            path: 'config.json',
            content: '{}',
            permissions: 'r',
            isBase64: false,
          },
        ]);

        result = await deployer.generateFileUpdatesForSkills(
          [skillVersion],
          skillFilesMap,
        );
      });

      it('deploys SKILL.md and the fallback file', () => {
        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('includes the file from skillFilesMap', () => {
        const configFile = result.createOrUpdate.find((f) =>
          f.path.includes('config.json'),
        );
        expect(configFile).toBeDefined();
      });
    });

    describe('when target has a non-root path', () => {
      let result: Awaited<ReturnType<typeof deployer.deploySkills>>;

      beforeEach(async () => {
        const targetWithPath: Target = {
          ...mockTarget,
          path: '/packages/app/',
        };

        const skillVersion = skillVersionFactory({ slug: 'prefixed-skill' });

        result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          targetWithPath,
        );
      });

      it('prefixes the skill path with the target path', () => {
        expect(result.createOrUpdate[0].path).toBe(
          'packages/app/.gitlab/duo/skills/prefixed-skill/SKILL.md',
        );
      });
    });
  });

  describe('deployArtifacts', () => {
    describe('with standards and skills', () => {
      let result: Awaited<ReturnType<typeof deployer.deployArtifacts>>;

      beforeEach(async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: 'backend',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('sv-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'desc',
          version: 1,
          summary: 'summary',
          userId: createUserId('user-1'),
          scope: 'backend',
        };

        const skillVersion = skillVersionFactory({
          name: 'Deploy Skill',
          slug: 'deploy-skill',
        });

        result = await deployer.deployArtifacts(
          [],
          [standardVersion],
          [skillVersion],
        );
      });

      it('includes single-file standard update', () => {
        const standardUpdate = result.createOrUpdate.find(
          (f) => f.path === '.gitlab/duo/chat-rules.md',
        );
        expect(standardUpdate).toBeDefined();
      });

      it('includes multi-file skill update', () => {
        const skillUpdate = result.createOrUpdate.find((f) =>
          f.path.includes('.gitlab/duo/skills/deploy-skill/SKILL.md'),
        );
        expect(skillUpdate).toBeDefined();
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when skills are removed', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateRemovalFileUpdates>
      >;

      beforeEach(async () => {
        const removedSkill = skillVersionFactory({ slug: 'removed-skill' });

        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [removedSkill],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('deletes the skill directory', () => {
        const skillDeletion = result.delete.find(
          (d) => d.path === '.gitlab/duo/skills/removed-skill',
        );
        expect(skillDeletion).toBeDefined();
      });

      it('marks skill deletion as directory type', () => {
        const skillDeletion = result.delete.find(
          (d) => d.path === '.gitlab/duo/skills/removed-skill',
        );
        expect(skillDeletion?.type).toBe(DeleteItemType.Directory);
      });
    });
  });

  describe('generateAgentCleanupFileUpdates', () => {
    describe('when cleaning up all artifacts', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({ slug: 'package-skill' });

        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [skillVersion],
        });
      });

      it('deletes default skill directories', () => {
        const defaultSlugs = DefaultSkillsDeployer.getDefaultSkillSlugs();
        for (const slug of defaultSlugs) {
          const deletion = result.delete.find(
            (d) => d.path === `.gitlab/duo/skills/${slug}`,
          );
          expect(deletion).toBeDefined();
        }
      });

      it('deletes package skill directories', () => {
        const deletion = result.delete.find(
          (d) => d.path === '.gitlab/duo/skills/package-skill',
        );
        expect(deletion).toBeDefined();
      });

      it('marks all skill deletions as directory type', () => {
        const skillDeletions = result.delete.filter((d) =>
          d.path.startsWith('.gitlab/duo/skills/'),
        );
        for (const deletion of skillDeletions) {
          expect(deletion.type).toBe(DeleteItemType.Directory);
        }
      });
    });
  });
});
