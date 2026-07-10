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

  it('inherits the base route handlers', async () => {
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

    commandsService.getCommandsBySpace.mockResolvedValue(mockCommands);

    const result = await controller.getCommands(orgId, spaceId, request);

    expect(result).toEqual(mockCommands);
    expect(commandsService.getCommandsBySpace).toHaveBeenCalledWith(
      spaceId,
      orgId,
      userId,
    );
  });
});
