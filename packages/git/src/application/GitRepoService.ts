import { GitRepo, GitRepoId, createGitRepoId } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
import { IGitRepoRepository } from '../domain/repositories/IGitRepoRepository';
import { OrganizationId, UserId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { QueryOption } from '@packmind/types';

/**
 * Service surface for `GitRepo` persistence.
 *
 * All public finders defined here default to `type='standard'` so that
 * marketplace-typed repositories never leak into skill/standard deployment
 * flows. Marketplace-aware variants must be opted into explicitly via the
 * `findMarketplace*` and `findGitRepoIgnoringType` methods.
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
   * Find a standard-type GitRepo by id.
   *
   * Marketplace-typed repos are filtered out so a stale marketplace id passed
   * to a standard-flow caller resolves to `null` rather than leaking the
   * marketplace row.
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

  async listGitRepos(organizationId?: OrganizationId): Promise<GitRepo[]> {
    return this.gitRepoRepository.list(organizationId, { type: 'standard' });
  }

  async deleteGitRepo(id: GitRepoId, userId: UserId): Promise<void> {
    return this.gitRepoRepository.deleteById(id, userId);
  }

  // ---------------------------------------------------------------------------
  // Marketplace-aware variants — explicitly opted into by marketplace use cases.
  // ---------------------------------------------------------------------------

  /**
   * Find a marketplace-typed GitRepo by id.
   *
   * Returns null when no row is found or when the row's type is not
   * `'marketplace'`. Used by the reconciliation job to load the underlying
   * `GitRepo` for a `Marketplace` without leaking standard-typed rows.
   */
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
   * Find a GitRepo by id without any type filter.
   *
   * Used by `DeleteGitRepoUseCase`, which serves both standard and
   * marketplace deletion paths. The use case looks up the repo by id and
   * then enforces type-appropriate authorization downstream.
   */
  async findGitRepoByIdIgnoringType(id: GitRepoId): Promise<GitRepo | null> {
    return this.gitRepoRepository.findById(id);
  }

  /**
   * Find a marketplace-typed GitRepo by owner/repo within an organization.
   *
   * Excludes standard-typed repos.
   */
  async findMarketplaceGitRepo(
    organizationId: OrganizationId,
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findByOwnerAndRepoInOrganization(
      owner,
      repo,
      organizationId,
      { ...opts, type: 'marketplace' },
    );
  }

  /**
   * List all marketplace-typed GitRepos for an organization.
   */
  async findMarketplaceGitReposByOrganization(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    return this.gitRepoRepository.findByOrganizationId(organizationId, {
      type: 'marketplace',
    });
  }

  /**
   * Find a GitRepo by owner/repo within an organization without any type
   * filter. Used by `LinkMarketplaceUseCase` for its pre-flight collision
   * check between standard and marketplace types.
   */
  async findGitRepoIgnoringType(
    organizationId: OrganizationId,
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findByOwnerAndRepoInOrganization(
      owner,
      repo,
      organizationId,
      { ...opts, type: 'any' },
    );
  }
}
