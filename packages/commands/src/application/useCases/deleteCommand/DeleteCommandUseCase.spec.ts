import {
  PackmindEventEmitterService,
  SpaceMembershipRequiredError,
} from '@packmind/node-utils';
import {
  mockInterface,
  stubLogger,
  createMockInstance,
} from '@packmind/test-utils';
import {
  createOrganizationId,
  createCommandId,
  createSpaceId,
  createUserId,
  DeleteCommandCommand,
  IAccountsPort,
  ISpacesPort,
  Organization,
  OrganizationId,
  Command,
  CommandDeletedEvent,
  CommandId,
  Space,
  SpaceId,
  User,
  UserId,
  UserSpaceRole,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test';
import { v4 as uuidv4 } from 'uuid';
import { commandFactory } from '../../../../test/commandFactory';
import { CommandService } from '../../services/CommandService';
import { CommandVersionService } from '../../services/CommandVersionService';
import { DeleteCommandUseCase } from './DeleteCommandUseCase';
import {
  CommandNotFoundError,
  CommandSpaceNotAccessibleError,
} from '../../../domain/errors';

describe('DeleteRecipeUseCase', () => {
  let deleteCommandUseCase: DeleteCommandUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let commandService: jest.Mocked<CommandService>;
  let commandVersionService: jest.Mocked<CommandVersionService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;

  beforeEach(() => {
    accountsPort = mockInterface<IAccountsPort>();

    spacesPort = mockInterface<ISpacesPort>();
    spacesPort.findMembership.mockResolvedValue({
      userId: createUserId('00000000-0000-0000-0000-000000000001'),
      spaceId: createSpaceId('00000000-0000-0000-0000-000000000002'),
      role: UserSpaceRole.MEMBER,
      pinned: false,
      createdBy: createUserId('00000000-0000-0000-0000-000000000001'),
      updatedBy: createUserId('00000000-0000-0000-0000-000000000001'),
    });

    commandService = createMockInstance(CommandService);

    commandVersionService = createMockInstance(CommandVersionService);

    eventEmitterService = createMockInstance(PackmindEventEmitterService);
    eventEmitterService.emit.mockReturnValue(true);

    stubLogger();

    deleteCommandUseCase = new DeleteCommandUseCase(
      spacesPort,
      accountsPort,
      commandService,
      commandVersionService,
      eventEmitterService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let recipeId: CommandId;
    let userId: UserId;
    let organizationId: OrganizationId;
    let spaceId: SpaceId;
    let command: DeleteCommandCommand;
    let mockCommand: Command;
    let user: User;
    let organization: Organization;
    let space: Space;

    beforeEach(() => {
      userId = createUserId(uuidv4());
      organizationId = createOrganizationId(uuidv4());
      spaceId = createSpaceId(uuidv4());
      recipeId = createCommandId(uuidv4());

      user = {
        id: userId,
        email: 'test@example.com',
        displayName: null,
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
      };
      organization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
      };
      space = spaceFactory({ id: spaceId, organizationId });

      mockCommand = commandFactory({ id: recipeId, userId, spaceId });
      command = {
        recipeId,
        spaceId,
        userId,
        organizationId,
      };

      accountsPort.getUserById.mockResolvedValue(user);
      accountsPort.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
    });

    describe('when recipe deletion succeeds', () => {
      beforeEach(async () => {
        commandService.getCommandById.mockResolvedValue(mockCommand);
        commandVersionService.deleteCommandVersionsForCommand.mockResolvedValue();
        commandService.deleteCommand.mockResolvedValue();

        await deleteCommandUseCase.execute(command);
      });

      it('calls RecipeService.deleteRecipe with correct parameters', () => {
        expect(commandService.deleteCommand).toHaveBeenCalledWith(
          recipeId,
          userId,
        );
      });

      it('calls RecipeVersionService.deleteRecipeVersionsForRecipe with correct parameters', () => {
        expect(
          commandVersionService.deleteCommandVersionsForCommand,
        ).toHaveBeenCalledWith(recipeId, userId);
      });

      it('calls RecipeService.deleteRecipe exactly once', () => {
        expect(commandService.deleteCommand).toHaveBeenCalledTimes(1);
      });

      it('calls RecipeVersionService.deleteRecipeVersionsForRecipe exactly once', () => {
        expect(
          commandVersionService.deleteCommandVersionsForCommand,
        ).toHaveBeenCalledTimes(1);
      });

      it('deletes recipe before deleting recipe versions', () => {
        const commandServiceCall =
          commandService.deleteCommand.mock.invocationCallOrder[0];
        const versionServiceCall =
          commandVersionService.deleteCommandVersionsForCommand.mock
            .invocationCallOrder[0];
        expect(commandServiceCall).toBeLessThan(versionServiceCall);
      });

      it('emits a CommandDeletedEvent', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.any(CommandDeletedEvent),
        );
      });

      it('emits event with correct recipe id in payload', () => {
        const emittedEvent = eventEmitterService.emit.mock
          .calls[0][0] as CommandDeletedEvent;
        expect(emittedEvent.payload.id).toBe(recipeId);
      });

      it('emits event with correct space id in payload', () => {
        const emittedEvent = eventEmitterService.emit.mock
          .calls[0][0] as CommandDeletedEvent;
        expect(emittedEvent.payload.spaceId).toBe(spaceId);
      });
    });

    describe('when recipe deletion fails', () => {
      let error: Error;

      beforeEach(() => {
        error = new Error('Recipe deletion failed');
        commandService.getCommandById.mockResolvedValue(mockCommand);
        commandService.deleteCommand.mockRejectedValue(error);
      });

      it('throws the error from RecipeService', async () => {
        await expect(deleteCommandUseCase.execute(command)).rejects.toThrow(
          'Recipe deletion failed',
        );
      });

      it('calls RecipeService.deleteRecipe with correct parameters', async () => {
        try {
          await deleteCommandUseCase.execute(command);
        } catch {
          // Ignore error for this test
        }

        expect(commandService.deleteCommand).toHaveBeenCalledWith(
          recipeId,
          userId,
        );
      });

      it('calls RecipeService.deleteRecipe exactly once', async () => {
        try {
          await deleteCommandUseCase.execute(command);
        } catch {
          // Ignore error for this test
        }

        expect(commandService.deleteCommand).toHaveBeenCalledTimes(1);
      });
    });

    describe('when recipe does not exist', () => {
      let nonExistentCommandId: CommandId;
      let nonExistentCommand: DeleteCommandCommand;

      beforeEach(() => {
        nonExistentCommandId = createCommandId(uuidv4());
        nonExistentCommand = {
          recipeId: nonExistentCommandId,
          spaceId,
          userId,
          organizationId,
        };
        commandService.getCommandById.mockResolvedValue(null);
      });

      it('throws CommandNotFoundError', async () => {
        await expect(
          deleteCommandUseCase.execute(nonExistentCommand),
        ).rejects.toBeInstanceOf(CommandNotFoundError);
      });
    });

    describe('when recipe belongs to another space', () => {
      beforeEach(() => {
        commandService.getCommandById.mockResolvedValue(
          commandFactory({
            id: recipeId,
            userId,
            spaceId: createSpaceId(uuidv4()),
          }),
        );
      });

      it('throws CommandNotFoundError', async () => {
        await expect(
          deleteCommandUseCase.execute(command),
        ).rejects.toBeInstanceOf(CommandNotFoundError);
      });

      it('does not delete the recipe', async () => {
        await deleteCommandUseCase.execute(command).catch(() => undefined);

        expect(commandService.deleteCommand).not.toHaveBeenCalled();
      });
    });

    describe('when space belongs to another organization', () => {
      beforeEach(() => {
        spacesPort.getSpaceById.mockResolvedValue(
          spaceFactory({
            id: spaceId,
            organizationId: createOrganizationId(uuidv4()),
          }),
        );
      });

      it('throws CommandSpaceNotAccessibleError', async () => {
        await expect(
          deleteCommandUseCase.execute(command),
        ).rejects.toBeInstanceOf(CommandSpaceNotAccessibleError);
      });
    });

    describe('when database operation fails', () => {
      let failingCommand: DeleteCommandCommand;

      beforeEach(() => {
        failingCommand = {
          recipeId,
          spaceId,
          userId,
          organizationId,
        };
        commandService.getCommandById.mockResolvedValue(mockCommand);
        commandService.deleteCommand.mockRejectedValue(
          new Error('Database connection failed'),
        );
      });

      it('throws an error with the correct message', async () => {
        await expect(
          deleteCommandUseCase.execute(failingCommand),
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('when the user is not a member of the space', () => {
      beforeEach(() => {
        spacesPort.findMembership.mockResolvedValue(null);
      });

      it('throws a SpaceMembershipRequiredError', async () => {
        await expect(deleteCommandUseCase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });
  });
});
