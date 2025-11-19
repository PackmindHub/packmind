import {
  IRepository,
  RagLabConfiguration,
  OrganizationId,
} from '@packmind/types';

export interface IRagLabConfigurationRepository
  extends IRepository<RagLabConfiguration> {
  findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<RagLabConfiguration | null>;
}
