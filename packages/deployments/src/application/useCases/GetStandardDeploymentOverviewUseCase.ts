import { PackmindLogger } from '@packmind/shared';

//TODO: remove and replace with an adapter pattern
import { StandardsHexa } from '@packmind/standards';

import {
  Standard,
  StandardVersion,
  createStandardVersionId,
  IGetStandardDeploymentOverview,
  GetStandardDeploymentOverviewCommand,
} from '@packmind/shared';
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
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview> {
    this.logger.info('Getting standard deployment overview', {
      organizationId: command.organizationId,
    });

    try {
      // Fetch all standard deployments for the organization
      const deployments =
        await this.standardsDeploymentRepository.listByOrganizationId(
          command.organizationId as OrganizationId,
        );

      // Get all standards and git repos from the organization
      const [standards, gitRepos] = await Promise.all([
        this.standardsHexa.listStandardsByOrganization(
          command.organizationId as OrganizationId,
        ),
        this.gitHexa.getOrganizationRepositories(
          command.organizationId as OrganizationId,
        ),
      ]);

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

        return {
          standard,
          latestVersion,
          deployments: deploymentInfos,
          hasOutdatedDeployments,
        };
      })
      .filter((status): status is StandardDeploymentStatus => status !== null);

    return {
      repositories,
      standards: standardStatuses,
    };
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
    const repoDeployments = deployments.filter((deployment) =>
      deployment.gitRepos.some((repo) => repo.id === gitRepo.id),
    );

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
      const repoDeployments = standardDeployments.filter((deployment) =>
        deployment.gitRepos.some((repo) => repo.id === gitRepo.id),
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
