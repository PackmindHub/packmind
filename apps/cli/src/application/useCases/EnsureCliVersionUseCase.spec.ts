import { EnsureCliVersionUseCase } from './EnsureCliVersionUseCase';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { IInstallDefaultSkillsUseCase } from '../../domain/useCases/IInstallDefaultSkillsUseCase';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';

function buildLockFile(
  overrides: Partial<PackmindLockFile> = {},
): PackmindLockFile {
  return {
    lockfileVersion: 1,
    packageSlugs: [],
    agents: [],
    artifacts: {},
    ...overrides,
  };
}

describe('EnsureCliVersionUseCase', () => {
  let lockFileRepository: jest.Mocked<ILockFileRepository>;
  let installDefaultSkillsUseCase: jest.Mocked<IInstallDefaultSkillsUseCase>;
  let useCase: EnsureCliVersionUseCase;

  const BASE_DIRECTORY = '/tmp/workspace';

  beforeEach(() => {
    lockFileRepository = {
      read: jest.fn(),
      write: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<ILockFileRepository>;

    installDefaultSkillsUseCase = {
      execute: jest.fn().mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      }),
    } as jest.Mocked<IInstallDefaultSkillsUseCase>;

    useCase = new EnsureCliVersionUseCase(
      lockFileRepository,
      installDefaultSkillsUseCase,
    );
  });

  describe('when no lockfile exists', () => {
    beforeEach(() => {
      lockFileRepository.read.mockResolvedValue(null);
    });

    it('returns the no-lockfile outcome', async () => {
      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(outcome).toEqual({ kind: 'no-lockfile' });
    });

    it('does not trigger a default-skills install', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(installDefaultSkillsUseCase.execute).not.toHaveBeenCalled();
    });

    it('does not write to the lockfile', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(lockFileRepository.write).not.toHaveBeenCalled();
    });
  });

  describe('when the lockfile has no cliVersion recorded', () => {
    beforeEach(() => {
      lockFileRepository.read.mockResolvedValue(buildLockFile());
    });

    it('returns the no-cli-version-recorded outcome', async () => {
      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(outcome).toEqual({ kind: 'no-cli-version-recorded' });
    });

    it('does not trigger a default-skills install', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(installDefaultSkillsUseCase.execute).not.toHaveBeenCalled();
    });

    it('does not write to the lockfile', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(lockFileRepository.write).not.toHaveBeenCalled();
    });
  });

  describe('when versions match exactly', () => {
    beforeEach(() => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.28.1' }),
      );
    });

    it('returns the match outcome', async () => {
      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(outcome).toEqual({ kind: 'match' });
    });

    it('does not trigger a default-skills install', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(installDefaultSkillsUseCase.execute).not.toHaveBeenCalled();
    });

    it('does not write to the lockfile', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(lockFileRepository.write).not.toHaveBeenCalled();
    });
  });

  describe('when current and lock differ only by -next pre-release', () => {
    beforeEach(() => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.28.1' }),
      );
    });

    it('treats 0.28.1-next as matching 0.28.1', async () => {
      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1-next',
      });

      expect(outcome).toEqual({ kind: 'match' });
      expect(installDefaultSkillsUseCase.execute).not.toHaveBeenCalled();
      expect(lockFileRepository.write).not.toHaveBeenCalled();
    });

    it('also treats a -next lockVersion as matching the released CLI', async () => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.28.1-next' }),
      );

      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(outcome).toEqual({ kind: 'match' });
    });
  });

  describe('when the running CLI is newer', () => {
    let existingLockFile: PackmindLockFile;

    beforeEach(() => {
      existingLockFile = buildLockFile({
        cliVersion: '0.27.0',
        packageSlugs: ['@space/pkg'],
      });
      lockFileRepository.read.mockResolvedValue(existingLockFile);
    });

    it('returns the newer outcome with the recorded lockVersion and upgraded=true', async () => {
      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
      });

      expect(outcome).toEqual({
        kind: 'newer',
        lockVersion: '0.27.0',
        upgraded: true,
      });
    });

    it('triggers the default-skills install with the current CLI version', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1',
        includeBeta: true,
      });

      expect(installDefaultSkillsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(installDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
        baseDirectory: BASE_DIRECTORY,
        cliVersion: '0.28.1',
        includeBeta: true,
      });
    });

    it('rewrites the lockfile with the verbatim new cliVersion', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1-next',
      });

      expect(lockFileRepository.write).toHaveBeenCalledTimes(1);
      expect(lockFileRepository.write).toHaveBeenCalledWith(BASE_DIRECTORY, {
        ...existingLockFile,
        cliVersion: '0.28.1-next',
      });
    });

    it('treats a -next current vs released lock as an upgrade when major/minor/patch is higher', async () => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.27.0' }),
      );

      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.0-next',
      });

      expect(outcome).toEqual({
        kind: 'newer',
        lockVersion: '0.27.0',
        upgraded: true,
      });
      expect(installDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
        baseDirectory: BASE_DIRECTORY,
        cliVersion: '0.28.0-next',
        includeBeta: undefined,
      });
    });
  });

  describe('when the running CLI is older', () => {
    beforeEach(() => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.28.1' }),
      );
    });

    it('returns the older outcome with the recorded lockVersion', async () => {
      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.27.0',
      });

      expect(outcome).toEqual({ kind: 'older', lockVersion: '0.28.1' });
    });

    it('does not trigger a default-skills install', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.27.0',
      });

      expect(installDefaultSkillsUseCase.execute).not.toHaveBeenCalled();
    });

    it('does not write to the lockfile', async () => {
      await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.27.0',
      });

      expect(lockFileRepository.write).not.toHaveBeenCalled();
    });

    it('considers 0.28.1-next current vs 0.28.2 lock as older', async () => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.28.2' }),
      );

      const outcome = await useCase.execute({
        baseDirectory: BASE_DIRECTORY,
        currentCliVersion: '0.28.1-next',
      });

      expect(outcome).toEqual({ kind: 'older', lockVersion: '0.28.2' });
    });
  });

  describe('error propagation', () => {
    it('propagates errors from the lockfile read', async () => {
      const error = new Error('boom');
      lockFileRepository.read.mockRejectedValue(error);

      await expect(
        useCase.execute({
          baseDirectory: BASE_DIRECTORY,
          currentCliVersion: '0.28.1',
        }),
      ).rejects.toBe(error);
    });

    it('propagates errors from the default-skills install', async () => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.27.0' }),
      );
      const error = new Error('install failed');
      installDefaultSkillsUseCase.execute.mockRejectedValue(error);

      await expect(
        useCase.execute({
          baseDirectory: BASE_DIRECTORY,
          currentCliVersion: '0.28.1',
        }),
      ).rejects.toBe(error);
      expect(lockFileRepository.write).not.toHaveBeenCalled();
    });

    it('propagates errors from the lockfile write', async () => {
      lockFileRepository.read.mockResolvedValue(
        buildLockFile({ cliVersion: '0.27.0' }),
      );
      const error = new Error('disk full');
      lockFileRepository.write.mockRejectedValue(error);

      await expect(
        useCase.execute({
          baseDirectory: BASE_DIRECTORY,
          currentCliVersion: '0.28.1',
        }),
      ).rejects.toBe(error);
    });
  });
});
