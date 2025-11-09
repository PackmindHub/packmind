import { GitRepo, GitRepoId, createGitRepoId } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
import { IGitRepoRepository } from '../domain/repositories/IGitRepoRepository';
import { OrganizationId, UserId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { QueryOption } from '@packmind/types';

export class GitRepoService {
  constructor(private readonly gitRepoRepository: IGitRepoRepository) {}

  async addGitRepo(gitRepo: Omit<GitRepo, 'id'>): Promise<GitRepo> {
    const gitRepoWithId = {
      ...gitRepo,
      id: createGitRepoId(uuidv4()),
    };
    return this.gitRepoRepository.add(gitRepoWithId);
  }

  async findGitRepoById(id: GitRepoId): Promise<GitRepo | null> {
    return this.gitRepoRepository.findById(id);
  }

  async findGitRepoByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    return this.gitRepoRepository.findByOwnerAndRepo(owner, repo, opts);
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
      opts,
    );
  }

  async findGitReposByProviderId(
    providerId: GitProviderId,
  ): Promise<GitRepo[]> {
    return this.gitRepoRepository.findByProviderId(providerId);
  }

  async findGitReposByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    return this.gitRepoRepository.findByOrganizationId(organizationId);
  }

  async listGitRepos(organizationId?: OrganizationId): Promise<GitRepo[]> {
    return this.gitRepoRepository.list(organizationId);
  }

  async deleteGitRepo(id: GitRepoId, userId: UserId): Promise<void> {
    return this.gitRepoRepository.deleteById(id, userId);
  }
}
