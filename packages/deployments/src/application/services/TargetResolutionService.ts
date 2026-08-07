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
   * Looks up the id of a git repo that is already managed in the organization,
   * matching by owner/repo/branch. Returns null when no such repo exists —
   * this service never creates a provider or repo (that is an admin-only
   * operation performed up front via tracking or the Git settings).
   */
  private async findRepoIdFromGitInfo(
    organizationId: OrganizationId,
    userId: string,
    gitRemoteUrl: string,
    gitBranch: string,
  ): Promise<string | null> {
    const { owner, repo } = parseGitRepoInfo(gitRemoteUrl);

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId,
    });

    for (const provider of providersResponse.providers) {
      const repos = await this.gitPort.listRepos(provider.id);
      const matchingRepo = repos.find(
        (r) =>
          r.owner.toLowerCase() === owner.toLowerCase() &&
          r.repo.toLowerCase() === repo.toLowerCase() &&
          r.branch === gitBranch,
      );
      if (matchingRepo) {
        return matchingRepo.id;
      }
    }

    return null;
  }

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
    const gitRepoId = await this.findRepoIdFromGitInfo(
      organizationId,
      userId,
      gitRemoteUrl,
      gitBranch,
    );

    if (!gitRepoId) {
      this.logger.info(
        'Git repo not found in distribution history, cannot query previous deployments',
        { gitRemoteUrl, branch: gitBranch },
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
   * Resolves the deployment target for the given git info.
   *
   * The provider and repo must already exist — this method NEVER creates them
   * (creating a provider or repo is admin-only). It only finds an existing repo
   * and, when found, finds-or-creates the target (path) under it. When no repo
   * has been set up for the remote, it returns null so callers skip recording
   * the distribution instead of silently provisioning a repo.
   */
  async findOrCreateTargetFromGitInfo(
    organizationId: OrganizationId,
    userId: string,
    gitRemoteUrl: string,
    gitBranch: string,
    relativePath: string,
  ): Promise<Target | null> {
    const gitRepoId = await this.findRepoIdFromGitInfo(
      organizationId,
      userId,
      gitRemoteUrl,
      gitBranch,
    );

    if (!gitRepoId) {
      this.logger.info(
        'Git repo not set up for remote; skipping target resolution',
        { gitRemoteUrl, branch: gitBranch },
      );
      return null;
    }

    return this.findOrCreateTarget({
      gitRepoId: createGitRepoId(gitRepoId),
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
