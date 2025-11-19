import { DataSource } from 'typeorm';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { IKnowledgePatchRepository } from '../../domain/repositories/IKnowledgePatchRepository';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { ITopicKnowledgePatchRepository } from '../../domain/repositories/ITopicKnowledgePatchRepository';
import { IRagLabConfigurationRepository } from '../../domain/repositories/IRagLabConfigurationRepository';
import { KnowledgePatchSchema } from '../schemas/KnowledgePatchSchema';
import { TopicSchema } from '../schemas/TopicSchema';
import { TopicKnowledgePatchSchema } from '../schemas/TopicKnowledgePatchSchema';
import { RagLabConfigurationSchema } from '../schemas/RagLabConfigurationSchema';
import { KnowledgePatchRepository } from './KnowledgePatchRepository';
import { TopicRepository } from './TopicRepository';
import { TopicKnowledgePatchRepository } from './TopicKnowledgePatchRepository';
import { RagLabConfigurationRepository } from './RagLabConfigurationRepository';

export class LearningsRepositories implements ILearningsRepositories {
  private readonly topicRepository: ITopicRepository;
  private readonly knowledgePatchRepository: IKnowledgePatchRepository;
  private readonly topicKnowledgePatchRepository: ITopicKnowledgePatchRepository;
  private readonly ragLabConfigurationRepository: IRagLabConfigurationRepository;

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
    this.ragLabConfigurationRepository = new RagLabConfigurationRepository(
      this.dataSource.getRepository(RagLabConfigurationSchema),
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

  getRagLabConfigurationRepository(): IRagLabConfigurationRepository {
    return this.ragLabConfigurationRepository;
  }
}
