import { DataSource } from 'typeorm';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { IKnowledgePatchRepository } from '../../domain/repositories/IKnowledgePatchRepository';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { ITopicKnowledgePatchRepository } from '../../domain/repositories/ITopicKnowledgePatchRepository';
import { KnowledgePatchSchema } from '../schemas/KnowledgePatchSchema';
import { TopicSchema } from '../schemas/TopicSchema';
import { TopicKnowledgePatchSchema } from '../schemas/TopicKnowledgePatchSchema';
import { KnowledgePatchRepository } from './KnowledgePatchRepository';
import { TopicRepository } from './TopicRepository';
import { TopicKnowledgePatchRepository } from './TopicKnowledgePatchRepository';

export class LearningsRepositories implements ILearningsRepositories {
  private readonly topicRepository: ITopicRepository;
  private readonly knowledgePatchRepository: IKnowledgePatchRepository;
  private readonly topicKnowledgePatchRepository: ITopicKnowledgePatchRepository;

  constructor(private readonly dataSource: DataSource) {
    this.topicRepository = new TopicRepository(
      this.dataSource.getRepository(TopicSchema),
    );
    this.knowledgePatchRepository = new KnowledgePatchRepository(
      this.dataSource.getRepository(KnowledgePatchSchema),
    );
    this.topicKnowledgePatchRepository = new TopicKnowledgePatchRepository(
      this.dataSource.getRepository(TopicKnowledgePatchSchema),
    );
  }

  getTopicRepository(): ITopicRepository {
    return this.topicRepository;
  }

  getKnowledgePatchRepository(): IKnowledgePatchRepository {
    return this.knowledgePatchRepository;
  }

  getTopicKnowledgePatchRepository(): ITopicKnowledgePatchRepository {
    return this.topicKnowledgePatchRepository;
  }
}
