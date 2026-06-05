import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import type { QueryOption } from '../../database/types';
import {
  AddGitProviderCommand,
  AddGitRepoCommand,
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  CheckProviderAuthCommand,
  CheckProviderAuthResponse,
  ExternalRepository,
  FetchFileContentInput,
  FetchFileContentOutput,
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
  GetAvailableRemoteDirectoriesCommand,
  HandleWebHookCommand,
  HandleWebHookResult,
  HandleWebHookWithoutContentCommand,
  HandleWebHookWithoutContentResult,
  ListProvidersCommand,
  ListProvidersResponse,
} from '../contracts';
import { GitCommit } from '../GitCommit';
import { GitProvider, GitProviderId } from '../GitProvider';
import { GitRepo } from '../GitRepo';
import { GitRepoId } from '../GitRepoId';
import { DeleteItem, FileModification } from '../../deployments/FileUpdates';
import { OrganizationGitHubApp } from '../OrganizationGitHubApp';

export const IGitPortName = 'IGitPort' as const;

export interface IGitPort {
  /**
   * List all git providers for an organization
   *
   * @param command - Command containing userId and organizationId
   * @returns Promise of list providers response with providers array
   */
  listProviders(command: ListProvidersCommand): Promise<ListProvidersResponse>;

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
   * @param files - Array of file modifications to commit (can contain full content or sections)
   * @param commitMessage - The commit message
   * @param deleteFiles - Optional array of files to delete in the same commit
   * @returns Promise of git commit
   */
  commitToGit(
    repo: GitRepo,
    files: FileModification[],
    commitMessage: string,
    deleteFiles?: DeleteItem[],
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
   * Ensure a branch exists on a git repository, creating it from a base branch
   * if missing. No-op when the target branch already exists.
   *
   * Used by the marketplace-publish flow to bootstrap the rolling `packmind/sync`
   * branch from the marketplace's default branch on the first publish.
   *
   * @param repo - The git repository (its `branch` field is the BASE branch used when creating)
   * @param branch - The target branch name to ensure exists
   * @returns Promise resolving when the branch is guaranteed to exist
   */
  createBranchFromBase(repo: GitRepo, branch: string): Promise<void>;

  /**
   * Open a pull request on a git repository, or update an existing one when a PR
   * with the same `head → base` already exists (rolling-PR semantics).
   *
   * Idempotent: if a PR matching `head → base` is already open, the existing one
   * is returned untouched (no second PR is created). Used by the
   * marketplace-publish flow to keep a single "Packmind sync" PR per marketplace.
   *
   * @param repo - The git repository (its `branch` field is the BASE branch)
   * @param command - PR head / title / body
   * @returns Promise of the PR URL and number
   */
  openOrUpdatePullRequest(
    repo: GitRepo,
    command: {
      head: string;
      title: string;
      body?: string;
    },
  ): Promise<{ url: string; number: number; wasCreated: boolean }>;

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
   * Find an existing GitHub App provider for a given organization and
   * installation id. Used by the install-callback flow to make a re-run
   * idempotent: if a provider already exists for the same installation we
   * reuse it instead of inserting a duplicate row.
   *
   * @param organizationId - The organization ID
   * @param appInstallationId - The GitHub App installation ID
   * @returns Promise of the matching provider, or null if none exists
   */
  findGitProviderByAppInstallation(
    organizationId: OrganizationId,
    appInstallationId: number,
  ): Promise<GitProvider | null>;

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
   * Probe a git provider's stored credentials against the upstream API to
   * determine whether they still work. Used by the connection drawer to
   * surface a live status instead of relying on whether credentials are
   * merely present in the database.
   *
   * @param command - Command containing the gitProviderId and member context
   * @returns Promise resolving to `{ ok: true }` or `{ ok: false, reason }`
   */
  checkProviderAuth(
    command: CheckProviderAuthCommand,
  ): Promise<CheckProviderAuthResponse>;

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

  /**
   * Queue a job to fetch file content from a git repository asynchronously
   *
   * Takes the output from handleWebHookWithoutContent and enriches it with file content,
   * producing the same format as handleWebHook.
   *
   * @param input - Parameters containing repository ID and files from handleWebHookWithoutContent
   * @param onComplete - Optional callback to execute when the job completes successfully
   * @returns Job ID that can be used to track the job status
   */
  addFetchFileContentJob(
    input: FetchFileContentInput,
    onComplete?: (result: FetchFileContentOutput) => Promise<void> | void,
  ): Promise<string>;

  /**
   * Persist (upsert) an OrganizationGitHubApp record.
   * If an active record already exists for the org it is revoked first,
   * then the new record is inserted (within a transaction).
   * Used exclusively by the OSS manifest-callback flow.
   *
   * @param app - The fully-populated OrganizationGitHubApp to persist
   * @returns The persisted (decrypted) record
   */
  upsertOrganizationGitHubApp(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp>;

  /**
   * Returns the active (non-revoked) OrganizationGitHubApp for the given org,
   * or null if none exists.
   *
   * @param orgId - The organization ID
   * @returns The active app record, or null
   */
  getActiveOrganizationGitHubApp(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null>;

  /**
   * Marks the active OrganizationGitHubApp for the given org as revoked.
   * No-ops if no active record exists.
   * Note: this does NOT cascade-delete existing GitProvider rows pointing at this org.
   * Those providers will start failing at next token mint. Admin must re-register
   * and users will need to re-install the new app.
   *
   * @param orgId - The organization ID
   */
  revokeOrganizationGitHubApp(orgId: OrganizationId): Promise<void>;
}
