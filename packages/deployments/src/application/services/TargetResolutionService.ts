import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  GitProviderVendors,
  IGitPort,
  OrganizationId,
  PackageId,
  RecipeVersion,
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
  extractBaseUrl,
  generateTargetName,
  normalizeRelativePath,
  GitProviderVendor,
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

    const repoId = await this.findOrCreateProviderAndRepo({
      userId,
      organizationId,
      providerVendor,
      gitRemoteUrl,
      owner,
      repo,
      branch: gitBranch,
    });

    return this.findOrCreateTarget({
      gitRepoId: createGitRepoId(repoId),
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

  private async findOrCreateProviderAndRepo(params: {
    userId: string;
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
