import { IPublicUseCase } from '@packmind/types';
import { ListedSkill } from '../repositories/IPackmindGateway';

export type IListSkillsCommand = Record<string, never>;

export type IListSkillsResult = ListedSkill[];

export type IListSkillsUseCase = IPublicUseCase<
  IListSkillsCommand,
  IListSkillsResult
>;
