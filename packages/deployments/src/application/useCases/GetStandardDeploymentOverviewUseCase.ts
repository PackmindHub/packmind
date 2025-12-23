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

      // Get all standards across all spaces and git repos
      const [standardsPerSpace, gitRepos] = await Promise.all([
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

      // Flatten standards from all spaces
      const standards = standardsPerSpace.flat();

      // Build the overview using the distribution data
      const overview = this.buildOverviewFromDistributions(
        distributions,
        standards,
        gitRepos,
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

        return {
          standard,
          latestVersion,
          deployments: deploymentInfos,
          targetDeployments,
          hasOutdatedDeployments,
        };
      })
      .filter((status): status is StandardDeploymentStatus => status !== null);

    // Build target-centric view
    const targets = this.buildTargetCentricView(
      distributions,
      standards,
      gitRepos,
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

      // Process each standard deployed to this target
      const standardVersionsMap = new Map<
        StandardId,
        StandardVersion & { deploymentDate: string }
      >();

      for (const distribution of targetDistributions) {
        // All distributions are successful since we filtered at query level
        const standardVersions = distribution.distributedPackages.flatMap(
          (dp) => dp.standardVersions,
        );
        for (const standardVersion of standardVersions) {
          const existing = standardVersionsMap.get(standardVersion.standardId);
          if (!existing || standardVersion.version > existing.version) {
            standardVersionsMap.set(standardVersion.standardId, {
              ...standardVersion,
              deploymentDate: distribution.createdAt,
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

        if (!isUpToDate) {
          hasOutdatedStandards = true;
        }

        deployedStandards.push({
          standard,
          deployedVersion,
          latestVersion,
          isUpToDate,
          deploymentDate: deployedVersion.deploymentDate,
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
    // Filter distributions for this specific standard
    const standardDistributions = allDistributions.filter((distribution) =>
      distribution.distributedPackages.some((dp) =>
        dp.standardVersions.some((sv) => sv.standardId === standard.id),
      ),
    );

    // Group by target
    const targetDistributionMap = new Map<string, Distribution[]>();

    for (const distribution of standardDistributions) {
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

      // Find the latest deployed version for this standard on this target
      let latestDeployedVersion: StandardVersion | null = null;
      let latestDeploymentDate = '';

      for (const distribution of targetDistributions) {
        const standardVersions = distribution.distributedPackages.flatMap(
          (dp) => dp.standardVersions,
        );
        for (const standardVersion of standardVersions) {
          if (standardVersion.standardId === standard.id) {
            if (
              !latestDeployedVersion ||
              standardVersion.version > latestDeployedVersion.version
            ) {
              latestDeployedVersion = standardVersion;
              latestDeploymentDate = distribution.createdAt;
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
}
