import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter, JobsService } from '@packmind/node-utils';
import {
  AddGitProviderCommand,
  AddGitRepoCommand,
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  CheckProviderAuthCommand,
  CheckProviderAuthResponse,
  DeleteItem,
  FileModification,
  FetchFileContentInput,
  FetchFileContentOutput,
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
  GetAvailableRemoteDirectoriesCommand,
  GitCommit,
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoId,
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase,
  IGitPort,
  ListAvailableReposCommand,
  ListAvailableReposResponse,
  ListProvidersCommand,
  ListProvidersResponse,
  OrganizationGitHubApp,
  OrganizationId,
  QueryOption,
  UserId,
} from '@packmind/types';
import { IGitDelayedJobs } from '../../domain/jobs/IGitDelayedJobs';
import { FetchFileContentJobFactory } from '../../infra/jobs/FetchFileContentJobFactory';
import { GithubAppMode } from '../../infra/repositories/github/auth/GithubTokenResolverFactory';
import { GitServices } from '../GitServices';
import { AddGitProviderUseCase } from '../useCases/addGitProvider/AddGitProviderUseCase';
import { AddGitRepoUseCase } from '../useCases/addGitRepo/AddGitRepoUseCase';
import { CheckBranchExistsUseCase } from '../useCases/checkBranchExists/CheckBranchExistsUseCase';
import { CheckDirectoryExistenceUseCase } from '../useCases/checkDirectoryExistence/CheckDirectoryExistenceUseCase';
import { CheckProviderAuthUseCase } from '../useCases/checkProviderAuth/CheckProviderAuthUseCase';
import { CommitToGitUseCase } from '../useCases/commitToGit/CommitToGitUseCase';
import { DeleteGitProviderUseCase } from '../useCases/deleteGitProvider/DeleteGitProviderUseCase';
import { DeleteGitRepoUseCase } from '../useCases/deleteGitRepo/DeleteGitRepoUseCase';
import { FindGitRepoByOwnerAndRepoUseCase } from '../useCases/findGitRepoByOwnerAndRepo/FindGitRepoByOwnerAndRepoUseCase';
import { FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase } from '../useCases/findGitRepoByOwnerRepoAndBranchInOrganization/FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase';
import { GetAvailableRemoteDirectoriesUseCase } from '../useCases/getAvailableRemoteDirectories/GetAvailableRemoteDirectoriesUseCase';
import { GetFileFromRepoUseCase } from '../useCases/getFileFromRepo/GetFileFromRepoUseCase';
import { GetOrganizationRepositoriesUseCase } from '../useCases/getOrganizationRepositories/GetOrganizationRepositoriesUseCase';
import { GetRepositoryByIdUseCase } from '../useCases/getRepositoryById/GetRepositoryByIdUseCase';
import { ListAvailableReposUseCase } from '../useCases/listAvailableRepos/ListAvailableReposUseCase';
import { ListProvidersUseCase } from '../useCases/listProviders/ListProvidersUseCase';
import { ListReposUseCase } from '../useCases/listRepos/ListReposUseCase';
import { UpdateGitProviderUseCase } from '../useCases/updateGitProvider/UpdateGitProviderUseCase';

const origin = 'GitAdapter';

export class GitAdapter implements IBaseAdapter<IGitPort>, IGitPort {
  private accountsPort: IAccountsPort | null = null;
  private deploymentsPort: IDeploymentPort | null = null;
  private gitDelayedJobs: IGitDelayedJobs | null = null;
  private mode: GithubAppMode = 'on-prem';

  // Use cases - all initialized in initialize()
  private _addGitProvider!: AddGitProviderUseCase;
  private _addGitRepo!: AddGitRepoUseCase;
  private _deleteGitProvider!: DeleteGitProviderUseCase;
  private _deleteGitRepo!: DeleteGitRepoUseCase;
  private _updateGitProvider!: UpdateGitProviderUseCase;
  private _listAvailableRepos!: ListAvailableReposUseCase;
  private _checkBranchExists!: CheckBranchExistsUseCase;
  private _commitToGit!: CommitToGitUseCase;
  private _getFileFromRepo!: GetFileFromRepoUseCase;
  private _findGitRepoByOwnerAndRepo!: FindGitRepoByOwnerAndRepoUseCase;
  private _listRepos!: ListReposUseCase;
  private _listProviders!: ListProvidersUseCase;
  private _checkProviderAuth!: CheckProviderAuthUseCase;
  private _getOrganizationRepositories!: GetOrganizationRepositoriesUseCase;
  private _getRepositoryById!: GetRepositoryByIdUseCase;
  private _findGitRepoByOwnerRepoAndBranchInOrganization!: IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase;
  private _getAvailableRemoteDirectories!: GetAvailableRemoteDirectoriesUseCase;
  private _checkDirectoryExistence!: CheckDirectoryExistenceUseCase;

  constructor(
    private readonly gitServices: GitServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GitAdapter constructed - awaiting initialization');
  }

  /**
   * Set the GitHub App hosting mode for use in credential validation.
   * Must be called before use cases that validate credentials are invoked.
   */
  public setMode(mode: GithubAppMode): void {
    this.mode = mode;
    // Recreate affected use cases with the new mode
    if (this.accountsPort) {
      this._addGitProvider = new AddGitProviderUseCase(
        this.gitServices.getGitProviderService(),
        this.accountsPort,
        this.mode,
      );
      this._updateGitProvider = new UpdateGitProviderUseCase(
        this.gitServices.getGitProviderService(),
        this.accountsPort,
        this.mode,
      );
    }
  }

  /**
   * Initialize adapter with ports and services from registry.
   * All ports are REQUIRED. JobsService is required for delayed jobs.
   */
  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
    [IDeploymentPortName]: IDeploymentPort;
    jobsService?: JobsService;
  }): Promise<void> {
    this.logger.info('Initializing GitAdapter with ports and services');

    this.accountsPort = ports[IAccountsPortName];
    this.deploymentsPort = ports[IDeploymentPortName];

    if (ports.jobsService) {
      this.gitDelayedJobs = await this.buildDelayedJobs(ports.jobsService);
    }

    // Step 3: Validate all required ports and services are set
    if (!this.accountsPort || !this.deploymentsPort || !this.gitDelayedJobs) {
      throw new Error(
        'GitAdapter: Required ports/services not provided. Ensure JobsService is passed to initialize().',
      );
    }

    // Step 4: Create all use cases with non-null ports
    // Use cases that depend on accountsPort
    this._addGitProvider = new AddGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.accountsPort,
      this.mode,
    );

    this._addGitRepo = new AddGitRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.accountsPort,
      this.deploymentsPort,
    );

    this._deleteGitProvider = new DeleteGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.accountsPort,
    );

    this._deleteGitRepo = new DeleteGitRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.accountsPort,
    );

    this._updateGitProvider = new UpdateGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.accountsPort,
      this.mode,
    );

    // Use cases that don't depend on external ports
    this._listAvailableRepos = new ListAvailableReposUseCase(
      this.gitServices.getGitProviderService(),
    );

    this._checkBranchExists = new CheckBranchExistsUseCase(
      this.gitServices.getGitProviderService(),
    );

    this._commitToGit = new CommitToGitUseCase(
      this.gitServices.getGitCommitService(),
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoFactory(),
    );

    this._getFileFromRepo = new GetFileFromRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoFactory(),
    );

    this._findGitRepoByOwnerAndRepo = new FindGitRepoByOwnerAndRepoUseCase(
      this.gitServices.getGitRepoService(),
    );

    this._listRepos = new ListReposUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
    );

    this._listProviders = new ListProvidersUseCase(
      this.accountsPort,
      this.gitServices.getGitProviderService(),
    );

    this._checkProviderAuth = new CheckProviderAuthUseCase(
      this.accountsPort,
      this.gitServices.getGitProviderService(),
    );

    this._getOrganizationRepositories = new GetOrganizationRepositoriesUseCase(
      this.gitServices.getGitRepoService(),
    );

    this._getRepositoryById = new GetRepositoryByIdUseCase(
      this.gitServices.getGitRepoService(),
    );

    this._findGitRepoByOwnerRepoAndBranchInOrganization =
      new FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase(
        this.gitServices.getGitRepoService(),
      );

    this._getAvailableRemoteDirectories =
      new GetAvailableRemoteDirectoriesUseCase(
        this.gitServices.getGitProviderService(),
      );

    this._checkDirectoryExistence = new CheckDirectoryExistenceUseCase(
      this.gitServices.getGitRepoService(),
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoFactory(),
    );

    this.logger.info('GitAdapter initialized successfully with all use cases');
  }

  /**
   * Build delayed jobs from JobsService.
   * This is called internally during initialize().
   */
  private async buildDelayedJobs(
    jobsService: JobsService,
  ): Promise<IGitDelayedJobs> {
    this.logger.debug('Building git delayed jobs');

    const fetchFileContentJobFactory = new FetchFileContentJobFactory(
      this.gitServices.getGitRepoService(),
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoFactory(),
    );

    jobsService.registerJobQueue(
      fetchFileContentJobFactory.getQueueName(),
      fetchFileContentJobFactory,
    );

    await fetchFileContentJobFactory.createQueue();

    if (!fetchFileContentJobFactory.delayedJob) {
      throw new Error('DelayedJob not found for FetchFileContent');
    }

    this.logger.debug('Git delayed jobs built successfully');
    return {
      fetchFileContentDelayedJob: fetchFileContentJobFactory.delayedJob,
    };
  }

  /**
   * Check if adapter is ready (all required ports and services set).
   */
  public isReady(): boolean {
    return (
      this.accountsPort != null &&
      this.deploymentsPort != null &&
      this.gitDelayedJobs != null
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): IGitPort {
    return this as IGitPort;
  }

  // ===========================
  // IGitPort Implementation
  // ===========================

  public addGitProvider(command: AddGitProviderCommand): Promise<GitProvider> {
    return this._addGitProvider.execute(command);
  }

  public findGitProviderByAppInstallation(
    organizationId: OrganizationId,
    appInstallationId: number,
  ): Promise<GitProvider | null> {
    return this.gitServices
      .getGitProviderService()
      .findGitProviderByAppInstallation(organizationId, appInstallationId);
  }

  public async addGitRepo(command: AddGitRepoCommand): Promise<GitRepo> {
    return this._addGitRepo.execute(command);
  }

  public async deleteGitProvider(
    id: GitProviderId,
    userId: UserId,
    organizationId: OrganizationId,
    force?: boolean,
  ): Promise<void> {
    await this._deleteGitProvider.execute({
      id,
      userId: String(userId),
      organizationId: String(organizationId),
      force,
    });
  }

  public async deleteGitRepo(
    repositoryId: GitRepoId,
    userId: UserId,
    organizationId: OrganizationId,
    providerId?: GitProviderId,
  ): Promise<void> {
    await this._deleteGitRepo.execute({
      repositoryId,
      userId: String(userId),
      organizationId: String(organizationId),
      providerId,
    });
  }

  public listAvailableRepos(
    command: ListAvailableReposCommand,
  ): Promise<ListAvailableReposResponse> {
    return this._listAvailableRepos.execute(command);
  }

  public checkBranchExists(
    gitProviderId: GitProviderId,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    return this._checkBranchExists.execute({
      gitProviderId,
      owner,
      repo,
      branch,
    });
  }

  public commitToGit(
    repo: GitRepo,
    files: FileModification[],
    commitMessage: string,
    deleteFiles?: DeleteItem[],
  ): Promise<GitCommit> {
    return this._commitToGit.commitToGit(
      repo,
      files,
      commitMessage,
      deleteFiles,
    );
  }

  public async createBranchFromBase(
    repo: GitRepo,
    branch: string,
  ): Promise<void> {
    // Mirrors the commitToGit plumbing: resolve the provider via the
    // GitProviderService and let it dispatch to the right IGitRepo
    // implementation. The repo's `branch` field is the BASE branch used to
    // bootstrap the target branch when it is missing.
    await this.gitServices
      .getGitProviderService()
      .createBranchFromBase(
        repo.providerId,
        repo.owner,
        repo.repo,
        repo.branch,
        branch,
      );
  }

  public async openOrUpdatePullRequest(
    repo: GitRepo,
    command: { head: string; title: string; body?: string },
  ): Promise<{ url: string; number: number; wasCreated: boolean }> {
    return this.gitServices
      .getGitProviderService()
      .openOrUpdatePullRequest(repo, command);
  }

  public async findOpenSyncPullRequest(
    repo: GitRepo,
    head: string,
  ): Promise<{ url: string; number: number } | null> {
    return this.gitServices
      .getGitProviderService()
      .findOpenSyncPullRequest(repo, head);
  }

  public async checkMarketplaceRepoExists(repo: GitRepo): Promise<{
    exists: boolean;
    reason?: 'auth_failed' | 'repo_not_found' | 'network_transient';
  }> {
    return this.gitServices
      .getGitProviderService()
      .checkMarketplaceRepoExists(repo);
  }

  public async getFileFromRepo(
    gitRepo: GitRepo,
    filePath: string,
    branch?: string,
  ): Promise<{ sha: string; content: string } | null> {
    return this._getFileFromRepo.getFileFromRepo(gitRepo, filePath, branch);
  }

  public async addFileToGit(
    repo: GitRepo,
    path: string,
    content: string,
  ): Promise<GitCommit> {
    return this.commitToGit(repo, [{ path, content }], `Add ${path}`);
  }

  public async findGitRepoByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    return this._findGitRepoByOwnerAndRepo.execute({
      owner,
      repo,
      opts,
    });
  }

  public async listRepos(gitProviderId: GitProviderId): Promise<GitRepo[]> {
    return this._listRepos.execute({ gitProviderId });
  }

  public async listProviders(
    command: ListProvidersCommand,
  ): Promise<ListProvidersResponse> {
    return this._listProviders.execute(command);
  }

  public async checkProviderAuth(
    command: CheckProviderAuthCommand,
  ): Promise<CheckProviderAuthResponse> {
    return this._checkProviderAuth.execute(command);
  }

  public async getOrganizationRepositories(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    return this._getOrganizationRepositories.execute({
      organizationId,
    });
  }

  public async getRepositoryById(
    repositoryId: GitRepoId,
  ): Promise<GitRepo | null> {
    return this._getRepositoryById.execute({ repositoryId });
  }

  public async updateGitProvider(
    id: GitProviderId,
    gitProvider: Partial<Omit<GitProvider, 'id'>>,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<GitProvider> {
    return this._updateGitProvider.execute({
      id,
      gitProvider,
      userId: String(userId),
      organizationId: String(organizationId),
    });
  }

  public async findGitRepoByOwnerRepoAndBranchInOrganization(
    command: FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  ): Promise<FindGitRepoByOwnerRepoAndBranchInOrganizationResult> {
    return this._findGitRepoByOwnerRepoAndBranchInOrganization.execute(command);
  }

  public async getAvailableRemoteDirectories(
    command: GetAvailableRemoteDirectoriesCommand,
  ): Promise<string[]> {
    return this._getAvailableRemoteDirectories.execute(command);
  }

  public async checkDirectoryExistence(
    command: CheckDirectoryExistenceCommand,
  ): Promise<CheckDirectoryExistenceResult> {
    return this._checkDirectoryExistence.execute(command);
  }

  public async addFetchFileContentJob(
    input: FetchFileContentInput,
    onComplete?: (result: FetchFileContentOutput) => Promise<void> | void,
  ): Promise<string> {
    return this.gitDelayedJobs!.fetchFileContentDelayedJob.addJobWithCallback(
      input,
      onComplete,
    );
  }

  public async upsertOrganizationGitHubApp(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp> {
    return this.gitServices
      .getOrganizationGitHubAppRepository()
      .upsertForOrganization(app);
  }

  public async getActiveOrganizationGitHubApp(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null> {
    return this.gitServices
      .getOrganizationGitHubAppRepository()
      .findActiveByOrganizationId(orgId);
  }

  public async revokeOrganizationGitHubApp(
    orgId: OrganizationId,
  ): Promise<void> {
    return this.gitServices
      .getOrganizationGitHubAppRepository()
      .markRevoked(orgId);
  }
}
