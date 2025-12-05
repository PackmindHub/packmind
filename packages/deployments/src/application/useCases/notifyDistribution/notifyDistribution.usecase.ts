import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createDistributedPackageId,
  createDistributionId,
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createTargetId,
  Distribution,
  DistributedPackage,
  DistributionStatus,
  GitProviderVendors,
  IAccountsPort,
  IGitPort,
  INotifyDistributionUseCase,
  IRecipesPort,
  IStandardsPort,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  OrganizationId,
  RecipeVersion,
  RecipeVersionId,
  StandardVersion,
  StandardVersionId,
  UnsupportedGitProviderError,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../../domain/repositories/ITargetRepository';

const origin = 'NotifyDistributionUseCase';

/**
 * Parse a git remote URL to extract the provider vendor type
 * @param gitRemoteUrl The git remote URL (e.g., https://github.com/owner/repo.git)
 * @returns 'github' or 'gitlab' based on the URL, throws otherwise
 */
function parseGitProviderVendor(gitRemoteUrl: string): 'github' | 'gitlab' {
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
      userId,
      organizationId: organizationIdString,
    } = command;

    // Cast organizationId to branded type
    const organizationId: OrganizationId =
      createOrganizationId(organizationIdString);

    this.logger.info('Processing distribution notification', {
      packageSlugs,
      gitRemoteUrl,
      gitBranch,
      relativePath,
    });

    // Step 1: Parse git remote URL to determine provider type
    const providerVendor = parseGitProviderVendor(gitRemoteUrl);
    this.logger.info('Detected git provider vendor', { providerVendor });

    // Step 2: Parse owner/repo from URL
    const { owner, repo } = parseGitRepoInfo(gitRemoteUrl);
    this.logger.info('Parsed repository info', { owner, repo });

    // Step 3: Find or create tokenless GitProvider
    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId,
    });

    // Find tokenless provider of the same vendor type
    const tokenlessProvider = providersResponse.providers.find(
      (p) => p.source === providerVendor && !p.hasToken,
    );

    let providerId: string;

    if (tokenlessProvider) {
      this.logger.info('Found existing tokenless provider', {
        providerId: tokenlessProvider.id,
      });
      providerId = tokenlessProvider.id;
    } else {
      // Create new tokenless provider
      this.logger.info('Creating new tokenless provider');
      const providerUrl =
        providerVendor === 'gitlab'
          ? 'https://gitlab.com'
          : 'https://github.com';
      const newProvider = await this.gitPort.addGitProvider({
        userId,
        organizationId,
        gitProvider: {
          source: GitProviderVendors[providerVendor],
          url: providerUrl,
          token: null,
        },
        // Allow tokenless provider since this is an internal use case for CLI distributions
        allowTokenlessProvider: true,
      });
      providerId = newProvider.id;
      this.logger.info('Created tokenless provider', {
        providerId: newProvider.id,
      });
    }

    // Step 4: Find or create GitRepo
    const existingRepoResult =
      await this.gitPort.findGitRepoByOwnerRepoAndBranchInOrganization({
        userId,
        organizationId,
        owner,
        repo,
        branch: gitBranch,
      });

    let gitRepoId: string;

    if (existingRepoResult.gitRepo) {
      this.logger.info('Found existing git repository', {
        repoId: existingRepoResult.gitRepo.id,
      });
      gitRepoId = existingRepoResult.gitRepo.id;
    } else {
      // Create new git repo
      this.logger.info('Creating new git repository');
      const newRepo = await this.gitPort.addGitRepo({
        userId,
        organizationId,
        gitProviderId: createGitProviderId(providerId),
        owner,
        repo,
        branch: gitBranch,
        // Allow tokenless provider since this is an internal use case for CLI distributions
        allowTokenlessProvider: true,
      });
      gitRepoId = newRepo.id;
      this.logger.info('Created git repository', { repoId: newRepo.id });
    }

    // Step 5: Find or create Target
    const normalizedPath = normalizeRelativePath(relativePath);
    const existingTargets = await this.targetRepository.findByGitRepoId(
      createGitRepoId(gitRepoId),
    );

    let targetId: string;
    const existingTarget = existingTargets.find(
      (t) => t.path === normalizedPath,
    );

    if (existingTarget) {
      this.logger.info('Found existing target', {
        targetId: existingTarget.id,
      });
      targetId = existingTarget.id;
    } else {
      // Create new target
      const targetName = generateTargetName(relativePath);
      this.logger.info('Creating new target', {
        targetName,
        path: normalizedPath,
      });

      const newTarget = await this.targetRepository.add({
        id: createTargetId(uuidv4()),
        name: targetName,
        path: normalizedPath,
        gitRepoId: createGitRepoId(gitRepoId),
      });
      targetId = newTarget.id;
      this.logger.info('Created target', { targetId: newTarget.id });
    }

    // Step 6: Find matching packages by slug in the organization
    const orgPackages =
      await this.packageRepository.findByOrganizationId(organizationId);
    const matchingPackages = orgPackages.filter((pkg) =>
      packageSlugs.includes(pkg.slug),
    );

    this.logger.info('Found matching packages', {
      requestedSlugs: packageSlugs,
      matchedCount: matchingPackages.length,
    });

    // Step 7: Create Distribution
    const distributionId = createDistributionId(uuidv4());
    const now = new Date().toISOString();

    // Step 8: Create DistributedPackages with latest versions
    const distributedPackageEntities: DistributedPackage[] = [];

    for (const pkg of matchingPackages) {
      const distributedPackageId = createDistributedPackageId(uuidv4());

      // Get latest versions for each standard and recipe
      const standardVersions: StandardVersion[] = [];
      const recipeVersions: RecipeVersion[] = [];

      for (const standardId of pkg.standards) {
        const latestVersion =
          await this.standardsPort.getLatestStandardVersion(standardId);
        if (latestVersion) {
          standardVersions.push(latestVersion);
        }
      }

      for (const recipeId of pkg.recipes) {
        const versions = await this.recipesPort.listRecipeVersions(recipeId);
        // Get the latest version (highest version number)
        const latestVersion = versions.reduce(
          (latest, current) =>
            current.version > (latest?.version ?? 0) ? current : latest,
          versions[0],
        );
        if (latestVersion) {
          recipeVersions.push(latestVersion);
        }
      }

      const distributedPackage: DistributedPackage = {
        id: distributedPackageId,
        distributionId,
        packageId: pkg.id,
        standardVersions: [], // Versions are linked separately via addStandardVersions/addRecipeVersions
        recipeVersions: [],
      };

      distributedPackageEntities.push({
        ...distributedPackage,
        // Keep track of versions to link after creation
        _standardVersionIds: standardVersions.map((sv) => sv.id),
        _recipeVersionIds: recipeVersions.map((rv) => rv.id),
      } as DistributedPackage & {
        _standardVersionIds: string[];
        _recipeVersionIds: string[];
      });
    }

    // Step 9: Save Distribution
    const target = existingTarget ?? {
      id: createTargetId(targetId),
      name: generateTargetName(relativePath),
      path: normalizedPath,
      gitRepoId: createGitRepoId(gitRepoId),
    };

    const distribution: Distribution = {
      id: distributionId,
      distributedPackages: distributedPackageEntities,
      createdAt: now,
      authorId: command.user.id,
      organizationId,
      target,
      status: DistributionStatus.success,
      renderModes: [],
    };

    await this.distributionRepository.add(distribution);
    this.logger.info('Created distribution', { distributionId });

    // Step 10: Save DistributedPackages and link versions
    for (const distributedPackage of distributedPackageEntities) {
      const extendedPackage = distributedPackage as DistributedPackage & {
        _standardVersionIds: string[];
        _recipeVersionIds: string[];
      };

      await this.distributedPackageRepository.add(distributedPackage);

      if (extendedPackage._standardVersionIds.length > 0) {
        await this.distributedPackageRepository.addStandardVersions(
          distributedPackage.id,
          extendedPackage._standardVersionIds as StandardVersionId[],
        );
      }

      if (extendedPackage._recipeVersionIds.length > 0) {
        await this.distributedPackageRepository.addRecipeVersions(
          distributedPackage.id,
          extendedPackage._recipeVersionIds as RecipeVersionId[],
        );
      }
    }

    this.logger.info('Distribution notification completed successfully', {
      distributionId,
      distributedPackageCount: distributedPackageEntities.length,
    });

    return { deploymentId: distributionId };
  }
}
