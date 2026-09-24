import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  PackageReleaseDetail,
  PackageReleaseEntry,
  createPackageId,
  createPackageReleaseId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IPackageReleaseRepository } from '../../domain/repositories/IPackageReleaseRepository';
import { PackageReleaseService } from './PackageReleaseService';

describe('PackageReleaseService', () => {
  const packageId = createPackageId(uuidv4());
  let repository: jest.Mocked<IPackageReleaseRepository>;
  let service: PackageReleaseService;

  const releaseOf = (version: string): PackageReleaseEntry => ({
    id: createPackageReleaseId(uuidv4()),
    packageId,
    version,
    name: 'Security',
    description: 'Security harness',
  });

  const detailOf = (version: string): PackageReleaseDetail => ({
    ...releaseOf(version),
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [],
  });

  beforeEach(() => {
    repository = mockInterface<IPackageReleaseRepository>();
    repository.findByPackageIdAndVersion.mockImplementation(
      async (_packageId, version) => detailOf(version),
    );
    service = new PackageReleaseService(repository, stubLogger());
  });

  afterEach(() => jest.clearAllMocks());

  describe('findHighestRelease', () => {
    describe('when the package has several versions', () => {
      it('returns the highest version number', async () => {
        repository.findByPackageId.mockResolvedValue(
          ['1.0.0', '1.1.1', '1.1.0'].map(releaseOf),
        );

        const highest = await service.findHighestRelease(packageId);

        expect(highest?.version).toEqual('1.1.1');
      });
    });

    describe('when a patch on an older line was created last', () => {
      it('returns the highest version number rather than the latest created', async () => {
        repository.findByPackageId.mockResolvedValue(
          ['1.0.0', '1.1.0', '1.0.1'].map(releaseOf),
        );

        const highest = await service.findHighestRelease(packageId);

        expect(highest?.version).toEqual('1.1.0');
      });
    });

    describe('when the package was never released', () => {
      it('returns null', async () => {
        repository.findByPackageId.mockResolvedValue([]);

        expect(await service.findHighestRelease(packageId)).toBeNull();
      });
    });

    describe('when the package was released', () => {
      it('returns the highest release with its pinned components', async () => {
        repository.findByPackageId.mockResolvedValue(
          ['1.0.0', '1.1.0'].map(releaseOf),
        );

        await service.findHighestRelease(packageId);

        expect(repository.findByPackageIdAndVersion).toHaveBeenCalledWith(
          packageId,
          '1.1.0',
        );
      });
    });
  });
});
