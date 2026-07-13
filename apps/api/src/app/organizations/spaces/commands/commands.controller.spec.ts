import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  Command,
  createCommandId,
  createCommandVersionId,
} from '@packmind/types';
import { CommandsService } from './commands.service';
import { OrganizationsSpacesCommandsController } from './commands.controller';

describe('OrganizationsSpacesRecipesController', () => {
  let controller: OrganizationsSpacesCommandsController;
  let commandsService: jest.Mocked<CommandsService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    commandsService = {
      getCommandsBySpace: jest.fn(),
      getCommandById: jest.fn(),
      getCommandVersionsById: jest.fn(),
      updateCommandFromUI: jest.fn(),
      deleteCommand: jest.fn(),
      deleteCommandsBatch: jest.fn(),
      getLatestVersionNumber: jest.fn(),
    } as unknown as jest.Mocked<CommandsService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesCommandsController(
      commandsService,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecipes', () => {
    describe('with valid space', () => {
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
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      let result: Command[];

      beforeEach(async () => {
        commandsService.getCommandsBySpace.mockResolvedValue(mockCommands);
        result = await controller.getCommands(orgId, spaceId, request);
      });

      it('returns recipes', () => {
        expect(result).toEqual(mockCommands);
      });

      it('calls service with correct params', () => {
        expect(commandsService.getCommandsBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error('Database error');

      commandsService.getCommandsBySpace.mockRejectedValue(error);

      await expect(
        controller.getCommands(orgId, spaceId, request),
      ).rejects.toThrow('Database error');
    });

    describe('when recipe list is empty', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      let result: Command[];

      beforeEach(async () => {
        commandsService.getCommandsBySpace.mockResolvedValue([]);
        result = await controller.getCommands(orgId, spaceId, request);
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls service with correct params', () => {
        expect(commandsService.getCommandsBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
    });
  });

  describe('getRecipeById', () => {
    describe('when recipe exists', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const mockCommand: Command = {
        id: recipeId,
        slug: 'test-recipe',
        name: 'Test Recipe',
        content: 'Test content',
        userId,
        version: 1,
        spaceId,
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      let result: Command;

      beforeEach(async () => {
        commandsService.getCommandById.mockResolvedValue(mockCommand);
        result = await controller.getCommandById(
          orgId,
          spaceId,
          recipeId,
          request,
        );
      });

      it('returns recipe', () => {
        expect(result).toEqual(mockCommand);
      });

      it('calls service with correct params', () => {
        expect(commandsService.getCommandById).toHaveBeenCalledWith(
          recipeId,
          orgId,
          spaceId,
          userId,
        );
      });
    });

    it('throws NotFoundException for non-existent recipe', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      commandsService.getCommandById.mockResolvedValue(null);

      await expect(
        controller.getCommandById(orgId, spaceId, recipeId, request),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error('Database error');

      commandsService.getCommandById.mockRejectedValue(error);

      await expect(
        controller.getCommandById(orgId, spaceId, recipeId, request),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getRecipeVersionsById', () => {
    describe('when versions exist', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const mockVersions = [
        {
          id: createCommandVersionId('version-1'),
          recipeId,
          version: 1,
          name: 'Test Recipe v1',
          slug: 'test-recipe',
          content: 'Content v1',
          userId: createUserId('user-1'),
        },
        {
          id: createCommandVersionId('version-2'),
          recipeId,
          version: 2,
          name: 'Test Recipe v2',
          slug: 'test-recipe',
          content: 'Content v2',
          userId: createUserId('user-1'),
        },
      ];
      let result: typeof mockVersions;

      beforeEach(async () => {
        commandsService.getCommandVersionsById.mockResolvedValue(mockVersions);
        result = await controller.getCommandVersionsById(
          orgId,
          spaceId,
          recipeId,
        );
      });

      it('returns recipe versions with command-named twin field', () => {
        expect(result).toEqual(
          mockVersions.map((version) => ({
            ...version,
            commandId: version.recipeId,
          })),
        );
      });

      it('calls service with correct params', () => {
        expect(commandsService.getCommandVersionsById).toHaveBeenCalledWith(
          recipeId,
        );
      });
    });

    it('throws NotFoundException for empty versions list', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');

      commandsService.getCommandVersionsById.mockResolvedValue([]);

      await expect(
        controller.getCommandVersionsById(orgId, spaceId, recipeId),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const error = new Error('Database error');

      commandsService.getCommandVersionsById.mockRejectedValue(error);

      await expect(
        controller.getCommandVersionsById(orgId, spaceId, recipeId),
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateRecipe', () => {
    describe('when update is successful', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const updateData = {
        name: 'Updated Recipe',
        content: 'Updated content',
      };
      const mockUpdatedCommand: Command = {
        id: recipeId,
        slug: 'test-recipe',
        name: updateData.name,
        content: updateData.content,
        userId,
        version: 2,
        spaceId,
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
        clientSource: 'ui',
      } as unknown as AuthenticatedRequest;
      let result: Command;

      beforeEach(async () => {
        commandsService.updateCommandFromUI.mockResolvedValue(
          mockUpdatedCommand,
        );
        result = await controller.updateCommand(
          orgId,
          spaceId,
          recipeId,
          updateData,
          request,
        );
      });

      it('returns updated recipe', () => {
        expect(result).toEqual(mockUpdatedCommand);
      });

      it('calls service with correct params', () => {
        expect(commandsService.updateCommandFromUI).toHaveBeenCalledWith({
          recipeId,
          spaceId,
          organizationId: orgId,
          name: updateData.name,
          content: updateData.content,
          userId,
          source: 'ui',
        });
      });
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const updateData = {
        name: 'Updated Recipe',
        content: 'Updated content',
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error('Database error');

      commandsService.updateCommandFromUI.mockRejectedValue(error);

      await expect(
        controller.updateCommand(orgId, spaceId, recipeId, updateData, request),
      ).rejects.toThrow('Database error');
    });

    it('validates recipe belongs to specified space', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const updateData = {
        name: 'Updated Recipe',
        content: 'Updated content',
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );

      commandsService.updateCommandFromUI.mockRejectedValue(error);

      await expect(
        controller.updateCommand(orgId, spaceId, recipeId, updateData, request),
      ).rejects.toThrow(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );
    });
  });

  describe('deleteRecipe', () => {
    it('deletes recipe within space and returns void', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
        clientSource: 'ui',
      } as unknown as AuthenticatedRequest;

      commandsService.deleteCommand.mockResolvedValue(undefined);

      await controller.deleteCommand(orgId, spaceId, recipeId, request);

      expect(commandsService.deleteCommand).toHaveBeenCalledWith(
        recipeId,
        spaceId,
        orgId,
        userId,
        'ui',
      );
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      commandsService.deleteCommand.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        controller.deleteCommand(orgId, spaceId, recipeId, request),
      ).rejects.toThrow('Database error');
    });

    it('validates recipe belongs to specified space', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createCommandId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );

      commandsService.deleteCommand.mockRejectedValue(error);

      await expect(
        controller.deleteCommand(orgId, spaceId, recipeId, request),
      ).rejects.toThrow(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );
    });
  });

  describe('deleteCommandsBatch', () => {
    const orgId = createOrganizationId('org-123');
    const spaceId = createSpaceId('space-456');
    const userId = createUserId('user-1');
    const commandIds = [
      createCommandId('recipe-1'),
      createCommandId('recipe-2'),
    ];
    const request = {
      user: { userId, name: 'Test User' },
      clientSource: 'ui',
    } as unknown as AuthenticatedRequest;

    it('accepts the legacy recipeIds key', async () => {
      commandsService.deleteCommandsBatch.mockResolvedValue(undefined);

      await controller.deleteCommandsBatch(
        orgId,
        spaceId,
        { recipeIds: commandIds },
        request,
      );

      expect(commandsService.deleteCommandsBatch).toHaveBeenCalledWith(
        commandIds,
        spaceId,
        userId,
        orgId,
        'ui',
      );
    });

    it('accepts the new commandIds key', async () => {
      commandsService.deleteCommandsBatch.mockResolvedValue(undefined);

      await controller.deleteCommandsBatch(
        orgId,
        spaceId,
        { commandIds },
        request,
      );

      expect(commandsService.deleteCommandsBatch).toHaveBeenCalledWith(
        commandIds,
        spaceId,
        userId,
        orgId,
        'ui',
      );
    });

    it('prefers commandIds over recipeIds when both are present', async () => {
      commandsService.deleteCommandsBatch.mockResolvedValue(undefined);
      const recipeIds = [createCommandId('legacy-1')];

      await controller.deleteCommandsBatch(
        orgId,
        spaceId,
        { commandIds, recipeIds },
        request,
      );

      expect(commandsService.deleteCommandsBatch).toHaveBeenCalledWith(
        commandIds,
        spaceId,
        userId,
        orgId,
        'ui',
      );
    });

    it('throws BadRequestException when neither key is provided', async () => {
      await expect(
        controller.deleteCommandsBatch(orgId, spaceId, {}, request),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the array is empty', async () => {
      await expect(
        controller.deleteCommandsBatch(
          orgId,
          spaceId,
          { commandIds: [] },
          request,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRecipeLatestVersion', () => {
    const orgId = createOrganizationId('org-123');
    const spaceId = createSpaceId('space-456');
    const recipeId = createCommandId('recipe-1');
    const userId = createUserId('user-1');

    const request = {
      organization: {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        role: 'admin',
      },
      user: {
        userId,
        name: 'Test User',
      },
    } as unknown as AuthenticatedRequest;

    describe('when service returns a version number', () => {
      let result: { version: number };

      beforeEach(async () => {
        commandsService.getLatestVersionNumber.mockResolvedValue(5);
        result = await controller.getCommandLatestVersion(
          orgId,
          spaceId,
          recipeId,
          request,
        );
      });

      it('returns the version number', () => {
        expect(result).toEqual({ version: 5 });
      });

      it('calls service with correct params', () => {
        expect(commandsService.getLatestVersionNumber).toHaveBeenCalledWith({
          recipeId,
          organizationId: orgId,
          spaceId,
          userId,
        });
      });
    });

    describe('when service returns null', () => {
      it('throws NotFoundException', async () => {
        commandsService.getLatestVersionNumber.mockResolvedValue(null);

        await expect(
          controller.getCommandLatestVersion(orgId, spaceId, recipeId, request),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
