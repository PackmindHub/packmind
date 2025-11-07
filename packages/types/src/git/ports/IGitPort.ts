import { GitProvider, GitProviderId } from '../GitProvider';
import { GitRepo } from '../GitRepo';
import { GitRepoId } from '../GitRepoId';
import { GitCommit } from '../GitCommit';
import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import {
  HandleWebHookWithoutContentCommand,
  HandleWebHookWithoutContentResult,
  HandleWebHookCommand,
  HandleWebHookResult,
  AddGitProviderCommand,
  AddGitRepoCommand,
  GetAvailableRemoteDirectoriesCommand,
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  ExternalRepository,
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
} from '../contracts';
import type { QueryOption } from '../../database/types';

export interface IGitPort {
  /**
   * List all git providers for an organization
   *
   * @param organizationId - The organization ID
   * @returns Promise of array of git providers
   */
  listProviders(organizationId: OrganizationId): Promise<GitProvider[]>;

  /**
   * Get all repositories for an organization
   *
   * @param organizationId - The organization ID
   * @returns Promise of array of git repositories
   */
  getOrganizationRepositories(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]>;

  /**
   * Get a repository by its ID
   *
   * @param repositoryId - The repository ID
   * @returns Promise of git repository or null if not found
   */
  getRepositoryById(repositoryId: GitRepoId): Promise<GitRepo | null>;

  /**
   * Commit files to a git repository
   *
   * @param repo - The git repository
   * @param files - Array of files to commit with path and content
   * @param commitMessage - The commit message
   * @returns Promise of git commit
   */
  commitToGit(
    repo: GitRepo,
    files: { path: string; content: string }[],
    commitMessage: string,
  ): Promise<GitCommit>;

  /**
   * Get file content from a git repository
   *
   * @param gitRepo - The git repository
   * @param filePath - The path to the file
   * @param branch - Optional branch name (defaults to repository default branch)
   * @returns Promise of file data with sha and content, or null if file doesn't exist
   */
  getFileFromRepo(
    gitRepo: GitRepo,
    filePath: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null>;

  /**
   * Handle webhook payload for a git repository with file content
   *
   * @param command - The webhook command
   * @returns Promise of webhook result with file paths and content
   */
  handleWebHook(command: HandleWebHookCommand): Promise<HandleWebHookResult>;

  /**
   * Handle webhook payload for a git repository without fetching file content
   *
   * @param command - The webhook command
   * @returns Promise of webhook result with file paths but without content
   */
  handleWebHookWithoutContent(
    command: HandleWebHookWithoutContentCommand,
  ): Promise<HandleWebHookWithoutContentResult>;

  /**
   * Add a new git provider for an organization
   *
   * @param command - Command containing git provider details and user/organization context
   * @returns Promise of the created git provider
   */
  addGitProvider(command: AddGitProviderCommand): Promise<GitProvider>;

  /**
   * Add a new git repository to a provider
   *
   * @param command - Command containing repository details and user/organization context
   * @returns Promise of the created git repository
   */
  addGitRepo(command: AddGitRepoCommand): Promise<GitRepo>;

  /**
   * Delete a git provider
   *
   * @param id - The git provider ID
   * @param userId - The user ID performing the deletion
   * @param organizationId - The organization ID
   * @param force - Optional flag to force deletion even if repositories exist
   * @returns Promise that resolves when deletion is complete
   */
  deleteGitProvider(
    id: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
    force?: boolean,
  ): Promise<void>;

  /**
   * Delete a git repository
   *
   * @param repositoryId - The repository ID
   * @param userId - The user ID performing the deletion
   * @param organizationId - The organization ID
   * @param providerId - Optional provider ID for validation
   * @returns Promise that resolves when deletion is complete
   */
  deleteGitRepo(
    repositoryId: GitRepoId,
    userId: UserId,
    organizationId: OrganizationId,
    providerId?: GitProviderId,
  ): Promise<void>;

  /**
   * List available repositories from a git provider
   *
   * @param gitProviderId - The git provider ID
   * @returns Promise of array of available repositories
   */
  listAvailableRepos(
    gitProviderId: GitProviderId,
  ): Promise<ExternalRepository[]>;

  /**
   * Check if a branch exists in a repository
   *
   * @param gitProviderId - The git provider ID
   * @param owner - The repository owner
   * @param repo - The repository name
   * @param branch - The branch name to check
   * @returns Promise of boolean indicating if branch exists
   */
  checkBranchExists(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean>;

  /**
   * Update a git provider
   *
   * @param id - The git provider ID
   * @param gitProvider - Partial git provider data to update
   * @param userId - The user ID performing the update
   * @param organizationId - The organization ID
   * @returns Promise of the updated git provider
   */
  updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<GitProvider>;

  /**
   * Get available remote directories in a repository
   *
   * @param command - Command containing repository details and path
   * @returns Promise of array of directory paths
   */
  getAvailableRemoteDirectories(
    command: GetAvailableRemoteDirectoriesCommand,
  ): Promise<string[]>;

  /**
   * Check if a directory exists in a repository
   *
   * @param command - Command containing repository details and directory path
   * @returns Promise of directory existence result
   */
  checkDirectoryExistence(
    command: CheckDirectoryExistenceCommand,
  ): Promise<CheckDirectoryExistenceResult>;

  /**
   * List all repositories for a git provider
   *
   * @param gitProviderId - The git provider ID
   * @returns Promise of array of git repositories
   */
  listRepos(gitProviderId: GitProviderId): Promise<GitRepo[]>;

  /**
   * Add a single file to a git repository
   *
   * @param repo - The git repository
   * @param path - The path where the file should be added
   * @param content - The content of the file
   * @returns Promise of git commit
   */
  addFileToGit(
    repo: GitRepo,
    path: string,
    content: string,
  ): Promise<GitCommit>;

  /**
   * Find a git repository by owner and repo name
   *
   * @param owner - The repository owner
   * @param repo - The repository name
   * @param opts - Optional query options (e.g., includeDeleted)
   * @returns Promise of git repository or null if not found
   */
  findGitRepoByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null>;

  /**
   * Find a git repository by owner, repo name, and branch within an organization
   *
   * @param command - Command containing owner, repo, branch, and organization context
   * @returns Promise of git repository result
   */
  findGitRepoByOwnerRepoAndBranchInOrganization(
    command: FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  ): Promise<FindGitRepoByOwnerRepoAndBranchInOrganizationResult>;
}
