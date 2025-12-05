import {
  DistributionStatus,
  GitRepoId,
  IRepository,
  OrganizationId,
  StandardId,
  StandardsDeployment,
  StandardVersion,
  TargetId,
} from '@packmind/types';

export interface IStandardsDeploymentRepository
  extends IRepository<StandardsDeployment> {
  listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<StandardsDeployment[]>;
  listByStandardId(
    standardId: StandardId,
    organizationId: OrganizationId,
  ): Promise<StandardsDeployment[]>;
  listByOrganizationIdAndGitRepos(
    organizationId: OrganizationId,
    gitRepoIds: GitRepoId[],
  ): Promise<StandardsDeployment[]>;
  /**
   * Get all currently deployed standard versions for a specific repository.
   * This returns the latest deployed version of each unique standard.
   * Used to generate complete standard books that include all deployed standards.
   */
  findActiveStandardVersionsByRepository(
    organizationId: OrganizationId,
    gitRepoId: GitRepoId,
  ): Promise<StandardVersion[]>;

  listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<StandardsDeployment[]>;

  listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
  ): Promise<StandardsDeployment[]>;
}
