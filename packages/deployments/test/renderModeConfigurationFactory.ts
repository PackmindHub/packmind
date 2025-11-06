import { Factory } from '@packmind/test-utils';
import {
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderModeConfiguration,
  createRenderModeConfigurationId,
  createOrganizationId,
} from '@packmind/types';
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
