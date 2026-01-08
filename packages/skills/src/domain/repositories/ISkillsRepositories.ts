import { ISkillRepository } from './ISkillRepository';
import { ISkillVersionRepository } from './ISkillVersionRepository';
import { ISkillFileRepository } from './ISkillFileRepository';

export interface ISkillsRepositories {
  getSkillRepository(): ISkillRepository;
  getSkillVersionRepository(): ISkillVersionRepository;
  getSkillFileRepository(): ISkillFileRepository;
}
