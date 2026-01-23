import {
  createDistributionId,
  createDistributedPackageId,
  createOrganizationId,
  createPackageId,
  createUserId,
  createTargetId,
  createGitRepoId,
  Distribution,
  DistributedPackage,
  DistributionStatus,
  PackageId,
  Target,
} from '@packmind/types';
import { listActiveDistributions } from './listActiveDistributions';

const DEFAULT_PACKAGE_ID = createPackageId('package-1');

const createTarget = (overrides?: Partial<Target>): Target => ({
  id: createTargetId('target-1'),
  name: 'default',
  path: '/',
  gitRepoId: createGitRepoId('git-repo-1'),
  ...overrides,
});

const createDistributedPackage = (
  distributionId: string,
  overrides?: Partial<DistributedPackage>,
): DistributedPackage => ({
  id: createDistributedPackageId('dp-1'),
  distributionId: createDistributionId(distributionId),
  packageId: DEFAULT_PACKAGE_ID,
  recipeVersions: [],
  standardVersions: [],
  operation: 'add',
  ...overrides,
});

const createDistribution = (
  overrides?: Partial<Distribution>,
): Distribution => {
  const distributionId = createDistributionId('dist-1');
  return {
    id: distributionId,
    distributedPackages: [createDistributedPackage('dist-1')],
    createdAt: new Date().toISOString(),
    authorId: createUserId('test-author-id'),
    organizationId: createOrganizationId('org-1'),
    target: createTarget(),
    status: DistributionStatus.success,
    renderModes: [],
    source: 'cli',
    ...overrides,
  };
};

const callListActiveDistributions = (
  distributions: Distribution[],
  packageId: PackageId = DEFAULT_PACKAGE_ID,
) => listActiveDistributions(distributions, packageId);

describe('listActiveDistributions', () => {
  describe('with empty distributions', () => {
    it('returns empty array', () => {
      const result = callListActiveDistributions([]);

      expect(result).toEqual([]);
    });
  });

  describe('with single target', () => {
    describe('when last operation is add', () => {
      let distribution: Distribution;
      let result: Distribution[];

      beforeEach(() => {
        distribution = createDistribution({
          id: createDistributionId('dist-1'),
          createdAt: '2024-01-01T10:00:00Z',
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        result = callListActiveDistributions([distribution]);
      });

      it('returns one distribution', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the distribution with correct id', () => {
        expect(result[0].id).toEqual(distribution.id);
      });
    });

    describe('when last operation is remove', () => {
      it('returns empty array', () => {
        const distribution = createDistribution({
          id: createDistributionId('dist-1'),
          createdAt: '2024-01-01T10:00:00Z',
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'remove',
            },
          ],
        });

        const result = callListActiveDistributions([distribution]);

        expect(result).toEqual([]);
      });
    });
  });

  describe('with multiple distributions for same target', () => {
    const targetId = createTargetId('target-1');
    const target = createTarget({ id: targetId });

    describe('when last operation is add', () => {
      let newerDistribution: Distribution;
      let result: Distribution[];

      beforeEach(() => {
        const olderDistribution = createDistribution({
          id: createDistributionId('dist-old'),
          createdAt: '2024-01-01T10:00:00Z',
          target,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-old'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        newerDistribution = createDistribution({
          id: createDistributionId('dist-new'),
          createdAt: '2024-01-02T10:00:00Z',
          target,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-new'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        result = callListActiveDistributions([
          olderDistribution,
          newerDistribution,
        ]);
      });

      it('returns one distribution', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the latest distribution', () => {
        expect(result[0].id).toEqual(newerDistribution.id);
      });
    });

    describe('when last operation is remove after add', () => {
      it('returns empty array', () => {
        const addDistribution = createDistribution({
          id: createDistributionId('dist-add'),
          createdAt: '2024-01-01T10:00:00Z',
          target,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-add'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        const removeDistribution = createDistribution({
          id: createDistributionId('dist-remove'),
          createdAt: '2024-01-02T10:00:00Z',
          target,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-remove'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'remove',
            },
          ],
        });

        const result = callListActiveDistributions([
          addDistribution,
          removeDistribution,
        ]);

        expect(result).toEqual([]);
      });
    });

    describe('when add follows remove', () => {
      let addDistribution: Distribution;
      let result: Distribution[];

      beforeEach(() => {
        const removeDistribution = createDistribution({
          id: createDistributionId('dist-remove'),
          createdAt: '2024-01-01T10:00:00Z',
          target,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-remove'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'remove',
            },
          ],
        });

        addDistribution = createDistribution({
          id: createDistributionId('dist-add'),
          createdAt: '2024-01-02T10:00:00Z',
          target,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-add'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        result = callListActiveDistributions([
          removeDistribution,
          addDistribution,
        ]);
      });

      it('returns one distribution', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the add distribution', () => {
        expect(result[0].id).toEqual(addDistribution.id);
      });
    });
  });

  describe('with multiple targets', () => {
    const target1 = createTarget({ id: createTargetId('target-1') });
    const target2 = createTarget({ id: createTargetId('target-2') });

    describe('with all active targets', () => {
      let result: Distribution[];

      beforeEach(() => {
        const dist1 = createDistribution({
          id: createDistributionId('dist-1'),
          createdAt: '2024-01-01T10:00:00Z',
          target: target1,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        const dist2 = createDistribution({
          id: createDistributionId('dist-2'),
          createdAt: '2024-01-01T10:00:00Z',
          target: target2,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        result = callListActiveDistributions([dist1, dist2]);
      });

      it('returns two distributions', () => {
        expect(result).toHaveLength(2);
      });

      it('includes target1', () => {
        expect(result.map((d) => d.target.id)).toContain(target1.id);
      });

      it('includes target2', () => {
        expect(result.map((d) => d.target.id)).toContain(target2.id);
      });
    });

    describe('with one target having remove as last operation', () => {
      let result: Distribution[];

      beforeEach(() => {
        const activeTarget1 = createDistribution({
          id: createDistributionId('dist-1'),
          createdAt: '2024-01-01T10:00:00Z',
          target: target1,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        const removedTarget2 = createDistribution({
          id: createDistributionId('dist-2'),
          createdAt: '2024-01-01T10:00:00Z',
          target: target2,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'remove',
            },
          ],
        });

        result = callListActiveDistributions([activeTarget1, removedTarget2]);
      });

      it('returns one distribution', () => {
        expect(result).toHaveLength(1);
      });

      it('returns only the active target', () => {
        expect(result[0].target.id).toEqual(target1.id);
      });
    });

    describe('with mixed history across targets', () => {
      let target2Add: Distribution;
      let result: Distribution[];

      beforeEach(() => {
        // Target 1: add -> remove (should be excluded)
        const target1Add = createDistribution({
          id: createDistributionId('dist-1-add'),
          createdAt: '2024-01-01T10:00:00Z',
          target: target1,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1-add'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        const target1Remove = createDistribution({
          id: createDistributionId('dist-1-remove'),
          createdAt: '2024-01-02T10:00:00Z',
          target: target1,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-1-remove'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'remove',
            },
          ],
        });

        // Target 2: remove -> add (should be included)
        const target2Remove = createDistribution({
          id: createDistributionId('dist-2-remove'),
          createdAt: '2024-01-01T10:00:00Z',
          target: target2,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-3'),
              distributionId: createDistributionId('dist-2-remove'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'remove',
            },
          ],
        });

        target2Add = createDistribution({
          id: createDistributionId('dist-2-add'),
          createdAt: '2024-01-02T10:00:00Z',
          target: target2,
          distributedPackages: [
            {
              id: createDistributedPackageId('dp-4'),
              distributionId: createDistributionId('dist-2-add'),
              packageId: createPackageId('package-1'),
              recipeVersions: [],
              standardVersions: [],
              operation: 'add',
            },
          ],
        });

        result = callListActiveDistributions([
          target1Add,
          target1Remove,
          target2Remove,
          target2Add,
        ]);
      });

      it('returns one distribution', () => {
        expect(result).toHaveLength(1);
      });

      it('returns target2', () => {
        expect(result[0].target.id).toEqual(target2.id);
      });

      it('returns target2Add distribution', () => {
        expect(result[0].id).toEqual(target2Add.id);
      });
    });
  });

  describe('with distribution status handling', () => {
    describe('when add operation succeeded', () => {
      it('returns one distribution', () => {
        const distribution = createDistribution({
          id: createDistributionId('dist-1'),
          status: DistributionStatus.success,
          distributedPackages: [
            createDistributedPackage('dist-1', { operation: 'add' }),
          ],
        });

        const result = callListActiveDistributions([distribution]);

        expect(result).toHaveLength(1);
      });
    });

    describe('when add operation has no_changes status', () => {
      it('returns one distribution', () => {
        const distribution = createDistribution({
          id: createDistributionId('dist-1'),
          status: DistributionStatus.no_changes,
          distributedPackages: [
            createDistributedPackage('dist-1', { operation: 'add' }),
          ],
        });

        const result = callListActiveDistributions([distribution]);

        expect(result).toHaveLength(1);
      });
    });

    describe('when add operation failed', () => {
      it('returns empty array', () => {
        const distribution = createDistribution({
          id: createDistributionId('dist-1'),
          status: DistributionStatus.failure,
          distributedPackages: [
            createDistributedPackage('dist-1', { operation: 'add' }),
          ],
        });

        const result = callListActiveDistributions([distribution]);

        expect(result).toEqual([]);
      });
    });

    describe('when remove operation succeeded', () => {
      it('returns empty array', () => {
        const distribution = createDistribution({
          id: createDistributionId('dist-1'),
          status: DistributionStatus.success,
          distributedPackages: [
            createDistributedPackage('dist-1', { operation: 'remove' }),
          ],
        });

        const result = callListActiveDistributions([distribution]);

        expect(result).toEqual([]);
      });
    });

    describe('when remove operation failed (package still deployed)', () => {
      it('returns one distribution', () => {
        const distribution = createDistribution({
          id: createDistributionId('dist-1'),
          status: DistributionStatus.failure,
          distributedPackages: [
            createDistributedPackage('dist-1', { operation: 'remove' }),
          ],
        });

        const result = callListActiveDistributions([distribution]);

        expect(result).toHaveLength(1);
      });
    });

    describe('with add then failed remove scenario', () => {
      let failedRemoveDistribution: Distribution;
      let result: Distribution[];

      beforeEach(() => {
        const target = createTarget({ id: createTargetId('target-1') });

        const addDistribution = createDistribution({
          id: createDistributionId('dist-add'),
          createdAt: '2024-01-01T10:00:00Z',
          target,
          status: DistributionStatus.success,
          distributedPackages: [
            createDistributedPackage('dist-add', { operation: 'add' }),
          ],
        });

        failedRemoveDistribution = createDistribution({
          id: createDistributionId('dist-remove'),
          createdAt: '2024-01-02T10:00:00Z',
          target,
          status: DistributionStatus.failure,
          distributedPackages: [
            createDistributedPackage('dist-remove', { operation: 'remove' }),
          ],
        });

        result = callListActiveDistributions([
          addDistribution,
          failedRemoveDistribution,
        ]);
      });

      it('returns one distribution', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the failed remove distribution', () => {
        expect(result[0].id).toEqual(failedRemoveDistribution.id);
      });
    });

    describe('with add then successful remove scenario', () => {
      it('returns empty array', () => {
        const target = createTarget({ id: createTargetId('target-1') });

        const addDistribution = createDistribution({
          id: createDistributionId('dist-add'),
          createdAt: '2024-01-01T10:00:00Z',
          target,
          status: DistributionStatus.success,
          distributedPackages: [
            createDistributedPackage('dist-add', { operation: 'add' }),
          ],
        });

        const successfulRemoveDistribution = createDistribution({
          id: createDistributionId('dist-remove'),
          createdAt: '2024-01-02T10:00:00Z',
          target,
          status: DistributionStatus.success,
          distributedPackages: [
            createDistributedPackage('dist-remove', { operation: 'remove' }),
          ],
        });

        const result = callListActiveDistributions([
          addDistribution,
          successfulRemoveDistribution,
        ]);

        expect(result).toEqual([]);
      });
    });
  });
});
