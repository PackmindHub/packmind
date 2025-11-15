import { ITopicRepository } from './ITopicRepository';

export interface ILearningsRepositories {
  getTopicRepository(): ITopicRepository;
}
