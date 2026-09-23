import { mockInterface } from '@packmind/test-utils';
import { standardFactory } from '@packmind/standards/test';
import { packageFactory } from '@packmind/deployments/test';
import {
  createPackageId,
  createSpaceId,
  createStandardId,
  Package,
} from '@packmind/types';

import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { IStandardsGateway } from '../../domain/repositories/IStandardsGateway';
import { IPackagesGateway } from '../../domain/repositories/IPackagesGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { RemoveFromPackageUseCase } from './RemoveFromPackageUseCase';

const SPACE_ID = createSpaceId('space-123');
const STANDARD_ID = createStandardId('std-id-1');

describe('RemoveFromPackageUseCase', () => {
  let useCase: RemoveFromPackageUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;
  let standardsGateway: jest.Mocked<IStandardsGateway>;
  let packagesGateway: jest.Mocked<IPackagesGateway>;
  let source: Package;

  function givenPackages(packages: Package[]) {
    packagesGateway.list.mockResolvedValue({ packages });
  }

  async function removeStandardFromSource() {
    return useCase.execute({
      packageSlug: source.slug,
      itemType: 'standard',
      itemSlugs: ['std-1'],
    });
  }

  beforeEach(() => {
    standardsGateway = mockInterface<IStandardsGateway>();
    packagesGateway = mockInterface<IPackagesGateway>();

    const spaceService = mockInterface<ISpaceService>();
    spaceService.getDefaultSpace = jest
      .fn()
      .mockResolvedValue({ id: SPACE_ID, slug: 'global' });

    mockGateway = createMockPackmindGateway({
      packages: packagesGateway,
      standards: standardsGateway,
    });

    source = packageFactory({
      id: createPackageId('package-source'),
      slug: 'source',
      spaceId: SPACE_ID,
      standards: [STANDARD_ID],
    });

    standardsGateway.list.mockResolvedValue({
      standards: [
        standardFactory({
          id: STANDARD_ID,
          slug: 'std-1',
          name: 'Std 1',
        }),
      ],
    });
    packagesGateway.removeArtefacts.mockResolvedValue({
      package: source,
      removed: { standards: [STANDARD_ID], commands: [], skills: [] },
      skipped: { standards: [], commands: [], skills: [] },
    });

    useCase = new RemoveFromPackageUseCase(mockGateway, spaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the standard belongs to the package only', () => {
    beforeEach(() => {
      givenPackages([source]);
    });

    it('removes it from the package', async () => {
      await removeStandardFromSource();

      expect(packagesGateway.removeArtefacts).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: source.id,
          spaceId: SPACE_ID,
          standardIds: [STANDARD_ID],
        }),
      );
    });

    it('reports it as removed', async () => {
      const result = await removeStandardFromSource();

      expect(result.removed).toEqual([
        {
          slug: 'std-1',
          name: 'Std 1',
          removed: true,
          remainingPackageSlugs: [],
        },
      ]);
    });

    it('reports the space-qualified package slug', async () => {
      const result = await removeStandardFromSource();

      expect(result.packageSlug).toBe('@global/source');
    });
  });

  describe('when the standard does not belong to the package', () => {
    beforeEach(() => {
      source = packageFactory({
        id: createPackageId('package-source'),
        slug: 'source',
        spaceId: SPACE_ID,
      });
      givenPackages([source]);
    });

    it('removes nothing', async () => {
      await removeStandardFromSource();

      expect(packagesGateway.removeArtefacts).not.toHaveBeenCalled();
    });

    it('reports that nothing was removed', async () => {
      const result = await removeStandardFromSource();

      expect(result.removed[0].removed).toBe(false);
    });
  });

  describe('when the standard also belongs to other packages', () => {
    beforeEach(() => {
      givenPackages([
        source,
        packageFactory({
          id: createPackageId('package-other-1'),
          slug: 'other-1',
          spaceId: SPACE_ID,
          standards: [STANDARD_ID],
        }),
        packageFactory({
          id: createPackageId('package-other-2'),
          slug: 'other-2',
          spaceId: SPACE_ID,
          standards: [STANDARD_ID],
        }),
      ]);
    });

    it('removes it from the named package only', async () => {
      await removeStandardFromSource();

      expect(packagesGateway.removeArtefacts).toHaveBeenCalledTimes(1);
    });

    it('reports the packages it still belongs to', async () => {
      const result = await removeStandardFromSource();

      expect(result.removed[0].remainingPackageSlugs).toEqual([
        '@global/other-1',
        '@global/other-2',
      ]);
    });
  });

  describe('when the package does not exist', () => {
    it('throws', async () => {
      givenPackages([]);

      await expect(
        useCase.execute({
          packageSlug: 'unknown',
          itemType: 'standard',
          itemSlugs: ['std-1'],
        }),
      ).rejects.toThrow("package 'unknown' not found");
    });
  });

  describe('when the standard does not exist', () => {
    it('throws', async () => {
      givenPackages([source]);
      standardsGateway.list.mockResolvedValue({ standards: [] });

      await expect(
        useCase.execute({
          packageSlug: source.slug,
          itemType: 'standard',
          itemSlugs: ['unknown'],
        }),
      ).rejects.toThrow("standard 'unknown' not found");
    });
  });
});
