import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { accountsSchemas } from '@packmind/accounts';
import { TestApp } from '../helpers/TestApp';
import {
  ChangeProposal,
  ChangeProposalStatus,
  ChangeProposalType,
  Organization,
  OrganizationId,
  Recipe,
  Space,
  SpaceId,
  User,
  UserId,
} from '@packmind/types';
import { spacesSchemas } from '@packmind/spaces';
import { recipesSchemas } from '@packmind/recipes';
import { playbookChangeManagementSchemas } from '@packmind/playbook-change-management';
import { gitSchemas } from '@packmind/git';
import { changeProposalFactory } from '@packmind/playbook-change-management/test';
import { standardsSchemas } from '@packmind/standards';
import { skillsSchemas } from '@packmind/skills';

describe('Applying multiple changes', () => {
  const fixture = createIntegrationTestFixture([
    ...accountsSchemas,
    ...spacesSchemas,
    ...recipesSchemas,
    ...standardsSchemas,
    ...skillsSchemas,
    ...gitSchemas,
    ...playbookChangeManagementSchemas,
  ]);

  let testApp: TestApp;
  let user: User;
  let organization: Organization;
  let space: Space;

  let command: Recipe;

  let basePackmindCommand: {
    userId: UserId;
    organizationId: OrganizationId;
    spaceId: SpaceId;
  };

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    // Use TestApp which handles all hexa registration and initialization
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    const signUpResponse = await testApp.accountsHexa
      .getAdapter()
      .signUpWithOrganization({
        email: 'someone@example.com',
        password: 'some-secret-apssword',
        authType: 'password',
      });
    user = signUpResponse.user;
    organization = signUpResponse.organization;

    const globalSpace = await testApp.spacesHexa
      .getAdapter()
      .getSpaceBySlug('global', organization.id);
    if (!globalSpace) {
      throw new Error(
        `No default space found in organization: ${organization}`,
      );
    }
    space = globalSpace;
    basePackmindCommand = {
      userId: user.id,
      organizationId: organization.id,
      spaceId: space.id,
    };

    command = await testApp.recipesHexa.getAdapter().captureRecipe({
      ...basePackmindCommand,
      name: 'My command',
      content: 'With some description',
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  describe('when there is no conflicting changes', () => {
    let changeProposals: ChangeProposal[];
    const updatedName = 'My updated name';
    const updatedDescription = 'My new description';

    beforeEach(async () => {
      await testApp.playbookManagementHexa
        .getAdapter()
        .batchCreateChangeProposals({
          ...basePackmindCommand,
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

      const listChangeProposalsResponse = await testApp.playbookManagementHexa
        .getAdapter()
        .listChangeProposalsByArtefact({
          ...basePackmindCommand,
          artefactId: command.id,
        });
      changeProposals = listChangeProposalsResponse.changeProposals;
    });

    describe('when rejecting all change proposals', () => {
      beforeEach(async () => {
        await testApp.playbookManagementHexa.getAdapter().applyChangeProposals({
          ...basePackmindCommand,
          artefactId: command.id,
          accepted: [],
          rejected: changeProposals.map((cp) => cp.id),
        });
      });

      it('does not create new recipe version', async () => {
        const queriedCommand = await testApp.recipesHexa
          .getAdapter()
          .getRecipeById({
            ...basePackmindCommand,
            recipeId: command.id,
          });

        expect(queriedCommand?.version).toEqual(command.version);
      });

      it('marks all changes as rejected', async () => {
        const { changeProposals: queriedProposals } =
          await testApp.playbookManagementHexa
            .getAdapter()
            .listCommandChangeProposals({
              ...basePackmindCommand,
              recipeId: command.id,
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
        await testApp.playbookManagementHexa.getAdapter().applyChangeProposals({
          ...basePackmindCommand,
          artefactId: command.id,
          accepted: changeProposals.map((cp) => cp.id),
          rejected: [],
        });
      });

      it('udpates the recipes and creates a new version', async () => {
        const queriedCommand = await testApp.recipesHexa
          .getAdapter()
          .getRecipeById({
            ...basePackmindCommand,
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
          await testApp.playbookManagementHexa
            .getAdapter()
            .listCommandChangeProposals({
              ...basePackmindCommand,
              recipeId: command.id,
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
      await testApp.playbookManagementHexa
        .getAdapter()
        .batchCreateChangeProposals({
          ...basePackmindCommand,
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

      const listChangeProposalsResponse = await testApp.playbookManagementHexa
        .getAdapter()
        .listChangeProposalsByArtefact({
          ...basePackmindCommand,
          artefactId: command.id,
        });
      changeProposals = listChangeProposalsResponse.changeProposals;
    });

    describe('when accepting all change proposals', () => {
      beforeEach(async () => {
        try {
          await testApp.playbookManagementHexa
            .getAdapter()
            .applyChangeProposals({
              ...basePackmindCommand,
              artefactId: command.id,
              accepted: changeProposals.map((cp) => cp.id),
              rejected: [],
            });
        } catch (error) {
          console.error(error);
        }
      });

      it('does not update the command', async () => {
        const queriedCommand = await testApp.recipesHexa
          .getAdapter()
          .getRecipeById({
            ...basePackmindCommand,
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
          await testApp.playbookManagementHexa
            .getAdapter()
            .listCommandChangeProposals({
              ...basePackmindCommand,
              recipeId: command.id,
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
});
