import semver from 'semver';
import {
  ICheckCliVersionCommand,
  ICheckCliVersionResult,
  ICheckCliVersionUseCase,
} from '../../domain/useCases/ICheckCliVersionUseCase';
import { fetchLatestVersionFromGitHub } from '../../infra/commands/updateHandler';

const VERSION_CHECK_TIMEOUT_MS = 5000;

export interface ICheckCliVersionDependencies {
  fetchLatestVersion: (fetchFn: typeof fetch) => Promise<string>;
  fetchFn: typeof fetch;
  timeoutMs: number;
}

export class CheckCliVersionUseCase implements ICheckCliVersionUseCase {
  private readonly deps: ICheckCliVersionDependencies;

  constructor(deps?: Partial<ICheckCliVersionDependencies>) {
    this.deps = {
      fetchLatestVersion:
        deps?.fetchLatestVersion ?? fetchLatestVersionFromGitHub,
      fetchFn: deps?.fetchFn ?? fetch,
      timeoutMs: deps?.timeoutMs ?? VERSION_CHECK_TIMEOUT_MS,
    };
  }

  async execute(
    command: ICheckCliVersionCommand,
  ): Promise<ICheckCliVersionResult | null> {
    try {
      const latestVersion = await Promise.race([
        this.deps.fetchLatestVersion(this.deps.fetchFn),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Version check timed out')),
            this.deps.timeoutMs,
          ),
        ),
      ]);
      const updateAvailable = semver.gt(latestVersion, command.currentVersion);

      return {
        currentVersion: command.currentVersion,
        latestVersion,
        updateAvailable,
      };
    } catch {
      return null;
    }
  }
}
