import { IKnowledgePatchRepository } from './IKnowledgePatchRepository';
import { ITopicRepository } from './ITopicRepository';

export interface ILearningsRepositories {
  getTopicRepository(): ITopicRepository;
  getKnowledgePatchRepository(): IKnowledgePatchRepository;
}
