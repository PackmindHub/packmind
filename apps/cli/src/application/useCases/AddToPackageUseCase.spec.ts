import { AddToPackageUseCase } from './AddToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import {
  createMockCommandsGateway,
  createMockPackagesGateway,
  createMockSkillsGateway,
  createMockStandardsGateway,
} from '../../mocks/createMockGateways';
import { recipeFactory } from '@packmind/recipes/test';
import { skillFactory } from '@packmind/skills/test';
import { standardFactory } from '@packmind/standards/test';

import {
  createPackageId,
  createRecipeId,
  createSkillId,
  createStandardId,
  Package,
} from '@packmind/types';
import { ISkillsGateway } from '../../domain/repositories/ISkillsGateway';
import { IStandardsGateway } from '../../domain/repositories/IStandardsGateway';
import { IPackagesGateway } from '../../domain/repositories/IPackagesGateway';
import { packageFactory } from '@packmind/deployments/test';

describe('AddToPackageUseCase', () => {
  let useCase: AddToPackageUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;
  let commandsGateway: jest.Mocked<ICommandsGateway>;
  let skillsGateway: jest.Mocked<ISkillsGateway>;
  let standardsGateway: jest.Mocked<IStandardsGateway>;
  let packagesGateway: jest.Mocked<IPackagesGateway>;
  let pkg: Package;

  beforeEach(() => {
    commandsGateway = createMockCommandsGateway();
    skillsGateway = createMockSkillsGateway();
    standardsGateway = createMockStandardsGateway();
    packagesGateway = createMockPackagesGateway();

    mockGateway = {
      spaces: { getGlobal: jest.fn().mockResolvedValue({ id: 'space-123' }) },
      packages: packagesGateway,
      standards: standardsGateway,
      commands: commandsGateway,
      skills: skillsGateway,
    } as unknown as jest.Mocked<IPackmindGateway>;

    pkg = packageFactory({ id: createPackageId('package-1') });

    useCase = new AddToPackageUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding standards', () => {
    beforeEach(() => {
      standardsGateway.list
        .mockResolvedValueOnce({
          standards: [
            standardFactory({
              id: createStandardId('std-id-1'),
              slug: 'std-1',
              name: 'Std 1',
              description: 'desc',
            }),
          ],
        })
        .mockResolvedValueOnce({
          standards: [
            standardFactory({
              id: createStandardId('std-id-2'),
              slug: 'std-2',
              name: 'Std 2',
              description: 'desc',
            }),
          ],
        });

      packagesGateway.list.mockResolvedValue({
        packages: [pkg],
      });
      packagesGateway.addArtefacts.mockResolvedValue({
        package: pkg,
        added: {
          standards: ['std-id-1', 'std-id-2'],
          commands: [],
          skills: [],
        },
        skipped: { standards: [], commands: [], skills: [] },
      });
    });

    it('resolves slugs to IDs and calls gateway with standardIds', async () => {
      await useCase.execute({
        packageSlug: pkg.slug,
        itemType: 'standard',
        itemSlugs: ['std-1', 'std-2'],
      });

      expect(mockGateway.packages.addArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: pkg.id,
          spaceId: 'space-123',
          standardIds: ['std-id-1', 'std-id-2'],
        }),
      );
    });

    it('converts IDs from gateway response back to slugs', async () => {
      const result = await useCase.execute({
        packageSlug: pkg.slug,
        itemType: 'standard',
        itemSlugs: ['std-1', 'std-2'],
      });

      expect(result.added).toEqual(['std-1', 'std-2']);
    });
  });

  describe('when adding commands', () => {
    beforeEach(() => {
      commandsGateway.list.mockResolvedValueOnce({
        recipes: [
          recipeFactory({
            id: createRecipeId('cmd-id-1'),
            slug: 'cmd-1',
            name: 'Cmd 1',
          }),
        ],
      });

      packagesGateway.list.mockResolvedValue({
        packages: [pkg],
      });
      packagesGateway.addArtefacts.mockResolvedValue({
        package: pkg,
        added: { standards: [], commands: ['cmd-id-1'], skills: [] },
        skipped: { standards: [], commands: [], skills: [] },
      });
    });

    it('calls gateway with commandIds', async () => {
      await useCase.execute({
        packageSlug: pkg.slug,
        itemType: 'command',
        itemSlugs: ['cmd-1'],
      });

      expect(mockGateway.packages.addArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: pkg.id,
          spaceId: 'space-123',
          recipeIds: ['cmd-id-1'],
        }),
      );
    });

    it('converts command IDs from gateway response back to slugs', async () => {
      const result = await useCase.execute({
        packageSlug: pkg.slug,
        itemType: 'command',
        itemSlugs: ['cmd-1'],
      });

      expect(result.added).toEqual(['cmd-1']);
    });
  });

  describe('when adding skills', () => {
    beforeEach(() => {
      skillsGateway.list.mockResolvedValueOnce([
        skillFactory({
          id: createSkillId('skill-id-1'),
          slug: 'skill-1',
          name: 'Skill 1',
        }),
      ]);

      packagesGateway.list.mockResolvedValue({
        packages: [pkg],
      });
      packagesGateway.addArtefacts.mockResolvedValue({
        package: pkg,
        added: { standards: [], commands: [], skills: ['skill-id-1'] },
        skipped: { standards: [], commands: [], skills: [] },
      });
    });

    it('calls gateway with skillIds', async () => {
      await useCase.execute({
        packageSlug: pkg.slug,
        itemType: 'skill',
        itemSlugs: ['skill-1'],
      });

      expect(mockGateway.packages.addArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: pkg.id,
          spaceId: 'space-123',
          skillIds: ['skill-id-1'],
        }),
      );
    });

    it('converts skill IDs from gateway response back to slugs', async () => {
      const result = await useCase.execute({
        packageSlug: pkg.slug,
        itemType: 'skill',
        itemSlugs: ['skill-1'],
      });

      expect(result.added).toEqual(['skill-1']);
    });
  });

  describe('when standard does not exist', () => {
    it('throws error with standard slug', async () => {
      packagesGateway.list.mockResolvedValueOnce({ packages: [pkg] });
      standardsGateway.list.mockResolvedValue({ standards: [] });

      await expect(
        useCase.execute({
          packageSlug: pkg.slug,
          itemType: 'standard',
          itemSlugs: ['non-existent'],
        }),
      ).rejects.toThrow("standard 'non-existent' not found");
    });
  });

  describe('when some items are skipped', () => {
    let result: { added: string[]; skipped: string[] };

    beforeEach(async () => {
      standardsGateway.list
        .mockResolvedValueOnce({
          standards: [
            standardFactory({
              id: createStandardId('std-id-1'),
              slug: 'std-1',
              name: 'Std 1',
              description: 'desc',
            }),
          ],
        })
        .mockResolvedValueOnce({
          standards: [
            standardFactory({
              id: createStandardId('std-id-2'),
              slug: 'std-2',
              name: 'Std 2',
              description: 'desc',
            }),
          ],
        });
      packagesGateway.list.mockResolvedValue({
        packages: [pkg],
      });
      packagesGateway.addArtefacts.mockResolvedValue({
        package: pkg,
        added: { standards: ['std-id-2'], commands: [], skills: [] },
        skipped: { standards: ['std-id-1'], commands: [], skills: [] },
      });

      result = await useCase.execute({
        packageSlug: pkg.slug,
        itemType: 'standard',
        itemSlugs: ['std-1', 'std-2'],
      });
    });

    it('converts added IDs to slugs', () => {
      expect(result.added).toEqual(['std-2']);
    });

    it('converts skipped IDs to slugs', () => {
      expect(result.skipped).toEqual(['std-1']);
    });
  });
});
