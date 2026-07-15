import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  Command,
  createCommandId,
} from '@packmind/types';
import { CommandsService } from './commands.service';
import { CommandsAliasController } from './commands.alias.controller';
import { OrganizationsSpacesCommandsController } from './commands.controller';

describe('CommandsAliasController', () => {
  let controller: CommandsAliasController;
  let commandsService: jest.Mocked<CommandsService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    commandsService = {
      getCommandsBySpace: jest.fn(),
      getCommandById: jest.fn(),
    } as unknown as jest.Mocked<CommandsService>;

    logger = stubLogger();
    controller = new CommandsAliasController(commandsService, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is an instance of the base commands controller', () => {
    expect(controller).toBeInstanceOf(OrganizationsSpacesCommandsController);
  });

  describe('inherits the base route handlers', () => {
    const orgId = createOrganizationId('org-123');
    const spaceId = createSpaceId('space-456');
    const userId = createUserId('user-1');
    const mockCommands: Command[] = [
      {
        id: createCommandId('recipe-1'),
        slug: 'test-recipe',
        name: 'Test Recipe',
        content: 'Test content',
        userId,
        version: 1,
        spaceId,
      },
    ];
    const request = {
      user: { userId, name: 'Test User' },
    } as unknown as AuthenticatedRequest;
    let result: Command[];

    beforeEach(async () => {
      commandsService.getCommandsBySpace.mockResolvedValue(mockCommands);

      result = await controller.getCommands(orgId, spaceId, request);
    });

    it('returns the commands from the service', () => {
      expect(result).toEqual(mockCommands);
    });

    it('delegates to the service with the space, organization and user ids', () => {
      expect(commandsService.getCommandsBySpace).toHaveBeenCalledWith(
        spaceId,
        orgId,
        userId,
      );
    });
  });
});
