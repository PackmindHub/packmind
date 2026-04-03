import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../../domain/repositories/ILockFileRepository';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';
import { createTargetContextResolver } from './targetContextResolver';

jest.mock('../../../utils/deployedFilesUtils', () => ({
  fetchDeployedFiles: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../../application/utils/findNearestConfigDir', () => ({
  findNearestConfigDir: jest.fn().mockResolvedValue('/project'),
}));

const { findNearestConfigDir } = jest.requireMock(
  '../../../../application/utils/findNearestConfigDir',
) as { findNearestConfigDir: jest.Mock };

const { fetchDeployedFiles } = jest.requireMock(
  '../../../utils/deployedFilesUtils',
) as { fetchDeployedFiles: jest.Mock };

function makeEntry(
  overrides: Partial<PlaybookChangeEntry> = {},
): PlaybookChangeEntry {
  return {
    filePath: '.packmind/standards/my-standard.md',
    artifactType: 'standard',
    artifactName: 'My Standard',
    codingAgent: 'packmind',
    changeType: 'created',
    addedAt: '2026-03-17T00:00:00.000Z',
    spaceId: 'space-123',
    targetId: 'target-456',
    content: '',
    ...overrides,
  };
}

describe('createTargetContextResolver', () => {
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;
  let mockPackmindCliHexa: PackmindCliHexa;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLockFileRepository = {
      read: jest.fn().mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['packmind'],
        installedAt: '2026-03-17T00:00:00.000Z',
        targetId: 'target-456',
        artifacts: {},
      }),
      write: jest.fn(),
      delete: jest.fn(),
    };

    mockPackmindCliHexa = {
      tryGetGitRepositoryRoot: jest.fn().mockResolvedValue('/project'),
      getPackmindGateway: jest.fn().mockReturnValue({}),
    } as unknown as PackmindCliHexa;
  });

  describe('when entry has configDir', () => {
    it('loads lock file from gitRoot/configDir', async () => {
      const resolver = await createTargetContextResolver({
        lockFileRepository: mockLockFileRepository,
        cwd: '/project',
        packmindCliHexa: mockPackmindCliHexa,
      });

      await resolver.getTargetContext(
        makeEntry({ configDir: 'apps/frontend' }),
      );

      expect(mockLockFileRepository.read).toHaveBeenCalledWith(
        '/project/apps/frontend',
      );
    });
  });

  describe('when entry has no configDir', () => {
    it('falls back to findNearestConfigDir', async () => {
      const resolver = await createTargetContextResolver({
        lockFileRepository: mockLockFileRepository,
        cwd: '/project',
        packmindCliHexa: mockPackmindCliHexa,
      });

      await resolver.getTargetContext(makeEntry({ configDir: undefined }));

      expect(findNearestConfigDir).toHaveBeenCalledWith(
        '/project',
        mockPackmindCliHexa,
      );
    });
  });

  describe('when getTargetContext is called twice with the same configDir', () => {
    it('returns the same object reference', async () => {
      const resolver = await createTargetContextResolver({
        lockFileRepository: mockLockFileRepository,
        cwd: '/project',
        packmindCliHexa: mockPackmindCliHexa,
      });

      const first = await resolver.getTargetContext(
        makeEntry({ configDir: 'apps/frontend' }),
      );
      const second = await resolver.getTargetContext(
        makeEntry({ configDir: 'apps/frontend' }),
      );

      expect(first).toBe(second);
    });

    it('reads the lock file only once', async () => {
      const resolver = await createTargetContextResolver({
        lockFileRepository: mockLockFileRepository,
        cwd: '/project',
        packmindCliHexa: mockPackmindCliHexa,
      });

      await resolver.getTargetContext(
        makeEntry({ configDir: 'apps/frontend' }),
      );
      await resolver.getTargetContext(
        makeEntry({ configDir: 'apps/frontend' }),
      );

      expect(mockLockFileRepository.read).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCachedContext', () => {
    describe('when context was previously resolved', () => {
      it('returns a defined value', async () => {
        const resolver = await createTargetContextResolver({
          lockFileRepository: mockLockFileRepository,
          cwd: '/project',
          packmindCliHexa: mockPackmindCliHexa,
        });

        await resolver.getTargetContext(
          makeEntry({ configDir: 'apps/frontend' }),
        );
        const cached = resolver.getCachedContext('apps/frontend');

        expect(cached).toBeDefined();
      });

      it('returns the correct projectDir', async () => {
        const resolver = await createTargetContextResolver({
          lockFileRepository: mockLockFileRepository,
          cwd: '/project',
          packmindCliHexa: mockPackmindCliHexa,
        });

        await resolver.getTargetContext(
          makeEntry({ configDir: 'apps/frontend' }),
        );
        const cached = resolver.getCachedContext('apps/frontend');

        expect(cached?.projectDir).toBe('/project/apps/frontend');
      });
    });

    describe('when context was not resolved', () => {
      it('returns undefined', async () => {
        const resolver = await createTargetContextResolver({
          lockFileRepository: mockLockFileRepository,
          cwd: '/project',
          packmindCliHexa: mockPackmindCliHexa,
        });

        const cached = resolver.getCachedContext('nonexistent');

        expect(cached).toBeUndefined();
      });
    });

    describe('when configDir is undefined', () => {
      it('uses __cwd__ sentinel key', async () => {
        const resolver = await createTargetContextResolver({
          lockFileRepository: mockLockFileRepository,
          cwd: '/project',
          packmindCliHexa: mockPackmindCliHexa,
        });

        await resolver.getTargetContext(makeEntry({ configDir: undefined }));
        const cached = resolver.getCachedContext(undefined);

        expect(cached).toBeDefined();
      });
    });
  });

  describe('when lock file has artifacts', () => {
    it('fetches deployed files', async () => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['packmind'],
        installedAt: '2026-03-17T00:00:00.000Z',
        targetId: 'target-456',
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
      });

      const resolver = await createTargetContextResolver({
        lockFileRepository: mockLockFileRepository,
        cwd: '/project',
        packmindCliHexa: mockPackmindCliHexa,
      });

      await resolver.getTargetContext(makeEntry({ configDir: 'apps/api' }));

      expect(fetchDeployedFiles).toHaveBeenCalled();
    });
  });

  describe('when lock file has no artifacts', () => {
    it('does not fetch deployed files', async () => {
      const resolver = await createTargetContextResolver({
        lockFileRepository: mockLockFileRepository,
        cwd: '/project',
        packmindCliHexa: mockPackmindCliHexa,
      });

      await resolver.getTargetContext(makeEntry({ configDir: 'apps/api' }));

      expect(fetchDeployedFiles).not.toHaveBeenCalled();
    });
  });
});
