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
  instance: IGitRepo;
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

  async resolve(gitRepo: GitRepo): Promise<IGitRepo> {
    const key = ResolvedGitRepoService.cacheKey(gitRepo);

    const cached = this.resolvedRepos.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.instance;
    }

    this.evictExpired();

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

    const instance = await this.gitRepoFactory.createGitRepo(gitRepo, provider);

    // Failures are deliberately not cached.
    this.resolvedRepos.set(key, {
      instance,
      expiresAt: Date.now() + RESOLVED_REPO_REUSE_MS,
    });

    return instance;
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
