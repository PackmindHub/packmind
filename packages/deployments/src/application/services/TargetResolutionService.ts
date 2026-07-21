import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  IGitPort,
  OrganizationId,
  PackageId,
  CommandVersion,
  SkillVersion,
  StandardVersion,
  Target,
  createGitRepoId,
  createTargetId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { TargetService } from './TargetService';
import {
  parseGitRepoInfo,
  parseGitProviderVendor,
  generateTargetName,
  normalizeRelativePath,
} from './gitInfoHelpers';
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

    const normalizedPath = normalizeRelativePath(relativePath);

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
   * Finds a target from git info, creating the provider, repo, and target if they don't exist.
   */
  async findOrCreateTargetFromGitInfo(
    organizationId: OrganizationId,
    userId: string,
    gitRemoteUrl: string,
    gitBranch: string,
    relativePath: string,
  ): Promise<Target> {
    const existingTarget = await this.findTargetFromGitInfo(
      organizationId,
      userId,
      gitRemoteUrl,
      gitBranch,
      relativePath,
    );

    if (existingTarget) {
      return existingTarget;
    }

    const providerVendor = parseGitProviderVendor(gitRemoteUrl);
    const { owner, repo } = parseGitRepoInfo(gitRemoteUrl);

    const gitRepo = await this.gitPort.findOrCreateGitRepo({
      userId,
      organizationId,
      providerVendor,
      gitRemoteUrl,
      owner,
      repo,
      branch: gitBranch,
    });

    return this.findOrCreateTarget({
      gitRepoId: createGitRepoId(gitRepo.id),
      relativePath,
    });
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
    recipeVersions: CommandVersion[];
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
          this.distributionRepository.findActiveCommandVersionsByTargetAndPackages(
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

  private async findOrCreateTarget(params: {
    gitRepoId: ReturnType<typeof createGitRepoId>;
    relativePath: string;
  }): Promise<Target> {
    const { gitRepoId, relativePath } = params;
    const normalizedPath = normalizeRelativePath(relativePath);

    const existingTargets =
      await this.targetService.getTargetsByGitRepoId(gitRepoId);

    const existingTarget = existingTargets.find(
      (t) => t.path === normalizedPath,
    );

    if (existingTarget) {
      this.logger.info('Found existing target', {
        targetId: existingTarget.id,
      });
      return existingTarget;
    }

    const targetName = generateTargetName(relativePath);
    this.logger.info('Creating new target', {
      targetName,
      path: normalizedPath,
    });

    const newTarget = await this.targetService.addTarget({
      id: createTargetId(uuidv4()),
      name: targetName,
      path: normalizedPath,
      gitRepoId,
    });

    this.logger.info('Created target', { targetId: newTarget.id });

    return newTarget;
  }
}
