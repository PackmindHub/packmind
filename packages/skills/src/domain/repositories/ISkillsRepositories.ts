import { ISkillRepository } from './ISkillRepository';
import { ISkillVersionRepository } from './ISkillVersionRepository';

export interface ISkillsRepositories {
  getSkillRepository(): ISkillRepository;
  getSkillVersionRepository(): ISkillVersionRepository;
}
