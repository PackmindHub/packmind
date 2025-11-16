import { IKnowledgePatchRepository } from './IKnowledgePatchRepository';
import { ITopicRepository } from './ITopicRepository';
import { ITopicKnowledgePatchRepository } from './ITopicKnowledgePatchRepository';

export interface ILearningsRepositories {
  getTopicRepository(): ITopicRepository;
  getKnowledgePatchRepository(): IKnowledgePatchRepository;
  getTopicKnowledgePatchRepository(): ITopicKnowledgePatchRepository;
}
