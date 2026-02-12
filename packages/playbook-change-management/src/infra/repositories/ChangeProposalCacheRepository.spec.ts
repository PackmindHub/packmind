import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createRecipeId,
  createSpaceId,
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
  const spaceId = createSpaceId(uuidv4());

  const buildProposal = (
    overrides: Partial<ChangeProposal<ChangeProposalType>> = {},
  ): ChangeProposal<ChangeProposalType> => ({
    id: createChangeProposalId(uuidv4()),
    type: ChangeProposalType.updateCommandName,
    artefactId: recipeId,
    artefactVersion: 1,
    spaceId,
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
      it('saves the proposal in the artefact cache key', async () => {
        mockCache.get.mockResolvedValue(null);
        const proposal = buildProposal();

        await repository.save(proposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:artefact:${recipeId}`,
          [proposal],
          86400,
        );
      });

      it('saves the proposal in the id cache key', async () => {
        mockCache.get.mockResolvedValue(null);
        const proposal = buildProposal();

        await repository.save(proposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:id:${proposal.id}`,
          proposal,
          86400,
        );
      });

      it('saves the proposal in the space cache key', async () => {
        mockCache.get.mockResolvedValue(null);
        const proposal = buildProposal();

        await repository.save(proposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:space:${spaceId}`,
          [proposal],
          86400,
        );
      });
    });

    describe('when cache already has proposals', () => {
      it('appends the new proposal to the existing array', async () => {
        const existingProposal = buildProposal();
        const newProposal = buildProposal();
        mockCache.get
          .mockResolvedValueOnce([existingProposal])
          .mockResolvedValueOnce([existingProposal]);

        await repository.save(newProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:artefact:${recipeId}`,
          [existingProposal, newProposal],
          86400,
        );
      });
    });
  });

  describe('findById', () => {
    it('reads from the correct cache key', async () => {
      const id = createChangeProposalId(uuidv4());
      mockCache.get.mockResolvedValue(null);

      await repository.findById(id);

      expect(mockCache.get).toHaveBeenCalledWith(`change-proposals:id:${id}`);
    });

    describe('when cache returns null', () => {
      it('returns null', async () => {
        mockCache.get.mockResolvedValue(null);
        const id = createChangeProposalId(uuidv4());

        const result = await repository.findById(id);

        expect(result).toBeNull();
      });
    });

    describe('when cache has the proposal', () => {
      it('returns the cached proposal', async () => {
        const proposal = buildProposal();
        mockCache.get.mockResolvedValue(proposal);

        const result = await repository.findById(proposal.id);

        expect(result).toEqual(proposal);
      });
    });
  });

  describe('findByArtefactId', () => {
    describe('when cache returns null', () => {
      it('returns an empty array', async () => {
        mockCache.get.mockResolvedValue(null);

        const result = await repository.findByArtefactId(recipeId);

        expect(result).toEqual([]);
      });
    });

    describe('when cache has proposals', () => {
      it('returns the cached proposals', async () => {
        const proposals = [buildProposal(), buildProposal()];
        mockCache.get.mockResolvedValue(proposals);

        const result = await repository.findByArtefactId(recipeId);

        expect(result).toEqual(proposals);
      });
    });

    it('reads from the correct cache key', async () => {
      mockCache.get.mockResolvedValue(null);

      await repository.findByArtefactId(recipeId);

      expect(mockCache.get).toHaveBeenCalledWith(
        `change-proposals:artefact:${recipeId}`,
      );
    });
  });

  describe('findBySpaceId', () => {
    describe('when cache returns null', () => {
      it('returns an empty array', async () => {
        mockCache.get.mockResolvedValue(null);

        const result = await repository.findBySpaceId(spaceId);

        expect(result).toEqual([]);
      });
    });

    describe('when cache has proposals', () => {
      it('returns the cached proposals', async () => {
        const proposals = [buildProposal(), buildProposal()];
        mockCache.get.mockResolvedValue(proposals);

        const result = await repository.findBySpaceId(spaceId);

        expect(result).toEqual(proposals);
      });
    });

    it('reads from the correct cache key', async () => {
      mockCache.get.mockResolvedValue(null);

      await repository.findBySpaceId(spaceId);

      expect(mockCache.get).toHaveBeenCalledWith(
        `change-proposals:space:${spaceId}`,
      );
    });
  });

  describe('update', () => {
    describe('when the proposal exists in cache', () => {
      it('replaces the matching proposal in artefact key', async () => {
        const proposal = buildProposal();
        const updatedProposal = {
          ...proposal,
          status: ChangeProposalStatus.rejected,
        };
        mockCache.get
          .mockResolvedValueOnce([proposal])
          .mockResolvedValueOnce([proposal]);

        await repository.update(updatedProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:artefact:${recipeId}`,
          [updatedProposal],
          86400,
        );
      });

      it('updates the id cache key', async () => {
        const proposal = buildProposal();
        const updatedProposal = {
          ...proposal,
          status: ChangeProposalStatus.rejected,
        };
        mockCache.get
          .mockResolvedValueOnce([proposal])
          .mockResolvedValueOnce([proposal]);

        await repository.update(updatedProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:id:${proposal.id}`,
          updatedProposal,
          86400,
        );
      });

      it('replaces the matching proposal in space key', async () => {
        const proposal = buildProposal();
        const updatedProposal = {
          ...proposal,
          status: ChangeProposalStatus.rejected,
        };
        mockCache.get
          .mockResolvedValueOnce([proposal])
          .mockResolvedValueOnce([proposal]);

        await repository.update(updatedProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:space:${spaceId}`,
          [updatedProposal],
          86400,
        );
      });
    });

    describe('when the proposal does not exist in cache', () => {
      it('writes the array back unchanged', async () => {
        const existingProposal = buildProposal();
        const unknownProposal = buildProposal();
        mockCache.get
          .mockResolvedValueOnce([existingProposal])
          .mockResolvedValueOnce([existingProposal]);

        await repository.update(unknownProposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:artefact:${recipeId}`,
          [existingProposal],
          86400,
        );
      });
    });

    describe('when cache is empty', () => {
      it('writes an empty array', async () => {
        mockCache.get.mockResolvedValue(null);
        const proposal = buildProposal();

        await repository.update(proposal);

        expect(mockCache.set).toHaveBeenCalledWith(
          `change-proposals:artefact:${recipeId}`,
          [],
          86400,
        );
      });
    });
  });
});
