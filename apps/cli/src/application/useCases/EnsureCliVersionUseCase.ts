import semver from 'semver';
import {
  EnsureCliVersionOutcome,
  IEnsureCliVersionCommand,
  IEnsureCliVersionUseCase,
} from '../../domain/useCases/IEnsureCliVersionUseCase';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { IInstallDefaultSkillsUseCase } from '../../domain/useCases/IInstallDefaultSkillsUseCase';
import { stripPrerelease } from '../utils/normalizeSemver';

/**
 * Compares the running CLI version against the `cliVersion` recorded in
 * `packmind-lock.json` and reconciles any drift.
 *
 * - When the running CLI is newer than the recorded version, the use case
 *   triggers a default-skills install (which silently prunes obsolete
 *   skills) and rewrites the lockfile with the new `cliVersion`.
 * - When the running CLI is older than the recorded version, the use case
 *   simply reports the situation; the caller decides whether to warn.
 * - When the lockfile is missing or has no `cliVersion`, the use case is a
 *   no-op; the next mutating command will populate the field.
 *
 * Pre-release suffixes (e.g. `-next`) are stripped for comparison via
 * {@link stripPrerelease}, but the verbatim `currentCliVersion` is written
 * to the lockfile when an upgrade is detected.
 */
export class EnsureCliVersionUseCase implements IEnsureCliVersionUseCase {
  constructor(
    private readonly lockFileRepository: ILockFileRepository,
    private readonly installDefaultSkillsUseCase: IInstallDefaultSkillsUseCase,
  ) {}

  public async execute(
    command: IEnsureCliVersionCommand,
  ): Promise<EnsureCliVersionOutcome> {
    const { baseDirectory, currentCliVersion, includeBeta } = command;

    const lockFile = await this.lockFileRepository.read(baseDirectory);
    if (!lockFile) {
      return { kind: 'no-lockfile' };
    }

    const lockVersion = lockFile.cliVersion;
    if (!lockVersion) {
      return { kind: 'no-cli-version-recorded' };
    }

    const normalizedCurrent = stripPrerelease(currentCliVersion);
    const normalizedLock = stripPrerelease(lockVersion);

    if (semver.eq(normalizedCurrent, normalizedLock)) {
      return { kind: 'match' };
    }

    if (semver.gt(normalizedCurrent, normalizedLock)) {
      await this.installDefaultSkillsUseCase.execute({
        baseDirectory,
        cliVersion: currentCliVersion,
        includeBeta,
      });
      await this.lockFileRepository.write(baseDirectory, {
        ...lockFile,
        cliVersion: currentCliVersion,
      });
      return { kind: 'newer', lockVersion, upgraded: true };
    }

    return { kind: 'older', lockVersion };
  }
}
