import {
  BaseHexa,
  HexaRegistry,
  PackmindLogger,
  QueryOption,
  IDeploymentPort,
  BaseHexaOpts,
} from '@packmind/shared';
import { GitHexaFactory } from './GitHexaFactory';
import { GitProvider, GitProviderId } from './domain/entities/GitProvider';
import { GitRepo, GitRepoId } from './domain/entities/GitRepo';
import { GitCommit } from './domain/entities/GitCommit';
import { OrganizationId, UserId } from '@packmind/accounts';
import { AddGitRepoCommand } from './domain/useCases/IAddGitRepo';
import { FindGitRepoByOwnerRepoAndBranchInOrganizationCommand } from './domain/useCases/IFindGitRepoByOwnerRepoAndBranchInOrganization';
import {
  UserProvider,
  OrganizationProvider,
  GetAvailableRemoteDirectoriesCommand,
} from '@packmind/shared';
import {
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
} from '@packmind/shared';
import { IGitRepoFactory } from './domain/repositories/IGitRepoFactory';
import { AddGitProviderCommand } from './application/useCases/addGitProvider/addGitProvider.usecase';

const origin = 'GitHexa';

/**
 * GitHexa - Facade for the Git domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for git-related functionality.
 * It holds the GitHexa instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - GitHexaFactory: Handles dependency injection and service instantiation
 * - GitHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */

export type GitHexaOpts = BaseHexaOpts & {
  gitRepoFactory?: IGitRepoFactory;
};

const BaseGitHexaOpts: GitHexaOpts = { logger: new PackmindLogger(origin) };

export class GitHexa extends BaseHexa<GitHexaOpts> {
  private readonly hexa: GitHexaFactory;

  constructor(registry: HexaRegistry, opts?: Partial<GitHexaOpts>) {
    super(registry, { ...BaseGitHexaOpts, ...opts });
    this.logger.info('Initializing GitHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Initialize the hexagon with the shared DataSource
      this.hexa = new GitHexaFactory(dataSource, {
        ...BaseGitHexaOpts,
        ...opts,
      });
      this.logger.info('GitHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the deployments adapter for creating default targets
   */
  public setDeploymentsAdapter(adapter: IDeploymentPort): void {
    this.hexa.setDeploymentsAdapter(adapter);
  }

  /**
   * Destroys the GitHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying GitHexa');
    // Add any cleanup logic here if needed
    this.logger.info('GitHexa destroyed');
  }

  // ======================
  // GIT PROVIDER USE CASES
  // ======================

  /**
   * Add a new git provider to an organization
   */
  public async addGitProvider(
    command: AddGitProviderCommand,
  ): Promise<GitProvider> {
    return this.hexa.useCases.addGitProvider(command);
  }

  /**
   * List all git providers for an organization
   */
  public async listProviders(
    organizationId: OrganizationId,
  ): Promise<GitProvider[]> {
    return this.hexa.useCases.listProviders(organizationId);
  }

  /**
   * Configure the admin user provider used for access validation
   */
  public setUserProvider(provider: UserProvider): void {
    this.hexa.useCases.setUserProvider(provider);
  }

  /**
   * Configure the organization provider used for access validation
   */
  public setOrganizationProvider(provider: OrganizationProvider): void {
    this.hexa.useCases.setOrganizationProvider(provider);
  }

  /**
   * Update an existing git provider
   */
  public async updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<GitProvider> {
    return this.hexa.useCases.updateGitProvider(
      id,
      gitProvider,
      userId,
      organizationId,
    );
  }

  /**
   * Delete a git provider
   */
  public async deleteGitProvider(
    id: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    return this.hexa.useCases.deleteGitProvider(id, userId, organizationId);
  }

  /**
   * List available repositories from a git provider (external repositories)
   */
  public async listAvailableRepos(gitProviderId: GitProviderId): Promise<
    {
      name: string;
      owner: string;
      description?: string;
      private: boolean;
      defaultBranch: string;
      language?: string;
      stars: number;
    }[]
  > {
    return this.hexa.useCases.listAvailableRepos(gitProviderId);
  }

  /**
   * Check if a branch exists in a repository
   */
  public async checkBranchExists(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    return this.hexa.useCases.checkBranchExists(
      gitProviderId,
      owner,
      repo,
      branch,
    );
  }

  /**
   * Get available targets (directories) from a git repository
   */
  public async getAvailableRemoteDirectories(
    command: GetAvailableRemoteDirectoriesCommand,
  ): Promise<string[]> {
    return this.hexa.useCases.getAvailableRemoteDirectories(command);
  }

  // ====================
  // GIT REPO USE CASES
  // ====================

  /**
   * Add a git repository to track
   */
  public async addGitRepo(command: AddGitRepoCommand): Promise<GitRepo> {
    return this.hexa.useCases.addGitRepo(command);
  }

  /**
   * Find a git repository by owner and repo name
   */
  public async findGitRepoByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    return this.hexa.useCases.findGitRepoByOwnerAndRepo(owner, repo, opts);
  }

  public async findGitRepoByOwnerRepoAndBranchInOrganization(
    command: FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  ): Promise<GitRepo | null> {
    return this.hexa.useCases.findGitRepoByOwnerRepoAndBranchInOrganization(
      command,
    );
  }

  /**
   * List repositories associated with a git provider
   */
  public async listRepos(gitProviderId: GitProviderId): Promise<GitRepo[]> {
    return this.hexa.useCases.listRepos(gitProviderId);
  }

  /**
   * Get all repositories for an organization
   */
  public async getOrganizationRepositories(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    return this.hexa.useCases.getOrganizationRepositories(organizationId);
  }

  /**
   * Get a repository by its ID
   */
  public async getRepositoryById(
    repositoryId: GitRepoId,
  ): Promise<GitRepo | null> {
    return this.hexa.useCases.getRepositoryById(repositoryId);
  }

  /**
   * Delete a git repository
   */
  public async deleteGitRepo(
    repositoryId: GitRepoId,
    userId: UserId,
    organizationId: OrganizationId,
    providerId?: GitProviderId,
  ): Promise<void> {
    return this.hexa.useCases.deleteGitRepo(
      repositoryId,
      userId,
      organizationId,
      providerId,
    );
  }

  public async commitToGit(
    repo: GitRepo,
    files: { path: string; content: string }[],
    commitMessage: string,
  ): Promise<GitCommit> {
    return this.hexa.useCases.commitToGit(repo, files, commitMessage);
  }

  /**
   * Handle webhook payload for a git repository
   */
  public async handleWebHook(
    gitRepo: GitRepo,
    payload: unknown,
    fileMatcher: RegExp,
  ): Promise<(GitCommit & { filePath: string; fileContent: string })[]> {
    return this.hexa.useCases.handleWebHook(gitRepo, payload, fileMatcher);
  }

  public async addFileToGit(repo: GitRepo, path: string, content: string) {
    return this.hexa.useCases.addFileToGit(repo, path, content);
  }

  public async getFileFromRepo(
    gitRepo: GitRepo,
    filePath: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null> {
    return this.hexa.useCases.getFileFromRepo(gitRepo, filePath, branch);
  }

  /**
   * Check if a directory exists in a git repository
   */
  public async checkDirectoryExistence(
    command: CheckDirectoryExistenceCommand,
  ): Promise<CheckDirectoryExistenceResult> {
    return this.hexa.useCases.checkDirectoryExistence(command);
  }
}
