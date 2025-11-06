import { Branded, brandedIdFactory } from '../brandedTypes';

export type SpaceId = Branded<'SpaceId'>;
export const createSpaceId = brandedIdFactory<SpaceId>();
