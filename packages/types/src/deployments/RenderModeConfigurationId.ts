import { Branded, brandedIdFactory } from '../brandedTypes';

export type RenderModeConfigurationId = Branded<'RenderModeConfigurationId'>;
export const createRenderModeConfigurationId =
  brandedIdFactory<RenderModeConfigurationId>();
