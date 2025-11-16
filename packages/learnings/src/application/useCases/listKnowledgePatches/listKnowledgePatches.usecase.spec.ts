import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createSpaceId,
  KnowledgePatchStatus,
  ListKnowledgePatchesCommand,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { knowledgePatchFactory } from '../../../../test/knowledgePatchFactory';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';
import { ListKnowledgePatchesUsecase } from './listKnowledgePatches.usecase';

describe('ListKnowledgePatchesUsecase', () => {
  let listKnowledgePatchesUsecase: ListKnowledgePatchesUsecase;
  let knowledgePatchService: jest.Mocked<KnowledgePatchService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    knowledgePatchService = {
      listPatchesBySpace: jest.fn(),
      listPatchesByStatus: jest.fn(),
    } as unknown as jest.Mocked<KnowledgePatchService>;

    stubbedLogger = stubLogger();

    listKnowledgePatchesUsecase = new ListKnowledgePatchesUsecase(
      knowledgePatchService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: ListKnowledgePatchesCommand;
    let spaceId: ReturnType<typeof createSpaceId>;

    beforeEach(() => {
      spaceId = createSpaceId(uuidv4());
      command = {
        spaceId: spaceId,
        organizationId: 'org-123',
        userId: 'user-123',
      };
    });

    it('lists all patches for a space when no status filter provided', async () => {
      const patches = [
        knowledgePatchFactory({ spaceId }),
        knowledgePatchFactory({ spaceId }),
      ];

      knowledgePatchService.listPatchesBySpace.mockResolvedValue(patches);

      const result = await listKnowledgePatchesUsecase.execute(command);

      expect(knowledgePatchService.listPatchesBySpace).toHaveBeenCalledWith(
        spaceId,
      );
      expect(result.patches).toEqual(patches);
    });

    it('lists patches filtered by status when status provided', async () => {
      const commandWithStatus = {
        ...command,
        status: KnowledgePatchStatus.PENDING_REVIEW,
      };

      const pendingPatches = [
        knowledgePatchFactory({
          spaceId,
          status: KnowledgePatchStatus.PENDING_REVIEW,
        }),
      ];

      knowledgePatchService.listPatchesByStatus.mockResolvedValue(
        pendingPatches,
      );

      const result =
        await listKnowledgePatchesUsecase.execute(commandWithStatus);

      expect(knowledgePatchService.listPatchesByStatus).toHaveBeenCalledWith(
        spaceId,
        KnowledgePatchStatus.PENDING_REVIEW,
      );
      expect(result.patches).toEqual(pendingPatches);
    });

    it('returns empty array when no patches found', async () => {
      knowledgePatchService.listPatchesBySpace.mockResolvedValue([]);

      const result = await listKnowledgePatchesUsecase.execute(command);

      expect(result.patches).toEqual([]);
    });

    describe('when listing fails', () => {
      it('throws the error', async () => {
        const error = new Error('Database error');
        knowledgePatchService.listPatchesBySpace.mockRejectedValue(error);

        await expect(
          listKnowledgePatchesUsecase.execute(command),
        ).rejects.toThrow('Database error');
      });
    });
  });
});
