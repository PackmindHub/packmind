import { KiroDeployer } from './KiroDeployer';
import {
  CommandVersion,
  DeleteItemType,
  FileModification,
  GitRepo,
  IStandardsPort,
  Rule,
  SkillVersion,
  StandardVersion,
  Target,
  createCommandVersionId,
  createGitProviderId,
  createGitRepoId,
  createStandardVersionId,
  createTargetId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { commandFactory } from '@packmind/commands/test';
import { standardFactory } from '@packmind/standards/test';
import { skillVersionFactory } from '@packmind/skills/test';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

const STEERING_DIR = '.kiro/steering/';
const SKILLS_DIR = '.kiro/skills/';

describe('KiroDeployer', () => {
  let deployer: KiroDeployer;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  const buildStandardVersion = (
    overrides: Partial<StandardVersion> = {},
  ): StandardVersion => {
    const standard = standardFactory({
      name: 'Test Standard',
      slug: 'test-standard',
      scope: '**/*.{ts,tsx}',
    });

    return {
      id: createStandardVersionId('standard-version-1'),
      standardId: standard.id,
      name: standard.name,
      slug: standard.slug,
      description: standard.description,
      version: 1,
      userId: createUserId('user-1'),
      scope: standard.scope,
      rules: [
        { content: 'Use TypeScript' },
        { content: 'Write tests' },
      ] as Rule[],
      ...overrides,
    };
  };

  beforeEach(() => {
    mockStandardsPort = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    deployer = new KiroDeployer(mockStandardsPort);

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSkillsFolderPath', () => {
    it('returns the Kiro skills folder path', () => {
      expect(deployer.getSkillsFolderPath()).toBe(SKILLS_DIR);
    });
  });

  describe('deployStandards', () => {
    describe('when the standard has a scope', () => {
      let content: string;
      let path: string;

      beforeEach(async () => {
        const result = await deployer.deployStandards(
          [buildStandardVersion()],
          mockGitRepo,
          mockTarget,
        );
        path = result.createOrUpdate[0].path;
        content = result.createOrUpdate[0].content;
      });

      it('creates one steering file', () => {
        expect(path).toBe(`${STEERING_DIR}packmind-standard-test-standard.md`);
      });

      it('includes the standard on file match', () => {
        expect(content).toContain('inclusion: fileMatch');
      });

      it('emits the scope as a YAML flow list', () => {
        expect(content).toContain("fileMatchPattern: ['**/*.{ts,tsx}']");
      });

      it('links back to the Packmind standard', () => {
        expect(content).toContain(
          '(../../.packmind/standards/test-standard.md)',
        );
      });

      it('lists the standard rules', () => {
        expect(content).toContain('* Use TypeScript');
      });
    });

    describe('when the scope holds several globs', () => {
      it('lists every glob without splitting brace groups', async () => {
        const result = await deployer.deployStandards(
          [buildStandardVersion({ scope: '**/*.{ts,tsx}, packages/**/*.md' })],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate[0].content).toContain(
          "fileMatchPattern: ['**/*.{ts,tsx}', 'packages/**/*.md']",
        );
      });
    });

    describe('when the standard has no scope', () => {
      let content: string;

      beforeEach(async () => {
        const result = await deployer.deployStandards(
          [buildStandardVersion({ scope: '' })],
          mockGitRepo,
          mockTarget,
        );
        content = result.createOrUpdate[0].content;
      });

      it('includes the standard always', () => {
        expect(content).toContain('inclusion: always');
      });

      it('omits the file match pattern', () => {
        expect(content).not.toContain('fileMatchPattern');
      });
    });

    describe('when there is no standard to deploy', () => {
      it('creates no file', async () => {
        const result = await deployer.deployStandards(
          [],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate).toEqual([]);
      });
    });

    describe('when the standard version carries no rules', () => {
      it('reads the rules from the standards port', async () => {
        mockStandardsPort.getRulesByStandardId.mockResolvedValue([
          { content: 'Rule from the port' },
        ] as Rule[]);

        const result = await deployer.deployStandards(
          [buildStandardVersion({ rules: undefined })],
          mockGitRepo,
          mockTarget,
        );

        expect(result.createOrUpdate[0].content).toContain(
          '* Rule from the port',
        );
      });
    });
  });

  describe('deploySkills', () => {
    describe('when deploying a skill', () => {
      let skillFile: FileModification;

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          name: 'My skill',
          slug: 'my-skill',
          description: 'Does the thing',
        });

        const result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );

        skillFile = result.createOrUpdate[0];
      });

      it('writes the skill under its own directory', () => {
        expect(skillFile.path).toBe(`${SKILLS_DIR}my-skill/SKILL.md`);
      });

      it('emits the name without quotes', () => {
        expect(skillFile.content).toContain('name: My skill');
      });

      it('emits the description without quotes', () => {
        expect(skillFile.content).toContain('description: Does the thing');
      });
    });

    describe('when the skill carries extra files', () => {
      let paths: string[];

      beforeEach(async () => {
        const skillVersion = skillVersionFactory({
          slug: 'my-skill',
          files: [
            { path: 'SKILL.md', content: 'ignored' },
            { path: 'reference.md', content: 'details' },
          ],
        } as Partial<SkillVersion>);

        const result = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );
        paths = result.createOrUpdate.map((file) => file.path);
      });

      it('writes the extra file alongside SKILL.md', () => {
        expect(paths).toContain(`${SKILLS_DIR}my-skill/reference.md`);
      });

      it('writes SKILL.md exactly once', () => {
        expect(
          paths.filter((path) => path === `${SKILLS_DIR}my-skill/SKILL.md`),
        ).toHaveLength(1);
      });
    });
  });

  describe('deployCommands', () => {
    it('writes no file, since Kiro has no command directory', async () => {
      const command = commandFactory({ slug: 'my-command' });
      const commandVersion: CommandVersion = {
        id: createCommandVersionId('command-version-1'),
        recipeId: command.id,
        name: command.name,
        slug: command.slug,
        content: command.content,
        version: 1,
        userId: createUserId('user-1'),
      };

      const result = await deployer.deployCommands(
        [commandVersion],
        mockGitRepo,
        mockTarget,
      );

      expect(result.createOrUpdate).toEqual([]);
    });
  });

  describe('generateRemovalFileUpdates', () => {
    let deletePaths: { path: string; type: DeleteItemType }[];

    beforeEach(async () => {
      const result = await deployer.generateRemovalFileUpdates(
        {
          recipeVersions: [],
          standardVersions: [buildStandardVersion()],
          skillVersions: [skillVersionFactory({ slug: 'my-skill' })],
        },
        { recipeVersions: [], standardVersions: [], skillVersions: [] },
      );
      deletePaths = result.delete;
    });

    it('deletes the steering file of the removed standard', () => {
      expect(deletePaths).toContainEqual({
        path: `${STEERING_DIR}packmind-standard-test-standard.md`,
        type: DeleteItemType.File,
      });
    });

    it('deletes the directory of the removed skill', () => {
      expect(deletePaths).toContainEqual({
        path: `${SKILLS_DIR}my-skill`,
        type: DeleteItemType.Directory,
      });
    });

    it('leaves the steering directory in place', () => {
      expect(deletePaths.map((item) => item.path)).not.toContain(STEERING_DIR);
    });
  });

  describe('generateAgentCleanupFileUpdates', () => {
    let deletePaths: { path: string; type: DeleteItemType }[];

    beforeEach(async () => {
      const result = await deployer.generateAgentCleanupFileUpdates({
        recipeVersions: [],
        standardVersions: [buildStandardVersion()],
        skillVersions: [skillVersionFactory({ slug: 'my-skill' })],
      });
      deletePaths = result.delete;
    });

    it('deletes the steering file of every known standard', () => {
      expect(deletePaths).toContainEqual({
        path: `${STEERING_DIR}packmind-standard-test-standard.md`,
        type: DeleteItemType.File,
      });
    });

    it('deletes the directory of every user skill', () => {
      expect(deletePaths).toContainEqual({
        path: `${SKILLS_DIR}my-skill`,
        type: DeleteItemType.Directory,
      });
    });

    it('deletes the directory of every default skill', () => {
      const defaultSkillPaths =
        DefaultSkillsDeployer.getDefaultSkillSlugs().map(
          (slug) => `${SKILLS_DIR}${slug}`,
        );

      expect(deletePaths.map((item) => item.path)).toEqual(
        expect.arrayContaining(defaultSkillPaths),
      );
    });

    it('leaves the steering directory in place', () => {
      expect(deletePaths.map((item) => item.path)).not.toContain(STEERING_DIR);
    });
  });

  describe('deployDefaultSkills', () => {
    it('writes the default skills under the Kiro skills folder', async () => {
      const result = await deployer.deployDefaultSkills();

      expect(
        result.fileUpdates.createOrUpdate.every((file) =>
          file.path.startsWith(SKILLS_DIR),
        ),
      ).toBe(true);
    });
  });
});
