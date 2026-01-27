import { PackmindLogger } from '@packmind/logger';
import {
  ISpacesPort,
  IStandardsPort,
  Standard,
  StandardId,
  StandardVersion,
  createStandardVersionId,
  IGetStandardDeploymentOverview,
  GetStandardDeploymentOverviewCommand,
  DistributionStatus,
  TargetStandardDeploymentStatus,
  TargetStandardDeploymentInfo,
  DeployedStandardTargetInfo,
  IGitPort,
  OrganizationId,
  Distribution,
  StandardDeploymentOverview,
  RepositoryStandardDeploymentStatus,
  StandardDeploymentStatus,
  DeployedStandardInfo,
  RepositoryStandardDeploymentInfo,
  GitRepo,
  PackageId,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'GetStandardDeploymentOverviewUseCase';

export class GetStandardDeploymentOverviewUseCase implements IGetStandardDeploymentOverview {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly gitPort: IGitPort,
    private readonly spacesPort: ISpacesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview> {
    this.logger.info('Getting standard deployment overview', {
      organizationId: command.organizationId,
    });

    try {
      // Fetch only successful distributions for the organization
      const distributions =
        await this.distributionRepository.listByOrganizationIdWithStatus(
          command.organizationId as OrganizationId,
          DistributionStatus.success, // Filter only successful distributions for overview
        );

      // Get all spaces for the organization
      const spaces = await this.spacesPort.listSpacesByOrganization(
        command.organizationId as OrganizationId,
      );

      // Get all active standards across all spaces
      const [activeStandardsPerSpace, gitRepos] = await Promise.all([
        Promise.all(
          spaces.map((space) =>
            this.standardsPort.listStandardsBySpace(
              space.id,
              command.organizationId as OrganizationId,
              command.userId,
            ),
          ),
        ),
        this.gitPort.getOrganizationRepositories(
          command.organizationId as OrganizationId,
        ),
      ]);

      // Flatten active standards from all spaces
      const activeStandards = activeStandardsPerSpace.flat();
      const activeStandardIds = new Set(activeStandards.map((s) => s.id));

      // Find standard IDs that are deleted but still effectively deployed
      // (only considering latest distribution per package per target)
      const deletedStandardIds = this.computeDeletedStandardIdsStillDeployed(
        distributions,
        activeStandardIds,
      );

      // Fetch deleted standards if any exist
      let deletedStandards: Standard[] = [];
      if (deletedStandardIds.length > 0) {
        const allStandardsPerSpace = await Promise.all(
          spaces.map((space) =>
            this.standardsPort.listStandardsBySpace(
              space.id,
              command.organizationId as OrganizationId,
              command.userId,
              { includeDeleted: true },
            ),
          ),
        );
        const allStandards = allStandardsPerSpace.flat();
        deletedStandards = allStandards.filter(
          (s) =>
            deletedStandardIds.includes(s.id as StandardId) &&
            !activeStandardIds.has(s.id),
        );
      }

      // Combine active and deleted standards for building the overview
      const allStandards = [...activeStandards, ...deletedStandards];

      // Build the overview using the distribution data
      const overview = this.buildOverviewFromDistributions(
        distributions,
        allStandards,
        gitRepos,
        activeStandardIds,
      );

      this.logger.info('Successfully retrieved standard deployment overview', {
        organizationId: command.organizationId,
        repositoriesCount: overview.repositories.length,
        standardsCount: overview.standards.length,
      });

      return overview;
    } catch (error) {
      this.logger.error('Failed to get standard deployment overview', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private buildOverviewFromDistributions(
    distributions: Distribution[],
    standards: Standard[],
    gitRepos: GitRepo[],
    activeStandardIds?: Set<StandardId>,
  ): StandardDeploymentOverview {
    // Create a map of the latest standard versions for easy lookup
    const latestStandardVersionMap =
      this.buildLatestStandardVersionMap(standards);

    // Create a map of standards by ID for easy lookup
    const standardsMap = new Map<string, Standard>();
    standards.forEach((standard) => {
      const existing = standardsMap.get(standard.id);
      if (!existing || standard.version > existing.version) {
        standardsMap.set(standard.id, standard);
      }
    });

    // Build repository-centric view
    const repositories: RepositoryStandardDeploymentStatus[] = gitRepos.map(
      (gitRepo) => {
        const deployedStandards = this.getDeployedStandardsForRepo(
          gitRepo,
          distributions,
          latestStandardVersionMap,
          standardsMap,
        );

        const hasOutdatedStandards = deployedStandards.some(
          (info) => !info.isUpToDate,
        );

        return {
          gitRepo,
          deployedStandards,
          hasOutdatedStandards,
        };
      },
    );

    // Build standard-centric view
    const standardStatuses: StandardDeploymentStatus[] = Array.from(
      standardsMap.values(),
    )
      .map((standard) => {
        // Find the latest version of this standard
        const latestVersion = latestStandardVersionMap.get(standard.id);
        if (!latestVersion) return null;

        const deploymentInfos = this.getDeploymentInfosForStandard(
          standard,
          latestVersion,
          gitRepos,
          distributions,
        );

        const hasOutdatedDeployments = deploymentInfos.some(
          (info) => !info.isUpToDate,
        );

        // Build target-based deployments for this standard
        const targetDeployments = this.buildTargetDeploymentsForStandard(
          standard,
          distributions,
          gitRepos,
        );

        // Determine if standard is deleted (not in active standards set)
        const isDeleted = activeStandardIds
          ? !activeStandardIds.has(standard.id)
          : undefined;

        const status: StandardDeploymentStatus = {
          standard,
          latestVersion,
          deployments: deploymentInfos,
          targetDeployments,
          hasOutdatedDeployments,
        };

        if (isDeleted) {
          status.isDeleted = true;
        }

        return status;
      })
      .filter((status): status is StandardDeploymentStatus => status !== null);

    // Build target-centric view
    const targets = this.buildTargetCentricView(
      distributions,
      standards,
      gitRepos,
      activeStandardIds,
    );

    return {
      repositories,
      targets,
      standards: standardStatuses,
    };
  }

  public buildTargetCentricView(
    distributions: Distribution[],
    standards: Standard[],
    gitRepos: GitRepo[],
    activeStandardIds?: Set<StandardId>,
  ): TargetStandardDeploymentStatus[] {
    // Group distributions by target
    const targetMap = new Map<string, Distribution[]>();

    for (const distribution of distributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetMap.has(targetId)) {
          targetMap.set(targetId, []);
        }
        const targetDistributions = targetMap.get(targetId);
        if (targetDistributions) {
          targetDistributions.push(distribution);
        }
      }
    }

    // Build target deployment status for each target
    const targetStatuses: TargetStandardDeploymentStatus[] = [];

    for (const [, targetDistributions] of targetMap.entries()) {
      const target = targetDistributions[0]?.target; // All distributions have the same target
      if (!target) continue;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      // Get deployed standards for this target
      const deployedStandards: DeployedStandardTargetInfo[] = [];
      let hasOutdatedStandards = false;

      // Sort distributions newest first to find the latest distribution per package
      const sortedDistributions = [...targetDistributions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // First pass: Track the latest distribution for each package
      const latestDistributionPerPackage = new Map<
        PackageId,
        { standardVersions: StandardVersion[]; deploymentDate: string }
      >();

      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.standardVersions) continue;
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(dp.packageId)) {
            // Skip packages with 'remove' operation - they should not contribute standards
            if (dp.operation === 'remove') {
              latestDistributionPerPackage.set(dp.packageId, {
                standardVersions: [],
                deploymentDate: distribution.createdAt,
              });
            } else {
              latestDistributionPerPackage.set(dp.packageId, {
                standardVersions: dp.standardVersions.filter(
                  (sv) => sv && sv.standardId,
                ),
                deploymentDate: distribution.createdAt,
              });
            }
          }
        }
      }

      // Second pass: Extract standard versions from latest distributions only
      const standardVersionsMap = new Map<
        StandardId,
        StandardVersion & { deploymentDate: string }
      >();

      for (const [, data] of latestDistributionPerPackage) {
        for (const standardVersion of data.standardVersions) {
          const existing = standardVersionsMap.get(standardVersion.standardId);
          if (!existing || standardVersion.version > existing.version) {
            standardVersionsMap.set(standardVersion.standardId, {
              ...standardVersion,
              deploymentDate: data.deploymentDate,
            });
          }
        }
      }

      // Convert to DeployedStandardTargetInfo format
      for (const [
        standardId,
        deployedVersion,
      ] of standardVersionsMap.entries()) {
        const standard = standards.find((s) => s.id === standardId);
        if (!standard) continue;

        const latestVersion: StandardVersion = {
          // Convert Standard to StandardVersion
          id: createStandardVersionId(standard.id),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          version: standard.version,
          description: standard.description,
          summary: null, // Standards don't have summary in the base type
          gitCommit: standard.gitCommit,
          userId: standard.userId,
          scope: standard.scope,
        };
        const isUpToDate = deployedVersion.version >= latestVersion.version;

        const isDeleted = activeStandardIds
          ? !activeStandardIds.has(standard.id as StandardId)
          : undefined;

        if (!isUpToDate || isDeleted) {
          hasOutdatedStandards = true;
        }

        deployedStandards.push({
          standard,
          deployedVersion,
          latestVersion,
          isUpToDate,
          deploymentDate: deployedVersion.deploymentDate,
          ...(isDeleted && { isDeleted }),
        });
      }

      targetStatuses.push({
        target,
        gitRepo,
        deployedStandards,
        hasOutdatedStandards,
      });
    }

    return targetStatuses;
  }

  public buildTargetDeploymentsForStandard(
    standard: Standard,
    allDistributions: Distribution[],
    gitRepos: GitRepo[],
  ): TargetStandardDeploymentInfo[] {
    // Group ALL distributions by target (not just those containing the standard)
    const targetDistributionMap = new Map<string, Distribution[]>();

    for (const distribution of allDistributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetDistributionMap.has(targetId)) {
          targetDistributionMap.set(targetId, []);
        }
        const targetDistributions = targetDistributionMap.get(targetId);
        if (targetDistributions) {
          targetDistributions.push(distribution);
        }
      }
    }

    const targetDeployments: TargetStandardDeploymentInfo[] = [];

    for (const [, targetDistributions] of targetDistributionMap.entries()) {
      const target = targetDistributions[0]?.target;
      if (!target) continue;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      // Sort distributions newest first to find the latest distribution per package
      const sortedDistributions = [...targetDistributions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // First pass: Track the latest distribution for each package
      const latestDistributionPerPackage = new Map<
        PackageId,
        { standardVersions: StandardVersion[]; deploymentDate: string }
      >();

      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.standardVersions) continue;
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(dp.packageId)) {
            // Skip packages with 'remove' operation - they should not contribute standards
            if (dp.operation === 'remove') {
              latestDistributionPerPackage.set(dp.packageId, {
                standardVersions: [],
                deploymentDate: distribution.createdAt,
              });
            } else {
              latestDistributionPerPackage.set(dp.packageId, {
                standardVersions: dp.standardVersions.filter(
                  (sv) => sv && sv.standardId,
                ),
                deploymentDate: distribution.createdAt,
              });
            }
          }
        }
      }

      // Second pass: Find the standard in the latest distributions
      let latestDeployedVersion: StandardVersion | null = null;
      let latestDeploymentDate = '';

      for (const [, data] of latestDistributionPerPackage) {
        for (const standardVersion of data.standardVersions) {
          if (standardVersion.standardId === standard.id) {
            if (
              !latestDeployedVersion ||
              standardVersion.version > latestDeployedVersion.version
            ) {
              latestDeployedVersion = standardVersion;
              latestDeploymentDate = data.deploymentDate;
            }
          }
        }
      }

      if (latestDeployedVersion) {
        const latestVersion: StandardVersion = {
          id: createStandardVersionId(standard.id),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          version: standard.version,
          description: standard.description,
          summary: null,
          gitCommit: standard.gitCommit,
          userId: standard.userId,
          scope: standard.scope,
        };

        targetDeployments.push({
          target,
          gitRepo,
          deployedVersion: latestDeployedVersion,
          isUpToDate: latestDeployedVersion.version >= latestVersion.version,
          deploymentDate: latestDeploymentDate,
        });
      }
    }

    return targetDeployments;
  }

  private buildLatestStandardVersionMap(
    standards: Standard[],
  ): Map<string, StandardVersion> {
    const map = new Map<string, StandardVersion>();

    standards.forEach((standard) => {
      const existing = map.get(standard.id);
      if (!existing || standard.version > existing.version) {
        // Convert Standard to StandardVersion format
        const standardVersion: StandardVersion = {
          id: createStandardVersionId(standard.id),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          version: standard.version,
          description: standard.description,
          summary: null,
          gitCommit: standard.gitCommit,
          userId: standard.userId,
          scope: standard.scope,
        };
        map.set(standard.id, standardVersion);
      }
    });

    return map;
  }

  private getDeployedStandardsForRepo(
    gitRepo: GitRepo,
    distributions: Distribution[],
    latestStandardVersionMap: Map<string, StandardVersion>,
    standardsMap: Map<string, Standard>,
  ): DeployedStandardInfo[] {
    const repoDistributions = distributions.filter((distribution) => {
      // Use the new single-reference model
      return distribution.target?.gitRepoId === gitRepo.id;
    });

    // Get the latest distribution for this repo
    const latestDistribution = repoDistributions.reduce(
      (latest, current) => {
        if (
          !latest ||
          new Date(current.createdAt) > new Date(latest.createdAt)
        ) {
          return current;
        }
        return latest;
      },
      null as Distribution | null,
    );

    if (!latestDistribution) {
      return [];
    }

    // Get all unique standards from the latest distribution
    const deployedStandardsMap = new Map<string, StandardVersion>();
    const standardVersions = latestDistribution.distributedPackages.flatMap(
      (dp) => dp.standardVersions,
    );
    standardVersions.forEach((standardVersion) => {
      const existing = deployedStandardsMap.get(standardVersion.standardId);
      if (!existing || standardVersion.version > existing.version) {
        deployedStandardsMap.set(standardVersion.standardId, standardVersion);
      }
    });

    return Array.from(deployedStandardsMap.values())
      .map((deployedVersion) => {
        const latestVersion = latestStandardVersionMap.get(
          deployedVersion.standardId,
        );
        if (!latestVersion) {
          // This should not happen in normal circumstances
          return null;
        }

        // Find the standard entity
        const standard = standardsMap.get(deployedVersion.standardId);
        if (!standard) {
          return null;
        }

        const isUpToDate = deployedVersion.version >= latestVersion.version;

        return {
          standard,
          deployedVersion,
          latestVersion,
          isUpToDate,
          deploymentDate: latestDistribution.createdAt,
        };
      })
      .filter((info): info is DeployedStandardInfo => info !== null);
  }

  private getDeploymentInfosForStandard(
    standard: Standard,
    latestVersion: StandardVersion,
    gitRepos: GitRepo[],
    distributions: Distribution[],
  ): RepositoryStandardDeploymentInfo[] {
    const standardDistributions = distributions.filter((distribution) =>
      distribution.distributedPackages.some((dp) =>
        dp.standardVersions.some(
          (version) => version.standardId === standard.id,
        ),
      ),
    );

    const deploymentInfos: RepositoryStandardDeploymentInfo[] = [];

    gitRepos.forEach((gitRepo) => {
      // Find the latest distribution of this standard to this repo
      const repoDistributions = standardDistributions.filter(
        (distribution) => distribution.target?.gitRepoId === gitRepo.id,
      );

      if (repoDistributions.length === 0) {
        return; // No distributions to this repo
      }

      const latestDistribution = repoDistributions.reduce((latest, current) => {
        if (
          !latest ||
          new Date(current.createdAt) > new Date(latest.createdAt)
        ) {
          return current;
        }
        return latest;
      }, repoDistributions[0]);

      // Find the latest version of this standard in the distribution
      const standardsInLatestDistribution =
        latestDistribution.distributedPackages
          .flatMap((dp) => dp.standardVersions)
          .filter((version) => version.standardId === standard.id);

      const deployedVersion = standardsInLatestDistribution.reduce(
        (latest, current) => {
          if (!latest || current.version > latest.version) {
            return current;
          }
          return latest;
        },
        standardsInLatestDistribution[0],
      );

      const isUpToDate = deployedVersion.version >= latestVersion.version;

      deploymentInfos.push({
        gitRepo,
        deployedVersion,
        isUpToDate,
        deploymentDate: latestDistribution.createdAt,
      });
    });

    return deploymentInfos;
  }

  /**
   * Computes deleted standard IDs that are still effectively deployed.
   * A deleted standard is considered "still deployed" only if ALL packages that
   * ever contained it still have it in their latest distribution.
   *
   * If ANY package that previously contained the standard has been redistributed
   * without the standard, the standard is excluded from the result.
   */
  private computeDeletedStandardIdsStillDeployed(
    distributions: Distribution[],
    activeStandardIds: Set<StandardId>,
  ): StandardId[] {
    // Group distributions by target
    const targetDistributions = new Map<string, Distribution[]>();
    for (const distribution of distributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetDistributions.has(targetId)) {
          targetDistributions.set(targetId, []);
        }
        const targetDists = targetDistributions.get(targetId);
        if (targetDists) {
          targetDists.push(distribution);
        }
      }
    }

    // Collect standard IDs that are still effectively deployed across all targets
    const effectivelyDeployedStandardIds = new Set<StandardId>();

    for (const [, targetDists] of targetDistributions) {
      // Sort distributions newest first
      const sortedDistributions = [...targetDists].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // First pass: Track which packages EVER had each standard (from ALL distributions)
      const packagesPerStandard = new Map<StandardId, Set<PackageId>>();
      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.standardVersions || dp.operation === 'remove')
            continue;
          for (const sv of dp.standardVersions) {
            if (!sv || !sv.standardId) continue;
            if (!packagesPerStandard.has(sv.standardId)) {
              packagesPerStandard.set(sv.standardId, new Set());
            }
            packagesPerStandard.get(sv.standardId)!.add(dp.packageId);
          }
        }
      }

      // Second pass: Track the LATEST distribution per package (standards in that latest dist)
      const latestStandardsPerPackage = new Map<PackageId, Set<StandardId>>();
      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.standardVersions) continue;
          // Only keep the first (latest) occurrence of each package
          if (!latestStandardsPerPackage.has(dp.packageId)) {
            const standardIds = new Set<StandardId>();
            // Skip packages with 'remove' operation - they have no standards
            if (dp.operation !== 'remove') {
              for (const sv of dp.standardVersions) {
                if (sv && sv.standardId) {
                  standardIds.add(sv.standardId);
                }
              }
            }
            latestStandardsPerPackage.set(dp.packageId, standardIds);
          }
        }
      }

      // Third pass: For each standard, check if ALL packages that ever had it still have it
      for (const [standardId, packagesThatHadStandard] of packagesPerStandard) {
        // Skip active standards
        if (activeStandardIds.has(standardId)) continue;

        // Check if ANY package that ever had this standard no longer has it
        let allPackagesStillHaveStandard = true;
        for (const packageId of packagesThatHadStandard) {
          const latestStandards = latestStandardsPerPackage.get(packageId);
          if (!latestStandards || !latestStandards.has(standardId)) {
            // This package's latest distribution doesn't have the standard
            allPackagesStillHaveStandard = false;
            break;
          }
        }

        // Only include if ALL packages that ever had it still have it in latest
        if (allPackagesStillHaveStandard) {
          effectivelyDeployedStandardIds.add(standardId);
        }
      }
    }

    // Return standards that are effectively deployed but no longer active
    return Array.from(effectivelyDeployedStandardIds).filter(
      (id) => !activeStandardIds.has(id),
    );
  }
}
