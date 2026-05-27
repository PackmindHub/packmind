import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createUserId,
  IAccountsPort,
  IDeploymentPort,
  IImportInstallationRepositoriesUseCase,
  ImportInstallationRepositoriesCommand,
  ImportInstallationRepositoriesResponse,
  NoGitHubAppRegisteredError,
  NotAGitHubAppProviderError,
} from '@packmind/types';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitProviderService } from '../../../GitProviderService';
import { GitRepoService } from '../../../GitRepoService';
import { GithubAppInstallationRepositoriesFetcher } from '../../../services/GithubAppInstallationRepositoriesFetcher';
import { GithubAppTokenService } from '../../../services/GithubAppTokenService';

const origin = 'ImportInstallationRepositoriesUseCase';

export class ImportInstallationRepositoriesUseCase
  extends AbstractMemberUseCase<
    ImportInstallationRepositoriesCommand,
    ImportInstallationRepositoriesResponse
  >
  implements IImportInstallationRepositoriesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitHubAppConfigRepository: IGitHubAppConfigRepository,
    private readonly githubAppTokenService: GithubAppTokenService,
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    private readonly installationRepositoriesFetcher: GithubAppInstallationRepositoriesFetcher,
    private readonly deploymentsPort: IDeploymentPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ImportInstallationRepositoriesCommand & MemberContext,
  ): Promise<ImportInstallationRepositoriesResponse> {
    const { gitProviderId, organization, userId } = command;

    this.logger.info('Importing installation repositories', {
      gitProviderId,
      organizationId: organization.id,
    });

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);

    if (!gitProvider || gitProvider.organizationId !== organization.id) {
      throw new Error('Git provider not found');
    }

    if (
      gitProvider.authType !== 'github_app' ||
      gitProvider.githubAppInstallationId == null
    ) {
      throw new NotAGitHubAppProviderError(gitProviderId);
    }

    const config = await this.gitHubAppConfigRepository.findActive();
    if (!config) {
      throw new NoGitHubAppRegisteredError();
    }

    const installationToken =
      await this.githubAppTokenService.getInstallationToken(
        config,
        gitProvider.githubAppInstallationId,
      );

    const installationRepositories =
      await this.installationRepositoriesFetcher.fetchAll(installationToken);

    let importedCount = 0;
    let skippedCount = 0;

    for (const repo of installationRepositories) {
      try {
        const existingRepo =
          await this.gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
            repo.owner,
            repo.name,
            repo.defaultBranch,
            organization.id,
          );

        if (existingRepo) {
          skippedCount++;
          continue;
        }

        const createdRepo = await this.gitRepoService.addGitRepo({
          owner: repo.owner,
          repo: repo.name,
          branch: repo.defaultBranch,
          providerId: gitProvider.id,
        });

        await this.deploymentsPort.addTarget({
          userId: createUserId(userId),
          organizationId: organization.id,
          name: 'Default',
          path: '/',
          gitRepoId: createdRepo.id,
          allowTokenlessProvider: true,
        });

        importedCount++;
      } catch (error) {
        this.logger.warn('Failed to import installation repository', {
          owner: repo.owner,
          name: repo.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('Installation repositories import complete', {
      gitProviderId,
      importedCount,
      skippedCount,
    });

    return { importedCount, skippedCount };
  }
}
