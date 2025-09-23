import { AddGitProviderUseCase } from './addGitProvider/addGitProvider.usecase';
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
import { PackmindLogger, QueryOption, IDeploymentPort } from '@packmind/shared';
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
  private readonly _addGitProvider: AddGitProviderUseCase;
  private _addGitRepo: AddGitRepoUseCase;
  private readonly _deleteGitProvider: DeleteGitProviderUseCase;
  private readonly _deleteGitRepo: DeleteGitRepoUseCase;
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
  private readonly _updateGitProvider: UpdateGitProviderUseCase;
  private readonly _findGitRepoByOwnerRepoAndBranchInOrganization: IFindGitRepoByOwnerRepoAndBranchInOrganizationUseCase;
  private readonly _getAvailableRemoteDirectories: GetAvailableRemoteDirectoriesUseCase;
  private readonly _checkDirectoryExistence: CheckDirectoryExistenceUseCase;

  private deploymentsAdapter?: IDeploymentPort;

  constructor(
    private readonly gitServices: IGitServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._addGitProvider = new AddGitProviderUseCase(
      gitServices.getGitProviderService(),
    );
    this._addGitRepo = new AddGitRepoUseCase(
      gitServices.getGitProviderService(),
      gitServices.getGitRepoService(),
    );
    this._deleteGitProvider = new DeleteGitProviderUseCase(
      gitServices.getGitProviderService(),
      gitServices.getGitRepoService(),
    );
    this._deleteGitRepo = new DeleteGitRepoUseCase(
      gitServices.getGitProviderService(),
      gitServices.getGitRepoService(),
    );
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
    this._updateGitProvider = new UpdateGitProviderUseCase(
      gitServices.getGitProviderService(),
    );
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
    this._addGitRepo = new AddGitRepoUseCase(
      this.gitServices.getGitProviderService(),
      this.gitServices.getGitRepoService(),
      this.deploymentsAdapter,
    );
  }

  public addGitProvider(
    gitProvider: Omit<GitProvider, 'id'>,
    organizationId: OrganizationId,
  ): Promise<GitProvider> {
    return this._addGitProvider.execute({
      gitProvider,
      organizationId,
    });
  }

  public async addGitRepo(command: AddGitRepoCommand): Promise<GitRepo> {
    return this._addGitRepo.execute(command);
  }

  public deleteGitProvider(
    id: GitProviderId,
    userId: UserId,
    force?: boolean,
  ): Promise<void> {
    return this._deleteGitProvider.execute({ id, userId, force });
  }

  public deleteGitRepo(
    repositoryId: GitRepoId,
    userId: UserId,
    providerId?: GitProviderId,
  ): Promise<void> {
    return this._deleteGitRepo.execute({ repositoryId, userId, providerId });
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
  ): Promise<GitProvider> {
    return this._updateGitProvider.execute({ id, gitProvider });
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
