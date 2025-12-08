import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createDistributedPackageId,
  createDistributionId,
  createGitProviderId,
  createGitRepoId,
  createTargetId,
  Distribution,
  DistributedPackage,
  DistributionStatus,
  GitProviderVendors,
  GitRepoId,
  IAccountsPort,
  IGitPort,
  INotifyDistributionUseCase,
  IRecipesPort,
  IStandardsPort,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  OrganizationId,
  Package,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  StandardId,
  StandardVersionId,
  Target,
  UnsupportedGitProviderError,
  UserId,
  GitProviderId,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../../domain/repositories/ITargetRepository';

const origin = 'NotifyDistributionUseCase';

type GitProviderVendor = 'github' | 'gitlab';

type DistributedPackageWithVersionIds = DistributedPackage & {
  _standardVersionIds: StandardVersionId[];
  _recipeVersionIds: RecipeVersionId[];
};

/**
 * Parse a git remote URL to extract the provider vendor type
 * @param gitRemoteUrl The git remote URL (e.g., https://github.com/owner/repo.git)
 * @returns 'github' or 'gitlab' based on the URL, throws otherwise
 */
function parseGitProviderVendor(gitRemoteUrl: string): GitProviderVendor {
  // Normalize URL - handle both HTTPS and SSH formats
  const normalizedUrl = gitRemoteUrl.toLowerCase();

  if (normalizedUrl.includes('github.com')) {
    return 'github';
  }

  if (normalizedUrl.includes('gitlab.com')) {
    return 'gitlab';
  }

  throw new UnsupportedGitProviderError(gitRemoteUrl);
}

/**
 * Parse a git remote URL to extract owner and repo
 * @param gitRemoteUrl The git remote URL
 * @returns Object with owner and repo
 */
function parseGitRepoInfo(gitRemoteUrl: string): {
  owner: string;
  repo: string;
} {
  // Handle HTTPS format: https://github.com/owner/repo.git or https://gitlab.com/owner/repo
  // Handle SSH format: git@github.com:owner/repo.git or git@gitlab.com:owner/repo.git
  const match = gitRemoteUrl.match(
    /(?:github|gitlab)\.com[/:]([^/]+)\/([^/.]+)/i,
  );

  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  throw new Error(`Unable to parse git remote URL: ${gitRemoteUrl}`);
}

/**
 * Generate a target name from the relative path
 * @param relativePath The relative path (e.g., "/src/packages/")
 * @returns A slugified name for the target
 */
function generateTargetName(relativePath: string): string {
  // Handle root path
  if (relativePath === '/' || relativePath === '') {
    return 'Default';
  }

  // Remove leading/trailing slashes, replace internal slashes with hyphens, and slugify
  const cleanPath = relativePath
    .replace(/(^\/+)|(\/+$)/g, '')
    .replace(/\//g, '-');
  return slug(cleanPath, { lower: true });
}

/**
 * Normalize relative path to ensure it has proper format (starts and ends with /)
 * @param relativePath The relative path
 * @returns Normalized path
 */
function normalizeRelativePath(relativePath: string): string {
  if (!relativePath || relativePath === '/') {
    return '/';
  }

  let normalized = relativePath;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  if (!normalized.endsWith('/')) {
    normalized = normalized + '/';
  }
  return normalized;
}

export class NotifyDistributionUseCase
  extends AbstractMemberUseCase<
    NotifyDistributionCommand,
    NotifyDistributionResponse
  >
  implements INotifyDistributionUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitPort: IGitPort,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly packageRepository: IPackageRepository,
    private readonly targetRepository: ITargetRepository,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: NotifyDistributionCommand & MemberContext,
  ): Promise<NotifyDistributionResponse> {
    const {
      distributedPackages: packageSlugs,
      gitRemoteUrl,
      gitBranch,
      relativePath,
    } = command;

    const userId = command.user.id;
    const organizationId = command.organization.id;

    this.logger.info('Processing distribution notification', {
      packageSlugs,
      gitRemoteUrl,
      gitBranch,
      relativePath,
    });

    const providerVendor = parseGitProviderVendor(gitRemoteUrl);
    const { owner, repo } = parseGitRepoInfo(gitRemoteUrl);

    const providerId = await this.findOrCreateProvider({
      userId,
      organizationId,
      providerVendor,
    });

    const gitRepoId = await this.findOrCreateGitRepo({
      userId,
      organizationId,
      providerId,
      owner,
      repo,
      branch: gitBranch,
    });

    const target = await this.findOrCreateTarget({
      gitRepoId: createGitRepoId(gitRepoId),
      relativePath,
    });

    const matchingPackages = await this.findMatchingPackages({
      organizationId,
      packageSlugs,
    });

    const distributionId = createDistributionId(uuidv4());
    const distributedPackages = await this.buildDistributedPackages({
      distributionId,
      packages: matchingPackages,
    });

    await this.saveDistribution({
      distributionId,
      distributedPackages,
      target,
      organizationId,
      authorId: command.user.id,
    });

    this.logger.info('Distribution notification completed successfully', {
      distributionId,
      distributedPackageCount: distributedPackages.length,
    });

    return { deploymentId: distributionId };
  }

  private async findOrCreateProvider(params: {
    userId: UserId;
    organizationId: OrganizationId;
    providerVendor: GitProviderVendor;
  }): Promise<GitProviderId> {
    const { userId, organizationId, providerVendor } = params;

    this.logger.info('Detected git provider vendor', { providerVendor });

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId,
    });

    const tokenlessProvider = providersResponse.providers.find(
      (p) => p.source === providerVendor && !p.hasToken,
    );

    if (tokenlessProvider) {
      this.logger.info('Found existing tokenless provider', {
        providerId: tokenlessProvider.id,
      });
      return tokenlessProvider.id;
    }

    this.logger.info('Creating new tokenless provider');
    const providerUrl =
      providerVendor === 'gitlab' ? 'https://gitlab.com' : 'https://github.com';

    const newProvider = await this.gitPort.addGitProvider({
      userId,
      organizationId,
      gitProvider: {
        source: GitProviderVendors[providerVendor],
        url: providerUrl,
        token: null,
      },
      allowTokenlessProvider: true,
    });

    this.logger.info('Created tokenless provider', {
      providerId: newProvider.id,
    });

    return newProvider.id;
  }

  private async findOrCreateGitRepo(params: {
    userId: UserId;
    organizationId: OrganizationId;
    providerId: GitProviderId;
    owner: string;
    repo: string;
    branch: string;
  }): Promise<string> {
    const { userId, organizationId, providerId, owner, repo, branch } = params;

    this.logger.info('Parsed repository info', { owner, repo });

    // Search for existing repos within the target provider only
    const providerRepos = await this.gitPort.listRepos(providerId);
    const existingRepo = providerRepos.find(
      (r) =>
        r.owner.toLowerCase() === owner.toLowerCase() &&
        r.repo.toLowerCase() === repo.toLowerCase() &&
        r.branch === branch,
    );

    if (existingRepo) {
      this.logger.info('Found existing git repository for this provider', {
        repoId: existingRepo.id,
        providerId,
      });
      return existingRepo.id;
    }

    this.logger.info('Creating new git repository');
    const newRepo = await this.gitPort.addGitRepo({
      userId,
      organizationId,
      gitProviderId: createGitProviderId(providerId),
      owner,
      repo,
      branch,
      allowTokenlessProvider: true,
    });

    this.logger.info('Created git repository', { repoId: newRepo.id });

    return newRepo.id;
  }

  private async findOrCreateTarget(params: {
    gitRepoId: GitRepoId;
    relativePath: string;
  }): Promise<Target> {
    const { gitRepoId, relativePath } = params;
    const normalizedPath = normalizeRelativePath(relativePath);

    const existingTargets =
      await this.targetRepository.findByGitRepoId(gitRepoId);

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

    const newTarget = await this.targetRepository.add({
      id: createTargetId(uuidv4()),
      name: targetName,
      path: normalizedPath,
      gitRepoId,
    });

    this.logger.info('Created target', { targetId: newTarget.id });

    return newTarget;
  }

  private async findMatchingPackages(params: {
    organizationId: OrganizationId;
    packageSlugs: string[];
  }): Promise<Package[]> {
    const { organizationId, packageSlugs } = params;

    const orgPackages =
      await this.packageRepository.findByOrganizationId(organizationId);

    const matchingPackages = orgPackages.filter((pkg) =>
      packageSlugs.includes(pkg.slug),
    );

    this.logger.info('Found matching packages', {
      requestedSlugs: packageSlugs,
      matchedCount: matchingPackages.length,
    });

    return matchingPackages;
  }

  private async buildDistributedPackages(params: {
    distributionId: string;
    packages: Package[];
  }): Promise<DistributedPackageWithVersionIds[]> {
    const { distributionId, packages } = params;
    const distributedPackages: DistributedPackageWithVersionIds[] = [];

    for (const pkg of packages) {
      const standardVersionIds = await this.getLatestStandardVersionIds(
        pkg.standards,
      );
      const recipeVersionIds = await this.getLatestRecipeVersionIds(
        pkg.recipes,
      );

      distributedPackages.push({
        id: createDistributedPackageId(uuidv4()),
        distributionId: createDistributionId(distributionId),
        packageId: pkg.id,
        standardVersions: [],
        recipeVersions: [],
        _standardVersionIds: standardVersionIds,
        _recipeVersionIds: recipeVersionIds,
      });
    }

    return distributedPackages;
  }

  private async getLatestStandardVersionIds(
    standardIds: StandardId[],
  ): Promise<StandardVersionId[]> {
    const versionIds: StandardVersionId[] = [];

    for (const standardId of standardIds) {
      const latestVersion =
        await this.standardsPort.getLatestStandardVersion(standardId);
      if (latestVersion) {
        versionIds.push(latestVersion.id);
      }
    }

    return versionIds;
  }

  private async getLatestRecipeVersionIds(
    recipeIds: RecipeId[],
  ): Promise<RecipeVersionId[]> {
    const versionIds: RecipeVersionId[] = [];

    for (const recipeId of recipeIds) {
      const versions = await this.recipesPort.listRecipeVersions(recipeId);
      const latestVersion = versions.reduce<RecipeVersion | undefined>(
        (latest, current) =>
          current.version > (latest?.version ?? 0) ? current : latest,
        undefined,
      );
      if (latestVersion) {
        versionIds.push(latestVersion.id);
      }
    }

    return versionIds;
  }

  private async saveDistribution(params: {
    distributionId: string;
    distributedPackages: DistributedPackageWithVersionIds[];
    target: Target;
    organizationId: OrganizationId;
    authorId: UserId;
  }): Promise<void> {
    const {
      distributionId,
      distributedPackages,
      target,
      organizationId,
      authorId,
    } = params;

    const distribution: Distribution = {
      id: createDistributionId(distributionId),
      distributedPackages,
      createdAt: new Date().toISOString(),
      authorId,
      organizationId,
      target,
      status: DistributionStatus.success,
      renderModes: [],
    };

    await this.distributionRepository.add(distribution);
    this.logger.info('Created distribution', { distributionId });

    await this.saveDistributedPackages(distributedPackages);
  }

  private async saveDistributedPackages(
    distributedPackages: DistributedPackageWithVersionIds[],
  ): Promise<void> {
    for (const distributedPackage of distributedPackages) {
      await this.distributedPackageRepository.add(distributedPackage);

      if (distributedPackage._standardVersionIds.length > 0) {
        await this.distributedPackageRepository.addStandardVersions(
          distributedPackage.id,
          distributedPackage._standardVersionIds,
        );
      }

      if (distributedPackage._recipeVersionIds.length > 0) {
        await this.distributedPackageRepository.addRecipeVersions(
          distributedPackage.id,
          distributedPackage._recipeVersionIds,
        );
      }
    }
  }
}
