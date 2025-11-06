import { Branded, brandedIdFactory } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { RenderMode, normalizeRenderModes } from './RenderMode';

export type RenderModeConfigurationId = Branded<'RenderModeConfigurationId'>;
export const createRenderModeConfigurationId =
  brandedIdFactory<RenderModeConfigurationId>();

export type RenderModeConfiguration = {
  id: RenderModeConfigurationId;
  organizationId: OrganizationId;
  activeRenderModes: RenderMode[];
};

export const DEFAULT_ACTIVE_RENDER_MODES = normalizeRenderModes([
  RenderMode.AGENTS_MD,
]);
