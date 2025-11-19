import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  DeleteTopicsCommand,
  createTopicId,
  createSpaceId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';
import { DeleteTopicsUsecase } from './deleteTopics.usecase';

describe('DeleteTopicsUsecase', () => {
  let deleteTopicsUsecase: DeleteTopicsUsecase;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    topicRepository = {
      deleteTopic: jest.fn(),
    } as unknown as jest.Mocked<ITopicRepository>;

    stubbedLogger = stubLogger();

    deleteTopicsUsecase = new DeleteTopicsUsecase(
      topicRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: DeleteTopicsCommand;

    beforeEach(() => {
      const topicId1 = createTopicId(uuidv4());
      const topicId2 = createTopicId(uuidv4());
      const topicId3 = createTopicId(uuidv4());

      command = {
        topicIds: [topicId1, topicId2, topicId3],
        spaceId: createSpaceId('space-123'),
        organizationId: 'org-123',
        userId: 'user-123',
      };
    });

    it('deletes multiple topics successfully', async () => {
      topicRepository.deleteTopic.mockResolvedValue(undefined);

      const result = await deleteTopicsUsecase.execute(command);

      expect(topicRepository.deleteTopic).toHaveBeenCalledTimes(3);
      expect(topicRepository.deleteTopic).toHaveBeenCalledWith(
        command.topicIds[0],
        command.spaceId,
      );
      expect(topicRepository.deleteTopic).toHaveBeenCalledWith(
        command.topicIds[1],
        command.spaceId,
      );
      expect(topicRepository.deleteTopic).toHaveBeenCalledWith(
        command.topicIds[2],
        command.spaceId,
      );
      expect(result).toEqual({});
    });

    it('calls deleteTopic with correct parameters for each topic', async () => {
      topicRepository.deleteTopic.mockResolvedValue(undefined);

      await deleteTopicsUsecase.execute(command);

      const calls = topicRepository.deleteTopic.mock.calls;
      calls.forEach((call, index) => {
        expect(call[0]).toBe(command.topicIds[index]);
        expect(call[1]).toBe(command.spaceId);
      });
    });

    describe('when delete fails', () => {
      it('throws the error', async () => {
        const error = new Error('Topic not found');
        topicRepository.deleteTopic.mockRejectedValue(error);

        await expect(deleteTopicsUsecase.execute(command)).rejects.toThrow(
          'Topic not found',
        );
      });
    });

    describe('when empty array provided', () => {
      it('completes without calling deleteTopic', async () => {
        const emptyCommand = {
          ...command,
          topicIds: [],
        };

        const result = await deleteTopicsUsecase.execute(emptyCommand);

        expect(topicRepository.deleteTopic).not.toHaveBeenCalled();
        expect(result).toEqual({});
      });
    });
  });
});
