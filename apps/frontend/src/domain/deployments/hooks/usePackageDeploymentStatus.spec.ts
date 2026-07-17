import {
  ActiveDistributedPackagesByTarget,
  createPackageId,
  createTargetId,
} from '@packmind/types';
import { getDeployedTargetCountByPackage } from './usePackageDeploymentStatus';

describe('getDeployedTargetCountByPackage', () => {
  const packageA = createPackageId('pkg-a');
  const packageB = createPackageId('pkg-b');
  const target1 = createTargetId('target-1');
  const target2 = createTargetId('target-2');

  const buildTargetEntry = (
    targetId: ReturnType<typeof createTargetId>,
    packageIds: ReturnType<typeof createPackageId>[],
  ): ActiveDistributedPackagesByTarget =>
    ({
      targetId,
      target: {} as ActiveDistributedPackagesByTarget['target'],
      gitRepo: null,
      packages: packageIds.map(
        (packageId) =>
          ({
            packageId,
          }) as ActiveDistributedPackagesByTarget['packages'][number],
      ),
    }) as ActiveDistributedPackagesByTarget;

  describe('when the overview is undefined', () => {
    it('returns an empty map', () => {
      expect(getDeployedTargetCountByPackage(undefined).size).toBe(0);
    });
  });

  describe('when a package is live on two targets', () => {
    it('counts both distinct targets', () => {
      const overview = [
        buildTargetEntry(target1, [packageA]),
        buildTargetEntry(target2, [packageA]),
      ];
      expect(getDeployedTargetCountByPackage(overview).get(packageA)).toBe(2);
    });
  });

  describe('when packages are spread across targets', () => {
    it('counts each package independently', () => {
      const overview = [
        buildTargetEntry(target1, [packageA, packageB]),
        buildTargetEntry(target2, [packageB]),
      ];
      const counts = getDeployedTargetCountByPackage(overview);
      expect(counts.get(packageB)).toBe(2);
    });
  });

  describe('when a package is not deployed', () => {
    it('has no entry in the map', () => {
      const overview = [buildTargetEntry(target1, [packageA])];
      expect(getDeployedTargetCountByPackage(overview).has(packageB)).toBe(
        false,
      );
    });
  });
});
