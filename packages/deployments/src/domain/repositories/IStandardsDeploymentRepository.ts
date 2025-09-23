import { StandardsDeployment } from '../entities/StandardsDeployment';
import { StandardVersion } from '@packmind/standards/types';
import { OrganizationId } from '@packmind/accounts/types';
import { StandardId } from '@packmind/standards/types';
import { GitRepoId } from '@packmind/git/types';
import { TargetId, DistributionStatus } from '@packmind/shared';
import { IRepository } from '@packmind/shared';

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

  /**
   * Get all currently deployed standard versions for a specific target.
   * This returns the latest deployed version of each unique standard.
   * Used to generate complete standard books that include all deployed standards.
   */
  findActiveStandardVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<StandardVersion[]>;

  // New methods for target-based queries
  listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<StandardsDeployment[]>;

  listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
  ): Promise<StandardsDeployment[]>;
}
