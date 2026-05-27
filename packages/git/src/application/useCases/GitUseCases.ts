import { PackmindLogger } from '@packmind/logger';
import {
  BuildGitHubAppManifestCommand,
  BuildGitHubAppManifestResponse,
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  GetAvailableRemoteDirectoriesCommand,
  GetGitHubAppStatusCommand,
  GetGitHubAppStatusResponse,
  GitCommit,
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoId,
  HandleWebHookCommand,
  HandleWebHookResult,
  HandleWebHookWithoutContentCommand,
  HandleWebHookWithoutContentResult,
  IAccountsPort,
  IDeploymentPort,
  ListProvidersCommand,
  ListProvidersResponse,
  OrganizationId,
  QueryOption,
  RegisterGitHubAppFromManifestCommand,
  RegisterGitHubAppFromManifestResponse,
  UserId,
} from '@packmind/types';
import { AddGitRepoCommand } from '../../domain/useCases/IAddGitRepo';
import {
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  FindGitRepoByOwnerRepoAndBranchInOrganizationResult,
  IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase,
} from '../../domain/useCases/IFindGitRepoByOwnerRepoAndBranchInOrganization';
import { IGitHubAppConfigRepository } from '../../domain/repositories/IGitHubAppConfigRepository';
import { GitServices } from '../GitServices';
import { GitHubAppManifestStateService } from '../services/GitHubAppManifestStateService';
import {
  AddGitProviderCommand,
  AddGitProviderUseCase,
} from './addGitProvider/addGitProvider.usecase';
import { AddGitRepoUseCase } from './addGitRepo/addGitRepo.usecase';
import { CheckBranchExistsUseCase } from './checkBranchExists/checkBranchExists.usecase';
import { CheckDirectoryExistenceUseCase } from './checkDirectoryExistence/checkDirectoryExistence.usecase';
import { CommitToGit } from './commitToGit/commitToGit.usecase';
import { DeleteGitProviderUseCase } from './deleteGitProvider/deleteGitProvider.usecase';
import { DeleteGitRepoUseCase } from './deleteGitRepo/deleteGitRepo.usecase';
import { FindGitRepoByOwnerAndRepoUseCase } from './findGitRepoByOwnerAndRepo/findGitRepoByOwnerAndRepo.usecase';
import { FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase } from './findGitRepoByOwnerRepoAndBranchInOrganization/findGitRepoByOwnerRepoAndBranchInOrganization.usecase';
import { GetAvailableRemoteDirectoriesUseCase } from './getAvailableRemoteDirectories/getAvailableRemoteDirectories.usecase';
import { GetFileFromRepo } from './getFileFromRepo/getFileFromRepo.usecase';
import { GetOrganizationRepositoriesUseCase } from './getOrganizationRepositories/getOrganizationRepositories.usecase';
import { GetRepositoryByIdUseCase } from './getRepositoryById/getRepositoryById.usecase';
import { HandleWebHook } from './handleWebHook/handleWebHook.usecase';
import { HandleWebHookWithoutContent } from './handleWebHookWithoutContent/handleWebHookWithoutContent.usecase';
import { BuildGitHubAppManifestUseCase } from './githubApp/buildGitHubAppManifest/buildGitHubAppManifest.usecase';
import { GetGitHubAppStatusUseCase } from './githubApp/getGitHubAppStatus/getGitHubAppStatus.usecase';
import { RegisterGitHubAppFromManifestUseCase } from './githubApp/registerGitHubAppFromManifest/registerGitHubAppFromManifest.usecase';
import { ListAvailableReposUseCase } from './listAvailableRepos/listAvailableRepos.usecase';
import { ListProvidersUseCase } from './listProviders/listProviders.usecase';
import { ListReposUseCase } from './listRepos/listRepos.usecase';
import { UpdateGitProviderUseCase } from './updateGitProvider/updateGitProvider.usecase';

const origin = 'GitUseCases';

export class GitUseCases {
  private _addGitProvider: AddGitProviderUseCase;
  private accountsAdapter: IAccountsPort = {
    async getUserById() {
      throw new Error('Accounts adapter not configured for Git domain');
    },
    async getOrganizationById() {
      throw new Error('Accounts adapter not configured for Git domain');
    },
  } as unknown as IAccountsPort;
  private _addGitRepo: AddGitRepoUseCase;
  private _deleteGitProvider: DeleteGitProviderUseCase;
  private _deleteGitRepo: DeleteGitRepoUseCase;
  private readonly _listAvailableRepos: ListAvailableReposUseCase;
  private readonly _checkBranchExists: CheckBranchExistsUseCase;
  private readonly _commitToGit: CommitToGit;
  private readonly _handleWebHook: HandleWebHook;
  private readonly _handleWebHookWithoutContent: HandleWebHookWithoutContent;
  private readonly _getFileFromRepo: GetFileFromRepo;
  private readonly _findGitRepoByOwnerAndRepo: FindGitRepoByOwnerAndRepoUseCase;
  private readonly _listRepos: ListReposUseCase;
  private readonly _listProviders: ListProvidersUseCase;
  private readonly _getOrganizationRepositories: GetOrganizationRepositoriesUseCase;
  private readonly _getRepositoryById: GetRepositoryByIdUseCase;
  private _updateGitProvider: UpdateGitProviderUseCase;
  private readonly _findGitRepoByOwnerRepoAndBranchInOrganization: IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase;
  private readonly _getAvailableRemoteDirectories: GetAvailableRemoteDirectoriesUseCase;
  private readonly _checkDirectoryExistence: CheckDirectoryExistenceUseCase;
  private readonly _manifestStateService: GitHubAppManifestStateService;
  private _buildGitHubAppManifest: BuildGitHubAppManifestUseCase;
  private _registerGitHubAppFromManifest: RegisterGitHubAppFromManifestUseCase;
  private readonly _getGitHubAppStatus: GetGitHubAppStatusUseCase;

  private deploymentsAdapter: IDeploymentPort = {
    async addTarget() {
      throw new Error('Deployments adapter not configured for Git domain');
    },
  } as unknown as IDeploymentPort;

  constructor(
    private readonly gitServices: GitServices,
    private readonly gitHubAppConfigRepository: IGitHubAppConfigRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._manifestStateService = new GitHubAppManifestStateService();
    this._addGitProvider = this.createAddGitProviderUseCase();
    this._addGitRepo = this.createAddGitRepoUseCase();
    this._deleteGitProvider = this.createDeleteGitProviderUseCase();
    this._deleteGitRepo = this.createDeleteGitRepoUseCase();
    this._listAvailableRepos = new ListAvailableReposUseCase(
      gitServices.getGitProviderService(),
    );
    this._checkBranchExists = new CheckBranchExistsUseCase(
      gitServices.getGitProviderService(),
    );
    this._commitToGit = new CommitToGit(
      gitServices.getGitCommitService(),
      gitServices.getGitProviderService(),
      gitServices.getGitRepoFactory(),
    );
    this._handleWebHook = new HandleWebHook(
      gitServices.getGitCommitService(),
      gitServices.getGitProviderService(),
      gitServices.getGitRepoService(),
      gitServices.getGitRepoFactory(),
    );
    this._handleWebHookWithoutContent = new HandleWebHookWithoutContent(
      gitServices.getGitCommitService(),
      gitServices.getGitProviderService(),
      gitServices.getGitRepoService(),
    );
    this._getFileFromRepo = new GetFileFromRepo(
      gitServices.getGitProviderService(),
      gitServices.getGitRepoFactory(),
    );
    this._findGitRepoByOwnerAndRepo = new FindGitRepoByOwnerAndRepoUseCase(
      gitServices.getGitRepoService(),
    );
    this._listRepos = new ListReposUseCase(
      gitServices.getGitProviderService(),
      gitServices.getGitRepoService(),
    );
    this._listProviders = new ListProvidersUseCase(
      this.accountsAdapter,
      gitServices.getGitProviderService(),
    );
    this._getOrganizationRepositories = new GetOrganizationRepositoriesUseCase(
      gitServices.getGitRepoService(),
    );
    this._getRepositoryById = new GetRepositoryByIdUseCase(
      gitServices.getGitRepoService(),
    );
    this._updateGitProvider = this.createUpdateGitProviderUseCase();
    this._findGitRepoByOwnerRepoAndBranchInOrganization =
      new FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase(
        gitServices.getGitRepoService(),
      );
    this._getAvailableRemoteDirectories =
      new GetAvailableRemoteDirectoriesUseCase(
        gitServices.getGitProviderService(),
      );
    this._checkDirectoryExistence = new CheckDirectoryExistenceUseCase(
      gitServices.getGitRepoService(),
      gitServices.getGitProviderService(),
      gitServices.getGitRepoFactory(),
    );
    this._buildGitHubAppManifest = this.createBuildGitHubAppManifestUseCase();
    this._registerGitHubAppFromManifest =
      this.createRegisterGitHubAppFromManifestUseCase();
    this._getGitHubAppStatus = new GetGitHubAppStatusUseCase(
      this.accountsAdapter,
      this.gitHubAppConfigRepository,
    );

    this.logger.info('GitUseCases initialized successfully');
  }

  /**
   * Set the deployments adapter for creating default targets
   */
  public setDeploymentsAdapter(adapter: IDeploymentPort): void {
    this.deploymentsAdapter = adapter;
    // Recreate the AddGitRepoUseCase with the deployment adapter
    this._addGitRepo = this.createAddGitRepoUseCase();
  }

  private createAddGitProviderUseCase(): AddGitProviderUseCase {
    return new AddGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.accountsAdapter,
    );
  }

  private createAddGitRepoUseCase(): AddGitRepoUseCase {
    return new AddGitRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.accountsAdapter,
      this.deploymentsAdapter,
    );
  }

  private createDeleteGitProviderUseCase(): DeleteGitProviderUseCase {
    return new DeleteGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.accountsAdapter,
    );
  }

  private createDeleteGitRepoUseCase(): DeleteGitRepoUseCase {
    return new DeleteGitRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.accountsAdapter,
    );
  }

  private createUpdateGitProviderUseCase(): UpdateGitProviderUseCase {
    return new UpdateGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.accountsAdapter,
    );
  }

  private createBuildGitHubAppManifestUseCase(): BuildGitHubAppManifestUseCase {
    return new BuildGitHubAppManifestUseCase(
      this.accountsAdapter,
      this._manifestStateService,
    );
  }

  private createRegisterGitHubAppFromManifestUseCase(): RegisterGitHubAppFromManifestUseCase {
    return new RegisterGitHubAppFromManifestUseCase(
      this.accountsAdapter,
      this.gitHubAppConfigRepository,
      this._manifestStateService,
    );
  }

  public setAccountsAdapter(adapter: IAccountsPort): void {
    this.accountsAdapter = adapter;
    this._addGitProvider = this.createAddGitProviderUseCase();
    this._addGitRepo = this.createAddGitRepoUseCase();
    this._deleteGitProvider = this.createDeleteGitProviderUseCase();
    this._deleteGitRepo = this.createDeleteGitRepoUseCase();
    this._updateGitProvider = this.createUpdateGitProviderUseCase();
    this._buildGitHubAppManifest = this.createBuildGitHubAppManifestUseCase();
    this._registerGitHubAppFromManifest =
      this.createRegisterGitHubAppFromManifestUseCase();
  }

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
    files: { path: string; content: string }[],
    commitMessage: string,
  ): Promise<GitCommit> {
    return this._commitToGit.commitToGit(repo, files, commitMessage);
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
}
