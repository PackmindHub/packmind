import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  BatchRejectKnowledgePatchesCommand,
  createKnowledgePatchId,
  createSpaceId,
  createUserId,
  KnowledgePatch,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { RejectKnowledgePatchUsecase } from '../rejectKnowledgePatch/rejectKnowledgePatch.usecase';
import { BatchRejectKnowledgePatchesUsecase } from './batchRejectKnowledgePatches.usecase';

describe('BatchRejectKnowledgePatchesUsecase', () => {
  let batchRejectUsecase: BatchRejectKnowledgePatchesUsecase;
  let rejectKnowledgePatchUsecase: jest.Mocked<RejectKnowledgePatchUsecase>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    rejectKnowledgePatchUsecase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RejectKnowledgePatchUsecase>;

    stubbedLogger = stubLogger();

    batchRejectUsecase = new BatchRejectKnowledgePatchesUsecase(
      rejectKnowledgePatchUsecase,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: BatchRejectKnowledgePatchesCommand;

    beforeEach(() => {
      const patchId1 = createKnowledgePatchId(uuidv4());
      const patchId2 = createKnowledgePatchId(uuidv4());
      const patchId3 = createKnowledgePatchId(uuidv4());

      command = {
        patchIds: [patchId1, patchId2, patchId3],
        spaceId: createSpaceId('space-123'),
        reviewedBy: createUserId(uuidv4()),
        reviewNotes: 'Not aligned with our standards',
        organizationId: 'org-123',
        userId: 'user-123',
      };
    });

    it('rejects multiple patches successfully', async () => {
      rejectKnowledgePatchUsecase.execute.mockResolvedValue({
        patch: {} as KnowledgePatch,
      });

      const result = await batchRejectUsecase.execute(command);

      expect(rejectKnowledgePatchUsecase.execute).toHaveBeenCalledTimes(3);
      expect(rejectKnowledgePatchUsecase.execute).toHaveBeenCalledWith({
        patchId: command.patchIds[0],
        spaceId: command.spaceId,
        reviewedBy: command.reviewedBy,
        reviewNotes: command.reviewNotes,
        organizationId: command.organizationId,
        userId: command.userId,
      });
      expect(result).toEqual({});
    });

    it('applies same review notes to all patches', async () => {
      rejectKnowledgePatchUsecase.execute.mockResolvedValue({
        patch: {} as KnowledgePatch,
      });

      await batchRejectUsecase.execute(command);

      const calls = rejectKnowledgePatchUsecase.execute.mock.calls;
      calls.forEach((call) => {
        expect(call[0].reviewNotes).toBe('Not aligned with our standards');
      });
    });

    describe('when reject fails', () => {
      it('throws the error', async () => {
        const error = new Error('Patch not found');
        rejectKnowledgePatchUsecase.execute.mockRejectedValue(error);

        await expect(batchRejectUsecase.execute(command)).rejects.toThrow(
          'Patch not found',
        );
      });
    });

    describe('when empty array provided', () => {
      it('completes without calling reject', async () => {
        const emptyCommand = {
          ...command,
          patchIds: [],
        };

        const result = await batchRejectUsecase.execute(emptyCommand);

        expect(rejectKnowledgePatchUsecase.execute).not.toHaveBeenCalled();
        expect(result).toEqual({});
      });
    });
  });
});
