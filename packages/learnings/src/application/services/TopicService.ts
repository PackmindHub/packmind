import { v4 as uuidv4 } from 'uuid';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { TopicRepository } from '../../infra/repositories/TopicRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createTopicId,
  Topic,
  TopicId,
  SpaceId,
  UserId,
  TopicCaptureContext,
  CodeExample,
  TopicStatus,
} from '@packmind/types';

const origin = 'TopicService';

export type CreateTopicData = {
  title: string;
  content: string;
  codeExamples: CodeExample[];
  captureContext: TopicCaptureContext;
  createdBy: UserId;
  spaceId: SpaceId;
};

export class TopicService {
  constructor(
    private readonly topicRepository: ITopicRepository = new TopicRepository(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('TopicService initialized');
  }

  async addTopic(topicData: CreateTopicData): Promise<Topic> {
    this.logger.info('Adding new topic', {
      title: topicData.title,
      spaceId: topicData.spaceId,
      createdBy: topicData.createdBy,
    });

    try {
      const topicId = createTopicId(uuidv4());
      const now = new Date();

      const topic: Topic = {
        id: topicId,
        ...topicData,
        status: TopicStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      const savedTopic = await this.topicRepository.add(topic);
      this.logger.info('Topic added to repository successfully', {
        topicId,
        title: topicData.title,
      });

      return savedTopic;
    } catch (error) {
      this.logger.error('Failed to add topic', {
        title: topicData.title,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getTopicById(topicId: TopicId): Promise<Topic | null> {
    this.logger.info('Getting topic by ID', { topicId });

    try {
      const topic = await this.topicRepository.findById(topicId);

      if (topic) {
        this.logger.info('Topic found', { topicId });
      } else {
        this.logger.warn('Topic not found', { topicId });
      }

      return topic;
    } catch (error) {
      this.logger.error('Failed to get topic by ID', {
        topicId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listTopicsBySpaceId(spaceId: SpaceId): Promise<Topic[]> {
    this.logger.info('Listing topics by space ID', { spaceId });

    try {
      const topics = await this.topicRepository.findBySpaceId(spaceId);
      this.logger.info('Topics found by space ID', {
        spaceId,
        count: topics.length,
      });
      return topics;
    } catch (error) {
      this.logger.error('Failed to list topics by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
