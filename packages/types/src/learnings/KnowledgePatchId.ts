import { Branded, brandedIdFactory } from '../brandedTypes';

export type KnowledgePatchId = Branded<'KnowledgePatchId'>;
export const createKnowledgePatchId = brandedIdFactory<KnowledgePatchId>();
