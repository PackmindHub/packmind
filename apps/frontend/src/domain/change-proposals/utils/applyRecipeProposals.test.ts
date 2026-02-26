import { v4 as uuidv4 } from 'uuid';
import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  Recipe,
  createChangeProposalId,
  createRecipeId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { applyRecipeProposals } from './applyRecipeProposals';

const recipeFactory = (recipe?: Partial<Recipe>): Recipe => ({
  id: createRecipeId(uuidv4()),
  name: 'Test Recipe',
  slug: 'test-recipe',
  content: 'Test recipe content',
  version: 1,
  gitCommit: undefined,
  userId: createUserId(uuidv4()),
  spaceId: createSpaceId(uuidv4()),
  ...recipe,
});

const changeProposalFactory = (
  proposal?: Partial<ChangeProposal<ChangeProposalType>>,
): ChangeProposal<ChangeProposalType> =>
  ({
    id: createChangeProposalId(uuidv4()),
    type: ChangeProposalType.updateCommandName,
    artefactId: createRecipeId(uuidv4()),
    artefactVersion: 1,
    spaceId: createSpaceId(uuidv4()),
    payload: { oldValue: 'Old Name', newValue: 'New Name' },
    captureMode: ChangeProposalCaptureMode.commit,
    status: ChangeProposalStatus.pending,
    createdBy: createUserId(uuidv4()),
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...proposal,
  }) as ChangeProposal<ChangeProposalType>;

describe('applyRecipeProposals', () => {
  const recipeId = createRecipeId(uuidv4());
  const recipe = recipeFactory({
    id: recipeId,
    name: 'Original Recipe',
    content: 'Original content',
  });

  describe('with no proposals', () => {
    const proposals: ChangeProposalWithConflicts[] = [];
    const acceptedIds = new Set<string>();

    let result: ReturnType<typeof applyRecipeProposals>;

    beforeEach(() => {
      result = applyRecipeProposals(recipe, proposals, acceptedIds);
    });

    it('returns the original recipe name', () => {
      expect(result.name).toBe('Original Recipe');
    });

    it('returns the original recipe content', () => {
      expect(result.content).toBe('Original content');
    });

    it('does not track name changes', () => {
      expect(result.changes.name).toBeUndefined();
    });

    it('does not track content changes', () => {
      expect(result.changes.content).toBeUndefined();
    });
  });

  describe('with no accepted proposals', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: { oldValue: 'Original Recipe', newValue: 'New Name' },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set<string>();

    let result: ReturnType<typeof applyRecipeProposals>;

    beforeEach(() => {
      result = applyRecipeProposals(recipe, proposals, acceptedIds);
    });

    it('returns the original recipe name', () => {
      expect(result.name).toBe('Original Recipe');
    });

    it('does not track changes', () => {
      expect(result.changes.name).toBeUndefined();
    });
  });

  describe('when updating recipe name', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: { oldValue: 'Original Recipe', newValue: 'Updated Name' },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposalId]);

    let result: ReturnType<typeof applyRecipeProposals>;

    beforeEach(() => {
      result = applyRecipeProposals(recipe, proposals, acceptedIds);
    });

    it('applies the new name', () => {
      expect(result.name).toBe('Updated Name');
    });

    it('tracks the name change', () => {
      expect(result.changes.name).toBeDefined();
    });

    it('tracks the original value', () => {
      expect(result.changes.name?.originalValue).toBe('Original Recipe');
    });

    it('tracks the final value', () => {
      expect(result.changes.name?.finalValue).toBe('Updated Name');
    });

    it('tracks the proposal ID', () => {
      expect(result.changes.name?.proposalIds).toEqual([proposalId]);
    });
  });

  describe('when updating recipe content', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposalId,
          type: ChangeProposalType.updateCommandDescription,
          artefactId: recipeId,
          payload: {
            oldValue: 'Original content',
            newValue: 'Updated content',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposalId]);

    let result: ReturnType<typeof applyRecipeProposals>;

    beforeEach(() => {
      result = applyRecipeProposals(recipe, proposals, acceptedIds);
    });

    it('applies the new content', () => {
      expect(result.content).toBe('Updated content');
    });

    it('tracks the content change', () => {
      expect(result.changes.content).toBeDefined();
    });

    it('tracks the original value', () => {
      expect(result.changes.content?.originalValue).toBe('Original content');
    });

    it('tracks the final value', () => {
      expect(result.changes.content?.finalValue).toBe('Updated content');
    });

    it('tracks the proposal ID', () => {
      expect(result.changes.content?.proposalIds).toEqual([proposalId]);
    });
  });

  describe('when applying multiple proposals in chronological order', () => {
    const proposal1Id = createChangeProposalId(uuidv4());
    const proposal2Id = createChangeProposalId(uuidv4());
    const proposal3Id = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: proposal1Id,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: {
            oldValue: 'Original Recipe',
            newValue: 'First Update',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: proposal2Id,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: { oldValue: 'First Update', newValue: 'Second Update' },
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: proposal3Id,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: { oldValue: 'Second Update', newValue: 'Final Update' },
          createdAt: new Date('2024-01-03'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([proposal1Id, proposal2Id, proposal3Id]);

    let result: ReturnType<typeof applyRecipeProposals>;

    beforeEach(() => {
      result = applyRecipeProposals(recipe, proposals, acceptedIds);
    });

    it('applies changes in chronological order', () => {
      expect(result.name).toBe('Final Update');
    });

    it('tracks the original value from the first change', () => {
      expect(result.changes.name?.originalValue).toBe('Original Recipe');
    });

    it('tracks the final value from the last change', () => {
      expect(result.changes.name?.finalValue).toBe('Final Update');
    });

    it('tracks all proposal IDs in order', () => {
      expect(result.changes.name?.proposalIds).toEqual([
        proposal1Id,
        proposal2Id,
        proposal3Id,
      ]);
    });
  });

  describe('when applying proposals in non-chronological order', () => {
    const earlierProposalId = createChangeProposalId(uuidv4());
    const laterProposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: laterProposalId,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: {
            oldValue: 'First Update',
            newValue: 'Second Update',
          },
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: earlierProposalId,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: {
            oldValue: 'Original Recipe',
            newValue: 'First Update',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([earlierProposalId, laterProposalId]);

    let result: ReturnType<typeof applyRecipeProposals>;

    beforeEach(() => {
      result = applyRecipeProposals(recipe, proposals, acceptedIds);
    });

    it('sorts and applies proposals by createdAt date', () => {
      expect(result.name).toBe('Second Update');
    });

    it('tracks proposals in chronological order', () => {
      expect(result.changes.name?.proposalIds).toEqual([
        earlierProposalId,
        laterProposalId,
      ]);
    });
  });

  describe('when applying mixed proposal types', () => {
    const nameProposalId = createChangeProposalId(uuidv4());
    const contentProposalId = createChangeProposalId(uuidv4());
    const proposals: ChangeProposalWithConflicts[] = [
      {
        ...changeProposalFactory({
          id: nameProposalId,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          payload: {
            oldValue: 'Original Recipe',
            newValue: 'Updated Recipe',
          },
          createdAt: new Date('2024-01-01'),
        }),
        conflictsWith: [],
      },
      {
        ...changeProposalFactory({
          id: contentProposalId,
          type: ChangeProposalType.updateCommandDescription,
          artefactId: recipeId,
          payload: {
            oldValue: 'Original content',
            newValue: 'Updated content',
          },
          createdAt: new Date('2024-01-02'),
        }),
        conflictsWith: [],
      },
    ];
    const acceptedIds = new Set([nameProposalId, contentProposalId]);

    let result: ReturnType<typeof applyRecipeProposals>;

    beforeEach(() => {
      result = applyRecipeProposals(recipe, proposals, acceptedIds);
    });

    it('applies the name change', () => {
      expect(result.name).toBe('Updated Recipe');
    });

    it('applies the content change', () => {
      expect(result.content).toBe('Updated content');
    });

    it('tracks the name change', () => {
      expect(result.changes.name).toBeDefined();
    });

    it('tracks the content change', () => {
      expect(result.changes.content).toBeDefined();
    });
  });
});
