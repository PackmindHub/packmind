import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createKnowledgePatchId,
  createSpaceId,
  GetKnowledgePatchCommand,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { knowledgePatchFactory } from '../../../../test/knowledgePatchFactory';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';
import { GetKnowledgePatchUsecase } from './getKnowledgePatch.usecase';

describe('GetKnowledgePatchUsecase', () => {
  let getKnowledgePatchUsecase: GetKnowledgePatchUsecase;
  let knowledgePatchService: jest.Mocked<KnowledgePatchService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    knowledgePatchService = {
      getPatchById: jest.fn(),
    } as unknown as jest.Mocked<KnowledgePatchService>;

    stubbedLogger = stubLogger();

    getKnowledgePatchUsecase = new GetKnowledgePatchUsecase(
      knowledgePatchService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let command: GetKnowledgePatchCommand;
    let patchId: ReturnType<typeof createKnowledgePatchId>;

    beforeEach(() => {
      patchId = createKnowledgePatchId(uuidv4());
      command = {
        patchId: patchId,
        spaceId: createSpaceId('space-123'),
        organizationId: 'org-123',
        userId: 'user-123',
      };
    });

    it('returns the patch', async () => {
      const patch = knowledgePatchFactory({
        id: patchId,
      });

      knowledgePatchService.getPatchById.mockResolvedValue(patch);

      const result = await getKnowledgePatchUsecase.execute(command);

      expect(knowledgePatchService.getPatchById).toHaveBeenCalledWith(patchId);
      expect(result.patch).toEqual(patch);
    });

    describe('when patch not found', () => {
      it('throws an error', async () => {
        knowledgePatchService.getPatchById.mockResolvedValue(null);

        await expect(getKnowledgePatchUsecase.execute(command)).rejects.toThrow(
          `Knowledge patch with id ${patchId} not found`,
        );
      });
    });

    describe('when service fails', () => {
      it('throws the error', async () => {
        const error = new Error('Database error');
        knowledgePatchService.getPatchById.mockRejectedValue(error);

        await expect(getKnowledgePatchUsecase.execute(command)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });
});
