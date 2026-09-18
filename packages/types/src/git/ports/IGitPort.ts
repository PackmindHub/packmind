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
  FetchFileContentInput,
  FetchFileContentOutput,
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
  FindOrCreateGitRepoCommand,
  FindOrCreateGitRepoResponse,
  CheckTrackedBranchExistsCommand,
  CheckTrackedBranchExistsResponse,
  GetAvailableRemoteDirectoriesCommand,
  GetTrackedRepositoryCommand,
  GetTrackedRepositoryResponse,
  ListAvailableReposCommand,
  ListAvailableReposResponse,
  ListProvidersCommand,
  ListProvidersResponse,
  RemoveTrackedRepositoryCommand,
  RemoveTrackedRepositoryResponse,
  SetTrackedRepositoryCommand,
  SetTrackedRepositoryResponse,
  UpdateTrackedBranchCommand,
  UpdateTrackedBranchResponse,
} from '../contracts';
import { GitBranchComparison } from '../GitBranchComparison';
import { GitCommit } from '../GitCommit';
import { GitProvider, GitProviderId } from '../GitProvider';
import { GitRepo } from '../GitRepo';
import { GitRepoId } from '../GitRepoId';
import { DeleteItem, FileModification } from '../../deployments/FileUpdates';
import { OrganizationGitHubApp } from '../OrganizationGitHubApp';

export const IGitPortName = 'IGitPort' as const;

export interface IGitPort {
  listProviders(command: ListProvidersCommand): Promise<ListProvidersResponse>;

  getOrganizationRepositories(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]>;

  getRepositoryById(repositoryId: GitRepoId): Promise<GitRepo | null>;

  /** Deletions, when given, land in the same commit as the modifications. */
  commitToGit(
    repo: GitRepo,
    files: FileModification[],
    commitMessage: string,
    deleteFiles?: DeleteItem[],
  ): Promise<GitCommit>;

  /** `branch` defaults to the GitRepo's own `branch` when omitted. */
  getFileFromRepo(
    gitRepo: GitRepo,
    filePath: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null>;

  /**
   * Creates `branch` from `repo.branch` — note the direction: the repo's own
   * `branch` field is the BASE, the argument is the branch being created. No-op
   * when the target branch already exists.
   *
   * Used by the marketplace-publish flow to bootstrap the rolling `packmind/sync`
   * branch from the marketplace's default branch on the first publish.
   */
  createBranchFromBase(repo: GitRepo, branch: string): Promise<void>;

  /**
   * No-op when the branch is already absent. Used by the accept-drift flow to
   * retire the rolling `packmind/sync` branch so the next publish starts from a
   * clean merge-base against the default branch.
   */
  deleteBranch(repo: GitRepo, branch: string): Promise<void>;

  /**
   * Idempotent, with rolling-PR semantics: if a PR matching `head → base` is
   * already open, no second PR is created — the existing one has its title and
   * body refreshed and is returned. `repo.branch` is the BASE. Used by the
   * marketplace-publish flow to keep a single "Packmind sync" PR per marketplace
   * whose description always reflects its current contents.
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
   * Find the open "Packmind sync" pull request on a marketplace repo, or
   * `null` when none is open. Used by reconcile to surface a pending PR.
   */
  findOpenSyncPullRequest(
    repo: GitRepo,
    head: string,
  ): Promise<{ url: string; number: number } | null>;

  /**
   * File-level diff of `head` against `base` — what a pull request from `head`
   * into `base` would change. Yields an empty comparison when either branch is
   * missing.
   */
  compareBranches(
    repo: GitRepo,
    base: string,
    head: string,
  ): Promise<GitBranchComparison>;

  /**
   * Probe a marketplace repo's reachability with the configured credentials,
   * distinguishing auth failure / repo gone / transient network error.
   */
  checkMarketplaceRepoExists(repo: GitRepo): Promise<{
    exists: boolean;
    reason?: 'auth_failed' | 'repo_not_found' | 'network_transient';
  }>;

  addGitProvider(command: AddGitProviderCommand): Promise<GitProvider>;

  /**
   * Used by the install-callback flow to make a re-run idempotent: if a provider
   * already exists for the same installation we reuse it instead of inserting a
   * duplicate row.
   */
  findGitProviderByAppInstallation(
    organizationId: OrganizationId,
    appInstallationId: number,
  ): Promise<GitProvider | null>;

  addGitRepo(command: AddGitRepoCommand): Promise<GitRepo>;

  /** `force` deletes the provider even when it still has repositories. */
  deleteGitProvider(
    id: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
    force?: boolean,
  ): Promise<void>;

  /** `providerId`, when given, is checked against the repository's own provider. */
  deleteGitRepo(
    repositoryId: GitRepoId,
    userId: UserId,
    organizationId: OrganizationId,
    providerId?: GitProviderId,
  ): Promise<void>;

  listAvailableRepos(
    command: ListAvailableReposCommand,
  ): Promise<ListAvailableReposResponse>;

  checkBranchExists(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean>;

  /**
   * Check whether the branch a repository is tracked on still exists on its
   * provider — the state a merged pull request leaves behind when its branch is
   * deleted, in which no distribution is recorded any more.
   *
   * The branch is read from the stored repository, and the answer is cached for
   * a few minutes: pages that list many repositories ask this once per
   * repository on every render.
   */
  checkTrackedBranchExists(
    command: CheckTrackedBranchExistsCommand,
  ): Promise<CheckTrackedBranchExistsResponse>;

  /**
   * Probe a git provider's stored credentials against the upstream API to
   * determine whether they still work. Used by the connection drawer to surface
   * a live status instead of relying on whether credentials are merely present
   * in the database.
   */
  checkProviderAuth(
    command: CheckProviderAuthCommand,
  ): Promise<CheckProviderAuthResponse>;

  updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<GitProvider>;

  getAvailableRemoteDirectories(
    command: GetAvailableRemoteDirectoriesCommand,
  ): Promise<string[]>;

  checkDirectoryExistence(
    command: CheckDirectoryExistenceCommand,
  ): Promise<CheckDirectoryExistenceResult>;

  listRepos(gitProviderId: GitProviderId): Promise<GitRepo[]>;

  addFileToGit(
    repo: GitRepo,
    path: string,
    content: string,
  ): Promise<GitCommit>;

  findGitRepoByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null>;

  findGitRepoByOwnerRepoAndBranchInOrganization(
    command: FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  ): Promise<FindGitRepoByOwnerRepoAndBranchInOrganizationResult>;

  /**
   * Queues a job that takes the input's files (without content) and enriches
   * each with its file content. Resolves to the job id, not the result.
   */
  addFetchFileContentJob(
    input: FetchFileContentInput,
    onComplete?: (result: FetchFileContentOutput) => Promise<void> | void,
  ): Promise<string>;

  /**
   * Upsert. Any active record for the org is revoked first, then the new one is
   * inserted, both within a single transaction. Returns the decrypted record.
   * Used by the GitHub App manifest-callback flow.
   */
  upsertOrganizationGitHubApp(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp>;

  /** Only the active (non-revoked) record, or null. */
  getActiveOrganizationGitHubApp(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null>;

  /**
   * No-ops if no active record exists. This does NOT cascade-delete the
   * GitProvider rows pointing at this org: those providers will start failing at
   * the next token mint, and an admin must re-register while users re-install
   * the new app.
   */
  revokeOrganizationGitHubApp(orgId: OrganizationId): Promise<void>;

  getTrackedRepository(
    command: GetTrackedRepositoryCommand,
  ): Promise<GetTrackedRepositoryResponse>;

  /**
   * Admin-gated server-side. At most one branch may be tracked per
   * (organization, owner, repo).
   */
  setTrackedRepository(
    command: SetTrackedRepositoryCommand,
  ): Promise<SetTrackedRepositoryResponse>;

  /**
   * Admin-gated server-side. Clears the previously tracked branch then sets the
   * new one (last-one-wins).
   */
  updateTrackedBranch(
    command: UpdateTrackedBranchCommand,
  ): Promise<UpdateTrackedBranchResponse>;

  /**
   * Admin-gated server-side. Nothing is deleted: the repository leaves the
   * governance views but keeps every recorded distribution, and re-tracking the
   * same branch brings the history back.
   */
  removeTrackedRepository(
    command: RemoveTrackedRepositoryCommand,
  ): Promise<RemoveTrackedRepositoryResponse>;

  /** Auto-creates a tokenless provider when the repo has none. */
  findOrCreateGitRepo(
    command: FindOrCreateGitRepoCommand,
  ): Promise<FindOrCreateGitRepoResponse>;
}
