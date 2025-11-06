import { PackmindLogger } from '@packmind/logger';
import { ISpacesPort } from '@packmind/types';

//TODO: remove and replace with an adapter pattern
import { StandardsHexa } from '@packmind/standards';

import {
  Standard,
  StandardId,
  StandardVersion,
  createStandardVersionId,
} from '@packmind/types';
import {
  IGetStandardDeploymentOverview,
  GetStandardDeploymentOverviewCommand,
  DistributionStatus,
  TargetStandardDeploymentStatus,
  TargetStandardDeploymentInfo,
  DeployedStandardTargetInfo,
} from '@packmind/types';
import { GitHexa, GitRepo } from '@packmind/git';
import { OrganizationId } from '@packmind/accounts';
import { StandardsDeployment } from '../../domain/entities/StandardsDeployment';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import {
  StandardDeploymentOverview,
  RepositoryStandardDeploymentStatus,
  StandardDeploymentStatus,
  DeployedStandardInfo,
  RepositoryStandardDeploymentInfo,
} from '../../domain/types/StandardDeploymentOverview';

const origin = 'GetStandardDeploymentOverviewUseCase';

export class GetStandardDeploymentOverviewUseCase
  implements IGetStandardDeploymentOverview
{
  constructor(
    private readonly standardsDeploymentRepository: IStandardsDeploymentRepository,
    private readonly standardsHexa: StandardsHexa,
    private readonly gitHexa: GitHexa,
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
      // Fetch only successful standard deployments for the organization
      const deployments =
        await this.standardsDeploymentRepository.listByOrganizationIdWithStatus(
          command.organizationId as OrganizationId,
          DistributionStatus.success, // Filter only successful deployments for overview
        );

      // Get all spaces for the organization
      const spaces = await this.spacesPort.listSpacesByOrganization(
        command.organizationId as OrganizationId,
      );

      // Get all standards across all spaces and git repos
      const [standardsPerSpace, gitRepos] = await Promise.all([
        Promise.all(
          spaces.map((space) =>
            this.standardsHexa.listStandardsBySpace({
              userId: command.userId,
              organizationId: command.organizationId as OrganizationId,
              spaceId: space.id,
            }),
          ),
        ),
        this.gitHexa.getOrganizationRepositories(
          command.organizationId as OrganizationId,
        ),
      ]);

      // Flatten standards from all spaces
      const standards = standardsPerSpace
        .flat()
        .map((response) => response.standards)
        .flat();

      // Build the overview using the deployment data
      const overview = this.buildOverviewFromDeployments(
        deployments,
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

  private buildOverviewFromDeployments(
    deployments: StandardsDeployment[],
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
          deployments,
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
          deployments,
        );

        const hasOutdatedDeployments = deploymentInfos.some(
          (info) => !info.isUpToDate,
        );

        // Build target-based deployments for this standard
        const targetDeployments = this.buildTargetDeploymentsForStandard(
          standard,
          deployments,
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
      deployments,
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
    deployments: StandardsDeployment[],
    standards: Standard[],
    gitRepos: GitRepo[],
  ): TargetStandardDeploymentStatus[] {
    // Group deployments by target
    const targetMap = new Map<string, StandardsDeployment[]>();

    for (const deployment of deployments) {
      if (deployment.target) {
        const targetId = deployment.target.id;
        if (!targetMap.has(targetId)) {
          targetMap.set(targetId, []);
        }
        const targetDeployments = targetMap.get(targetId);
        if (targetDeployments) {
          targetDeployments.push(deployment);
        }
      }
    }

    // Build target deployment status for each target
    const targetStatuses: TargetStandardDeploymentStatus[] = [];

    for (const [, targetDeployments] of targetMap.entries()) {
      const target = targetDeployments[0]?.target; // All deployments have the same target
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

      for (const deployment of targetDeployments) {
        // All deployments are successful since we filtered at query level
        for (const standardVersion of deployment.standardVersions) {
          const existing = standardVersionsMap.get(standardVersion.standardId);
          if (!existing || standardVersion.version > existing.version) {
            standardVersionsMap.set(standardVersion.standardId, {
              ...standardVersion,
              deploymentDate: deployment.createdAt,
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
    allDeployments: StandardsDeployment[],
    gitRepos: GitRepo[],
  ): TargetStandardDeploymentInfo[] {
    // Filter deployments for this specific standard
    const standardDeployments = allDeployments.filter((deployment) =>
      deployment.standardVersions.some((sv) => sv.standardId === standard.id),
    );

    // Group by target
    const targetDeploymentMap = new Map<string, StandardsDeployment[]>();

    for (const deployment of standardDeployments) {
      if (deployment.target) {
        const targetId = deployment.target.id;
        if (!targetDeploymentMap.has(targetId)) {
          targetDeploymentMap.set(targetId, []);
        }
        const targetDeployments = targetDeploymentMap.get(targetId);
        if (targetDeployments) {
          targetDeployments.push(deployment);
        }
      }
    }

    const targetDeployments: TargetStandardDeploymentInfo[] = [];

    for (const [, deployments] of targetDeploymentMap.entries()) {
      const target = deployments[0]?.target;
      if (!target) continue;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      // Find the latest deployed version for this standard on this target
      let latestDeployedVersion: StandardVersion | null = null;
      let latestDeploymentDate = '';

      for (const deployment of deployments) {
        for (const standardVersion of deployment.standardVersions) {
          if (standardVersion.standardId === standard.id) {
            if (
              !latestDeployedVersion ||
              standardVersion.version > latestDeployedVersion.version
            ) {
              latestDeployedVersion = standardVersion;
              latestDeploymentDate = deployment.createdAt;
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
    deployments: StandardsDeployment[],
    latestStandardVersionMap: Map<string, StandardVersion>,
    standardsMap: Map<string, Standard>,
  ): DeployedStandardInfo[] {
    const repoDeployments = deployments.filter((deployment) => {
      // Use the new single-reference model
      return deployment.target?.gitRepoId === gitRepo.id;
    });

    // Get the latest deployment for this repo
    const latestDeployment = repoDeployments.reduce(
      (latest, current) => {
        if (
          !latest ||
          new Date(current.createdAt) > new Date(latest.createdAt)
        ) {
          return current;
        }
        return latest;
      },
      null as StandardsDeployment | null,
    );

    if (!latestDeployment) {
      return [];
    }

    // Get all unique standards from the latest deployment
    const deployedStandardsMap = new Map<string, StandardVersion>();
    latestDeployment.standardVersions.forEach((standardVersion) => {
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
          deploymentDate: latestDeployment.createdAt,
        };
      })
      .filter((info): info is DeployedStandardInfo => info !== null);
  }

  private getDeploymentInfosForStandard(
    standard: Standard,
    latestVersion: StandardVersion,
    gitRepos: GitRepo[],
    deployments: StandardsDeployment[],
  ): RepositoryStandardDeploymentInfo[] {
    const standardDeployments = deployments.filter((deployment) =>
      deployment.standardVersions.some(
        (version) => version.standardId === standard.id,
      ),
    );

    const deploymentInfos: RepositoryStandardDeploymentInfo[] = [];

    gitRepos.forEach((gitRepo) => {
      // Find the latest deployment of this standard to this repo
      const repoDeployments = standardDeployments.filter(
        (deployment) => deployment.target?.gitRepoId === gitRepo.id,
      );

      if (repoDeployments.length === 0) {
        return; // No deployments to this repo
      }

      const latestDeployment = repoDeployments.reduce((latest, current) => {
        if (
          !latest ||
          new Date(current.createdAt) > new Date(latest.createdAt)
        ) {
          return current;
        }
        return latest;
      }, repoDeployments[0]);

      // Find the latest version of this standard in the deployment
      const standardsInLatestDeployment =
        latestDeployment.standardVersions.filter(
          (version) => version.standardId === standard.id,
        );

      const deployedVersion = standardsInLatestDeployment.reduce(
        (latest, current) => {
          if (!latest || current.version > latest.version) {
            return current;
          }
          return latest;
        },
        standardsInLatestDeployment[0],
      );

      const isUpToDate = deployedVersion.version >= latestVersion.version;

      deploymentInfos.push({
        gitRepo,
        deployedVersion,
        isUpToDate,
        deploymentDate: latestDeployment.createdAt,
      });
    });

    return deploymentInfos;
  }
}
