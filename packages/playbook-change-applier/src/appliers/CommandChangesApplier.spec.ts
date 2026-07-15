import {
  ICommandsPort,
  Command,
  CommandVersion,
  createCommandId,
  createCommandVersionId,
  createUserId,
  createOrganizationId,
  createSpaceId,
  DiffService,
} from '@packmind/types';
import { CommandChangesApplier } from './CommandChangesApplier';

describe('CommandChangesApplier', () => {
  let applier: CommandChangesApplier;
  let commandsPort: jest.Mocked<ICommandsPort>;
  let diffService: DiffService;

  const recipeId = createCommandId('recipe-1');
  const versionId = createCommandVersionId('ver-1');
  const userId = createUserId('user-1');
  const orgId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');

  const recipe: Command = {
    id: recipeId,
    name: 'My Command',
    slug: 'my-command',
    version: 1,
    spaceId,
    organizationId: orgId,
  } as Command;

  const version: CommandVersion = {
    id: versionId,
    recipeId,
    name: 'My Command',
    slug: 'my-command',
    content: 'Do this thing',
    version: 1,
    userId,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    diffService = new DiffService();

    commandsPort = {
      getCommandByIdInternal: jest.fn(),
      getCommandVersion: jest.fn(),
      updateCommandFromUI: jest.fn(),
    } as unknown as jest.Mocked<ICommandsPort>;

    applier = new CommandChangesApplier(diffService, commandsPort);
  });

  describe('getVersion', () => {
    describe('when recipe and version exist', () => {
      beforeEach(() => {
        commandsPort.getCommandByIdInternal.mockResolvedValue(recipe);
        commandsPort.getCommandVersion.mockResolvedValue(version);
      });

      it('returns the recipe version', async () => {
        const result = await applier.getVersion(recipeId);

        expect(result).toEqual(version);
      });

      it('fetches recipe by internal id', async () => {
        await applier.getVersion(recipeId);

        expect(commandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          recipeId,
        );
      });

      it('fetches the version with correct parameters', async () => {
        await applier.getVersion(recipeId);

        expect(commandsPort.getCommandVersion).toHaveBeenCalledWith(
          recipe.id,
          recipe.version,
          [recipe.spaceId],
        );
      });
    });

    describe('when recipe does not exist', () => {
      beforeEach(() => {
        commandsPort.getCommandByIdInternal.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(applier.getVersion(recipeId)).rejects.toThrow(
          `Recipe not found for ${recipeId}`,
        );
      });
    });

    describe('when version does not exist', () => {
      beforeEach(() => {
        commandsPort.getCommandByIdInternal.mockResolvedValue(recipe);
        commandsPort.getCommandVersion.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(applier.getVersion(recipeId)).rejects.toThrow(
          `Recipe version not found for ${recipeId}`,
        );
      });
    });
  });

  describe('saveNewVersion', () => {
    const newVersionId = createCommandVersionId('ver-2');
    const updatedCommand = { ...recipe, version: 2 } as Command;
    const newVersion: CommandVersion = {
      ...version,
      id: newVersionId,
      version: 2,
    };

    describe('when update succeeds', () => {
      beforeEach(() => {
        commandsPort.updateCommandFromUI.mockResolvedValue({
          recipe: updatedCommand,
        });
        commandsPort.getCommandVersion.mockResolvedValue(newVersion);
      });

      it('returns the new version', async () => {
        const result = await applier.saveNewVersion(
          version,
          userId,
          spaceId,
          orgId,
        );

        expect(result).toEqual(newVersion);
      });

      it('calls updateRecipeFromUI with mapped fields', async () => {
        await applier.saveNewVersion(version, userId, spaceId, orgId);

        expect(commandsPort.updateCommandFromUI).toHaveBeenCalledWith({
          recipeId: version.recipeId,
          name: version.name,
          content: version.content,
          userId,
          spaceId,
          organizationId: orgId,
        });
      });
    });

    describe('when fetching new version fails', () => {
      beforeEach(() => {
        commandsPort.updateCommandFromUI.mockResolvedValue({
          recipe: updatedCommand,
        });
        commandsPort.getCommandVersion.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(
          applier.saveNewVersion(version, userId, spaceId, orgId),
        ).rejects.toThrow(
          `Failed to retrieve new version after updating recipe ${recipeId}`,
        );
      });
    });
  });
});
