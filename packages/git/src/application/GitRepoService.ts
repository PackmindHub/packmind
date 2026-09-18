import { GitRepo, GitRepoId, createGitRepoId } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
import { IGitRepoRepository } from '../domain/repositories/IGitRepoRepository';
import { OrganizationId, UserId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { QueryOption } from '@packmind/types';

/**
 * Every finder here defaults to `type='standard'` so marketplace-typed
 * repositories never leak into standard deployment flows. Marketplace-aware
 * callers must opt in explicitly through the `findMarketplace*` and
 * `find*IgnoringType` methods.
 */
export class GitRepoService {
  constructor(private readonly gitRepoRepository: IGitRepoRepository) {}

  async addGitRepo(gitRepo: Omit<GitRepo, 'id'>): Promise<GitRepo> {
    const gitRepoWithId = {
      ...gitRepo,
      id: createGitRepoId(uuidv4()),
    };
    return this.gitRepoRepository.add(gitRepoWithId);
  }

  /**
   * A stale marketplace id passed by a standard-flow caller resolves to `null`
   * rather than leaking the marketplace row.
   */
  async findGitRepoById(id: GitRepoId): Promise<GitRepo | null> {
    const gitRepo = await this.gitRepoRepository.findById(id);
    if (!gitRepo) {
      return null;
    }
    if (gitRepo.type !== 'standard') {
      return null;
    }
    return gitRepo;
  }

  async findGitRepoByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findByOwnerAndRepo(owner, repo, {
      ...opts,
      type: 'standard',
    });
  }

  async findGitRepoByOwnerRepoAndBranchInOrganization(
    owner: string,
    repo: string,
    branch: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findByOwnerRepoAndBranchInOrganization(
      owner,
      repo,
      branch,
      organizationId,
      { ...opts, type: 'standard' },
    );
  }

  async findGitReposByProviderId(
    providerId: GitProviderId,
  ): Promise<GitRepo[]> {
    return this.gitRepoRepository.findByProviderId(providerId, {
      type: 'standard',
    });
  }

  async findGitReposByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    return this.gitRepoRepository.findByOrganizationId(organizationId, {
      type: 'standard',
    });
  }

  async deleteGitRepo(id: GitRepoId, userId: UserId): Promise<void> {
    return this.gitRepoRepository.deleteById(id, userId);
  }

  async findTrackedByOwnerRepoInOrganization(
    organizationId: OrganizationId,
    owner: string,
    repo: string,
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findTrackedByOwnerRepoInOrganization(
      organizationId,
      owner,
      repo,
    );
  }

  async updateTracked(
    gitRepoId: GitRepoId,
    isTracked: boolean,
  ): Promise<GitRepo> {
    return this.gitRepoRepository.updateTracked(gitRepoId, isTracked);
  }

  async markTrackingRemoved(gitRepoId: GitRepoId): Promise<GitRepo> {
    return this.gitRepoRepository.markTrackingRemoved(gitRepoId);
  }

  /**
   * Matches tracked and untracked repos alike, so a caller can tell "connected
   * to Packmind but not governed" apart from "never seen this repository".
   */
  async findByOwnerAndRepoInOrganization(
    owner: string,
    repo: string,
    organizationId: OrganizationId,
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findByOwnerAndRepoInOrganization(
      owner,
      repo,
      organizationId,
    );
  }

  // ---------------------------------------------------------------------------
  // Marketplace-aware variants — explicitly opted into by marketplace use cases.
  // ---------------------------------------------------------------------------

  /** Mirror of `findGitRepoById`, rejecting standard-typed rows instead. */
  async findMarketplaceGitRepoById(id: GitRepoId): Promise<GitRepo | null> {
    const gitRepo = await this.gitRepoRepository.findById(id);
    if (!gitRepo) {
      return null;
    }
    if (gitRepo.type !== 'marketplace') {
      return null;
    }
    return gitRepo;
  }

  /**
   * For callers serving both standard and marketplace paths, which enforce
   * type-appropriate authorization themselves.
   */
  async findGitRepoByIdIgnoringType(id: GitRepoId): Promise<GitRepo | null> {
    return this.gitRepoRepository.findById(id);
  }

  /**
   * Pass `opts.providerId` to scope the lookup to a single Git provider: the
   * same `owner/repo` pair can legitimately exist on two providers within one
   * org (a GitHub and a GitLab `acme/plugins`), and a collision check must not
   * treat those as the same repository.
   */
  async findGitRepoIgnoringType(
    organizationId: OrganizationId,
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'> & { providerId?: GitProviderId },
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findByOwnerAndRepoInOrganization(
      owner,
      repo,
      organizationId,
      { ...opts, type: 'any' },
    );
  }
}
