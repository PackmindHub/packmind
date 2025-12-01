import { Branded, brandedIdFactory } from '../brandedTypes';

export type AIProviderId = Branded<'AIProviderId'>;
export const createAIProviderId = brandedIdFactory<AIProviderId>();
