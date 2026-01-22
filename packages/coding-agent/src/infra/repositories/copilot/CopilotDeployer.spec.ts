import { CopilotDeployer } from './CopilotDeployer';
import {
  createGitProviderId,
  createGitRepoId,
  createSkillFileId,
  createSkillVersionId,
  createTargetId,
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
});
