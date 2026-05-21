import semver from 'semver';
import {
  ICheckCliVersionCommand,
  ICheckCliVersionResult,
  ICheckCliVersionUseCase,
} from '../../domain/useCases/ICheckCliVersionUseCase';
import { IVersionCacheProvider } from '../../domain/repositories/IVersionCacheProvider';
import { fetchLatestVersionFromGitHub } from '../../infra/commands/updateHandler';
import { FileVersionCacheProvider } from '../../infra/utils/versionCache/FileVersionCacheProvider';

const VERSION_CHECK_TIMEOUT_MS = 1500;
const VERSION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ICheckCliVersionDependencies {
  fetchLatestVersion: (fetchFn: typeof fetch) => Promise<string>;
  fetchFn: typeof fetch;
  timeoutMs: number;
  cacheProvider: IVersionCacheProvider;
  cacheTtlMs: number;
  now: () => Date;
}

export class CheckCliVersionUseCase implements ICheckCliVersionUseCase {
  private readonly deps: ICheckCliVersionDependencies;

  constructor(deps?: Partial<ICheckCliVersionDependencies>) {
    this.deps = {
      fetchLatestVersion:
        deps?.fetchLatestVersion ?? fetchLatestVersionFromGitHub,
      fetchFn: deps?.fetchFn ?? fetch,
      timeoutMs: deps?.timeoutMs ?? VERSION_CHECK_TIMEOUT_MS,
      cacheProvider: deps?.cacheProvider ?? new FileVersionCacheProvider(),
      cacheTtlMs: deps?.cacheTtlMs ?? VERSION_CACHE_TTL_MS,
      now: deps?.now ?? (() => new Date()),
    };
  }

  async execute(
    command: ICheckCliVersionCommand,
  ): Promise<ICheckCliVersionResult | null> {
    const cached = this.readFreshCache(command.currentVersion);
    if (cached) {
      return this.toResult(command.currentVersion, cached.latestVersion);
    }

    const fetchPromise = this.deps.fetchLatestVersion(this.deps.fetchFn);
    // If the timeout wins the race, the fetch promise will eventually settle
    // with an unobserved rejection. Swallow it to avoid unhandledRejection noise.
    fetchPromise.catch(() => undefined);

    try {
      const latestVersion = await Promise.race([
        fetchPromise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Version check timed out')),
            this.deps.timeoutMs,
          ),
        ),
      ]);

      this.deps.cacheProvider.write({
        latestVersion,
        checkedAt: this.deps.now(),
      });

      return this.toResult(command.currentVersion, latestVersion);
    } catch {
      return null;
    }
  }

  private readFreshCache(currentVersion: string) {
    const cached = this.deps.cacheProvider.read();
    if (!cached) {
      return null;
    }

    const age = this.deps.now().getTime() - cached.checkedAt.getTime();
    if (age < 0 || age >= this.deps.cacheTtlMs) {
      return null;
    }

    if (
      semver.valid(currentVersion) &&
      semver.valid(cached.latestVersion) &&
      semver.gte(currentVersion, cached.latestVersion)
    ) {
      return null;
    }

    return cached;
  }

  private toResult(
    currentVersion: string,
    latestVersion: string,
  ): ICheckCliVersionResult {
    return {
      currentVersion,
      latestVersion,
      updateAvailable: semver.gt(latestVersion, currentVersion),
    };
  }
}
