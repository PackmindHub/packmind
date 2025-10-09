import { OrganizationId } from '@packmind/accounts';
import { IRepository, RenderModeConfiguration } from '@packmind/shared';

export interface IRenderModeConfigurationRepository
  extends IRepository<RenderModeConfiguration> {
  findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<RenderModeConfiguration | null>;
  upsert(
    configuration: RenderModeConfiguration,
  ): Promise<RenderModeConfiguration>;
}
