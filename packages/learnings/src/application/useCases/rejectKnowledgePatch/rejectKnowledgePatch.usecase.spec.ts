import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createKnowledgePatchId,
  createUserId,
  KnowledgePatchStatus,
  RejectKnowledgePatchCommand,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { knowledgePatchFactory } from '../../../../test/knowledgePatchFactory';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';
import { RejectKnowledgePatchUsecase } from './rejectKnowledgePatch.usecase';

describe('RejectKnowledgePatchUsecase', () => {
  let rejectKnowledgePatchUsecase: RejectKnowledgePatchUsecase;
  let knowledgePatchService: jest.Mocked<KnowledgePatchService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    knowledgePatchService = {
      getPatchById: jest.fn(),
      updatePatchStatus: jest.fn(),
    } as unknown as jest.Mocked<KnowledgePatchService>;

    stubbedLogger = stubLogger();

    rejectKnowledgePatchUsecase = new RejectKnowledgePatchUsecase(
      knowledgePatchService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: RejectKnowledgePatchCommand;
    let patchId: ReturnType<typeof createKnowledgePatchId>;
    let reviewedBy: ReturnType<typeof createUserId>;

    beforeEach(() => {
      patchId = createKnowledgePatchId(uuidv4());
      reviewedBy = createUserId(uuidv4());

      command = {
        patchId: patchId,
        reviewedBy: reviewedBy,
        reviewNotes: 'Does not align with current architecture',
        organizationId: 'org-123',
        userId: 'user-123',
      };
    });

    it('rejects a pending patch successfully', async () => {
      const pendingPatch = knowledgePatchFactory({
        id: patchId,
        status: KnowledgePatchStatus.PENDING_REVIEW,
      });

      const rejectedPatch = knowledgePatchFactory({
        id: patchId,
        status: KnowledgePatchStatus.REJECTED,
        reviewedBy: reviewedBy,
        reviewNotes: command.reviewNotes,
        reviewedAt: new Date(),
      });

      knowledgePatchService.getPatchById.mockResolvedValue(pendingPatch);
      knowledgePatchService.updatePatchStatus.mockResolvedValue(rejectedPatch);

      const result = await rejectKnowledgePatchUsecase.execute(command);

      expect(knowledgePatchService.getPatchById).toHaveBeenCalledWith(patchId);
      expect(knowledgePatchService.updatePatchStatus).toHaveBeenCalledWith(
        patchId,
        KnowledgePatchStatus.REJECTED,
        reviewedBy,
        'Does not align with current architecture',
      );
      expect(result.patch).toEqual(rejectedPatch);
    });

    describe('when review notes are missing', () => {
      it('throws an error for empty notes', async () => {
        const commandWithoutNotes = {
          ...command,
          reviewNotes: '',
        };

        await expect(
          rejectKnowledgePatchUsecase.execute(commandWithoutNotes),
        ).rejects.toThrow('Review notes are required when rejecting a patch');
      });

      it('throws an error for whitespace-only notes', async () => {
        const commandWithWhitespace = {
          ...command,
          reviewNotes: '   ',
        };

        await expect(
          rejectKnowledgePatchUsecase.execute(commandWithWhitespace),
        ).rejects.toThrow('Review notes are required when rejecting a patch');
      });
    });

    describe('when patch not found', () => {
      it('throws an error', async () => {
        knowledgePatchService.getPatchById.mockResolvedValue(null);

        await expect(
          rejectKnowledgePatchUsecase.execute(command),
        ).rejects.toThrow(`Knowledge patch with id ${patchId} not found`);
      });
    });

    describe('when patch is not pending review', () => {
      it('throws an error for already accepted patch', async () => {
        const acceptedPatch = knowledgePatchFactory({
          id: patchId,
          status: KnowledgePatchStatus.ACCEPTED,
        });

        knowledgePatchService.getPatchById.mockResolvedValue(acceptedPatch);

        await expect(
          rejectKnowledgePatchUsecase.execute(command),
        ).rejects.toThrow(
          `Knowledge patch ${patchId} is not pending review (current status: ${KnowledgePatchStatus.ACCEPTED})`,
        );
      });

      it('throws an error for already rejected patch', async () => {
        const rejectedPatch = knowledgePatchFactory({
          id: patchId,
          status: KnowledgePatchStatus.REJECTED,
        });

        knowledgePatchService.getPatchById.mockResolvedValue(rejectedPatch);

        await expect(
          rejectKnowledgePatchUsecase.execute(command),
        ).rejects.toThrow(
          `Knowledge patch ${patchId} is not pending review (current status: ${KnowledgePatchStatus.REJECTED})`,
        );
      });
    });

    describe('when update fails', () => {
      it('throws the error', async () => {
        const pendingPatch = knowledgePatchFactory({
          id: patchId,
          status: KnowledgePatchStatus.PENDING_REVIEW,
        });

        knowledgePatchService.getPatchById.mockResolvedValue(pendingPatch);

        const error = new Error('Database error');
        knowledgePatchService.updatePatchStatus.mockRejectedValue(error);

        await expect(
          rejectKnowledgePatchUsecase.execute(command),
        ).rejects.toThrow('Database error');
      });
    });
  });
});
