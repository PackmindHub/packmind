import { IPublicUseCase } from '@packmind/types';
import { ListedSkill } from '../repositories/ISkillsGateway';

export type IListSkillsCommand = Record<string, never>;

export type IListSkillsResult = ListedSkill[];

export type IListSkillsUseCase = IPublicUseCase<
  IListSkillsCommand,
  IListSkillsResult
>;
