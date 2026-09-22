import { mockInterface } from '@packmind/test-utils';
import { commandFactory } from '@packmind/commands/test';
import { packageFactory } from '@packmind/deployments/test';
import {
  ArtefactsRemovedFromPackage,
  Command,
  createCommandId,
  createPackageId,
  createSpaceId,
  Package,
} from '@packmind/types';

import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import { IPackagesGateway } from '../../domain/repositories/IPackagesGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { MoveToPackageUseCase } from './MoveToPackageUseCase';

const SPACE_ID = createSpaceId('space-123');
const COMMAND_ID = createCommandId('cmd-id-1');

describe('MoveToPackageUseCase', () => {
  let useCase: MoveToPackageUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;
  let commandsGateway: jest.Mocked<ICommandsGateway>;
  let packagesGateway: jest.Mocked<IPackagesGateway>;
  let target: Package;
  let command: Command;

  function givenPackages(packages: Package[]) {
    packagesGateway.list.mockResolvedValue({ packages });
  }

  /** What the server reports it did, which is what the result is built from. */
  function givenMoveResult({
    addedCommands = [] as string[],
    removedFrom = [] as ArtefactsRemovedFromPackage[],
  } = {}) {
    packagesGateway.moveArtefacts.mockResolvedValue({
      package: target,
      added: { standards: [], commands: addedCommands, skills: [] },
      skipped: { standards: [], commands: [], skills: [] },
      removedFrom,
    });
  }

  function emptied(
    pkg: Package,
    commands: string[] = [COMMAND_ID],
  ): ArtefactsRemovedFromPackage {
    return { packageId: pkg.id, standards: [], commands, skills: [] };
  }

  async function moveCommandToTarget() {
    return useCase.execute({
      packageSlug: target.slug,
      itemType: 'command',
      itemSlugs: ['cmd-1'],
    });
  }

  beforeEach(() => {
    commandsGateway = mockInterface<ICommandsGateway>();
    packagesGateway = mockInterface<IPackagesGateway>();

    const spaceService = mockInterface<ISpaceService>();
    spaceService.getDefaultSpace = jest
      .fn()
      .mockResolvedValue({ id: SPACE_ID, slug: 'global' });

    mockGateway = createMockPackmindGateway({
      packages: packagesGateway,
      commands: commandsGateway,
    });

    target = packageFactory({
      id: createPackageId('package-target'),
      slug: 'target',
      spaceId: SPACE_ID,
    });
    command = commandFactory({
      id: COMMAND_ID,
      slug: 'cmd-1',
      name: 'Cmd 1',
    });

    commandsGateway.list.mockResolvedValue({ recipes: [command] });
    givenMoveResult({ addedCommands: [COMMAND_ID] });

    useCase = new MoveToPackageUseCase(mockGateway, spaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the command belongs to no package', () => {
    beforeEach(() => {
      givenPackages([target]);
      givenMoveResult({ addedCommands: [COMMAND_ID] });
    });

    it('moves it to the target package', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.moveArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: target.id,
          spaceId: SPACE_ID,
          recipeIds: [COMMAND_ID],
        }),
      );
    });

    it('asks the server once', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.moveArtefacts).toHaveBeenCalledTimes(1);
    });

    it('reports it as added to the target', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved).toEqual([
        {
          slug: 'cmd-1',
          name: 'Cmd 1',
          addedToTarget: true,
          removedFrom: [],
        },
      ]);
    });

    it('reports the space-qualified target slug', async () => {
      const result = await moveCommandToTarget();

      expect(result.targetPackageSlug).toBe('@global/target');
    });
  });

  describe('when the command belongs to another package', () => {
    let source: Package;

    beforeEach(() => {
      source = packageFactory({
        id: createPackageId('package-source'),
        slug: 'source',
        spaceId: SPACE_ID,
        recipes: [COMMAND_ID],
      });
      givenPackages([target, source]);
      givenMoveResult({
        addedCommands: [COMMAND_ID],
        removedFrom: [emptied(source)],
      });
    });

    it('reports the package it was removed from', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].removedFrom).toEqual(['@global/source']);
    });

    it('still asks the server once', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.moveArtefacts).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the command belongs to several other packages', () => {
    beforeEach(() => {
      const first = packageFactory({
        id: createPackageId('package-source-1'),
        slug: 'source-1',
        spaceId: SPACE_ID,
        recipes: [COMMAND_ID],
      });
      const second = packageFactory({
        id: createPackageId('package-source-2'),
        slug: 'source-2',
        spaceId: SPACE_ID,
        recipes: [COMMAND_ID],
      });
      givenPackages([target, first, second]);
      givenMoveResult({
        addedCommands: [COMMAND_ID],
        removedFrom: [emptied(first), emptied(second)],
      });
    });

    it('reports every package it was removed from', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].removedFrom).toEqual([
        '@global/source-1',
        '@global/source-2',
      ]);
    });
  });

  describe('when the command already belongs to the target only', () => {
    beforeEach(() => {
      target = packageFactory({
        id: createPackageId('package-target'),
        slug: 'target',
        spaceId: SPACE_ID,
        recipes: [COMMAND_ID],
      });
      givenPackages([target]);
      givenMoveResult();
    });

    it('reports that nothing was added', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].addedToTarget).toBe(false);
    });

    it('reports that it left no package', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].removedFrom).toEqual([]);
    });
  });

  describe('when the command belongs to the target and another package', () => {
    let source: Package;

    beforeEach(() => {
      target = packageFactory({
        id: createPackageId('package-target'),
        slug: 'target',
        spaceId: SPACE_ID,
        recipes: [COMMAND_ID],
      });
      source = packageFactory({
        id: createPackageId('package-source'),
        slug: 'source',
        spaceId: SPACE_ID,
        recipes: [COMMAND_ID],
      });
      givenPackages([target, source]);
      givenMoveResult({ removedFrom: [emptied(source)] });
    });

    it('reports that nothing was added', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].addedToTarget).toBe(false);
    });

    it('reports the package it was removed from', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].removedFrom).toEqual(['@global/source']);
    });
  });

  describe('when several commands are moved at once', () => {
    const OTHER_COMMAND_ID = createCommandId('cmd-id-2');
    let source: Package;

    beforeEach(() => {
      source = packageFactory({
        id: createPackageId('package-source'),
        slug: 'source',
        spaceId: SPACE_ID,
        recipes: [COMMAND_ID, OTHER_COMMAND_ID],
      });
      givenPackages([target, source]);
      commandsGateway.list.mockResolvedValue({
        recipes: [
          command,
          commandFactory({
            id: OTHER_COMMAND_ID,
            slug: 'cmd-2',
            name: 'Cmd 2',
          }),
        ],
      });
      givenMoveResult({
        addedCommands: [COMMAND_ID, OTHER_COMMAND_ID],
        removedFrom: [emptied(source, [COMMAND_ID, OTHER_COMMAND_ID])],
      });
    });

    async function moveBothCommands() {
      return useCase.execute({
        packageSlug: target.slug,
        itemType: 'command',
        itemSlugs: ['cmd-1', 'cmd-2'],
      });
    }

    it('sends them in a single call', async () => {
      await moveBothCommands();

      expect(packagesGateway.moveArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: target.id,
          recipeIds: [COMMAND_ID, OTHER_COMMAND_ID],
        }),
      );
    });

    it('reports the source package on each of them', async () => {
      const result = await moveBothCommands();

      expect(result.moved.map((moved) => moved.removedFrom)).toEqual([
        ['@global/source'],
        ['@global/source'],
      ]);
    });
  });

  describe('when the server empties a package the CLI has not seen', () => {
    beforeEach(() => {
      givenPackages([target]);
      givenMoveResult({
        addedCommands: [COMMAND_ID],
        removedFrom: [
          {
            packageId: createPackageId('package-unknown'),
            standards: [],
            commands: [COMMAND_ID],
            skills: [],
          },
        ],
      });
    });

    it('names no package it cannot name', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].removedFrom).toEqual([]);
    });
  });

  describe('when the target package does not exist', () => {
    it('throws', async () => {
      givenPackages([]);

      await expect(
        useCase.execute({
          packageSlug: 'unknown',
          itemType: 'command',
          itemSlugs: ['cmd-1'],
        }),
      ).rejects.toThrow("package 'unknown' not found");
    });
  });

  describe('when the command does not exist', () => {
    it('throws', async () => {
      givenPackages([target]);
      commandsGateway.list.mockResolvedValue({ recipes: [] });

      await expect(
        useCase.execute({
          packageSlug: target.slug,
          itemType: 'command',
          itemSlugs: ['unknown'],
        }),
      ).rejects.toThrow("command 'unknown' not found");
    });
  });
});
