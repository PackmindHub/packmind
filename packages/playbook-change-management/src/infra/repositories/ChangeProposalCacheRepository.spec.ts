import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createRecipeId,
  createUserId,
} from '@packmind/types';
import { Cache } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { ChangeProposalCacheRepository } from './ChangeProposalCacheRepository';

describe('ChangeProposalCacheRepository', () => {
  let repository: ChangeProposalCacheRepository;
  let mockCache: { get: jest.Mock; set: jest.Mock };

  const recipeId = createRecipeId(uuidv4());

  const buildProposal = (
    overrides: Partial<ChangeProposal<ChangeProposalType>> = {},
  ): ChangeProposal<ChangeProposalType> => ({
    id: createChangeProposalId(uuidv4()),
    type: ChangeProposalType.updateCommandName,
    artefactId: recipeId,
    artefactVersion: 1,
    payload: { oldValue: 'old', newValue: 'new' },
    captureMode: ChangeProposalCaptureMode.commit,
    status: ChangeProposalStatus.pending,
    createdBy: createUserId(uuidv4()),
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockCache = { get: jest.fn(), set: jest.fn() };
    repository = new ChangeProposalCacheRepository(
      mockCache as unknown as Cache,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    describe('when cache is empty', () => {
      it('saves the proposal as a new array', async () => {
        mockCache.get.mockResolvedValue(null);
        const proposal = buildProposal();

        await repository.save(recipeId, proposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:command:${recipeId}`,
          [proposal],
          86400,
        );
      });
    });

    describe('when cache already has proposals', () => {
      it('appends the new proposal to the existing array', async () => {
        const existingProposal = buildProposal();
        const newProposal = buildProposal();
        mockCache.get.mockResolvedValue([existingProposal]);

        await repository.save(recipeId, newProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:command:${recipeId}`,
          [existingProposal, newProposal],
          86400,
        );
      });
    });

    it('reads from the correct cache key', async () => {
      mockCache.get.mockResolvedValue(null);
      const proposal = buildProposal();

      await repository.save(recipeId, proposal);

      expect(mockCache.get).toHaveBeenCalledWith(
        `change-proposals:command:${recipeId}`,
      );
    });
  });

  describe('findByRecipeId', () => {
    describe('when cache returns null', () => {
      it('returns an empty array', async () => {
        mockCache.get.mockResolvedValue(null);

        const result = await repository.findByRecipeId(recipeId);

        expect(result).toEqual([]);
      });
    });

    describe('when cache has proposals', () => {
      it('returns the cached proposals', async () => {
        const proposals = [buildProposal(), buildProposal()];
        mockCache.get.mockResolvedValue(proposals);

        const result = await repository.findByRecipeId(recipeId);

        expect(result).toEqual(proposals);
      });
    });

    it('reads from the correct cache key', async () => {
      mockCache.get.mockResolvedValue(null);

      await repository.findByRecipeId(recipeId);

      expect(mockCache.get).toHaveBeenCalledWith(
        `change-proposals:command:${recipeId}`,
      );
    });
  });

  describe('update', () => {
    describe('when the proposal exists in cache', () => {
      it('replaces the matching proposal', async () => {
        const proposal = buildProposal();
        const updatedProposal = {
          ...proposal,
          status: ChangeProposalStatus.rejected,
        };
        mockCache.get.mockResolvedValue([proposal]);

        await repository.update(recipeId, updatedProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:command:${recipeId}`,
          [updatedProposal],
          86400,
        );
      });

      it('preserves other proposals in the array', async () => {
        const otherProposal = buildProposal();
        const proposal = buildProposal();
        const updatedProposal = {
          ...proposal,
          status: ChangeProposalStatus.rejected,
        };
        mockCache.get.mockResolvedValue([otherProposal, proposal]);

        await repository.update(recipeId, updatedProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:command:${recipeId}`,
          [otherProposal, updatedProposal],
          86400,
        );
      });
    });

    describe('when the proposal does not exist in cache', () => {
      it('writes the array back unchanged', async () => {
        const existingProposal = buildProposal();
        const unknownProposal = buildProposal();
        mockCache.get.mockResolvedValue([existingProposal]);

        await repository.update(recipeId, unknownProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:command:${recipeId}`,
          [existingProposal],
          86400,
        );
      });
    });

    describe('when cache is empty', () => {
      it('writes an empty array', async () => {
        mockCache.get.mockResolvedValue(null);
        const proposal = buildProposal();

        await repository.update(recipeId, proposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:command:${recipeId}`,
          [],
          86400,
        );
      });
    });

    it('reads from the correct cache key', async () => {
      mockCache.get.mockResolvedValue(null);
      const proposal = buildProposal();

      await repository.update(recipeId, proposal);

      expect(mockCache.get).toHaveBeenCalledWith(
        `change-proposals:command:${recipeId}`,
      );
    });
  });
});
