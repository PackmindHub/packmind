import { CommandChangeProposalApplier } from './CommandChangeProposalApplier';
import { DiffService } from './DiffService';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { ChangeProposalStatus } from '../ChangeProposalStatus';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { createChangeProposalId } from '../ChangeProposalId';
import {
  RecipeVersion,
  createRecipeVersionId,
} from '../../recipes/RecipeVersion';
import { createRecipeId } from '../../recipes/RecipeId';
import { createSpaceId } from '../../spaces/SpaceId';
import { createUserId } from '../../accounts/User';

let idCounter = 0;
const nextId = () => `test-id-${++idCounter}`;

const changeProposalFactory = <T extends ChangeProposalType>(
  overrides: Partial<ChangeProposal<T>> & {
    type: T;
    payload: ChangeProposal<T>['payload'];
  },
): ChangeProposal<T> =>
  ({
    id: createChangeProposalId(nextId()),
    artefactId: createRecipeId(nextId()),
    artefactVersion: 1,
    spaceId: createSpaceId(nextId()),
    captureMode: ChangeProposalCaptureMode.commit,
    message: '',
    status: ChangeProposalStatus.pending,
    decision: null,
    createdBy: createUserId(nextId()),
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ChangeProposal<T>;

const recipeVersionFactory = (
  overrides?: Partial<RecipeVersion>,
): RecipeVersion => ({
  id: createRecipeVersionId(nextId()),
  recipeId: createRecipeId(nextId()),
  name: 'Test Command',
  slug: 'test-command',
  content: 'Test content',
  version: 1,
  userId: createUserId(nextId()),
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
  });
});
