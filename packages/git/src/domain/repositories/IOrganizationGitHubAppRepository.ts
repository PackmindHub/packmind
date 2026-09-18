import { OrganizationGitHubApp } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IOrganizationGitHubAppRepository extends IRepository<OrganizationGitHubApp> {
  /**
   * Most recent record for the org, revoked ones included. Prefer
   * `findActiveByOrganizationId` for operational lookups.
   */
  findByOrganizationId(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null>;

  /** Active meaning neither revoked nor deleted. */
  findActiveByOrganizationId(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null>;

  /** No-ops if no active row exists. */
  markRevoked(orgId: OrganizationId): Promise<void>;

  /**
   * Any already-active record is marked revoked before the insert, both in
   * one transaction.
   */
  upsertForOrganization(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp>;
}
