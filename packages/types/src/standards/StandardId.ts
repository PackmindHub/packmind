import { Branded, brandedIdFactory } from '../brandedTypes';

export type StandardId = Branded<'StandardId'>;
export const createStandardId = brandedIdFactory<StandardId>();
