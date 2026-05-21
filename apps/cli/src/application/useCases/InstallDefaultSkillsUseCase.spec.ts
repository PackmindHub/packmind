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
  createMockDeploymentGateway,
} from '../../mocks/createMockGateways';
import {
  PackmindLockFile,
  PackmindLockFileEntry,
} from '../../domain/repositories/PackmindLockFile';
import { isSkillsInitBootstrapError } from '../../domain/errors/SkillsInitBootstrapError';
import {
  CodingAgent,
  DEFAULT_ACTIVE_RENDER_MODES,
  RENDER_MODE_TO_CODING_AGENT,
  RenderMode,
} from '@packmind/types';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

const BASE_DIR = '/project';

function makeLockFileEntry(
  overrides: Partial<PackmindLockFileEntry>,
): PackmindLockFileEntry {
  return {
    name: 'entry',
    type: 'skill',
    id: 'entry',
    version: 1,
    spaceId: '',
    packageIds: [],
    files: [],
    source: 'user',
    ...overrides,
  };
}

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
  let mockWriteLockFile: jest.Mock;

  beforeEach(() => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('existing content' as unknown as Buffer);

    mockGetDefaults = jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skippedSkillsCount: 0,
      lockFileSlice: {},
    });

    mockReadLockFile = jest.fn().mockResolvedValue(null);
    mockWriteLockFile = jest.fn().mockResolvedValue(undefined);

    const skillsGateway = createMockSkillsGateway({
      getDefaults: mockGetDefaults,
    });
    const packmindGateway = createMockPackmindGateway({
      skills: skillsGateway,
    });
    // Default: an existing (but minimal) packmind.json short-circuits the
    // bootstrap path so existing tests exercise the post-bootstrap flow.
    // Dedicated bootstrap tests below override `readConfig` to return null.
    const configRepo = createMockConfigFileRepository({
      readConfig: jest.fn().mockResolvedValue({ packages: {} }),
    });
    const lockFileRepo = createMockLockFileRepository({
      read: mockReadLockFile,
      write: mockWriteLockFile,
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

  describe('lockfile merge', () => {
    const defaultEntry: PackmindLockFileEntry = makeLockFileEntry({
      name: 'packmind-create-skill',
      type: 'skill',
      id: 'packmind-create-skill',
      version: 1,
      source: 'default',
      files: [
        {
          path: '.claude/skills/packmind-create-skill/SKILL.md',
          agent: 'claude',
          isSkillDefinition: true,
        },
      ],
    });

    const newDefaultEntry: PackmindLockFileEntry = makeLockFileEntry({
      name: 'packmind-new-default',
      type: 'skill',
      id: 'packmind-new-default',
      version: 1,
      source: 'default',
      files: [
        {
          path: '.claude/skills/packmind-new-default/SKILL.md',
          agent: 'claude',
          isSkillDefinition: true,
        },
      ],
    });

    beforeEach(() => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    describe('when no lockfile exists on disk', () => {
      beforeEach(() => {
        mockReadLockFile.mockResolvedValue(null);
        mockGetDefaults.mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
          skippedSkillsCount: 0,
          lockFileSlice: {
            'default:skill:packmind-create-skill': defaultEntry,
          },
        });
      });

      it('writes a fresh lockfileVersion: 2 lockfile with the slice as artifacts', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(mockWriteLockFile).toHaveBeenCalledTimes(1);
        const [writtenBaseDir, writtenLockFile] = mockWriteLockFile.mock
          .calls[0] as [string, PackmindLockFile];
        expect(writtenBaseDir).toBe(BASE_DIR);
        expect(writtenLockFile).toEqual({
          lockfileVersion: 2,
          cliVersion: '0.25.0',
          packageSlugs: [],
          agents: [],
          artifacts: {
            'default:skill:packmind-create-skill': defaultEntry,
          },
        });
      });
    });

    describe('when existing lockfile is v1 with user-skill entries (migrated on read)', () => {
      // The migrated form is what LockFileRepository.read returns. We simulate
      // that by returning the v2-shaped equivalent (per Group A.4 semantics).
      const migratedUserEntry: PackmindLockFileEntry = makeLockFileEntry({
        name: 'my-custom-skill',
        type: 'skill',
        id: 'my-custom-skill',
        version: 3,
        source: 'user',
        files: [
          {
            path: '.claude/skills/my-custom-skill/SKILL.md',
            agent: 'claude',
            isSkillDefinition: true,
          },
        ],
      });

      beforeEach(() => {
        mockReadLockFile.mockResolvedValue({
          lockfileVersion: 2,
          cliVersion: '0.20.0',
          packageSlugs: ['@my-space/my-package'],
          agents: ['claude'],
          artifacts: {
            'user:skill:my-custom-skill': migratedUserEntry,
          },
        } satisfies PackmindLockFile);

        mockGetDefaults.mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
          skippedSkillsCount: 0,
          lockFileSlice: {
            'default:skill:packmind-create-skill': defaultEntry,
          },
        });
      });

      it('preserves the user-skill entry under its re-keyed form', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(writtenLockFile.artifacts['user:skill:my-custom-skill']).toEqual(
          migratedUserEntry,
        );
      });

      it('merges default-skill entries into artifacts', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(
          writtenLockFile.artifacts['default:skill:packmind-create-skill'],
        ).toEqual(defaultEntry);
      });

      it('persists lockfileVersion: 2', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(writtenLockFile.lockfileVersion).toBe(2);
      });

      it('preserves other top-level fields (packageSlugs, agents, cliVersion)', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(writtenLockFile.packageSlugs).toEqual(['@my-space/my-package']);
        expect(writtenLockFile.agents).toEqual(['claude']);
        expect(writtenLockFile.cliVersion).toBe('0.20.0');
      });
    });

    describe('when existing lockfileVersion: 2 has no default skills', () => {
      beforeEach(() => {
        mockReadLockFile.mockResolvedValue({
          lockfileVersion: 2,
          cliVersion: '0.25.0',
          packageSlugs: [],
          agents: ['claude'],
          artifacts: {},
        } satisfies PackmindLockFile);

        mockGetDefaults.mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
          skippedSkillsCount: 0,
          lockFileSlice: {
            'default:skill:packmind-create-skill': defaultEntry,
          },
        });
      });

      it('adds the default entries', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(writtenLockFile.artifacts).toEqual({
          'default:skill:packmind-create-skill': defaultEntry,
        });
      });
    });

    describe('when existing lockfileVersion: 2 has stale default-skill entries', () => {
      const staleDefaultEntry: PackmindLockFileEntry = makeLockFileEntry({
        name: 'packmind-stale-skill',
        type: 'skill',
        id: 'packmind-stale-skill',
        version: 1,
        source: 'default',
        files: [
          {
            path: '.claude/skills/packmind-stale-skill/SKILL.md',
            agent: 'claude',
            isSkillDefinition: true,
          },
        ],
      });

      beforeEach(() => {
        mockReadLockFile.mockResolvedValue({
          lockfileVersion: 2,
          cliVersion: '0.25.0',
          packageSlugs: [],
          agents: ['claude'],
          artifacts: {
            'default:skill:packmind-stale-skill': staleDefaultEntry,
          },
        } satisfies PackmindLockFile);

        mockGetDefaults.mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
          skippedSkillsCount: 0,
          lockFileSlice: {
            'default:skill:packmind-create-skill': defaultEntry,
          },
        });
      });

      it('preserves stale default-skill entries (cleanup is out of scope)', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(
          writtenLockFile.artifacts['default:skill:packmind-stale-skill'],
        ).toEqual(staleDefaultEntry);
        expect(
          writtenLockFile.artifacts['default:skill:packmind-create-skill'],
        ).toEqual(defaultEntry);
      });
    });

    /**
     * MANDATORY regression test per the safety contract from the
     * predecessor sprint's revert (commit 76399bfb8).
     *
     * Default-skill operations MUST NEVER touch user-authored entries. We
     * pre-seed a lockfile with `user:skill:my-custom-skill` + an existing
     * `default:skill:packmind-create-skill`, then run the use case with a
     * slice that updates the default entry AND adds a new default entry.
     * The user entry MUST be byte-equal before and after.
     */
    describe('MANDATORY: user-skill preservation regression', () => {
      const userSkillEntry: PackmindLockFileEntry = makeLockFileEntry({
        name: 'my-custom-skill',
        type: 'skill',
        id: 'my-custom-skill',
        version: 7,
        spaceId: 'space-1',
        packageIds: ['pkg-1', 'pkg-2'],
        source: 'user',
        files: [
          {
            path: '.claude/skills/my-custom-skill/SKILL.md',
            agent: 'claude',
            isSkillDefinition: true,
          },
        ],
      });

      const oldDefaultEntry: PackmindLockFileEntry = makeLockFileEntry({
        name: 'packmind-create-skill',
        type: 'skill',
        id: 'packmind-create-skill',
        version: 1,
        source: 'default',
        files: [
          {
            path: '.claude/skills/packmind-create-skill/SKILL.md',
            agent: 'claude',
            isSkillDefinition: true,
          },
        ],
      });

      const updatedDefaultEntry: PackmindLockFileEntry = makeLockFileEntry({
        name: 'packmind-create-skill',
        type: 'skill',
        id: 'packmind-create-skill',
        version: 2,
        source: 'default',
        files: [
          {
            path: '.claude/skills/packmind-create-skill/SKILL.md',
            agent: 'claude',
            isSkillDefinition: true,
          },
        ],
      });

      const seededLockFile: PackmindLockFile = {
        lockfileVersion: 2,
        cliVersion: '0.25.0',
        packageSlugs: ['@my-space/my-package'],
        agents: ['claude'],
        artifacts: {
          'user:skill:my-custom-skill': userSkillEntry,
          'default:skill:packmind-create-skill': oldDefaultEntry,
        },
      };
      // Snapshot a deep clone of the user-skill entry BEFORE execute so the
      // post-execute comparison really proves byte-equality (no shared ref).
      const userSkillEntrySnapshotBefore: PackmindLockFileEntry = JSON.parse(
        JSON.stringify(userSkillEntry),
      );

      beforeEach(() => {
        mockReadLockFile.mockResolvedValue(
          // Deep-clone so the use case cannot mutate our seed.
          JSON.parse(JSON.stringify(seededLockFile)) as PackmindLockFile,
        );

        mockGetDefaults.mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
          skippedSkillsCount: 0,
          lockFileSlice: {
            'default:skill:packmind-create-skill': updatedDefaultEntry,
            'default:skill:packmind-new-default': newDefaultEntry,
          },
        });
      });

      it('keeps the user-skill entry byte-equal after execute', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(writtenLockFile.artifacts['user:skill:my-custom-skill']).toEqual(
          userSkillEntrySnapshotBefore,
        );
        // Byte-equality on the serialized form — the strongest possible
        // assertion that the user-skill entry was not mutated in any way.
        expect(
          JSON.stringify(
            writtenLockFile.artifacts['user:skill:my-custom-skill'],
          ),
        ).toBe(JSON.stringify(userSkillEntrySnapshotBefore));
      });

      it('updates the existing default-skill entry', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(
          writtenLockFile.artifacts['default:skill:packmind-create-skill'],
        ).toEqual(updatedDefaultEntry);
      });

      it('adds the new default-skill entry', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(
          writtenLockFile.artifacts['default:skill:packmind-new-default'],
        ).toEqual(newDefaultEntry);
      });

      it('does not delete or rename the user-skill key', async () => {
        await useCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        const [, writtenLockFile] = mockWriteLockFile.mock.calls[0] as [
          string,
          PackmindLockFile,
        ];
        expect(
          Object.prototype.hasOwnProperty.call(
            writtenLockFile.artifacts,
            'user:skill:my-custom-skill',
          ),
        ).toBe(true);
      });
    });
  });

  describe('bootstrap empty directory', () => {
    let bootstrapUseCase: InstallDefaultSkillsUseCase;
    let bootstrapReadConfig: jest.Mock;
    let bootstrapUpdateAgentsConfig: jest.Mock;
    let bootstrapReadLockFile: jest.Mock;
    let bootstrapGetRenderModeConfiguration: jest.Mock;
    let bootstrapGetDefaults: jest.Mock;

    function buildUseCase(): InstallDefaultSkillsUseCase {
      const skillsGateway = createMockSkillsGateway({
        getDefaults: bootstrapGetDefaults,
      });
      const deploymentGateway = createMockDeploymentGateway({
        getRenderModeConfiguration: bootstrapGetRenderModeConfiguration,
      });
      const packmindGateway = createMockPackmindGateway({
        skills: skillsGateway,
        deployment: deploymentGateway,
      });
      const configRepo = createMockConfigFileRepository({
        readConfig: bootstrapReadConfig,
        updateAgentsConfig: bootstrapUpdateAgentsConfig,
      });
      const lockFileRepo = createMockLockFileRepository({
        read: bootstrapReadLockFile,
        write: jest.fn().mockResolvedValue(undefined),
      });
      const repositories = createMockPackmindRepositories({
        packmindGateway,
        configFileRepository: configRepo,
        lockFileRepository: lockFileRepo,
      });
      return new InstallDefaultSkillsUseCase(repositories);
    }

    beforeEach(() => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      bootstrapUpdateAgentsConfig = jest.fn().mockResolvedValue(undefined);
      bootstrapGetDefaults = jest.fn().mockResolvedValue({
        fileUpdates: { createOrUpdate: [], delete: [] },
        skippedSkillsCount: 0,
        lockFileSlice: {},
      });
    });

    describe('when both packmind.json and packmind-lock.json are absent and gateway returns mapped modes', () => {
      const mappedAgents: CodingAgent[] = ['claude', 'agents_md'];

      beforeEach(() => {
        // First read: null (triggers bootstrap). After bootstrap writes the
        // agents config, the downstream readConfig at execute() line ~36
        // returns the freshly-written config. This proves the re-read picks
        // up the bootstrapped agents.
        bootstrapReadConfig = jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue({ packages: {}, agents: mappedAgents });
        bootstrapReadLockFile = jest.fn().mockResolvedValue(null);
        bootstrapGetRenderModeConfiguration = jest.fn().mockResolvedValue({
          configuration: {
            activeRenderModes: [RenderMode.CLAUDE, RenderMode.AGENTS_MD],
          },
        });
        bootstrapUseCase = buildUseCase();
      });

      it('writes the mapped agents to packmind.json once', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapUpdateAgentsConfig).toHaveBeenCalledTimes(1);
        expect(bootstrapUpdateAgentsConfig).toHaveBeenCalledWith(
          BASE_DIR,
          mappedAgents,
        );
      });

      it('passes the bootstrapped agents to getDefaults via the re-read', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapGetDefaults).toHaveBeenCalledTimes(1);
        expect(bootstrapGetDefaults).toHaveBeenCalledWith(
          expect.objectContaining({ agents: mappedAgents }),
        );
      });
    });

    describe('falls back to default active render modes when configuration is null', () => {
      const fallbackAgents: CodingAgent[] = DEFAULT_ACTIVE_RENDER_MODES.map(
        (mode) => RENDER_MODE_TO_CODING_AGENT[mode],
      ).filter((agent): agent is CodingAgent => agent !== undefined);

      beforeEach(() => {
        // First read: null (triggers bootstrap). Second read mirrors the
        // happy-path pattern by returning the just-written agents config.
        bootstrapReadConfig = jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue({ packages: {}, agents: fallbackAgents });
        bootstrapReadLockFile = jest.fn().mockResolvedValue(null);
        bootstrapGetRenderModeConfiguration = jest
          .fn()
          .mockResolvedValue({ configuration: null });
        bootstrapUseCase = buildUseCase();
      });

      it('writes the default-mapped agents to packmind.json once', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapUpdateAgentsConfig).toHaveBeenCalledTimes(1);
        expect(bootstrapUpdateAgentsConfig).toHaveBeenCalledWith(
          BASE_DIR,
          fallbackAgents,
        );
      });

      it('passes the default-mapped agents to getDefaults via the re-read', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapGetDefaults).toHaveBeenCalledTimes(1);
        expect(bootstrapGetDefaults).toHaveBeenCalledWith(
          expect.objectContaining({ agents: fallbackAgents }),
        );
      });
    });

    describe('when the gateway throws', () => {
      beforeEach(() => {
        bootstrapReadConfig = jest.fn().mockResolvedValue(null);
        bootstrapReadLockFile = jest.fn().mockResolvedValue(null);
        bootstrapGetRenderModeConfiguration = jest
          .fn()
          .mockRejectedValue(new Error('network'));
        bootstrapUseCase = buildUseCase();
      });

      it('rejects with SkillsInitBootstrapError', async () => {
        let caught: unknown;
        try {
          await bootstrapUseCase.execute({
            cliVersion: '0.25.0',
            baseDirectory: BASE_DIR,
          });
        } catch (error) {
          caught = error;
        }
        expect(isSkillsInitBootstrapError(caught)).toBe(true);
      });

      it('does not write agents config', async () => {
        try {
          await bootstrapUseCase.execute({
            cliVersion: '0.25.0',
            baseDirectory: BASE_DIR,
          });
        } catch {
          // expected
        }

        expect(bootstrapUpdateAgentsConfig).not.toHaveBeenCalled();
      });

      it('does not call getDefaults', async () => {
        try {
          await bootstrapUseCase.execute({
            cliVersion: '0.25.0',
            baseDirectory: BASE_DIR,
          });
        } catch {
          // expected
        }

        expect(bootstrapGetDefaults).not.toHaveBeenCalled();
      });
    });

    describe('when activeRenderModes is empty', () => {
      beforeEach(() => {
        bootstrapReadConfig = jest.fn().mockResolvedValue(null);
        bootstrapReadLockFile = jest.fn().mockResolvedValue(null);
        bootstrapGetRenderModeConfiguration = jest.fn().mockResolvedValue({
          configuration: { activeRenderModes: [] },
        });
        bootstrapUseCase = buildUseCase();
      });

      it('rejects with SkillsInitBootstrapError', async () => {
        let caught: unknown;
        try {
          await bootstrapUseCase.execute({
            cliVersion: '0.25.0',
            baseDirectory: BASE_DIR,
          });
        } catch (error) {
          caught = error;
        }
        expect(isSkillsInitBootstrapError(caught)).toBe(true);
      });

      it('does not write agents config', async () => {
        try {
          await bootstrapUseCase.execute({
            cliVersion: '0.25.0',
            baseDirectory: BASE_DIR,
          });
        } catch {
          // expected
        }

        expect(bootstrapUpdateAgentsConfig).not.toHaveBeenCalled();
      });

      it('does not call getDefaults', async () => {
        try {
          await bootstrapUseCase.execute({
            cliVersion: '0.25.0',
            baseDirectory: BASE_DIR,
          });
        } catch {
          // expected
        }

        expect(bootstrapGetDefaults).not.toHaveBeenCalled();
      });
    });

    describe('when only packmind-lock.json is present', () => {
      const stubLockFile: PackmindLockFile = {
        lockfileVersion: 2,
        cliVersion: '0.0.0',
        packageSlugs: [],
        agents: [],
        artifacts: {},
      };

      beforeEach(() => {
        bootstrapReadConfig = jest.fn().mockResolvedValue(null);
        bootstrapReadLockFile = jest.fn().mockResolvedValue(stubLockFile);
        bootstrapGetRenderModeConfiguration = jest.fn();
        bootstrapUseCase = buildUseCase();
      });

      it('does not call getRenderModeConfiguration', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapGetRenderModeConfiguration).not.toHaveBeenCalled();
      });

      it('does not write agents config', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapUpdateAgentsConfig).not.toHaveBeenCalled();
      });

      it('calls getDefaults with agents: undefined', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapGetDefaults).toHaveBeenCalledTimes(1);
        expect(bootstrapGetDefaults).toHaveBeenCalledWith(
          expect.objectContaining({ agents: undefined }),
        );
      });
    });

    describe('when packmind.json already exists', () => {
      beforeEach(() => {
        bootstrapReadConfig = jest
          .fn()
          .mockResolvedValue({ packages: {}, agents: ['claude'] });
        bootstrapReadLockFile = jest.fn().mockResolvedValue(null);
        bootstrapGetRenderModeConfiguration = jest.fn();
        bootstrapUseCase = buildUseCase();
      });

      it('does not call getRenderModeConfiguration', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapGetRenderModeConfiguration).not.toHaveBeenCalled();
      });

      it('does not write agents config', async () => {
        await bootstrapUseCase.execute({
          cliVersion: '0.25.0',
          baseDirectory: BASE_DIR,
        });

        expect(bootstrapUpdateAgentsConfig).not.toHaveBeenCalled();
      });
    });
  });
});
