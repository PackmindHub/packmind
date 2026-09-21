import { mockInterface } from '@packmind/test-utils';
import { commandFactory } from '@packmind/commands/test';
import { packageFactory } from '@packmind/deployments/test';
import {
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
    packagesGateway.addArtefacts.mockResolvedValue({
      package: target,
      added: { standards: [], commands: [COMMAND_ID], skills: [] },
      skipped: { standards: [], commands: [], skills: [] },
    });
    packagesGateway.removeArtefacts.mockResolvedValue({
      package: target,
      removed: { standards: [], commands: [COMMAND_ID], skills: [] },
      skipped: { standards: [], commands: [], skills: [] },
    });

    useCase = new MoveToPackageUseCase(mockGateway, spaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the command belongs to no package', () => {
    beforeEach(() => {
      givenPackages([target]);
    });

    it('adds it to the target package', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.addArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: target.id,
          spaceId: SPACE_ID,
          recipeIds: [COMMAND_ID],
        }),
      );
    });

    it('removes it from nothing', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.removeArtefacts).not.toHaveBeenCalled();
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
    });

    it('adds it to the target package', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.addArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({ packageId: target.id }),
      );
    });

    it('removes it from the source package', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.removeArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: source.id,
          spaceId: SPACE_ID,
          recipeIds: [COMMAND_ID],
        }),
      );
    });

    it('reports the package it was removed from', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].removedFrom).toEqual(['@global/source']);
    });
  });

  describe('when the command belongs to several other packages', () => {
    beforeEach(() => {
      givenPackages([
        target,
        packageFactory({
          id: createPackageId('package-source-1'),
          slug: 'source-1',
          spaceId: SPACE_ID,
          recipes: [COMMAND_ID],
        }),
        packageFactory({
          id: createPackageId('package-source-2'),
          slug: 'source-2',
          spaceId: SPACE_ID,
          recipes: [COMMAND_ID],
        }),
      ]);
    });

    it('removes it from each of them', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.removeArtefacts).toHaveBeenCalledTimes(2);
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
    });

    it('adds nothing', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.addArtefacts).not.toHaveBeenCalled();
    });

    it('removes nothing', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.removeArtefacts).not.toHaveBeenCalled();
    });

    it('reports that nothing was added', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].addedToTarget).toBe(false);
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
    });

    it('adds nothing', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.addArtefacts).not.toHaveBeenCalled();
    });

    it('removes it from the other package', async () => {
      await moveCommandToTarget();

      expect(packagesGateway.removeArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({ packageId: source.id }),
      );
    });

    it('reports the package it was removed from', async () => {
      const result = await moveCommandToTarget();

      expect(result.moved[0].removedFrom).toEqual(['@global/source']);
    });
  });

  describe('when several commands share a source package', () => {
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
    });

    it('removes them from that package in a single call', async () => {
      await useCase.execute({
        packageSlug: target.slug,
        itemType: 'command',
        itemSlugs: ['cmd-1', 'cmd-2'],
      });

      expect(packagesGateway.removeArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: source.id,
          recipeIds: [COMMAND_ID, OTHER_COMMAND_ID],
        }),
      );
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
