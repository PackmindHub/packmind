import { Branded, brandedIdFactory } from '../brandedTypes';

export type TargetId = Branded<'TargetId'>;
export const createTargetId = brandedIdFactory<TargetId>();
