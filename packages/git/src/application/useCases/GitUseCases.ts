import {
  AddGitProviderCommand,
  AddGitProviderUseCase,
} from './addGitProvider/addGitProvider.usecase';
import { AddGitRepoUseCase } from './addGitRepo/addGitRepo.usecase';
import { DeleteGitProviderUseCase } from './deleteGitProvider/deleteGitProvider.usecase';
import { DeleteGitRepoUseCase } from './deleteGitRepo/deleteGitRepo.usecase';
import { ListAvailableReposUseCase } from './listAvailableRepos/listAvailableRepos.usecase';
import { CheckBranchExistsUseCase } from './checkBranchExists/checkBranchExists.usecase';
import { CommitToGit } from './commitToGit/commitToGit.usecase';
import { HandleWebHook } from './handleWebHook/handleWebHook.usecase';
import { GetFileFromRepo } from './getFileFromRepo/getFileFromRepo.usecase';
import { FindGitRepoByOwnerAndRepoUseCase } from './findGitRepoByOwnerAndRepo/findGitRepoByOwnerAndRepo.usecase';
import { ListReposUseCase } from './listRepos/listRepos.usecase';
import { ListProvidersUseCase } from './listProviders/listProviders.usecase';
import { GetOrganizationRepositoriesUseCase } from './getOrganizationRepositories/getOrganizationRepositories.usecase';
import { GetRepositoryByIdUseCase } from './getRepositoryById/getRepositoryById.usecase';
import { UpdateGitProviderUseCase } from './updateGitProvider/updateGitProvider.usecase';
import { GetAvailableRemoteDirectoriesUseCase } from './getAvailableRemoteDirectories/getAvailableRemoteDirectories.usecase';
import { CheckDirectoryExistenceUseCase } from './checkDirectoryExistence/checkDirectoryExistence.usecase';
import { IGitServices } from '../IGitServices';
import {
  PackmindLogger,
  QueryOption,
  IDeploymentPort,
  UserProvider,
  OrganizationProvider,
} from '@packmind/shared';
import { GitProvider, GitProviderId } from '../../domain/entities/GitProvider';
import { GitRepo, GitRepoId } from '../../domain/entities/GitRepo';
import { GitCommit } from '../../domain/entities/GitCommit';
import { OrganizationId, UserId } from '@packmind/accounts';
import { AddGitRepoCommand } from '../../domain/useCases/IAddGitRepo';
import {
  FindGitRepoByOwnerRepoAndBranchInOrganizationCommand,
  IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase,
} from '../../domain/useCases/IFindGitRepoByOwnerRepoAndBranchInOrganization';
import { FindGitRepoByOwnerRepoAndBranchInOrganizationUseCase } from './findGitRepoByOwnerRepoAndBranchInOrganization/findGitRepoByOwnerRepoAndBranchInOrganization.usecase';
import { GetAvailableRemoteDirectoriesCommand } from '@packmind/shared';
import {
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
} from '@packmind/shared';
const origin = 'GitUseCases';

export class GitUseCases {
  private _addGitProvider: AddGitProviderUseCase;
  private userProvider: UserProvider = {
    async getUserById() {
      throw new Error('User provider not configured for Git domain');
    },
  };
  private organizationProvider: OrganizationProvider = {
    async getOrganizationById() {
      throw new Error('Organization provider not configured for Git domain');
    },
  };
  private _addGitRepo: AddGitRepoUseCase;
  private _deleteGitProvider: DeleteGitProviderUseCase;
  private _deleteGitRepo: DeleteGitRepoUseCase;
  private readonly _listAvailableRepos: ListAvailableReposUseCase;
  private readonly _checkBranchExists: CheckBranchExistsUseCase;
  private readonly _commitToGit: CommitToGit;
  private readonly _handleWebHook: HandleWebHook;
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

  private deploymentsAdapter?: IDeploymentPort;

  constructor(
    private readonly gitServices: IGitServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
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
      this.logger,
    );
    this._handleWebHook = new HandleWebHook(
      gitServices.getGitCommitService(),
      gitServices.getGitProviderService(),
      gitServices.getGitRepoFactory(),
      this.logger,
    );
    this._getFileFromRepo = new GetFileFromRepo(
      gitServices.getGitProviderService(),
      gitServices.getGitRepoFactory(),
      this.logger,
    );
    this._findGitRepoByOwnerAndRepo = new FindGitRepoByOwnerAndRepoUseCase(
      gitServices.getGitRepoService(),
    );
    this._listRepos = new ListReposUseCase(
      gitServices.getGitProviderService(),
      gitServices.getGitRepoService(),
    );
    this._listProviders = new ListProvidersUseCase(
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
      this.userProvider,
      this.organizationProvider,
      this.logger,
    );
  }

  private createAddGitRepoUseCase(): AddGitRepoUseCase {
    return new AddGitRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.userProvider,
      this.organizationProvider,
      this.deploymentsAdapter,
    );
  }

  private createDeleteGitProviderUseCase(): DeleteGitProviderUseCase {
    return new DeleteGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.userProvider,
      this.organizationProvider,
      this.logger,
    );
  }

  private createDeleteGitRepoUseCase(): DeleteGitRepoUseCase {
    return new DeleteGitRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.userProvider,
      this.organizationProvider,
      this.logger,
    );
  }

  private createUpdateGitProviderUseCase(): UpdateGitProviderUseCase {
    return new UpdateGitProviderUseCase(
      this.gitServices.getGitProviderService(),
      this.userProvider,
      this.organizationProvider,
      this.logger,
    );
  }

  public setUserProvider(provider: UserProvider): void {
    this.userProvider = provider;
    this._addGitProvider = this.createAddGitProviderUseCase();
    this._addGitRepo = this.createAddGitRepoUseCase();
    this._deleteGitProvider = this.createDeleteGitProviderUseCase();
    this._deleteGitRepo = this.createDeleteGitRepoUseCase();
    this._updateGitProvider = this.createUpdateGitProviderUseCase();
  }

  public setOrganizationProvider(provider: OrganizationProvider): void {
    this.organizationProvider = provider;
    this._addGitProvider = this.createAddGitProviderUseCase();
    this._addGitRepo = this.createAddGitRepoUseCase();
    this._deleteGitProvider = this.createDeleteGitProviderUseCase();
    this._deleteGitRepo = this.createDeleteGitRepoUseCase();
    this._updateGitProvider = this.createUpdateGitProviderUseCase();
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
    gitRepo: GitRepo,
    payload: unknown,
    fileMatcher: RegExp,
  ): Promise<(GitCommit & { filePath: string; fileContent: string })[]> {
    return this._handleWebHook.handleWebHook(gitRepo, payload, fileMatcher);
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
    organizationId: OrganizationId,
  ): Promise<GitProvider[]> {
    return this._listProviders.execute({ organizationId });
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
  ): Promise<GitRepo | null> {
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
}
