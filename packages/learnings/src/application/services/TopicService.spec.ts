import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createSpaceId,
  createTopicId,
  createUserId,
  Topic,
  TopicId,
  SpaceId,
  TopicCaptureContext,
  TopicStatus,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { topicFactory } from '../../../test/topicFactory';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { CreateTopicData, TopicService } from './TopicService';

describe('TopicService', () => {
  let topicService: TopicService;
  let topicRepository: ITopicRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    topicRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findBySpaceId: jest.fn(),
      updateStatus: jest.fn(),
      findPendingDigestion: jest.fn(),
      findByKnowledgePatchId: jest.fn(),
      deleteTopic: jest.fn(),
    };

    stubbedLogger = stubLogger();

    topicService = new TopicService(topicRepository, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addTopic', () => {
    let topicData: CreateTopicData;
    let savedTopic: Topic;
    let result: Topic;

    beforeEach(async () => {
      topicData = {
        title: 'Test Technical Decision',
        content: 'We decided to use TypeScript for type safety',
        codeExamples: [
          {
            code: 'const x: string = "hello";',
            language: 'typescript',
          },
        ],
        captureContext: TopicCaptureContext.MCP_TOOL,
        createdBy: createUserId(uuidv4()),
        spaceId: createSpaceId(uuidv4()),
      };

      const now = new Date();
      savedTopic = {
        id: createTopicId(uuidv4()),
        ...topicData,
        status: TopicStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      topicRepository.add = jest.fn().mockResolvedValue(savedTopic);

      result = await topicService.addTopic(topicData);
    });

    it('creates a new topic with generated ID', () => {
      expect(topicRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: topicData.title,
          content: topicData.content,
          codeExamples: topicData.codeExamples,
          captureContext: topicData.captureContext,
          createdBy: topicData.createdBy,
          spaceId: topicData.spaceId,
        }),
      );
    });

    it('returns the created topic', () => {
      expect(result).toEqual(savedTopic);
    });
  });

  describe('getTopicById', () => {
    describe('when the topic exists', () => {
      let topicId: TopicId;
      let topic: Topic;
      let result: Topic | null;

      beforeEach(async () => {
        topicId = createTopicId(uuidv4());
        topic = topicFactory({ id: topicId });

        topicRepository.findById = jest.fn().mockResolvedValue(topic);

        result = await topicService.getTopicById(topicId);
      });

      it('retrieves the topic from repository', () => {
        expect(topicRepository.findById).toHaveBeenCalledWith(topicId);
      });

      it('returns the topic', () => {
        expect(result).toEqual(topic);
      });
    });

    describe('when the topic does not exist', () => {
      let topicId: TopicId;
      let result: Topic | null;

      beforeEach(async () => {
        topicId = createTopicId(uuidv4());

        topicRepository.findById = jest.fn().mockResolvedValue(null);

        result = await topicService.getTopicById(topicId);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('listTopicsBySpaceId', () => {
    let spaceId: SpaceId;
    let topics: Topic[];
    let result: Topic[];

    beforeEach(async () => {
      spaceId = createSpaceId(uuidv4());
      topics = [
        topicFactory({ spaceId, title: 'Topic 1' }),
        topicFactory({ spaceId, title: 'Topic 2' }),
      ];

      topicRepository.findBySpaceId = jest.fn().mockResolvedValue(topics);

      result = await topicService.listTopicsBySpaceId(spaceId);
    });

    it('retrieves topics from repository', () => {
      expect(topicRepository.findBySpaceId).toHaveBeenCalledWith(spaceId);
    });

    it('returns all topics for the space', () => {
      expect(result).toEqual(topics);
    });
  });
});
