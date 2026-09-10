import {
  GitProvider,
  GitProviderId,
  GitProviderNotFoundError,
  GitRepo,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { IGitRepo } from '../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';
import { IGitProviderRepository } from '../../domain/repositories/IGitProviderRepository';

const origin = 'ResolvedGitRepoService';

/**
 * Short on purpose: this window is what defers a rotated credential taking
 * effect, and a revoked on-prem GitHub App being noticed.
 */
const RESOLVED_REPO_REUSE_MS = 10_000;

type Windowed<V> = {
  value: Promise<V>;
  expiresAt: number;
};

/**
 * The single "given a GitRepo, give me an IGitRepo" path.
 *
 * Depends on the repository rather than `GitProviderService` because most of
 * its callers live inside that service.
 */
export class ResolvedGitRepoService {
  private readonly providers = new Map<string, Windowed<GitProvider | null>>();
  private readonly repos = new Map<string, Windowed<IGitRepo>>();

  constructor(
    private readonly gitProviderRepository: IGitProviderRepository,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /**
   * The provider row. Exposed so a caller can run its own checks on it without
   * paying for a second read — the checks differ per caller and are theirs.
   */
  async getProvider(providerId: GitProviderId): Promise<GitProvider | null> {
    return this.reuse(
      this.providers,
      providerId,
      () => this.gitProviderRepository.findById(providerId),
      // A miss must stay a miss: a connection created inside the window has to
      // be visible to the next read.
      (provider) => provider !== null,
    );
  }

  async resolve(gitRepo: GitRepo): Promise<IGitRepo> {
    return this.reuse(
      this.repos,
      ResolvedGitRepoService.cacheKey(gitRepo),
      async () => {
        const provider = await this.getProvider(gitRepo.providerId);

        if (!provider) {
          throw new GitProviderNotFoundError(gitRepo.providerId);
        }

        this.logger.debug('Resolving git repository', {
          owner: gitRepo.owner,
          repo: gitRepo.repo,
          branch: gitRepo.branch,
          providerId: gitRepo.providerId,
        });

        return this.gitRepoFactory.createGitRepo(gitRepo, provider);
      },
      () => true,
    );
  }

  /**
   * Holds the in-flight work, not its result, and writes it before the first
   * await: concurrent misses on one key have to share it, or the slower one
   * overwrites the faster and can put stale credentials back in front.
   */
  private reuse<V>(
    store: Map<string, Windowed<V>>,
    key: string,
    start: () => Promise<V>,
    keep: (value: V) => boolean,
  ): Promise<V> {
    const cached = store.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    this.evictExpired(store);

    const pending = start();
    store.set(key, {
      value: pending,
      expiresAt: Date.now() + RESOLVED_REPO_REUSE_MS,
    });

    const forget = () => {
      if (store.get(key)?.value === pending) {
        store.delete(key);
      }
    };
    pending.then((value) => {
      if (!keep(value)) {
        forget();
      }
    }, forget);

    return pending;
  }

  /**
   * Keyed on what the factory actually reads, so two rows pointing at the same
   * branch through the same provider share one instance. `gitRepo.id` is
   * excluded on purpose — some callers mint a synthetic one per call.
   */
  private static cacheKey(gitRepo: GitRepo): string {
    return `${gitRepo.providerId}|${gitRepo.owner}/${gitRepo.repo}@${gitRepo.branch ?? ''}`;
  }

  private evictExpired<V>(store: Map<string, Windowed<V>>): void {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.expiresAt) {
        store.delete(key);
      }
    }
  }
}
