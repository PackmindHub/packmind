import { IPublicUseCase } from '@packmind/types';

export type ListedSkill = {
  slug: string;
  name: string;
  description: string;
};

export type IListSkillsCommand = Record<string, never>;

export type IListSkillsResult = ListedSkill[];

export type IListSkillsUseCase = IPublicUseCase<
  IListSkillsCommand,
  IListSkillsResult
>;
