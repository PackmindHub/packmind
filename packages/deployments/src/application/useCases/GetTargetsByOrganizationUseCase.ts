import {
  TargetWithRepository,
  IGetTargetsByOrganizationUseCase,
  GetTargetsByOrganizationCommand,
  PackmindLogger,
} from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';
import { TargetService } from '../services/TargetService';
import { GitHexa } from '@packmind/git';

const origin = 'GetTargetsByOrganizationUseCase';

export class GetTargetsByOrganizationUseCase
  implements IGetTargetsByOrganizationUseCase
{
  constructor(
    private readonly targetService: TargetService,
    private readonly gitHexa: GitHexa,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]> {
    const { organizationId } = command;

    this.logger.info('Getting targets by organization ID', {
      organizationId,
    });

    try {
      // First, get all repositories for the organization
      const repositories = await this.gitHexa.getOrganizationRepositories(
        command.organizationId as OrganizationId,
      );

      this.logger.info('Retrieved repositories for organization', {
        organizationId,
        repositoryCount: repositories.length,
      });

      // Then, get all targets for all repositories with repository information
      const allTargetsWithRepository: TargetWithRepository[] = [];

      for (const repository of repositories) {
        const targets = await this.targetService.getTargetsByGitRepoId(
          repository.id,
        );

        // Map targets to include repository information
        const targetsWithRepo = targets.map((target) => ({
          ...target,
          repository: {
            owner: repository.owner,
            repo: repository.repo,
            branch: repository.branch,
          },
        }));

        allTargetsWithRepository.push(...targetsWithRepo);
      }

      this.logger.info('Successfully retrieved targets by organization ID', {
        organizationId,
        repositoryCount: repositories.length,
        targetCount: allTargetsWithRepository.length,
      });

      return allTargetsWithRepository;
    } catch (error) {
      this.logger.error('Failed to get targets by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
