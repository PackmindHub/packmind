import { Branded, brandedIdFactory } from '../brandedTypes';

export type SkillId = Branded<'SkillId'>;
export const createSkillId = brandedIdFactory<SkillId>();
