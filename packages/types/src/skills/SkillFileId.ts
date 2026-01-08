import { Branded, brandedIdFactory } from '../brandedTypes';

export type SkillFileId = Branded<'SkillFileId'>;
export const createSkillFileId = brandedIdFactory<SkillFileId>();
