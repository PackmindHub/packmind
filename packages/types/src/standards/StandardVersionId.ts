import { Branded, brandedIdFactory } from '../brandedTypes';

export type StandardVersionId = Branded<'StandardVersionId'>;
export const createStandardVersionId = brandedIdFactory<StandardVersionId>();
