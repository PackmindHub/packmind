import {
  ChangeProposalType,
  createChangeProposalId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IRecipesPort,
  RecipeVersion,
  DiffService,
  ChangeProposalConflictError,
} from '@packmind/types';
import { CommandChangesApplier } from './CommandChangesApplier';
import { recipeFactory, recipeVersionFactory } from '@packmind/recipes/test';
import { changeProposalFactory } from '../../../../test';

describe('CommandChangesApplier', () => {
  let recipeVersion: RecipeVersion;
  let diffService: DiffService;
  let recipePort: jest.Mocked<IRecipesPort>;
  let applier: CommandChangesApplier;

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

    applier = new CommandChangesApplier(diffService, recipePort);
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

        expect(newVersion.version).toEqual(
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

        expect(newVersion.version).toEqual(
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

    describe('when one proposal has delete: true and another has removeFromPackages', () => {
      const packageId = createPackageId('pkg-1');
      let result: ReturnType<typeof applier.applyChangeProposals>;

      beforeEach(() => {
        const removeProposal = changeProposalFactory({
          type: ChangeProposalType.removeCommand,
          decision: { delete: false, removeFromPackages: [packageId] },
        });
        const deleteProposal = changeProposalFactory({
          type: ChangeProposalType.removeCommand,
          decision: { delete: true },
        });

        result = applier.applyChangeProposals(recipeVersion, [
          removeProposal,
          deleteProposal,
        ]);
      });

      it('marks as delete', () => {
        expect(result.delete).toBe(true);
      });

      it('clears removeFromPackages', () => {
        expect(result.removeFromPackages).toEqual([]);
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

  describe('deleteArtefact', () => {
    const userId = createUserId('user-id');
    const spaceId = createSpaceId('space-id');
    const organizationId = createOrganizationId('organization-id');

    beforeEach(() => {
      recipePort.deleteRecipe = jest.fn().mockResolvedValue({});
    });

    it('calls deleteRecipe with the recipe ID and auth context from source version', async () => {
      await applier.deleteArtefact(
        recipeVersion,
        userId,
        spaceId,
        organizationId,
      );

      expect(recipePort.deleteRecipe).toHaveBeenCalledWith({
        recipeId: recipeVersion.recipeId,
        spaceId,
        userId,
        organizationId,
      });
    });
  });

  describe('getUpdatePackageCommandWithoutArtefact', () => {
    it('removes the recipe from the package recipe list', () => {
      const otherRecipeId = createRecipeId('other-recipe');
      const standardId = createStandardId('std-1');
      const skillId = createSkillId('skill-1');
      const pkg = {
        id: createPackageId('pkg-1'),
        name: 'My Package',
        slug: 'my-package',
        description: 'desc',
        spaceId: createSpaceId('space-1'),
        createdBy: createUserId('user-1'),
        recipes: [recipeVersion.recipeId, otherRecipeId],
        standards: [standardId],
        skills: [skillId],
      };

      const result = applier.getUpdatePackageCommandWithoutArtefact(
        recipeVersion,
        pkg,
      );

      expect(result).toEqual({
        recipeIds: [otherRecipeId],
        standardIds: [standardId],
        skillsIds: [skillId],
      });
    });
  });
});
