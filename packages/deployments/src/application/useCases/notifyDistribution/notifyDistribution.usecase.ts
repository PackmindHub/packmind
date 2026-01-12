import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createDistributedPackageId,
  createDistributionId,
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
  PackageId,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  RenderMode,
  StandardId,
  StandardVersionId,
  Target,
  TargetId,
  UserId,
} from '@packmind/types';
import { RenderModeConfigurationService } from '../../services/RenderModeConfigurationService';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../../domain/repositories/ITargetRepository';

const origin = 'NotifyDistributionUseCase';

type GitProviderVendor = 'github' | 'gitlab' | 'unknown';

type DistributedPackageWithVersionIds = DistributedPackage & {
  _standardVersionIds: StandardVersionId[];
  _recipeVersionIds: RecipeVersionId[];
};

/**
 * Parse a git remote URL to extract the provider vendor type
 * @param gitRemoteUrl The git remote URL (e.g., https://github.com/owner/repo.git)
 * @returns 'github', 'gitlab', or 'unknown' based on the URL
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

  return 'unknown';
}

/**
 * Parse a git remote URL to extract owner and repo
 * @param gitRemoteUrl The git remote URL
 * @returns Object with owner and repo
 */
export function parseGitRepoInfo(gitRemoteUrl: string): {
  owner: string;
  repo: string;
} {
  // Handle HTTPS format: https://host.com/owner/repo.git or https://host.com/owner/repo
  // Handle SSH format: git@host.com:owner/repo.git or git@host.com:owner/repo
  // Also handles trailing slashes (e.g., https://host.com/owner/repo/)
  // Generic pattern that works for any git host
  const match = gitRemoteUrl.match(/[/:]([^/:]+)\/([^/.]+)(?:\.git)?\/?$/i);

  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  throw new Error(`Unable to parse git remote URL: ${gitRemoteUrl}`);
}

/**
 * Extract the base URL from a git remote URL
 * @param gitRemoteUrl The git remote URL
 * @returns The base URL (e.g., https://bitbucket.org)
 */
function extractBaseUrl(gitRemoteUrl: string): string {
  // Handle HTTPS format: https://host.com/owner/repo.git
  const httpsMatch = gitRemoteUrl.match(/^(https?:\/\/[^/]+)/i);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  // Handle SSH format: git@host.com:owner/repo.git
  const sshMatch = gitRemoteUrl.match(/^git@([^:]+):/i);
  if (sshMatch) {
    return `https://${sshMatch[1]}`;
  }

  // Fallback: return the original URL
  return gitRemoteUrl;
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
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
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

    const repoId = await this.findOrCreateProviderAndRepo({
      userId,
      organizationId,
      providerVendor,
      gitRemoteUrl,
      owner,
      repo,
      branch: gitBranch,
    });

    const target = await this.findOrCreateTarget({
      gitRepoId: createGitRepoId(repoId),
      relativePath,
    });

    const previouslyActivePackageIds = await this.getPreviouslyActivePackageIds(
      organizationId,
      target.id,
    );

    const matchingPackages = await this.findMatchingPackages({
      organizationId,
      packageSlugs,
    });

    const renderModes =
      await this.renderModeConfigurationService.getActiveRenderModes(
        organizationId,
      );

    const distributionId = createDistributionId(uuidv4());
    const distributedPackages = await this.buildDistributedPackages({
      distributionId,
      packages: matchingPackages,
      previouslyActivePackageIds,
    });

    await this.saveDistribution({
      distributionId,
      distributedPackages,
      target,
      organizationId,
      authorId: command.user.id,
      renderModes,
    });

    this.logger.info('Distribution notification completed successfully', {
      distributionId,
      distributedPackageCount: distributedPackages.length,
    });

    return { deploymentId: distributionId };
  }

  private async findOrCreateProviderAndRepo(params: {
    userId: UserId;
    organizationId: OrganizationId;
    providerVendor: GitProviderVendor;
    gitRemoteUrl: string;
    owner: string;
    repo: string;
    branch: string;
  }): Promise<string> {
    const {
      userId,
      organizationId,
      providerVendor,
      gitRemoteUrl,
      owner,
      repo,
      branch,
    } = params;

    this.logger.info('Finding provider and repo', {
      providerVendor,
      owner,
      repo,
      branch,
    });

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId,
    });

    const vendorProviders = providersResponse.providers.filter(
      (p) => p.source === providerVendor,
    );

    // Only check token providers for known vendors (github, gitlab)
    // Unknown vendors don't have API access to list available repos
    if (providerVendor !== 'unknown') {
      const tokenProviders = vendorProviders.filter((p) => p.hasToken);

      // First pass: Check ALL token providers for existing repos and collect
      // providers that can access the repo. We must check all providers before
      // creating to avoid GitRepositoryExists errors.
      type ProviderInfo = (typeof tokenProviders)[number];
      const providersWithAccess: ProviderInfo[] = [];

      for (const provider of tokenProviders) {
        // Check if repo already exists for this provider
        const existingRepos = await this.gitPort.listRepos(provider.id);
        const existingRepo = existingRepos.find(
          (r) =>
            r.owner.toLowerCase() === owner.toLowerCase() &&
            r.repo.toLowerCase() === repo.toLowerCase() &&
            r.branch === branch,
        );

        if (existingRepo) {
          this.logger.info('Found existing repo under token provider', {
            providerId: provider.id,
            repoId: existingRepo.id,
          });
          return existingRepo.id;
        }

        // Check if token can access the repo
        // Wrap in try-catch to handle expired/invalid tokens gracefully
        try {
          const availableRepos = await this.gitPort.listAvailableRepos(
            provider.id,
          );
          const canAccess = availableRepos.some(
            (r) =>
              r.owner.toLowerCase() === owner.toLowerCase() &&
              r.name.toLowerCase() === repo.toLowerCase(),
          );

          if (canAccess) {
            providersWithAccess.push(provider);
          }
        } catch (error) {
          this.logger.info('Failed to list available repos for provider', {
            providerId: provider.id,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue to next provider - this one's token may be expired/invalid
        }
      }

      // Second pass: If we found a provider with access, create the repo there
      if (providersWithAccess.length > 0) {
        const provider = providersWithAccess[0];
        this.logger.info(
          'Token can access repo, creating under token provider',
          {
            providerId: provider.id,
          },
        );
        const newRepo = await this.gitPort.addGitRepo({
          userId,
          organizationId,
          gitProviderId: provider.id,
          owner,
          repo,
          branch,
        });
        return newRepo.id;
      }
    }

    // Fall back to tokenless provider
    this.logger.info('No token provider has access, falling back to tokenless');

    // Determine the expected provider URL for this git remote
    let expectedProviderUrl: string;
    if (providerVendor === 'github') {
      expectedProviderUrl = 'https://github.com';
    } else if (providerVendor === 'gitlab') {
      expectedProviderUrl = 'https://gitlab.com';
    } else {
      expectedProviderUrl = extractBaseUrl(gitRemoteUrl);
    }

    // Find a tokenless provider that matches the expected URL
    let tokenlessProvider = vendorProviders.find(
      (p) =>
        !p.hasToken &&
        p.url?.toLowerCase() === expectedProviderUrl.toLowerCase(),
    );

    if (!tokenlessProvider) {
      // Create new tokenless provider
      const newProvider = await this.gitPort.addGitProvider({
        userId,
        organizationId,
        gitProvider: {
          source: GitProviderVendors[providerVendor],
          url: expectedProviderUrl,
          token: null,
        },
        allowTokenlessProvider: true,
      });
      this.logger.info('Created tokenless provider', {
        providerId: newProvider.id,
      });
      tokenlessProvider = { ...newProvider, hasToken: false };
    }

    // Check if repo exists under tokenless provider
    const tokenlessRepos = await this.gitPort.listRepos(tokenlessProvider.id);
    const existingTokenlessRepo = tokenlessRepos.find(
      (r) =>
        r.owner.toLowerCase() === owner.toLowerCase() &&
        r.repo.toLowerCase() === repo.toLowerCase() &&
        r.branch === branch,
    );

    if (existingTokenlessRepo) {
      this.logger.info('Found existing repo under tokenless provider', {
        providerId: tokenlessProvider.id,
        repoId: existingTokenlessRepo.id,
      });
      return existingTokenlessRepo.id;
    }

    // Create repo under tokenless provider
    this.logger.info('Creating repo under tokenless provider', {
      providerId: tokenlessProvider.id,
    });
    const newRepo = await this.gitPort.addGitRepo({
      userId,
      organizationId,
      gitProviderId: tokenlessProvider.id,
      owner,
      repo,
      branch,
      allowTokenlessProvider: true,
    });
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

  private async getPreviouslyActivePackageIds(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<PackageId[]> {
    const activePackageIds =
      await this.distributionRepository.findActivePackageIdsByTarget(
        organizationId,
        targetId,
      );

    this.logger.info('Found previously active packages for target', {
      organizationId,
      targetId,
      activePackageCount: activePackageIds.length,
    });

    return activePackageIds;
  }

  private async buildDistributedPackages(params: {
    distributionId: string;
    packages: Package[];
    previouslyActivePackageIds: PackageId[];
  }): Promise<DistributedPackageWithVersionIds[]> {
    const { distributionId, packages, previouslyActivePackageIds } = params;
    const distributedPackages: DistributedPackageWithVersionIds[] = [];
    const currentPackageIds = new Set(packages.map((p) => p.id));

    // Create 'add' entries for current packages
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
        skillVersions: [],
        operation: 'add',
        _standardVersionIds: standardVersionIds,
        _recipeVersionIds: recipeVersionIds,
      });
    }

    // Create 'remove' entries for packages that were previously active but are not in current distribution
    for (const prevPackageId of previouslyActivePackageIds) {
      if (!currentPackageIds.has(prevPackageId)) {
        this.logger.info('Package removed from distribution', {
          packageId: prevPackageId,
        });

        distributedPackages.push({
          id: createDistributedPackageId(uuidv4()),
          distributionId: createDistributionId(distributionId),
          packageId: prevPackageId,
          standardVersions: [],
          recipeVersions: [],
          skillVersions: [],
          operation: 'remove',
          _standardVersionIds: [],
          _recipeVersionIds: [],
        });
      }
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
    renderModes: RenderMode[];
  }): Promise<void> {
    const {
      distributionId,
      distributedPackages,
      target,
      organizationId,
      authorId,
      renderModes,
    } = params;

    const distribution: Distribution = {
      id: createDistributionId(distributionId),
      distributedPackages,
      createdAt: new Date().toISOString(),
      authorId,
      organizationId,
      target,
      status: DistributionStatus.success,
      renderModes,
      source: 'cli',
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
