import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  IGitPort,
  OrganizationId,
  PackageId,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
  createGitRepoId,
} from '@packmind/types';
import { TargetService } from './TargetService';
import { parseGitRepoInfo } from '../useCases/notifyDistribution/notifyDistribution.usecase';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'TargetResolutionService';

export class TargetResolutionService {
  constructor(
    private readonly gitPort: IGitPort,
    private readonly targetService: TargetService,
    private readonly distributionRepository: IDistributionRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * Finds a target from git info by looking up the repository and path.
   */
  async findTargetFromGitInfo(
    organizationId: OrganizationId,
    userId: string,
    gitRemoteUrl: string,
    gitBranch: string,
    relativePath: string,
  ): Promise<Target | null> {
    const { owner, repo } = parseGitRepoInfo(gitRemoteUrl);

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId,
    });

    let gitRepoId: string | null = null;
    for (const provider of providersResponse.providers) {
      const repos = await this.gitPort.listRepos(provider.id);
      const matchingRepo = repos.find(
        (r) =>
          r.owner.toLowerCase() === owner.toLowerCase() &&
          r.repo.toLowerCase() === repo.toLowerCase() &&
          r.branch === gitBranch,
      );
      if (matchingRepo) {
        gitRepoId = matchingRepo.id;
        break;
      }
    }

    if (!gitRepoId) {
      this.logger.info(
        'Git repo not found in distribution history, cannot query previous deployments',
        { owner, repo, branch: gitBranch },
      );
      return null;
    }

    const targets = await this.targetService.getTargetsByGitRepoId(
      gitRepoId as ReturnType<typeof createGitRepoId>,
    );

    let normalizedPath = relativePath;
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    if (!normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath + '/';
    }

    const target = targets.find((t) => t.path === normalizedPath);

    if (!target) {
      this.logger.info(
        'Target not found in distribution history, cannot query previous deployments',
        { gitRepoId, relativePath: normalizedPath },
      );
      return null;
    }

    return target;
  }

  /**
   * Finds previously deployed versions for all artifact types (standards, recipes, skills)
   * by resolving a target from git info and querying distribution history.
   */
  async findPreviouslyDeployedVersions(
    organizationId: OrganizationId,
    userId: string,
    gitRemoteUrl: string,
    gitBranch: string,
    relativePath: string,
    currentPackageIds: PackageId[],
  ): Promise<{
    standardVersions: StandardVersion[];
    recipeVersions: RecipeVersion[];
    skillVersions: SkillVersion[];
  }> {
    try {
      const target = await this.findTargetFromGitInfo(
        organizationId,
        userId,
        gitRemoteUrl,
        gitBranch,
        relativePath,
      );

      if (!target) {
        return {
          standardVersions: [],
          recipeVersions: [],
          skillVersions: [],
        };
      }

      const [standardVersions, recipeVersions, skillVersions] =
        await Promise.all([
          this.distributionRepository.findActiveStandardVersionsByTargetAndPackages(
            organizationId,
            target.id,
            currentPackageIds,
          ),
          this.distributionRepository.findActiveRecipeVersionsByTargetAndPackages(
            organizationId,
            target.id,
            currentPackageIds,
          ),
          this.distributionRepository.findActiveSkillVersionsByTargetAndPackages(
            organizationId,
            target.id,
            currentPackageIds,
          ),
        ]);

      this.logger.info(
        'Found previously deployed versions from distribution history',
        {
          targetId: target.id,
          standardCount: standardVersions.length,
          recipeCount: recipeVersions.length,
          skillCount: skillVersions.length,
        },
      );

      return { standardVersions, recipeVersions, skillVersions };
    } catch (error) {
      this.logger.error(
        'Failed to query distribution history for previous versions',
        { error: error instanceof Error ? error.message : String(error) },
      );
      return {
        standardVersions: [],
        recipeVersions: [],
        skillVersions: [],
      };
    }
  }
}
