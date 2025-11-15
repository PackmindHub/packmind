import { DataSource } from 'typeorm';
import { ILearningsRepositories } from '../../domain/repositories/ILearningsRepositories';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { TopicSchema } from '../schemas/TopicSchema';
import { TopicRepository } from './TopicRepository';

export class LearningsRepositories implements ILearningsRepositories {
  private readonly topicRepository: ITopicRepository;

  constructor(private readonly dataSource: DataSource) {
    this.topicRepository = new TopicRepository(
      this.dataSource.getRepository(TopicSchema),
    );
  }

  getTopicRepository(): ITopicRepository {
    return this.topicRepository;
  }
}
