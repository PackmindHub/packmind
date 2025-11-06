import { RenderModeConfigurationId } from './RenderModeConfigurationId';
import { OrganizationId } from '../accounts/Organization';
import { RenderMode, normalizeRenderModes } from './RenderMode';

export type RenderModeConfiguration = {
  id: RenderModeConfigurationId;
  organizationId: OrganizationId;
  activeRenderModes: RenderMode[];
};

export const DEFAULT_ACTIVE_RENDER_MODES = normalizeRenderModes([
  RenderMode.AGENTS_MD,
]);
