import { Branded, brandedIdFactory } from '../brandedTypes';

export type SkillVersionId = Branded<'SkillVersionId'>;
export const createSkillVersionId = brandedIdFactory<SkillVersionId>();
