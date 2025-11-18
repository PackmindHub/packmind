import { Branded, brandedIdFactory } from '../brandedTypes';

export type RagLabConfigurationId = Branded<'RagLabConfigurationId'>;
export const createRagLabConfigurationId =
  brandedIdFactory<RagLabConfigurationId>();
