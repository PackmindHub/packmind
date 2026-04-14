import { UninstallUseCase } from './UninstallUseCase';
import { createMockConfigFileRepository } from '../../mocks/createMockRepositories';
import { createMockSpaceService } from '../../mocks/createMockServices';
import { spaceFactory } from '@packmind/spaces/test';
import { createSpaceId, IInstallResult } from '@packmind/types';
import { IInstallUseCase } from '../../domain/useCases/IInstallUseCase';

const installResultFactory = (
  overrides: Partial<IInstallResult> = {},
): IInstallResult => ({
  filesCreated: 0,
  filesUpdated: 0,
  filesDeleted: 0,
  contentFilesChanged: 0,
  errors: [],
  recipesCount: 0,
  standardsCount: 0,
  commandsCount: 0,
  skillsCount: 0,
  recipesRemoved: 0,
  standardsRemoved: 0,
  commandsRemoved: 0,
  skillsRemoved: 0,
  skillDirectoriesDeleted: 0,
  missingAccess: [],
  ...overrides,
});

describe('UninstallUseCase', () => {
  let useCase: UninstallUseCase;
  let mockConfigFileRepository: ReturnType<
    typeof createMockConfigFileRepository
  >;
  let mockSpaceService: ReturnType<typeof createMockSpaceService>;
  let mockInstallUseCase: jest.Mocked<IInstallUseCase>;

  const defaultSpace = spaceFactory({
    id: createSpaceId('space-1'),
    slug: 'my-space',
    isDefaultSpace: true,
  });

  beforeEach(() => {
    mockConfigFileRepository = createMockConfigFileRepository();
    mockSpaceService = createMockSpaceService();
    mockInstallUseCase = { execute: jest.fn() };

    mockSpaceService.getSpaces.mockResolvedValue([defaultSpace]);
    mockSpaceService.getDefaultSpace.mockResolvedValue(defaultSpace);
    mockConfigFileRepository.readConfig.mockResolvedValue({
      packages: {
        '@my-space/package-a': '*',
        '@my-space/package-b': '*',
      },
    });
    mockConfigFileRepository.updateConfig.mockResolvedValue(undefined);
    mockInstallUseCase.execute.mockResolvedValue(installResultFactory());

    useCase = new UninstallUseCase(
      mockConfigFileRepository,
      mockSpaceService,
      mockInstallUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no packmind.json exists', () => {
    beforeEach(() => {
      mockConfigFileRepository.readConfig.mockResolvedValue(null);
      mockConfigFileRepository.configExists.mockResolvedValue(false);
    });

    it('throws an error', async () => {
      await expect(
        useCase.execute({ packages: ['@my-space/package-a'] }),
      ).rejects.toThrow('No packmind.json found');
    });
  });

  describe('when packmind.json exists but is malformed', () => {
    beforeEach(() => {
      mockConfigFileRepository.readConfig.mockResolvedValue(null);
      mockConfigFileRepository.configExists.mockResolvedValue(true);
    });

    it('throws an error indicating the file cannot be parsed', async () => {
      await expect(
        useCase.execute({ packages: ['@my-space/package-a'] }),
      ).rejects.toThrow(
        'packmind.json exists but could not be parsed. Please fix the JSON syntax errors and try again.',
      );
    });
  });

  describe('when a package is not installed', () => {
    it('throws an error listing the missing package', async () => {
      await expect(
        useCase.execute({ packages: ['@my-space/unknown-package'] }),
      ).rejects.toThrow('not installed:\n  - @my-space/unknown-package');
    });

    it('lists all missing packages if multiple are not installed', async () => {
      await expect(
        useCase.execute({
          packages: ['@my-space/unknown-a', '@my-space/unknown-b'],
        }),
      ).rejects.toThrow('packages are not installed');
    });
  });

  describe('when removing a single prefixed package', () => {
    let result: IInstallResult;

    beforeEach(async () => {
      result = await useCase.execute({
        baseDirectory: '/project',
        packages: ['@my-space/package-a'],
      });
    });

    it('removes the package from config', () => {
      expect(mockConfigFileRepository.updateConfig).toHaveBeenCalledWith(
        '/project',
        'packages',
        { '@my-space/package-b': '*' },
      );
    });

    it('calls install after updating config', () => {
      expect(mockInstallUseCase.execute).toHaveBeenCalledWith({
        baseDirectory: '/project',
      });
    });

    it('returns the install result', () => {
      expect(result).toEqual(installResultFactory());
    });
  });

  describe('when removing an unprefixed package with a single space', () => {
    beforeEach(async () => {
      await useCase.execute({
        baseDirectory: '/project',
        packages: ['package-a'],
      });
    });

    it('normalizes the slug using the default space', () => {
      expect(mockConfigFileRepository.updateConfig).toHaveBeenCalledWith(
        '/project',
        'packages',
        { '@my-space/package-b': '*' },
      );
    });
  });

  describe('when removing an unprefixed package and the organization has multiple spaces', () => {
    beforeEach(() => {
      const anotherSpace = spaceFactory({
        id: createSpaceId('space-2'),
        slug: 'other-space',
      });
      mockSpaceService.getSpaces.mockResolvedValue([
        defaultSpace,
        anotherSpace,
      ]);
    });

    it('throws an error asking to use the @space/package format', async () => {
      await expect(
        useCase.execute({ packages: ['package-a'] }),
      ).rejects.toThrow('multiple spaces');
    });
  });

  describe('when removing all packages', () => {
    beforeEach(async () => {
      await useCase.execute({
        baseDirectory: '/project',
        packages: ['@my-space/package-a', '@my-space/package-b'],
      });
    });

    it('writes an empty packages object to config', () => {
      expect(mockConfigFileRepository.updateConfig).toHaveBeenCalledWith(
        '/project',
        'packages',
        {},
      );
    });

    it('still calls install to clean up artifacts', () => {
      expect(mockInstallUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('when install fails after config has been updated', () => {
    const installError = new Error('install failed');

    beforeEach(() => {
      mockInstallUseCase.execute.mockRejectedValue(installError);
    });

    it('restores the original packages in config', async () => {
      try {
        await useCase.execute({
          baseDirectory: '/project',
          packages: ['@my-space/package-a'],
        });
      } catch {
        // Expected failure
      }

      expect(mockConfigFileRepository.updateConfig).toHaveBeenLastCalledWith(
        '/project',
        'packages',
        { '@my-space/package-a': '*', '@my-space/package-b': '*' },
      );
    });

    it('rethrows the install error', async () => {
      await expect(
        useCase.execute({
          baseDirectory: '/project',
          packages: ['@my-space/package-a'],
        }),
      ).rejects.toThrow('install failed');
    });
  });

  describe('when no baseDirectory is provided', () => {
    it('uses the current working directory', async () => {
      await useCase.execute({ packages: ['@my-space/package-a'] });

      expect(mockConfigFileRepository.readConfig).toHaveBeenCalledWith(
        process.cwd(),
      );
    });
  });
});
