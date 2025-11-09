import { OrganizationId } from '@packmind/types';
import { IRepository } from '@packmind/types';
import { RenderModeConfiguration } from '@packmind/types';

export interface IRenderModeConfigurationRepository
  extends IRepository<RenderModeConfiguration> {
  findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<RenderModeConfiguration | null>;
  upsert(
    configuration: RenderModeConfiguration,
  ): Promise<RenderModeConfiguration>;
}
