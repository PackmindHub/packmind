import { CopilotDeployer } from './CopilotDeployer';
import {
  createGitProviderId,
  createGitRepoId,
  createSkillFileId,
  createSkillVersionId,
  createTargetId,
  DeleteItemType,
  GitRepo,
  IStandardsPort,
  SkillVersion,
  Target,
} from '@packmind/types';
import { skillVersionFactory } from '@packmind/skills/test';

describe('CopilotDeployer', () => {
  let deployer: CopilotDeployer;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    mockStandardsPort = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    deployer = new CopilotDeployer(mockStandardsPort);

    mockTarget = {
      id: createTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createGitRepoId('test-repo-id'),
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

  describe('generateFileUpdatesForSkills', () => {
    describe('when skill has files with isBase64 true', () => {
      let skillVersion: SkillVersion;

      beforeEach(() => {
        skillVersion = skillVersionFactory({
          name: 'Binary Skill',
          slug: 'binary-skill',
          description: 'A skill with binary files',
          prompt: 'This skill has binary file attachments',
          files: [
            {
              id: createSkillFileId('file-1'),
              skillVersionId: createSkillVersionId('skill-version-1'),
              path: 'image.png',
              content: 'base64encodedcontent',
              permissions: 'rw-r--r--',
              isBase64: true,
            },
          ],
        });
      });

      it('includes isBase64 true in file update', async () => {
        const fileUpdates = await deployer.generateFileUpdatesForSkills([
          skillVersion,
        ]);

        const binaryFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('image.png'),
        );
        expect(binaryFile?.isBase64).toBe(true);
      });

      it('propagates skillFileId for skill file', async () => {
        const fileUpdates = await deployer.generateFileUpdatesForSkills([
          skillVersion,
        ]);

        const binaryFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('image.png'),
        );
        expect(binaryFile?.skillFileId).toBe('file-1');
      });

      it('propagates skillFilePermissions for skill file', async () => {
        const fileUpdates = await deployer.generateFileUpdatesForSkills([
          skillVersion,
        ]);

        const binaryFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('image.png'),
        );
        expect(binaryFile?.skillFilePermissions).toBe('rw-r--r--');
      });

      it('does not set skillFileId on SKILL.md', async () => {
        const fileUpdates = await deployer.generateFileUpdatesForSkills([
          skillVersion,
        ]);

        const skillMdFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('SKILL.md'),
        );
        expect(skillMdFile?.skillFileId).toBeUndefined();
      });
    });

    describe('when skill has files with isBase64 false', () => {
      let skillVersion: SkillVersion;

      beforeEach(() => {
        skillVersion = skillVersionFactory({
          name: 'Text Skill',
          slug: 'text-skill',
          description: 'A skill with text files',
          prompt: 'This skill has text file attachments',
          files: [
            {
              id: createSkillFileId('file-1'),
              skillVersionId: createSkillVersionId('skill-version-1'),
              path: 'reference.md',
              content: '# Reference documentation',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
          ],
        });
      });

      it('includes isBase64 false in file update', async () => {
        const fileUpdates = await deployer.generateFileUpdatesForSkills([
          skillVersion,
        ]);

        const textFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('reference.md'),
        );
        expect(textFile?.isBase64).toBe(false);
      });
    });
  });

  describe('deploySkills', () => {
    describe('when skill has files with isBase64 true', () => {
      let skillVersion: SkillVersion;

      beforeEach(() => {
        skillVersion = skillVersionFactory({
          name: 'Binary Skill',
          slug: 'binary-skill',
          description: 'A skill with binary files',
          prompt: 'This skill has binary file attachments',
          files: [
            {
              id: createSkillFileId('file-1'),
              skillVersionId: createSkillVersionId('skill-version-1'),
              path: 'image.png',
              content: 'base64encodedcontent',
              permissions: 'rw-r--r--',
              isBase64: true,
            },
          ],
        });
      });

      it('includes isBase64 true in file update', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );

        const binaryFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('image.png'),
        );
        expect(binaryFile?.isBase64).toBe(true);
      });
    });

    describe('when skill has files with isBase64 false', () => {
      let skillVersion: SkillVersion;

      beforeEach(() => {
        skillVersion = skillVersionFactory({
          name: 'Text Skill',
          slug: 'text-skill',
          description: 'A skill with text files',
          prompt: 'This skill has text file attachments',
          files: [
            {
              id: createSkillFileId('file-1'),
              skillVersionId: createSkillVersionId('skill-version-1'),
              path: 'reference.md',
              content: '# Reference documentation',
              permissions: 'rw-r--r--',
              isBase64: false,
            },
          ],
        });
      });

      it('includes isBase64 false in file update', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersion],
          mockGitRepo,
          mockTarget,
        );

        const textFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('reference.md'),
        );
        expect(textFile?.isBase64).toBe(false);
      });
    });
  });

  describe('getSkillsFolderPath', () => {
    it('returns the GitHub skills folder path', () => {
      expect(deployer.getSkillsFolderPath()).toBe('.github/skills/');
    });
  });

  describe('generateAgentCleanupFileUpdates', () => {
    describe('when deleting default skills', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;

      beforeEach(async () => {
        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
        });
      });

      it('deletes packmind-create-skill default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/packmind-create-skill' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-create-standard default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/packmind-create-standard' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-onboard default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/packmind-onboard' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-create-command default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/packmind-create-command' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-create-package default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/packmind-create-package' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-cli-list-commands default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/packmind-cli-list-commands' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });
    });

    describe('when deleting user package skills', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;
      let userPackageSkillVersions: SkillVersion[];

      beforeEach(async () => {
        userPackageSkillVersions = [
          skillVersionFactory({ slug: 'my-custom-skill' }),
          skillVersionFactory({ slug: 'another-package-skill' }),
        ];

        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: userPackageSkillVersions,
        });
      });

      it('deletes my-custom-skill user package skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/my-custom-skill' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes another-package-skill user package skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.github/skills/another-package-skill' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });
    });

    describe('when user has skills not managed by Packmind', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;

      beforeEach(async () => {
        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [skillVersionFactory({ slug: 'managed-skill' })],
        });
      });

      it('does not include unmanaged skill in delete list', () => {
        expect(
          result.delete.some(
            (item) => item.path === '.github/skills/user-created-skill',
          ),
        ).toBe(false);
      });

      it('only deletes skills that are explicitly managed', () => {
        const skillDeleteItems = result.delete.filter((item) =>
          item.path.startsWith('.github/skills/'),
        );

        // Should include: 6 default skills + 1 managed skill = 7 total
        expect(skillDeleteItems).toHaveLength(7);
      });
    });
  });
});
