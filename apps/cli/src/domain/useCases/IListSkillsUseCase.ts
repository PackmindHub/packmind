import { IPublicUseCase, SpaceId } from '@packmind/types';

export type ListedSkill = {
  slug: string;
  name: string;
  description: string;
  spaceId: string;
};

export type IListSkillsCommand = { spaceId?: SpaceId };

export type IListSkillsResult = ListedSkill[];

export type IListSkillsUseCase = IPublicUseCase<
  IListSkillsCommand,
  IListSkillsResult
>;
