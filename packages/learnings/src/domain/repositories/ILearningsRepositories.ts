import { IKnowledgePatchRepository } from './IKnowledgePatchRepository';
import { ITopicRepository } from './ITopicRepository';
import { ITopicKnowledgePatchRepository } from './ITopicKnowledgePatchRepository';
import { IRagLabConfigurationRepository } from './IRagLabConfigurationRepository';

export interface ILearningsRepositories {
  getTopicRepository(): ITopicRepository;
  getKnowledgePatchRepository(): IKnowledgePatchRepository;
  getTopicKnowledgePatchRepository(): ITopicKnowledgePatchRepository;
  getRagLabConfigurationRepository(): IRagLabConfigurationRepository;
}
