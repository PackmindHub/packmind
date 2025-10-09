import { Factory } from '@packmind/shared/test';
import {
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderModeConfiguration,
  createRenderModeConfigurationId,
} from '@packmind/shared';
import { createOrganizationId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';

export const renderModeConfigurationFactory: Factory<
  RenderModeConfiguration
> = (overrides?: Partial<RenderModeConfiguration>) => {
  return {
    id: createRenderModeConfigurationId(uuidv4()),
    organizationId: createOrganizationId(uuidv4()),
    activeRenderModes: DEFAULT_ACTIVE_RENDER_MODES,
    ...overrides,
  };
};
