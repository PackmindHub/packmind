import * as fs from 'fs/promises';
import { InstallDefaultSkillsUseCase } from './InstallDefaultSkillsUseCase';
import {
  createMockPackmindRepositories,
  createMockConfigFileRepository,
  createMockLockFileRepository,
} from '../../mocks/createMockRepositories';
import {
  createMockSkillsGateway,
  createMockPackmindGateway,
} from '../../mocks/createMockGateways';
import { PackmindLockFile } from '@packmind/types';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

const BASE_DIR = '/project';

function makeSkillContent(
  name: string,
  options: { versionConstraint?: string } = {},
): string {
  const metadataLines = options.versionConstraint
    ? `metadata:\n packmind-cli-version: "${options.versionConstraint}"\n`
    : '';
  return `---
name: '${name}'
description: 'A skill'
${metadataLines}---
# ${name}
Skill body.
`;
}

describe('InstallDefaultSkillsUseCase', () => {
  let useCase: InstallDefaultSkillsUseCase;
  let mockGetDefaults: jest.Mock;
  let mockReadLockFile: jest.Mock;

  beforeEach(() => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('existing content' as unknown as Buffer);

    mockGetDefaults = jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skippedSkillsCount: 0,
    });

    mockReadLockFile = jest.fn().mockResolvedValue(null);

    const skillsGateway = createMockSkillsGateway({
      getDefaults: mockGetDefaults,
    });
    const packmindGateway = createMockPackmindGateway({
      skills: skillsGateway,
    });
    const configRepo = createMockConfigFileRepository({
      readConfig: jest.fn().mockResolvedValue(null),
    });
    const lockFileRepo = createMockLockFileRepository({
      read: mockReadLockFile,
    });
    const repositories = createMockPackmindRepositories({
      packmindGateway,
      configFileRepository: configRepo,
      lockFileRepository: lockFileRepo,
    });

    useCase = new InstallDefaultSkillsUseCase(repositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a skill has no version constraint', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill.md',
              content: makeSkillContent('my-skill'),
            },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      // File does not exist
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    it('creates the file', async () => {
      await useCase.execute({ cliVersion: '0.25.0', baseDirectory: BASE_DIR });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        `${BASE_DIR}/.claude/skills/my-skill.md`,
        makeSkillContent('my-skill'),
        'utf-8',
      );
    });

    it('returns filesCreated: 1', async () => {
      const result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.filesCreated).toBe(1);
    });

    it('returns empty incompatibleInstalledSkills', async () => {
      const result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.incompatibleInstalledSkills).toHaveLength(0);
    });

    it('returns empty skippedIncompatibleSkillNames', async () => {
      const result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
    });
  });

  describe('when a skill has a version constraint and CLI version exceeds it', () => {
    const skillPath = '.claude/skills/old-skill.md';
    const skillContent = makeSkillContent('old-skill', {
      versionConstraint: '< 0.24.0',
    });

    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [{ path: skillPath, content: skillContent }],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
    });

    describe('when the skill is NOT yet installed', () => {
      beforeEach(() => {
        mockFs.access.mockRejectedValue(new Error('ENOENT'));
      });

      it('does not create the file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('adds the skill name to skippedIncompatibleSkillNames', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.skippedIncompatibleSkillNames).toEqual(['old-skill']);
      });

      it('returns empty incompatibleInstalledSkills', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills).toHaveLength(0);
      });
    });

    describe('when the skill IS already installed', () => {
      beforeEach(() => {
        mockFs.access.mockResolvedValue(undefined);
      });

      it('does not overwrite the file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('returns the skill as an incompatibleInstalledSkill', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills).toEqual([
          { skillName: 'old-skill', filePaths: [skillPath] },
        ]);
      });

      it('returns empty skippedIncompatibleSkillNames', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
      });
    });

    describe('when the skill is deployed for multiple agents (multiple paths)', () => {
      const claudePath = '.claude/skills/old-skill.md';
      const cursorPath = '.cursor/rules/old-skill.md';

      beforeEach(() => {
        mockGetDefaults.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              { path: claudePath, content: skillContent },
              { path: cursorPath, content: skillContent },
            ],
            delete: [],
          },
          skippedSkillsCount: 0,
        });
        mockFs.access.mockResolvedValue(undefined); // both installed
      });

      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
      });

      it('groups both paths under a single incompatibleInstalledSkill entry', () => {
        expect(result.incompatibleInstalledSkills).toHaveLength(1);
      });

      it('uses the correct skill name', () => {
        expect(result.incompatibleInstalledSkills[0].skillName).toBe(
          'old-skill',
        );
      });

      it('includes all agent replica paths', () => {
        expect(result.incompatibleInstalledSkills[0].filePaths).toEqual(
          expect.arrayContaining([claudePath, cursorPath]),
        );
      });
    });
  });

  describe('when a folder-based skill has companion files (README, LICENSE)', () => {
    const skillMdPath = '.claude/skills/old-skill/SKILL.md';
    const readmePath = '.claude/skills/old-skill/README.md';
    const licensePath = '.claude/skills/old-skill/LICENSE.txt';
    const skillContent = makeSkillContent('old-skill', {
      versionConstraint: '< 0.24.0',
    });

    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            { path: skillMdPath, content: skillContent },
            { path: readmePath, content: 'README content' },
            { path: licensePath, content: 'LICENSE content' },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
    });

    describe('when all files are already installed', () => {
      beforeEach(() => {
        mockFs.access.mockResolvedValue(undefined);
      });

      it('groups companion files under a single incompatibleInstalledSkill entry', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills).toHaveLength(1);
      });

      it('includes all companion file paths in incompatibleInstalledSkills', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills[0].filePaths).toEqual(
          expect.arrayContaining([skillMdPath, readmePath, licensePath]),
        );
      });

      it('does not create or update companion files', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });
    });

    describe('when the skill is NOT yet installed', () => {
      beforeEach(() => {
        mockFs.access.mockRejectedValue(new Error('ENOENT'));
      });

      it('does not create any file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('adds the skill name once to skippedIncompatibleSkillNames', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.skippedIncompatibleSkillNames).toEqual(['old-skill']);
      });
    });
  });

  describe('when a folder-based skill has files in subdirectories (e.g. scripts/)', () => {
    const skillMdPath = '.claude/skills/old-skill/SKILL.md';
    const scriptPath = '.claude/skills/old-skill/scripts/init_skill.py';
    const skillContent = makeSkillContent('old-skill', {
      versionConstraint: '< 0.24.0',
    });

    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            { path: skillMdPath, content: skillContent },
            { path: scriptPath, content: '# script' },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
    });

    describe('when the skill is NOT yet installed', () => {
      beforeEach(() => {
        mockFs.access.mockRejectedValue(new Error('ENOENT'));
      });

      it('does not create any file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('adds the skill name once to skippedIncompatibleSkillNames', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.skippedIncompatibleSkillNames).toEqual(['old-skill']);
      });
    });

    describe('when the skill IS already installed', () => {
      beforeEach(() => {
        mockFs.access.mockResolvedValue(undefined);
      });

      it('does not create or update any file', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('includes the subdirectory file in incompatibleInstalledSkills', async () => {
        const result = await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });
        expect(result.incompatibleInstalledSkills[0].filePaths).toEqual(
          expect.arrayContaining([skillMdPath, scriptPath]),
        );
      });
    });
  });

  describe('when a skill version constraint is satisfied by the CLI version', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/current-skill.md',
              content: makeSkillContent('current-skill', {
                versionConstraint: '< 0.30.0',
              }),
            },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
    });

    it('creates the file', () => {
      expect(result.filesCreated).toBe(1);
    });

    it('returns empty skippedIncompatibleSkillNames', () => {
      expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
    });

    it('returns empty incompatibleInstalledSkills', () => {
      expect(result.incompatibleInstalledSkills).toHaveLength(0);
    });
  });

  describe('when no cliVersion is provided', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/old-skill.md',
              content: makeSkillContent('old-skill', {
                versionConstraint: '< 0.24.0',
              }),
            },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute({ baseDirectory: BASE_DIR });
    });

    it('creates the file', () => {
      expect(result.filesCreated).toBe(1);
    });

    it('returns empty skippedIncompatibleSkillNames', () => {
      expect(result.skippedIncompatibleSkillNames).toHaveLength(0);
    });
  });

  describe('when a skill is in the lockfile but no longer in the gateway response', () => {
    const obsoleteSkillPath = '.claude/skills/old-skill/SKILL.md';

    function lockFileWithSkill(
      filePath: string,
      name: string,
    ): PackmindLockFile {
      return {
        lockfileVersion: 1,
        packageSlugs: [],
        agents: [],
        artifacts: {
          [name]: {
            name,
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              {
                path: filePath,
                agent: 'claude',
                isSkillDefinition: true,
              },
            ],
          },
        },
      };
    }

    beforeEach(() => {
      // Gateway response no longer contains the obsolete skill.
      mockGetDefaults.mockResolvedValue({
        fileUpdates: { createOrUpdate: [], delete: [] },
        skippedSkillsCount: 0,
      });
      mockReadLockFile.mockResolvedValue(
        lockFileWithSkill(obsoleteSkillPath, 'old-skill'),
      );
    });

    it('flags the skill as incompatibleInstalledSkill', async () => {
      const result = await useCase.execute({
        cliVersion: '0.28.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.incompatibleInstalledSkills).toEqual([
        { skillName: 'old-skill', filePaths: [obsoleteSkillPath] },
      ]);
    });

    it('includes all lockfile-recorded file paths in filePaths', async () => {
      mockReadLockFile.mockResolvedValueOnce({
        lockfileVersion: 1,
        packageSlugs: [],
        agents: [],
        artifacts: {
          'old-skill': {
            name: 'old-skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              {
                path: '.claude/skills/old-skill/SKILL.md',
                agent: 'claude',
                isSkillDefinition: true,
              },
              {
                path: '.claude/skills/old-skill/README.md',
                agent: 'claude',
              },
            ],
          },
        },
      } satisfies PackmindLockFile);

      const result = await useCase.execute({
        cliVersion: '0.28.0',
        baseDirectory: BASE_DIR,
      });

      expect(result.incompatibleInstalledSkills).toHaveLength(1);
      expect(result.incompatibleInstalledSkills[0].filePaths).toEqual([
        '.claude/skills/old-skill/SKILL.md',
        '.claude/skills/old-skill/README.md',
      ]);
    });

    it('also runs when no cliVersion is provided', async () => {
      const result = await useCase.execute({ baseDirectory: BASE_DIR });
      expect(result.incompatibleInstalledSkills).toEqual([
        { skillName: 'old-skill', filePaths: [obsoleteSkillPath] },
      ]);
    });
  });

  describe('when a skill is in the lockfile and still in the gateway response', () => {
    const skillPath = '.claude/skills/current-skill/SKILL.md';

    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            { path: skillPath, content: makeSkillContent('current-skill') },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      mockReadLockFile.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: [],
        agents: [],
        artifacts: {
          'current-skill': {
            name: 'current-skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              {
                path: skillPath,
                agent: 'claude',
                isSkillDefinition: true,
              },
            ],
          },
        },
      } satisfies PackmindLockFile);
      mockFs.access.mockResolvedValue(undefined);
    });

    it('does not flag it as obsolete', async () => {
      const result = await useCase.execute({
        cliVersion: '0.28.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.incompatibleInstalledSkills).toHaveLength(0);
    });
  });

  describe('when the lockfile contains non-skill artifacts', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: { createOrUpdate: [], delete: [] },
        skippedSkillsCount: 0,
      });
      mockReadLockFile.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: [],
        agents: [],
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      } satisfies PackmindLockFile);
    });

    it('ignores standards and commands when computing obsolete skills', async () => {
      const result = await useCase.execute({
        cliVersion: '0.28.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.incompatibleInstalledSkills).toHaveLength(0);
    });
  });

  describe('when a lockfile skill entry has no isSkillDefinition file', () => {
    beforeEach(() => {
      mockGetDefaults.mockResolvedValue({
        fileUpdates: { createOrUpdate: [], delete: [] },
        skippedSkillsCount: 0,
      });
      mockReadLockFile.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: [],
        agents: [],
        artifacts: {
          'partial-skill': {
            name: 'partial-skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              {
                path: '.claude/skills/partial-skill/README.md',
                agent: 'claude',
              },
            ],
          },
        },
      } satisfies PackmindLockFile);
    });

    it('does not flag it as obsolete', async () => {
      const result = await useCase.execute({
        cliVersion: '0.28.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.incompatibleInstalledSkills).toHaveLength(0);
    });
  });

  describe('when a lockfile skill is both obsolete AND version-incompatible against an installed copy', () => {
    const skillPath = '.claude/skills/duplicated-skill/SKILL.md';
    const incompatibleSkillContent = makeSkillContent('duplicated-skill', {
      versionConstraint: '< 0.24.0',
    });

    beforeEach(() => {
      // Gateway returns the version-incompatible skill (same path).
      mockGetDefaults.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            { path: skillPath, content: incompatibleSkillContent },
          ],
          delete: [],
        },
        skippedSkillsCount: 0,
      });
      mockReadLockFile.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: [],
        agents: [],
        artifacts: {
          'duplicated-skill': {
            name: 'duplicated-skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              {
                path: skillPath,
                agent: 'claude',
                isSkillDefinition: true,
              },
            ],
          },
        },
      } satisfies PackmindLockFile);
      mockFs.access.mockResolvedValue(undefined); // installed on disk
    });

    it('produces a single deduplicated entry', async () => {
      const result = await useCase.execute({
        cliVersion: '0.25.0',
        baseDirectory: BASE_DIR,
      });
      expect(result.incompatibleInstalledSkills).toHaveLength(1);
      expect(result.incompatibleInstalledSkills[0].skillName).toBe(
        'duplicated-skill',
      );
    });
  });
});
