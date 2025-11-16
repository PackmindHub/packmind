import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  AcceptKnowledgePatchCommand,
  createKnowledgePatchId,
  createSpaceId,
  createUserId,
  KnowledgePatchStatus,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { knowledgePatchFactory } from '../../../../test/knowledgePatchFactory';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';
import { AcceptKnowledgePatchUsecase } from './acceptKnowledgePatch.usecase';

describe('AcceptKnowledgePatchUsecase', () => {
  let acceptKnowledgePatchUsecase: AcceptKnowledgePatchUsecase;
  let knowledgePatchService: jest.Mocked<KnowledgePatchService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    knowledgePatchService = {
      getPatchById: jest.fn(),
      updatePatchStatus: jest.fn(),
    } as unknown as jest.Mocked<KnowledgePatchService>;

    stubbedLogger = stubLogger();

    acceptKnowledgePatchUsecase = new AcceptKnowledgePatchUsecase(
      knowledgePatchService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: AcceptKnowledgePatchCommand;
    let patchId: ReturnType<typeof createKnowledgePatchId>;
    let reviewedBy: ReturnType<typeof createUserId>;

    beforeEach(() => {
      patchId = createKnowledgePatchId(uuidv4());
      reviewedBy = createUserId(uuidv4());

      command = {
        patchId: patchId,
        spaceId: createSpaceId('space-123'),
        reviewedBy: reviewedBy,
        organizationId: 'org-123',
        userId: 'user-123',
      };
    });

    it('accepts a pending patch successfully', async () => {
      const pendingPatch = knowledgePatchFactory({
        id: patchId,
        status: KnowledgePatchStatus.PENDING_REVIEW,
      });

      const acceptedPatch = knowledgePatchFactory({
        id: patchId,
        status: KnowledgePatchStatus.ACCEPTED,
        reviewedBy: reviewedBy,
        reviewedAt: new Date(),
      });

      knowledgePatchService.getPatchById.mockResolvedValue(pendingPatch);
      knowledgePatchService.updatePatchStatus.mockResolvedValue(acceptedPatch);

      const result = await acceptKnowledgePatchUsecase.execute(command);

      expect(knowledgePatchService.getPatchById).toHaveBeenCalledWith(patchId);
      expect(knowledgePatchService.updatePatchStatus).toHaveBeenCalledWith(
        patchId,
        KnowledgePatchStatus.ACCEPTED,
        reviewedBy,
        undefined,
      );
      expect(result.patch).toEqual(acceptedPatch);
      expect(result.applied).toBe(false);
    });

    it('accepts a patch with review notes', async () => {
      const commandWithNotes = {
        ...command,
        reviewNotes: 'Looks good, approved',
      };

      const pendingPatch = knowledgePatchFactory({
        id: patchId,
        status: KnowledgePatchStatus.PENDING_REVIEW,
      });

      const acceptedPatch = knowledgePatchFactory({
        id: patchId,
        status: KnowledgePatchStatus.ACCEPTED,
        reviewedBy: reviewedBy,
        reviewNotes: 'Looks good, approved',
      });

      knowledgePatchService.getPatchById.mockResolvedValue(pendingPatch);
      knowledgePatchService.updatePatchStatus.mockResolvedValue(acceptedPatch);

      const result =
        await acceptKnowledgePatchUsecase.execute(commandWithNotes);

      expect(knowledgePatchService.updatePatchStatus).toHaveBeenCalledWith(
        patchId,
        KnowledgePatchStatus.ACCEPTED,
        reviewedBy,
        'Looks good, approved',
      );
      expect(result.patch.reviewNotes).toBe('Looks good, approved');
    });

    describe('when patch not found', () => {
      it('throws an error', async () => {
        knowledgePatchService.getPatchById.mockResolvedValue(null);

        await expect(
          acceptKnowledgePatchUsecase.execute(command),
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
          acceptKnowledgePatchUsecase.execute(command),
        ).rejects.toThrow(
          `Knowledge patch ${patchId} is not pending review (current status: ${KnowledgePatchStatus.ACCEPTED})`,
        );
      });

      it('throws an error for rejected patch', async () => {
        const rejectedPatch = knowledgePatchFactory({
          id: patchId,
          status: KnowledgePatchStatus.REJECTED,
        });

        knowledgePatchService.getPatchById.mockResolvedValue(rejectedPatch);

        await expect(
          acceptKnowledgePatchUsecase.execute(command),
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
          acceptKnowledgePatchUsecase.execute(command),
        ).rejects.toThrow('Database error');
      });
    });
  });
});
