import { DataSource } from 'typeorm';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { IKnowledgePatchRepository } from '../../domain/repositories/IKnowledgePatchRepository';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { KnowledgePatchSchema } from '../schemas/KnowledgePatchSchema';
import { TopicSchema } from '../schemas/TopicSchema';
import { KnowledgePatchRepository } from './KnowledgePatchRepository';
import { TopicRepository } from './TopicRepository';

export class LearningsRepositories implements ILearningsRepositories {
  private readonly topicRepository: ITopicRepository;
  private readonly knowledgePatchRepository: IKnowledgePatchRepository;

  constructor(private readonly dataSource: DataSource) {
    this.topicRepository = new TopicRepository(
      this.dataSource.getRepository(TopicSchema),
    );
    this.knowledgePatchRepository = new KnowledgePatchRepository(
      this.dataSource.getRepository(KnowledgePatchSchema),
    );
  }

  getTopicRepository(): ITopicRepository {
    return this.topicRepository;
  }

  getKnowledgePatchRepository(): IKnowledgePatchRepository {
    return this.knowledgePatchRepository;
  }
}
