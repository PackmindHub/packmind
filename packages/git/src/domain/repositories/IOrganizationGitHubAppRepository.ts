import { OrganizationGitHubApp } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IOrganizationGitHubAppRepository extends IRepository<OrganizationGitHubApp> {
  /**
   * Returns the most recent (including revoked) record for the given org,
   * or null if none exists. Prefer `findActiveByOrganizationId` for
   * operational lookups that must exclude revoked entries.
   */
  findByOrganizationId(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null>;

  /**
   * Returns the active (non-revoked, non-deleted) record for the given org,
   * or null if none exists.
   */
  findActiveByOrganizationId(
    orgId: OrganizationId,
  ): Promise<OrganizationGitHubApp | null>;

  /**
   * Sets `revokedAt = now()` on the active row for the given org.
   * No-ops if no active row exists.
   */
  markRevoked(orgId: OrganizationId): Promise<void>;

  /**
   * Inserts a new record for the org. If an active record already exists,
   * that record is marked revoked first (within a transaction), then the
   * new record is inserted. Used by the re-register flow.
   */
  upsertForOrganization(
    app: OrganizationGitHubApp,
  ): Promise<OrganizationGitHubApp>;
}
