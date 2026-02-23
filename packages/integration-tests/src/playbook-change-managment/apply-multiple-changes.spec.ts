import {
  ChangeProposal,
  ChangeProposalStatus,
  ChangeProposalType,
  Recipe,
} from '@packmind/types';

import { changeProposalFactory } from '@packmind/playbook-change-management/test';

import {
  integrationTestWithUser,
  IntegrationTestWithUserContext,
} from '../helpers/integrationTest';

describe(
  'Applying multiple changes',
  integrationTestWithUser((getContext) => {
    let command: Recipe;
    let testContext: IntegrationTestWithUserContext;

    beforeEach(async () => {
      testContext = await getContext();

      command = await testContext.testApp.recipesHexa
        .getAdapter()
        .captureRecipe({
          ...testContext.basePackmindCommand,
          name: 'My command',
          content: 'With some description',
        });
    });

    afterEach(async () => {
      jest.clearAllMocks();
    });

    describe('when there is no conflicting changes', () => {
      let changeProposals: ChangeProposal[];
      const updatedName = 'My updated name';
      const updatedDescription = 'My new description';

      beforeEach(async () => {
        await testContext.testApp.playbookManagementHexa
          .getAdapter()
          .batchCreateChangeProposals({
            ...testContext.basePackmindCommand,
            proposals: [
              changeProposalFactory({
                artefactId: command.id,
                artefactVersion: command.version,
                type: ChangeProposalType.updateCommandName,
                payload: {
                  oldValue: command.name,
                  newValue: updatedName,
                },
              }),
              changeProposalFactory({
                artefactId: command.id,
                artefactVersion: command.version,
                type: ChangeProposalType.updateCommandDescription,
                payload: {
                  oldValue: command.content,
                  newValue: updatedDescription,
                },
              }),
            ],
          });

        const listChangeProposalsResponse =
          await testContext.testApp.playbookManagementHexa
            .getAdapter()
            .listChangeProposalsByArtefact({
              ...testContext.basePackmindCommand,
              artefactId: command.id,
            });
        changeProposals = listChangeProposalsResponse.changeProposals;
      });

      describe('when rejecting all change proposals', () => {
        beforeEach(async () => {
          await testContext.testApp.playbookManagementHexa
            .getAdapter()
            .applyChangeProposals({
              ...testContext.basePackmindCommand,
              artefactId: command.id,
              accepted: [],
              rejected: changeProposals.map((cp) => cp.id),
            });
        });

        it('does not create new recipe version', async () => {
          const queriedCommand = await testContext.testApp.recipesHexa
            .getAdapter()
            .getRecipeById({
              ...testContext.basePackmindCommand,
              recipeId: command.id,
            });

          expect(queriedCommand?.version).toEqual(command.version);
        });

        it('marks all changes as rejected', async () => {
          const { changeProposals: queriedProposals } =
            await testContext.testApp.playbookManagementHexa
              .getAdapter()
              .listChangeProposalsByArtefact({
                ...testContext.basePackmindCommand,
                artefactId: command.id,
                pendingOnly: false,
              });

          expect(queriedProposals).toEqual([
            expect.objectContaining({
              status: ChangeProposalStatus.rejected,
            }),
            expect.objectContaining({
              status: ChangeProposalStatus.rejected,
            }),
          ]);
        });
      });

      describe('when accepting all change proposals', () => {
        beforeEach(async () => {
          await testContext.testApp.playbookManagementHexa
            .getAdapter()
            .applyChangeProposals({
              ...testContext.basePackmindCommand,
              artefactId: command.id,
              accepted: changeProposals.map((cp) => cp.id),
              rejected: [],
            });
        });

        it('udpates the recipes and creates a new version', async () => {
          const queriedCommand = await testContext.testApp.recipesHexa
            .getAdapter()
            .getRecipeById({
              ...testContext.basePackmindCommand,
              recipeId: command.id,
            });

          expect(queriedCommand).toEqual(
            expect.objectContaining({
              name: updatedName,
              content: updatedDescription,
              version: command.version + 1,
            }),
          );
        });

        it('marks all changes as applied', async () => {
          const { changeProposals: queriedProposals } =
            await testContext.testApp.playbookManagementHexa
              .getAdapter()
              .listChangeProposalsByArtefact({
                ...testContext.basePackmindCommand,
                artefactId: command.id,
                pendingOnly: false,
              });

          expect(queriedProposals).toEqual([
            expect.objectContaining({
              status: ChangeProposalStatus.applied,
            }),
            expect.objectContaining({
              status: ChangeProposalStatus.applied,
            }),
          ]);
        });
      });
    });

    describe('when there is conflicting changes', () => {
      let changeProposals: ChangeProposal[];

      beforeEach(async () => {
        await testContext.testApp.playbookManagementHexa
          .getAdapter()
          .batchCreateChangeProposals({
            ...testContext.basePackmindCommand,
            proposals: [
              changeProposalFactory({
                artefactId: command.id,
                artefactVersion: command.version,
                type: ChangeProposalType.updateCommandDescription,
                payload: {
                  oldValue: command.content,
                  newValue: 'My new description',
                },
              }),
              changeProposalFactory({
                artefactId: command.id,
                artefactVersion: command.version,
                type: ChangeProposalType.updateCommandDescription,
                payload: {
                  oldValue: command.content,
                  newValue: 'My newer description',
                },
              }),
            ],
          });

        const listChangeProposalsResponse =
          await testContext.testApp.playbookManagementHexa
            .getAdapter()
            .listChangeProposalsByArtefact({
              ...testContext.basePackmindCommand,
              artefactId: command.id,
            });
        changeProposals = listChangeProposalsResponse.changeProposals;
      });

      describe('when accepting all change proposals', () => {
        beforeEach(async () => {
          try {
            await testContext.testApp.playbookManagementHexa
              .getAdapter()
              .applyChangeProposals({
                ...testContext.basePackmindCommand,
                artefactId: command.id,
                accepted: changeProposals.map((cp) => cp.id),
                rejected: [],
              });
          } catch (error) {
            console.error(error);
          }
        });

        it('does not update the command', async () => {
          const queriedCommand = await testContext.testApp.recipesHexa
            .getAdapter()
            .getRecipeById({
              ...testContext.basePackmindCommand,
              recipeId: command.id,
            });

          expect(queriedCommand).toEqual(
            expect.objectContaining({
              content: command.content,
              version: command.version,
            }),
          );
        });

        it('leaves all changes as pending', async () => {
          const { changeProposals: queriedProposals } =
            await testContext.testApp.playbookManagementHexa
              .getAdapter()
              .listChangeProposalsByArtefact({
                ...testContext.basePackmindCommand,
                artefactId: command.id,
                pendingOnly: false,
              });

          expect(queriedProposals).toEqual([
            expect.objectContaining({
              status: ChangeProposalStatus.pending,
            }),
            expect.objectContaining({
              status: ChangeProposalStatus.pending,
            }),
          ]);
        });
      });
    });
  }),
);
