import {
  ChangeProposal,
  ChangeProposalType,
  createChangeProposalId,
  RecipeVersion,
} from '@packmind/types';
import { ApplyCommandChangeProposals } from './ApplyCommandChangeProposals';
import { recipeVersionFactory } from '@packmind/recipes/test';
import { changeProposalFactory } from '../../../../test';
import { DiffService } from '../../services/DiffService';
import { ChangeProposalConflictError } from '../../../domain/errors';

describe('ApplyCommandChangeProposals', () => {
  let recipeVersion: RecipeVersion;
  let diffService: DiffService;
  let applier: ApplyCommandChangeProposals;

  beforeEach(() => {
    recipeVersion = recipeVersionFactory({
      name: 'Original name',
      content: 'Original content',
    });
    diffService = new DiffService();
    applier = new ApplyCommandChangeProposals(diffService);
  });

  describe('applyChangeProposal', () => {
    describe('when updating the name', () => {
      it('overrides the name with each proposal', () => {
        const newVersion = applier.applyChangeProposals(recipeVersion, [
          changeProposalFactory({
            type: ChangeProposalType.updateCommandName,
            artefactId: recipeVersion.recipeId,
            artefactVersion: recipeVersion.version,
            payload: {
              oldValue: recipeVersion.name,
              newValue: `Before: ${recipeVersion.name}`,
            },
          }) as ChangeProposal<ChangeProposalType.updateCommandName>,
          changeProposalFactory({
            type: ChangeProposalType.updateCommandName,
            artefactId: recipeVersion.recipeId,
            artefactVersion: recipeVersion.version,
            payload: {
              oldValue: recipeVersion.name,
              newValue: `${recipeVersion.name} - after`,
            },
          }) as ChangeProposal<ChangeProposalType.updateCommandName>,
        ]);

        expect(newVersion).toEqual(
          expect.objectContaining({
            name: `${recipeVersion.name} - after`,
            content: recipeVersion.content,
          }),
        );
      });
    });

    describe('when updating the content', () => {
      it('uses the diff service to apply all changes', () => {
        const newVersion = applier.applyChangeProposals(recipeVersion, [
          changeProposalFactory({
            type: ChangeProposalType.updateCommandDescription,
            artefactId: recipeVersion.recipeId,
            artefactVersion: recipeVersion.version,
            payload: {
              oldValue: recipeVersion.content,
              newValue: `Some content before\n${recipeVersion.content}`,
            },
          }) as ChangeProposal<ChangeProposalType.updateCommandDescription>,
          changeProposalFactory({
            type: ChangeProposalType.updateCommandDescription,
            artefactId: recipeVersion.recipeId,
            artefactVersion: recipeVersion.version,
            payload: {
              oldValue: recipeVersion.content,
              newValue: `${recipeVersion.content}\nSome content after`,
            },
          }) as ChangeProposal<ChangeProposalType.updateCommandDescription>,
        ]);

        expect(newVersion).toEqual(
          expect.objectContaining({
            name: recipeVersion.name,
            content: `Some content before\n${recipeVersion.content}\nSome content after`,
          }),
        );
      });

      it('throws a ChangeProposalConflictError if applying the diff fails', () => {
        expect(() =>
          applier.applyChangeProposals(recipeVersion, [
            changeProposalFactory({
              id: createChangeProposalId('proposal-1'),
              type: ChangeProposalType.updateCommandDescription,
              artefactId: recipeVersion.recipeId,
              artefactVersion: recipeVersion.version,
              payload: {
                oldValue: recipeVersion.content,
                newValue: `---${recipeVersion.content}`,
              },
            }) as ChangeProposal<ChangeProposalType.updateCommandDescription>,
            changeProposalFactory({
              id: createChangeProposalId('proposal-2'),
              type: ChangeProposalType.updateCommandDescription,
              artefactId: recipeVersion.recipeId,
              artefactVersion: recipeVersion.version,
              payload: {
                oldValue: recipeVersion.content,
                newValue: `${recipeVersion.content}---`,
              },
            }) as ChangeProposal<ChangeProposalType.updateCommandDescription>,
          ]),
        ).toThrow(
          new ChangeProposalConflictError(createChangeProposalId('proposal-2')),
        );
      });
    });
  });
});
