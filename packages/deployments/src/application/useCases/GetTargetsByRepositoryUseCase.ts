import {
  TargetWithRepository,
  IGetTargetsByRepositoryUseCase,
  GetTargetsByRepositoryCommand,
  PackmindLogger,
  OrganizationId,
} from '@packmind/shared';
import { TargetService } from '../services/TargetService';
import { GitHexa } from '@packmind/git';

const origin = 'GetTargetsByRepositoryUseCase';

export class GetTargetsByRepositoryUseCase
  implements IGetTargetsByRepositoryUseCase
{
  constructor(
    private readonly targetService: TargetService,
    private readonly gitHexa: GitHexa,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetTargetsByRepositoryCommand,
  ): Promise<TargetWithRepository[]> {
    const { owner, repo, organizationId } = command;

    this.logger.info('Getting targets by repository name (all branches)', {
      owner,
      repo,
      organizationId,
    });

    try {
      // First, get all repositories for the organization
      const repositories = await this.gitHexa.getOrganizationRepositories(
        organizationId as OrganizationId,
      );

      this.logger.info('Retrieved repositories for organization', {
        organizationId,
        repositoryCount: repositories.length,
      });

      // Filter repositories matching owner/repo (across all branches)
      const matchingRepositories = repositories.filter(
        (r) => r.owner === owner && r.repo === repo,
      );

      this.logger.info('Filtered repositories matching owner/repo', {
        owner,
        repo,
        matchingCount: matchingRepositories.length,
      });

      // Get all targets for all matching repositories with repository information
      const allTargetsWithRepository: TargetWithRepository[] = [];

      for (const repository of matchingRepositories) {
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

      this.logger.info(
        'Successfully retrieved targets by repository name (all branches)',
        {
          owner,
          repo,
          organizationId,
          branchCount: matchingRepositories.length,
          targetCount: allTargetsWithRepository.length,
        },
      );

      return allTargetsWithRepository;
    } catch (error) {
      this.logger.error(
        'Failed to get targets by repository name (all branches)',
        {
          owner,
          repo,
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
