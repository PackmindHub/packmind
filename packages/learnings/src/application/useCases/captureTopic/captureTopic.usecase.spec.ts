import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  CaptureTopicCommand,
  createSpaceId,
  createTopicId,
  createUserId,
  TopicCaptureContext,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { topicFactory } from '../../../../test/topicFactory';
import { TopicService } from '../../services/TopicService';
import { CaptureTopicUsecase } from './captureTopic.usecase';

describe('CaptureTopicUsecase', () => {
  let captureTopicUsecase: CaptureTopicUsecase;
  let topicService: jest.Mocked<TopicService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    topicService = {
      addTopic: jest.fn(),
      getTopicById: jest.fn(),
      listTopicsBySpaceId: jest.fn(),
    } as unknown as jest.Mocked<TopicService>;

    stubbedLogger = stubLogger();

    captureTopicUsecase = new CaptureTopicUsecase(topicService, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: CaptureTopicCommand;

    beforeEach(() => {
      const userId = createUserId(uuidv4());
      const spaceId = createSpaceId(uuidv4());

      command = {
        title: 'Use TypeScript for type safety',
        content:
          'We decided to use TypeScript instead of JavaScript for better type safety and developer experience.',
        spaceId: spaceId,
        codeExamples: [
          {
            code: 'const greeting: string = "Hello";',
            language: 'typescript',
          },
        ],
        captureContext: TopicCaptureContext.MCP_TOOL,
        userId: userId,
        organizationId: 'org-123',
      };
    });

    it('creates a topic with provided data', async () => {
      const savedTopic = topicFactory({
        id: createTopicId(uuidv4()),
        title: command.title,
        content: command.content,
        codeExamples: command.codeExamples,
        captureContext: command.captureContext,
        createdBy: createUserId(command.userId),
        spaceId: createSpaceId(command.spaceId),
      });

      topicService.addTopic.mockResolvedValue(savedTopic);

      const result = await captureTopicUsecase.execute(command);

      expect(topicService.addTopic).toHaveBeenCalledWith({
        title: command.title,
        content: command.content,
        codeExamples: command.codeExamples,
        captureContext: command.captureContext,
        createdBy: createUserId(command.userId),
        spaceId: createSpaceId(command.spaceId),
      });

      expect(result).toEqual(savedTopic);
    });

    it('returns the created topic', async () => {
      const savedTopic = topicFactory();
      topicService.addTopic.mockResolvedValue(savedTopic);

      const result = await captureTopicUsecase.execute(command);

      expect(result).toEqual(savedTopic);
    });

    describe('when topic creation fails', () => {
      it('throws the error', async () => {
        const error = new Error('Database connection failed');
        topicService.addTopic.mockRejectedValue(error);

        await expect(captureTopicUsecase.execute(command)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('when codeExamples is empty', () => {
      it('creates topic with empty code examples array', async () => {
        const commandWithoutCode = {
          ...command,
          codeExamples: [],
        };

        const savedTopic = topicFactory({ codeExamples: [] });
        topicService.addTopic.mockResolvedValue(savedTopic);

        const result = await captureTopicUsecase.execute(commandWithoutCode);

        expect(topicService.addTopic).toHaveBeenCalledWith(
          expect.objectContaining({
            codeExamples: [],
          }),
        );

        expect(result.codeExamples).toEqual([]);
      });
    });
  });
});
