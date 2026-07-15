import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createCommandId,
  createSpaceId,
  createUserId,
  OrganizationId,
  Command,
  CommandId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { commandFactory } from '../../../test/commandFactory';
import { commandVersionFactory } from '../../../test/commandVersionFactory';
import { ICommandRepository } from '../../domain/repositories/ICommandRepository';
import { ICommandVersionRepository } from '../../domain/repositories/ICommandVersionRepository';
import {
  CreateCommandData,
  CommandService,
  UpdateCommandData,
} from './CommandService';

describe('RecipeService', () => {
  let commandService: CommandService;
  let commandRepository: ICommandRepository;
  let commandVersionRepository: ICommandVersionRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    commandRepository = {
      add: jest.fn(),
      addMany: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByUserId: jest.fn(),
      findBySpaceId: jest.fn(),
      markAsMoved: jest.fn(),
    };

    commandVersionRepository = {
      add: jest.fn(),
      addMany: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByCommandId: jest.fn(),
      findLatestByCommandId: jest.fn(),
      findByCommandIdAndVersion: jest.fn(),
    };

    stubbedLogger = stubLogger();

    commandService = new CommandService(
      commandRepository,
      commandVersionRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addRecipe', () => {
    let commandData: CreateCommandData;
    let savedCommand: Command;
    let result: Command;

    beforeEach(async () => {
      commandData = {
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: 'Test content',
        version: 1,
        userId: createUserId(uuidv4()),
        spaceId: createSpaceId(uuidv4()),
      };

      savedCommand = {
        id: createCommandId(uuidv4()),
        ...commandData,
        movedTo: null,
      };

      commandRepository.add = jest.fn().mockResolvedValue(savedCommand);

      result = await commandService.addCommand(commandData);
    });

    it('creates a new recipe with generated ID', () => {
      expect(commandRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: commandData.name,
          slug: commandData.slug,
          content: commandData.content,
          version: commandData.version,
        }),
      );
    });

    it('returns the created recipe', () => {
      expect(result).toEqual(savedCommand);
    });
  });

  describe('getRecipeById', () => {
    describe('when the recipe exists', () => {
      let recipeId: CommandId;
      let recipe: Command;
      let result: Command | null;

      beforeEach(async () => {
        recipeId = createCommandId(uuidv4());
        recipe = commandFactory({ id: recipeId });

        commandRepository.findById = jest.fn().mockResolvedValue(recipe);

        result = await commandService.getCommandById(recipeId);
      });

      it('calls repository with correct ID', () => {
        expect(commandRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('returns the found recipe', () => {
        expect(result).toEqual(recipe);
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentCommandId: CommandId;
      let result: Command | null;

      beforeEach(async () => {
        nonExistentCommandId = createCommandId(uuidv4());
        commandRepository.findById = jest.fn().mockResolvedValue(null);

        result = await commandService.getCommandById(nonExistentCommandId);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('findRecipeBySlug', () => {
    describe('when the recipe exists', () => {
      let slug: string;
      let organizationId: OrganizationId;
      let recipe: Command;
      let result: Command | null;

      beforeEach(async () => {
        slug = 'test-recipe';
        organizationId = createOrganizationId('org-123');
        recipe = commandFactory({ slug });

        commandRepository.findBySlug = jest.fn().mockResolvedValue(recipe);

        result = await commandService.findCommandBySlug(slug, organizationId);
      });

      it('calls repository with correct slug and organizationId', () => {
        expect(commandRepository.findBySlug).toHaveBeenCalledWith(
          slug,
          organizationId,
          undefined,
        );
      });

      it('returns the found recipe', () => {
        expect(result).toEqual(recipe);
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentSlug: string;
      let organizationId: OrganizationId;
      let result: Command | null;

      beforeEach(async () => {
        nonExistentSlug = 'non-existent-recipe';
        organizationId = createOrganizationId('org-123');
        commandRepository.findBySlug = jest.fn().mockResolvedValue(null);

        result = await commandService.findCommandBySlug(
          nonExistentSlug,
          organizationId,
        );
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('updateRecipe', () => {
    describe('when the recipe exists', () => {
      let recipeId: CommandId;
      let existingCommand: Command;
      let updateData: UpdateCommandData;
      let updatedCommand: Command;
      let result: Command;

      beforeEach(async () => {
        recipeId = createCommandId(uuidv4());
        existingCommand = commandFactory({ id: recipeId, version: 1 });

        updateData = {
          name: 'Updated Recipe',
          slug: 'updated-recipe',
          content: 'Updated content',
          version: 2,
          userId: createUserId(uuidv4()),
        };

        updatedCommand = {
          id: recipeId,
          ...updateData,
          spaceId: existingCommand.spaceId,
          movedTo: null,
        };

        commandRepository.findById = jest
          .fn()
          .mockResolvedValue(existingCommand);
        commandRepository.add = jest.fn().mockResolvedValue(updatedCommand);

        result = await commandService.updateCommand(recipeId, updateData);
      });

      it('checks if the recipe exists', () => {
        expect(commandRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('updates the recipe with correct data', () => {
        expect(commandRepository.add).toHaveBeenCalledWith({
          id: recipeId,
          ...updateData,
          spaceId: existingCommand.spaceId,
          movedTo: existingCommand.movedTo,
        });
      });

      it('returns the updated recipe', () => {
        expect(result).toEqual(updatedCommand);
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentCommandId: CommandId;
      let updateData: UpdateCommandData;

      beforeEach(() => {
        nonExistentCommandId = createCommandId(uuidv4());
        updateData = {
          name: 'Non-existent Recipe',
          slug: 'non-existent-recipe',
          content: 'This recipe does not exist',
          version: 1,
          userId: createUserId(uuidv4()),
        };

        commandRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          commandService.updateCommand(nonExistentCommandId, updateData),
        ).rejects.toThrow(`Recipe with id ${nonExistentCommandId} not found`);
      });
    });
  });

  describe('deleteRecipe', () => {
    let userId: UserId;

    beforeEach(() => {
      userId = createUserId(uuidv4());
    });

    describe('when the recipe exists', () => {
      let recipeId: CommandId;
      let recipe: Command;

      beforeEach(async () => {
        recipeId = createCommandId(uuidv4());
        recipe = commandFactory({ id: recipeId });

        commandRepository.findById = jest.fn().mockResolvedValue(recipe);
        commandRepository.deleteById = jest.fn().mockResolvedValue(undefined);

        await commandService.deleteCommand(recipeId, userId);
      });

      it('checks if the recipe exists', () => {
        expect(commandRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('deletes the recipe', () => {
        expect(commandRepository.deleteById).toHaveBeenCalledWith(
          recipeId,
          userId,
        );
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentCommandId: CommandId;

      beforeEach(() => {
        nonExistentCommandId = createCommandId(uuidv4());
        commandRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          commandService.deleteCommand(nonExistentCommandId, userId),
        ).rejects.toThrow(`Recipe with id ${nonExistentCommandId} not found`);
      });

      it('does not call deleteById', async () => {
        try {
          await commandService.deleteCommand(nonExistentCommandId, userId);
        } catch {
          // Ignore error
        }
        expect(commandRepository.deleteById).not.toHaveBeenCalled();
      });
    });
  });

  describe('markRecipeAsMoved', () => {
    const destinationSpaceId = createSpaceId(uuidv4());

    describe('when the recipe exists', () => {
      let recipeId: CommandId;
      let recipe: Command;

      beforeEach(async () => {
        recipeId = createCommandId(uuidv4());
        recipe = commandFactory({ id: recipeId });

        commandRepository.findById = jest.fn().mockResolvedValue(recipe);
        commandRepository.markAsMoved = jest.fn().mockResolvedValue(undefined);

        await commandService.markCommandAsMoved(recipeId, destinationSpaceId);
      });

      it('checks if the recipe exists', () => {
        expect(commandRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('calls markAsMoved on repository with correct args', () => {
        expect(commandRepository.markAsMoved).toHaveBeenCalledWith(
          recipeId,
          destinationSpaceId,
        );
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentCommandId: CommandId;

      beforeEach(() => {
        nonExistentCommandId = createCommandId(uuidv4());
        commandRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          commandService.markCommandAsMoved(
            nonExistentCommandId,
            destinationSpaceId,
          ),
        ).rejects.toThrow(`Recipe with id ${nonExistentCommandId} not found`);
      });
    });
  });

  describe('duplicateRecipeToSpace', () => {
    const destinationSpaceId = createSpaceId(uuidv4());
    const newUserId = createUserId(uuidv4());

    describe('when the recipe exists', () => {
      let recipeId: CommandId;
      let original: Command;
      let savedCommand: Command;
      let version: ReturnType<typeof commandVersionFactory>;

      beforeEach(() => {
        recipeId = createCommandId(uuidv4());
        original = commandFactory({ id: recipeId });

        version = commandVersionFactory({ recipeId });

        savedCommand = commandFactory({
          name: original.name,
          slug: original.slug,
          content: original.content,
          userId: newUserId,
          spaceId: destinationSpaceId,
          movedTo: null,
        });

        commandRepository.findById = jest.fn().mockResolvedValue(original);
        commandRepository.add = jest.fn().mockResolvedValue(savedCommand);
        commandVersionRepository.findByCommandId = jest
          .fn()
          .mockResolvedValue([version]);
        commandVersionRepository.addMany = jest
          .fn()
          .mockResolvedValue([version]);
      });

      it('creates a new recipe in the destination space', async () => {
        await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(commandRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            name: original.name,
            slug: original.slug,
            content: original.content,
            spaceId: destinationSpaceId,
            userId: newUserId,
            movedTo: null,
          }),
        );
      });

      it('copies all versions linked to the new recipe', async () => {
        await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(commandVersionRepository.addMany).toHaveBeenCalledWith([
          expect.objectContaining({
            name: version.name,
            slug: version.slug,
            content: version.content,
            version: version.version,
          }),
        ]);
      });

      it('returns the duplicated recipe', async () => {
        const result = await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(result).toEqual(savedCommand);
      });

      it('uses the provided newUserId for the duplicated recipe', async () => {
        await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(commandRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: newUserId,
          }),
        );
      });

      it('sets movedTo to null on the duplicated recipe', async () => {
        await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(commandRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            movedTo: null,
          }),
        );
      });
    });

    describe('when the recipe has multiple versions', () => {
      let recipeId: CommandId;
      let original: Command;
      let version1: ReturnType<typeof commandVersionFactory>;
      let version2: ReturnType<typeof commandVersionFactory>;

      beforeEach(() => {
        recipeId = createCommandId(uuidv4());
        original = commandFactory({ id: recipeId });

        version1 = commandVersionFactory({ recipeId, version: 1 });
        version2 = commandVersionFactory({ recipeId, version: 2 });

        commandRepository.findById = jest.fn().mockResolvedValue(original);
        commandRepository.add = jest.fn().mockResolvedValue(original);
        commandVersionRepository.findByCommandId = jest
          .fn()
          .mockResolvedValue([version1, version2]);
        commandVersionRepository.addMany = jest
          .fn()
          .mockResolvedValue([version1, version2]);
      });

      beforeEach(async () => {
        await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );
      });

      it('copies all versions in a single bulk call', () => {
        expect(commandVersionRepository.addMany).toHaveBeenCalledTimes(1);
      });

      it('copies all versions with correct data', () => {
        expect(commandVersionRepository.addMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: version1.name }),
            expect.objectContaining({ name: version2.name }),
          ]),
        );
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentCommandId: CommandId;

      beforeEach(() => {
        nonExistentCommandId = createCommandId(uuidv4());
        commandRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          commandService.duplicateCommandToSpace(
            nonExistentCommandId,
            destinationSpaceId,
            newUserId,
          ),
        ).rejects.toThrow(`Recipe with id ${nonExistentCommandId} not found`);
      });
    });

    describe('when the recipe has no versions', () => {
      let recipeId: CommandId;
      let original: Command;
      let savedCommand: Command;

      beforeEach(() => {
        recipeId = createCommandId(uuidv4());
        original = commandFactory({ id: recipeId });
        savedCommand = commandFactory({
          name: original.name,
          spaceId: destinationSpaceId,
          userId: newUserId,
          movedTo: null,
        });

        commandRepository.findById = jest.fn().mockResolvedValue(original);
        commandRepository.add = jest.fn().mockResolvedValue(savedCommand);
        commandVersionRepository.findByCommandId = jest
          .fn()
          .mockResolvedValue([]);
      });

      it('creates the recipe', async () => {
        await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(commandRepository.add).toHaveBeenCalledTimes(1);
      });

      it('does not create any versions', async () => {
        await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(commandVersionRepository.addMany).not.toHaveBeenCalled();
      });

      it('returns the duplicated recipe', async () => {
        const result = await commandService.duplicateCommandToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(result).toEqual(savedCommand);
      });
    });
  });
});
