import { GitProviderNotFoundError, GitRepo } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { IGitRepo } from '../../domain/repositories/IGitRepo';
import { IGitRepoFactory } from '../../domain/repositories/IGitRepoFactory';
import { GitProviderService } from '../GitProviderService';

const origin = 'ResolvedGitRepoService';

/**
 * Short on purpose: this window is what defers a rotated credential taking
 * effect, and a revoked on-prem GitHub App being noticed.
 */
const RESOLVED_REPO_REUSE_MS = 10_000;

type ResolvedGitRepo = {
  /**
   * The in-flight resolution, not its result. Stored before the first await so
   * concurrent misses on one key share it: otherwise both resolve, and the one
   * that finishes last wins — which can put a client built from just-rotated
   * credentials behind one built from the old ones.
   */
  instance: Promise<IGitRepo>;
  expiresAt: number;
};

/**
 * The single "given a GitRepo, give me an IGitRepo" path for the read side.
 * Every file read goes through `IGitPort.getFileFromRepo`, so reuse here
 * covers all of them.
 */
export class ResolvedGitRepoService {
  private readonly resolvedRepos = new Map<string, ResolvedGitRepo>();

  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoFactory: IGitRepoFactory,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  // `async` with no `await` on purpose: only native async methods are given a
  // span, and the body must stay synchronous — see the cache write below.
  async resolve(gitRepo: GitRepo): Promise<IGitRepo> {
    const key = ResolvedGitRepoService.cacheKey(gitRepo);

    const cached = this.resolvedRepos.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.instance;
    }

    this.evictExpired();

    const pending = this.build(gitRepo);

    // Set synchronously — an await here would reopen the race this closes. The
    // window therefore runs from when the credentials were read, not from when
    // the client was built.
    this.resolvedRepos.set(key, {
      instance: pending,
      expiresAt: Date.now() + RESOLVED_REPO_REUSE_MS,
    });

    // Failures are deliberately not cached. Guarded on identity so a newer
    // entry is left alone.
    pending.catch(() => {
      if (this.resolvedRepos.get(key)?.instance === pending) {
        this.resolvedRepos.delete(key);
      }
    });

    return pending;
  }

  private async build(gitRepo: GitRepo): Promise<IGitRepo> {
    const provider = await this.gitProviderService.findGitProviderById(
      gitRepo.providerId,
    );

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
  }

  /**
   * Keyed on what the factory actually reads, so two rows pointing at the same
   * branch through the same provider share one instance. `gitRepo.id` is
   * excluded on purpose — some callers mint a synthetic one per call.
   */
  private static cacheKey(gitRepo: GitRepo): string {
    return `${gitRepo.providerId}|${gitRepo.owner}/${gitRepo.repo}@${gitRepo.branch ?? ''}`;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, resolved] of this.resolvedRepos) {
      if (now >= resolved.expiresAt) {
        this.resolvedRepos.delete(key);
      }
    }
  }
}
