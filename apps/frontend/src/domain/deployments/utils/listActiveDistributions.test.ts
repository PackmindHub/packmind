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
    it('returns distribution when last operation is add', () => {
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
            operation: 'add',
          },
        ],
      });

      const result = callListActiveDistributions([distribution]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(distribution.id);
    });

    it('returns empty when last operation is remove', () => {
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

  describe('with multiple distributions for same target', () => {
    const targetId = createTargetId('target-1');
    const target = createTarget({ id: targetId });

    it('returns latest distribution when last operation is add', () => {
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

      const newerDistribution = createDistribution({
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

      const result = callListActiveDistributions([
        olderDistribution,
        newerDistribution,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(newerDistribution.id);
    });

    it('returns empty when last operation is remove after add', () => {
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

    it('returns distribution when add follows remove', () => {
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

      const addDistribution = createDistribution({
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

      const result = callListActiveDistributions([
        removeDistribution,
        addDistribution,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(addDistribution.id);
    });
  });

  describe('with multiple targets', () => {
    const target1 = createTarget({ id: createTargetId('target-1') });
    const target2 = createTarget({ id: createTargetId('target-2') });

    it('returns distributions for all active targets', () => {
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

      const result = callListActiveDistributions([dist1, dist2]);

      expect(result).toHaveLength(2);
      expect(result.map((d) => d.target.id)).toContain(target1.id);
      expect(result.map((d) => d.target.id)).toContain(target2.id);
    });

    it('filters out targets with remove as last operation', () => {
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

      const result = callListActiveDistributions([
        activeTarget1,
        removedTarget2,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].target.id).toEqual(target1.id);
    });

    it('handles mixed history across targets', () => {
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

      const target2Add = createDistribution({
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

      const result = callListActiveDistributions([
        target1Add,
        target1Remove,
        target2Remove,
        target2Add,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].target.id).toEqual(target2.id);
      expect(result[0].id).toEqual(target2Add.id);
    });
  });

  describe('with distribution status handling', () => {
    it('returns distribution when add operation succeeded', () => {
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

    it('returns distribution when add operation has no_changes status', () => {
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

    it('returns empty when add operation failed', () => {
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

    it('returns empty when remove operation succeeded', () => {
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

    it('returns distribution when remove operation failed (package still deployed)', () => {
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

    it('handles add then failed remove scenario', () => {
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

      const failedRemoveDistribution = createDistribution({
        id: createDistributionId('dist-remove'),
        createdAt: '2024-01-02T10:00:00Z',
        target,
        status: DistributionStatus.failure,
        distributedPackages: [
          createDistributedPackage('dist-remove', { operation: 'remove' }),
        ],
      });

      const result = callListActiveDistributions([
        addDistribution,
        failedRemoveDistribution,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(failedRemoveDistribution.id);
    });

    it('handles add then successful remove scenario', () => {
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
