import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter, JobsService } from '@packmind/node-utils';
import {
  AddGitProviderCommand,
  AddGitRepoCommand,
  BuildGitHubAppManifestCommand,
  BuildGitHubAppManifestResponse,
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  DeleteItem,
  FileModification,
  FetchFileContentInput,
  FetchFileContentOutput,
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
  GetAvailableRemoteDirectoriesCommand,
  GetGitHubAppStatusCommand,
  GetGitHubAppStatusResponse,
  GitCommit,
  GitHubAppConfig,
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoId,
  HandleWebHookCommand,
  HandleWebHookResult,
  HandleWebHookWithoutContentCommand,
  HandleWebHookWithoutContentResult,
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase,
  IGitPort,
  ImportInstallationRepositoriesCommand,
  ImportInstallationRepositoriesResponse,
  LinkGitHubAppInstallationCommand,
  LinkGitHubAppInstallationResponse,
  ListInstallationRepositoriesCommand,
  ListInstallationRepositoriesResponse,
  ListProvidersCommand,
  ListProvidersResponse,
  OrganizationId,
  QueryOption,
  RegisterGitHubAppFromManifestCommand,
  RegisterGitHubAppFromManifestResponse,
  UnlinkGitHubAppInstallationCommand,
  UnlinkGitHubAppInstallationResponse,
  UserId,
} from '@packmind/types';
import { IGitDelayedJobs } from '../../domain/jobs/IGitDelayedJobs';
import { FetchFileContentJobFactory } from '../../infra/jobs/FetchFileContentJobFactory';
import { GitServices } from '../GitServices';
import { GitHubAppManifestStateService } from '../services/GitHubAppManifestStateService';
import { AddGitProviderUseCase } from '../useCases/addGitProvider/addGitProvider.usecase';
import { AddGitRepoUseCase } from '../useCases/addGitRepo/addGitRepo.usecase';
import { CheckBranchExistsUseCase } from '../useCases/checkBranchExists/checkBranchExists.usecase';
import { CheckDirectoryExistenceUseCase } from '../useCases/checkDirectoryExistence/checkDirectoryExistence.usecase';
import { CommitToGit } from '../useCases/commitToGit/commitToGit.usecase';
import { DeleteGitProviderUseCase } from '../useCases/deleteGitProvider/deleteGitProvider.usecase';
import { DeleteGitRepoUseCase } from '../useCases/deleteGitRepo/deleteGitRepo.usecase';
import { FindGitRepoByOwnerAndRepoUseCase } from '../useCases/findGitRepoByOwnerAndRepo/findGitRepoByOwnerAndRepo.usecase';
import { FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase } from '../useCases/findGitRepoByOwnerRepoAndBranchInOrganization/findGitRepoByOwnerRepoAndBranchInOrganization.usecase';
import { GetAvailableRemoteDirectoriesUseCase } from '../useCases/getAvailableRemoteDirectories/getAvailableRemoteDirectories.usecase';
import { GetFileFromRepo } from '../useCases/getFileFromRepo/getFileFromRepo.usecase';
import { GetOrganizationRepositoriesUseCase } from '../useCases/getOrganizationRepositories/getOrganizationRepositories.usecase';
import { GetRepositoryByIdUseCase } from '../useCases/getRepositoryById/getRepositoryById.usecase';
import { HandleWebHook } from '../useCases/handleWebHook/handleWebHook.usecase';
import { HandleWebHookWithoutContent } from '../useCases/handleWebHookWithoutContent/handleWebHookWithoutContent.usecase';
import { BuildGitHubAppManifestUseCase } from '../useCases/githubApp/buildGitHubAppManifest/buildGitHubAppManifest.usecase';
import { GetGitHubAppStatusUseCase } from '../useCases/githubApp/getGitHubAppStatus/getGitHubAppStatus.usecase';
import { ImportInstallationRepositoriesUseCase } from '../useCases/githubApp/importInstallationRepositories/importInstallationRepositories.usecase';
import { LinkGitHubAppInstallationUseCase } from '../useCases/githubApp/linkGitHubAppInstallation/linkGitHubAppInstallation.usecase';
import { ListInstallationRepositoriesUseCase } from '../useCases/githubApp/listInstallationRepositories/listInstallationRepositories.usecase';
import { RegisterGitHubAppFromManifestUseCase } from '../useCases/githubApp/registerGitHubAppFromManifest/registerGitHubAppFromManifest.usecase';
import { UnlinkGitHubAppInstallationUseCase } from '../useCases/githubApp/unlinkGitHubAppInstallation/unlinkGitHubAppInstallation.usecase';
import { GithubAppInstallationRepositoriesFetcher } from '../services/GithubAppInstallationRepositoriesFetcher';
import { GithubAppTokenService } from '../services/GithubAppTokenService';
import { ListAvailableReposUseCase } from '../useCases/listAvailableRepos/listAvailableRepos.usecase';
import { ListProvidersUseCase } from '../useCases/listProviders/listProviders.usecase';
import { ListReposUseCase } from '../useCases/listRepos/listRepos.usecase';
import { UpdateGitProviderUseCase } from '../useCases/updateGitProvider/updateGitProvider.usecase';

const origin = 'GitAdapter';

export class GitAdapter implements IBaseAdapter<IGitPort>, IGitPort {
  private accountsPort: IAccountsPort | null = null;
  private deploymentsPort: IDeploymentPort | null = null;
  private gitDelayedJobs: IGitDelayedJobs | null = null;

  // Use cases - all initialized in initialize()
  private _addGitProvider!: AddGitProviderUseCase;
  private _addGitRepo!: AddGitRepoUseCase;
  private _deleteGitProvider!: DeleteGitProviderUseCase;
  private _deleteGitRepo!: DeleteGitRepoUseCase;
  private _updateGitProvider!: UpdateGitProviderUseCase;
  private _listAvailableRepos!: ListAvailableReposUseCase;
  private _checkBranchExists!: CheckBranchExistsUseCase;
  private _commitToGit!: CommitToGit;
  private _handleWebHook!: HandleWebHook;
  private _handleWebHookWithoutContent!: HandleWebHookWithoutContent;
  private _getFileFromRepo!: GetFileFromRepo;
  private _findGitRepoByOwnerAndRepo!: FindGitRepoByOwnerAndRepoUseCase;
  private _listRepos!: ListReposUseCase;
  private _listProviders!: ListProvidersUseCase;
  private _getOrganizationRepositories!: GetOrganizationRepositoriesUseCase;
  private _getRepositoryById!: GetRepositoryByIdUseCase;
  private _findGitRepoByOwnerRepoAndBranchInOrganization!: IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase;
  private _getAvailableRemoteDirectories!: GetAvailableRemoteDirectoriesUseCase;
  private _checkDirectoryExistence!: CheckDirectoryExistenceUseCase;
  private _buildGitHubAppManifest!: BuildGitHubAppManifestUseCase;
  private _registerGitHubAppFromManifest!: RegisterGitHubAppFromManifestUseCase;
  private _getGitHubAppStatus!: GetGitHubAppStatusUseCase;
  private _linkGitHubAppInstallation!: LinkGitHubAppInstallationUseCase;
  private _unlinkGitHubAppInstallation!: UnlinkGitHubAppInstallationUseCase;
  private _listInstallationRepositories!: ListInstallationRepositoriesUseCase;
  private _importInstallationRepositories!: ImportInstallationRepositoriesUseCase;
  private readonly _manifestStateService: GitHubAppManifestStateService;

  constructor(
    private readonly gitServices: GitServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._manifestStateService = new GitHubAppManifestStateService();
    this.logger.info('GitAdapter constructed - awaiting initialization');
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
    );

    // Use cases that don't depend on external ports
    this._listAvailableRepos = new ListAvailableReposUseCase(
      this.gitServices.getGitProviderService(),
    );

    this._checkBranchExists = new CheckBranchExistsUseCase(
      this.gitServices.getGitProviderService(),
    );

    this._commitToGit = new CommitToGit(
      this.gitServices.getGitCommitService(),
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoFactory(),
    );

    this._handleWebHook = new HandleWebHook(
      this.gitServices.getGitCommitService(),
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.gitServices.getGitRepoFactory(),
    );

    this._handleWebHookWithoutContent = new HandleWebHookWithoutContent(
      this.gitServices.getGitCommitService(),
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
    );

    this._getFileFromRepo = new GetFileFromRepo(
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

    const gitHubAppConfigRepository =
      this.gitServices.getGitHubAppConfigRepository();

    this._buildGitHubAppManifest = new BuildGitHubAppManifestUseCase(
      this.accountsPort,
      this._manifestStateService,
    );

    this._registerGitHubAppFromManifest =
      new RegisterGitHubAppFromManifestUseCase(
        this.accountsPort,
        gitHubAppConfigRepository,
        this._manifestStateService,
      );

    this._getGitHubAppStatus = new GetGitHubAppStatusUseCase(
      this.accountsPort,
      gitHubAppConfigRepository,
    );

    const githubAppTokenService = new GithubAppTokenService();
    const installationRepositoriesFetcher =
      new GithubAppInstallationRepositoriesFetcher();

    this._importInstallationRepositories =
      new ImportInstallationRepositoriesUseCase(
        this.accountsPort,
        gitHubAppConfigRepository,
        githubAppTokenService,
        this.gitServices.getGitProviderService(),
        this.gitServices.getGitRepoService(),
        installationRepositoriesFetcher,
        this.deploymentsPort,
      );

    this._linkGitHubAppInstallation = new LinkGitHubAppInstallationUseCase(
      this.accountsPort,
      gitHubAppConfigRepository,
      githubAppTokenService,
      this.gitServices.getGitProviderService(),
      this._importInstallationRepositories,
    );

    this._unlinkGitHubAppInstallation = new UnlinkGitHubAppInstallationUseCase(
      this.accountsPort,
      this.gitServices.getGitProviderService(),
    );

    this._listInstallationRepositories =
      new ListInstallationRepositoriesUseCase(
        this.accountsPort,
        gitHubAppConfigRepository,
        githubAppTokenService,
        this.gitServices.getGitProviderService(),
        installationRepositoriesFetcher,
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

  public listAvailableRepos(gitProviderId: GitProviderId): Promise<
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
    return this._listAvailableRepos.execute({ gitProviderId });
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

  public async handleWebHook(
    command: HandleWebHookCommand,
  ): Promise<HandleWebHookResult> {
    return this._handleWebHook.execute(command);
  }

  public async handleWebHookWithoutContent(
    command: HandleWebHookWithoutContentCommand,
  ): Promise<HandleWebHookWithoutContentResult> {
    return this._handleWebHookWithoutContent.execute(command);
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

  // ===========================
  // GitHub App Admin Use Cases
  // ===========================

  public async buildGitHubAppManifest(
    command: BuildGitHubAppManifestCommand,
  ): Promise<BuildGitHubAppManifestResponse> {
    return this._buildGitHubAppManifest.execute(command);
  }

  public async registerGitHubAppFromManifest(
    command: RegisterGitHubAppFromManifestCommand,
  ): Promise<RegisterGitHubAppFromManifestResponse> {
    return this._registerGitHubAppFromManifest.execute(command);
  }

  public async getGitHubAppStatus(
    command: GetGitHubAppStatusCommand,
  ): Promise<GetGitHubAppStatusResponse> {
    return this._getGitHubAppStatus.execute(command);
  }

  public async linkGitHubAppInstallation(
    command: LinkGitHubAppInstallationCommand,
  ): Promise<LinkGitHubAppInstallationResponse> {
    return this._linkGitHubAppInstallation.execute(command);
  }

  public async unlinkGitHubAppInstallation(
    command: UnlinkGitHubAppInstallationCommand,
  ): Promise<UnlinkGitHubAppInstallationResponse> {
    return this._unlinkGitHubAppInstallation.execute(command);
  }

  public async listInstallationRepositories(
    command: ListInstallationRepositoriesCommand,
  ): Promise<ListInstallationRepositoriesResponse> {
    return this._listInstallationRepositories.execute(command);
  }

  public async importInstallationRepositories(
    command: ImportInstallationRepositoriesCommand,
  ): Promise<ImportInstallationRepositoriesResponse> {
    return this._importInstallationRepositories.execute(command);
  }

  // ===========================
  // Webhook support methods
  // ===========================

  public async getGitHubAppConfig(): Promise<GitHubAppConfig | null> {
    return this.gitServices.getGitHubAppConfigRepository().findActive();
  }

  public async getGitProviderByInstallationId(
    installationId: number,
  ): Promise<GitProvider | null> {
    return this.gitServices
      .getGitProviderRepository()
      .findByGithubAppInstallationId(installationId);
  }
}
