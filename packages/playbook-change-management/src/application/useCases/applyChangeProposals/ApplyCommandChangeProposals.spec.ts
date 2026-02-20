import {
  ChangeProposal,
  ChangeProposalType,
  createChangeProposalId,
  createOrganizationId,
  createSpaceId,
  createUserId,
  IRecipesPort,
  RecipeVersion,
} from '@packmind/types';
import { ApplyCommandChangeProposals } from './ApplyCommandChangeProposals';
import { recipeFactory, recipeVersionFactory } from '@packmind/recipes/test';
import { changeProposalFactory } from '../../../../test';
import { DiffService } from '../../services/DiffService';
import { ChangeProposalConflictError } from '../../../domain/errors';

describe('ApplyCommandChangeProposals', () => {
  let recipeVersion: RecipeVersion;
  let diffService: DiffService;
  let recipePort: jest.Mocked<IRecipesPort>;
  let applier: ApplyCommandChangeProposals;

  beforeEach(() => {
    recipeVersion = recipeVersionFactory({
      name: 'Original name',
      content: 'Original content',
    });
    diffService = new DiffService();
    recipePort = {
      updateRecipeFromUI: jest.fn(),
      getRecipeVersion: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    applier = new ApplyCommandChangeProposals(diffService, recipePort);
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
          }),
          changeProposalFactory({
            type: ChangeProposalType.updateCommandName,
            artefactId: recipeVersion.recipeId,
            artefactVersion: recipeVersion.version,
            payload: {
              oldValue: recipeVersion.name,
              newValue: `${recipeVersion.name} - after`,
            },
          }),
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
          }),
          changeProposalFactory({
            type: ChangeProposalType.updateCommandDescription,
            artefactId: recipeVersion.recipeId,
            artefactVersion: recipeVersion.version,
            payload: {
              oldValue: recipeVersion.content,
              newValue: `${recipeVersion.content}\nSome content after`,
            },
          }),
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
            }),
            changeProposalFactory({
              id: createChangeProposalId('proposal-2'),
              type: ChangeProposalType.updateCommandDescription,
              artefactId: recipeVersion.recipeId,
              artefactVersion: recipeVersion.version,
              payload: {
                oldValue: recipeVersion.content,
                newValue: `${recipeVersion.content}---`,
              },
            }),
          ]),
        ).toThrow(
          new ChangeProposalConflictError(createChangeProposalId('proposal-2')),
        );
      });
    });
  });

  describe('saveNewVersion', () => {
    const userId = createUserId('user-id');
    const spaceId = createSpaceId('space-id');
    const organizationId = createOrganizationId('organization-id');

    let newVersion: RecipeVersion;

    beforeEach(async () => {
      newVersion = {
        ...recipeVersion,
        version: recipeVersion.version + 1,
      };

      recipePort.getRecipeVersion.mockResolvedValue(newVersion);
      recipePort.updateRecipeFromUI.mockResolvedValue({
        recipe: recipeFactory({
          id: recipeVersion.recipeId,
          version: newVersion.version,
        }),
      });

      await applier.saveNewVersion(
        {
          ...recipeVersion,
          name: 'New name',
          content: 'New content',
        },
        userId,
        spaceId,
        organizationId,
      );
    });

    it('calls recipePort.updateRecipeFromUI with the correct data', async () => {
      expect(recipePort.updateRecipeFromUI).toHaveBeenCalledWith({
        recipeId: recipeVersion.recipeId,
        name: 'New name',
        content: 'New content',
        userId,
        spaceId,
        organizationId,
      });
    });

    it('uses recipesPort.getRecipeVersion to get the newly created version', async () => {
      expect(recipePort.getRecipeVersion).toHaveBeenCalledWith(
        recipeVersion.recipeId,
        newVersion.version,
      );
    });
  });
});
