import { CommandChangeProposalApplier } from './CommandChangeProposalApplier';
import { DiffService } from './DiffService';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { v4 as uuidv4 } from 'uuid';
import { createChangeProposalFactory } from './testHelpers';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import {
  RecipeVersion,
  createRecipeVersionId,
} from '../../recipes/RecipeVersion';
import { createRecipeId } from '../../recipes/RecipeId';
import { createUserId } from '../../accounts/User';

const changeProposalFactory = createChangeProposalFactory(createRecipeId);

const recipeVersionFactory = (
  overrides?: Partial<RecipeVersion>,
): RecipeVersion => ({
  id: createRecipeVersionId(uuidv4()),
  recipeId: createRecipeId(uuidv4()),
  name: 'Test Command',
  slug: 'test-command',
  content: 'Test content',
  version: 1,
  userId: createUserId(uuidv4()),
  ...overrides,
});

describe('CommandChangeProposalApplier', () => {
  const diffService = new DiffService();
  const applier = new CommandChangeProposalApplier(diffService);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('areChangesApplicable', () => {
    it('returns true for command change types', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateCommandName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
      ];

      expect(applier.areChangesApplicable(proposals as ChangeProposal[])).toBe(
        true,
      );
    });

    it('returns false for non-command change types', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
      ];

      expect(applier.areChangesApplicable(proposals as ChangeProposal[])).toBe(
        false,
      );
    });
  });

  describe('applyChangeProposals', () => {
    describe('updateCommandName', () => {
      it('overrides the name with the new value', () => {
        const source = recipeVersionFactory({ name: 'Original Name' });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateCommandName,
          payload: { oldValue: 'Original Name', newValue: 'Updated Name' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.name).toBe('Updated Name');
      });

      it('applies multiple name changes sequentially', () => {
        const source = recipeVersionFactory({ name: 'First' });
        const proposals = [
          changeProposalFactory({
            type: ChangeProposalType.updateCommandName,
            payload: { oldValue: 'First', newValue: 'Second' },
          }),
          changeProposalFactory({
            type: ChangeProposalType.updateCommandName,
            payload: { oldValue: 'Second', newValue: 'Third' },
          }),
        ];

        const result = applier.applyChangeProposals(
          source,
          proposals as ChangeProposal[],
        );

        expect(result.name).toBe('Third');
      });
    });

    describe('updateCommandDescription', () => {
      it('applies diff to merge the description', () => {
        const source = recipeVersionFactory({
          content: 'line1\nline2\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'line1\nline2\nline3',
            newValue: 'line1\nmodified\nline3',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.content).toBe('line1\nmodified\nline3');
      });

      it('throws ChangeProposalConflictError on conflict', () => {
        const source = recipeVersionFactory({
          content: 'line1\nchanged-by-someone\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'line1\noriginal\nline3',
            newValue: 'line1\nchanged-by-proposal\nline3',
          },
        });

        expect(() =>
          applier.applyChangeProposals(source, [proposal as ChangeProposal]),
        ).toThrow(ChangeProposalConflictError);
      });
    });

    describe('unsupported type', () => {
      it('returns source unchanged for unsupported change proposal types', () => {
        const source = recipeVersionFactory();
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Old', newValue: 'New' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as unknown as ChangeProposal,
        ]);

        expect(result).toEqual(source);
      });
    });
  });
});
