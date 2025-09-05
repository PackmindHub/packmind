import { IStandardRepository } from './IStandardRepository';
import { IStandardVersionRepository } from './IStandardVersionRepository';
import { IRuleRepository } from './IRuleRepository';
import { IRuleExampleRepository } from './IRuleExampleRepository';

export interface IStandardsRepositories {
  getStandardRepository(): IStandardRepository;
  getStandardVersionRepository(): IStandardVersionRepository;
  getRuleRepository(): IRuleRepository;
  getRuleExampleRepository(): IRuleExampleRepository;
}
