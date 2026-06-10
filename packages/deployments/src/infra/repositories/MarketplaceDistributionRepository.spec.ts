import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MarketplaceDistributionRepository } from './MarketplaceDistributionRepository';
import { MarketplaceDistributionSchema } from '../schemas/MarketplaceDistributionSchema';
import { MarketplaceSchema } from '../schemas/MarketplaceSchema';
import { PackageSchema } from '../schemas/PackageSchema';
import { marketplaceDistributionFactory } from './__factories__/marketplaceDistributionFactory';
import { marketplaceFactory } from './__factories__/marketplaceFactory';
import { packageFactory } from '../../../test/packageFactory';
import {
  GitRepoSchema,
  GitProviderSchema,
  OrganizationGitHubAppSchema,
} from '@packmind/git';
import { gitProviderFactory, gitRepoFactory } from '@packmind/git/test';
import {
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  UserSchema,
} from '@packmind/accounts';
import { userFactory } from '@packmind/accounts/test';
import {
  DistributionStatus,
  GitProvider,
  GitRepo,
  Marketplace,
  MarketplaceDistribution,
  Organization,
  OrganizationId,
  Package,
  PublishFailureReason,
  User,
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';

describe('MarketplaceDistributionRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    UserSchema,
    UserOrganizationMembershipSchema,
    OrganizationGitHubAppSchema,
    GitProviderSchema,
    GitRepoSchema,
    MarketplaceSchema,
    PackageSchema,
    MarketplaceDistributionSchema,
  ]);

  let repository: MarketplaceDistributionRepository;
  let organizationRepo: Repository<Organization>;
  let userRepo: Repository<User>;
  let gitProviderRepo: Repository<GitProvider>;
  let gitRepoRepo: Repository<GitRepo>;
  let marketplaceRepo: Repository<Marketplace>;
  let packageRepo: Repository<Package>;
  let marketplaceDistributionRepo: Repository<MarketplaceDistribution>;
  let logger: jest.Mocked<PackmindLogger>;

  let organization: Organization;
  let user: User;
  let gitProvider: GitProvider;
  let gitRepo: GitRepo;
  let otherGitRepo: GitRepo;
  let marketplace: Marketplace;
  let otherMarketplace: Marketplace;
  let pkg: Package;
  let otherPackage: Package;

  // Soft-delete spec needs a never-used row so it can be deleted/restored
  // without interfering with the other tests.
  let softDeletePackageId: Package['id'];
  let softDeleteMarketplaceId: Marketplace['id'];
  let softDeleteOrganizationId: OrganizationId;

  beforeAll(() => fixture.initialize());

  const createOrganization = async (slugSuffix: string) =>
    organizationRepo.save({
      id: createOrganizationId(uuidv4()),
      name: `Org ${slugSuffix}`,
      slug: `org-${slugSuffix}-${uuidv4()}`,
    });

  beforeEach(async () => {
    logger = stubLogger();
    repository = new MarketplaceDistributionRepository(
      fixture.datasource.getRepository(MarketplaceDistributionSchema),
      logger,
    );

    organizationRepo = fixture.datasource.getRepository(OrganizationSchema);
    userRepo = fixture.datasource.getRepository(UserSchema);
    gitProviderRepo = fixture.datasource.getRepository(GitProviderSchema);
    gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
    marketplaceRepo = fixture.datasource.getRepository(MarketplaceSchema);
    packageRepo = fixture.datasource.getRepository(PackageSchema);
    marketplaceDistributionRepo = fixture.datasource.getRepository(
      MarketplaceDistributionSchema,
    );

    organization = await createOrganization('primary');

    user = await userRepo.save(userFactory({ memberships: [] }));

    gitProvider = await gitProviderRepo.save(
      gitProviderFactory({ organizationId: organization.id }),
    );

    gitRepo = await gitRepoRepo.save(
      gitRepoFactory({ providerId: gitProvider.id, type: 'marketplace' }),
    );
    otherGitRepo = await gitRepoRepo.save(
      gitRepoFactory({ providerId: gitProvider.id, type: 'marketplace' }),
    );

    marketplace = await marketplaceRepo.save(
      marketplaceFactory({
        organizationId: organization.id,
        gitRepoId: gitRepo.id,
        addedBy: user.id,
      }),
    );
    otherMarketplace = await marketplaceRepo.save(
      marketplaceFactory({
        organizationId: organization.id,
        gitRepoId: otherGitRepo.id,
        addedBy: user.id,
      }),
    );

    pkg = await packageRepo.save(
      packageFactory({
        createdBy: user.id,
      }),
    );
    otherPackage = await packageRepo.save(
      packageFactory({
        createdBy: user.id,
      }),
    );

    // Soft-delete spec uses a fresh marketplace/package pair so it can be
    // safely deleted/restored without colliding with the other tests.
    const softDeleteOrg = await createOrganization('soft-delete');
    softDeleteOrganizationId = softDeleteOrg.id;
    const softDeleteGitRepo = await gitRepoRepo.save(
      gitRepoFactory({ providerId: gitProvider.id, type: 'marketplace' }),
    );
    const softDeleteMarketplace = await marketplaceRepo.save(
      marketplaceFactory({
        organizationId: softDeleteOrg.id,
        gitRepoId: softDeleteGitRepo.id,
        addedBy: user.id,
      }),
    );
    softDeleteMarketplaceId = softDeleteMarketplace.id;
    const softDeletePackage = await packageRepo.save(
      packageFactory({
        createdBy: user.id,
      }),
    );
    softDeletePackageId = softDeletePackage.id;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  itHandlesSoftDelete<MarketplaceDistribution>({
    entityFactory: () =>
      marketplaceDistributionFactory({
        organizationId: softDeleteOrganizationId,
        marketplaceId: softDeleteMarketplaceId,
        packageId: softDeletePackageId,
        authorId: user.id,
      }),
    getRepository: () => repository,
    queryDeletedEntity: async (id) =>
      marketplaceDistributionRepo.findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  describe('add', () => {
    it('inserts a marketplace distribution row', async () => {
      const distribution = marketplaceDistributionFactory({
        organizationId: organization.id,
        marketplaceId: marketplace.id,
        packageId: pkg.id,
        authorId: user.id,
        pluginSlug: 'my-plugin',
      });

      const saved = await repository.add(distribution);

      expect(saved).toMatchObject({
        id: distribution.id,
        organizationId: organization.id,
        marketplaceId: marketplace.id,
        packageId: pkg.id,
        authorId: user.id,
        pluginSlug: 'my-plugin',
        status: DistributionStatus.in_progress,
        source: 'app',
      });
    });

    describe('when nullable side-channel columns are omitted', () => {
      let found: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distribution = marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        });

        await repository.add(distribution);
        found = await repository.findById(distribution.id);
      });

      it('persists prUrl as falsy', async () => {
        expect(found?.prUrl).toBeFalsy();
      });

      it('persists gitCommit as falsy', async () => {
        expect(found?.gitCommit).toBeFalsy();
      });

      it('persists error as falsy', async () => {
        expect(found?.error).toBeFalsy();
      });

      it('persists failureReason as falsy', async () => {
        expect(found?.failureReason).toBeFalsy();
      });

      it('persists contentHash as falsy', async () => {
        expect(found?.contentHash).toBeFalsy();
      });
    });
  });

  describe('findById', () => {
    describe('when the row exists', () => {
      it('returns the row', async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );

        const result = await repository.findById(distribution.id);

        expect(result?.id).toEqual(distribution.id);
      });
    });

    it('returns null for an unknown id', async () => {
      const result = await repository.findById(
        createMarketplaceDistributionId(uuidv4()),
      );

      expect(result).toBeNull();
    });
  });

  describe('findByMarketplaceId', () => {
    it('returns distributions targeting the marketplace ordered desc by createdAt', async () => {
      const first = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      const second = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: otherPackage.id,
          authorId: user.id,
        }),
      );

      const result = await repository.findByMarketplaceId(marketplace.id);

      expect(result.map((row) => row.id).sort()).toEqual(
        [first.id, second.id].sort(),
      );
    });

    describe('when other marketplaces have distributions', () => {
      let ours: MarketplaceDistribution;
      let result: MarketplaceDistribution[];

      beforeEach(async () => {
        ours = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: otherMarketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );

        result = await repository.findByMarketplaceId(marketplace.id);
      });

      it('returns only the requested marketplace distributions', async () => {
        expect(result).toHaveLength(1);
      });

      it('returns the distribution belonging to the requested marketplace', async () => {
        expect(result[0].id).toEqual(ours.id);
      });
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      await repository.deleteById(distribution.id);

      const result = await repository.findByMarketplaceId(marketplace.id);

      expect(result).toEqual([]);
    });

    describe('when the marketplace has no distributions', () => {
      it('returns an empty array', async () => {
        const result = await repository.findByMarketplaceId(
          createMarketplaceId(uuidv4()),
        );

        expect(result).toEqual([]);
      });
    });
  });

  describe('findByPackageId', () => {
    it('returns every distribution for a package across marketplaces', async () => {
      const onMarketplaceA = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      const onMarketplaceB = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: otherMarketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );

      const result = await repository.findByPackageId(pkg.id);

      expect(result.map((row) => row.id).sort()).toEqual(
        [onMarketplaceA.id, onMarketplaceB.id].sort(),
      );
    });

    describe('when other packages have distributions', () => {
      let ours: MarketplaceDistribution;
      let result: MarketplaceDistribution[];

      beforeEach(async () => {
        ours = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: otherPackage.id,
            authorId: user.id,
          }),
        );

        result = await repository.findByPackageId(pkg.id);
      });

      it('returns only the requested package distributions', async () => {
        expect(result).toHaveLength(1);
      });

      it('returns the distribution belonging to the requested package', async () => {
        expect(result[0].id).toEqual(ours.id);
      });
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      await repository.deleteById(distribution.id);

      const result = await repository.findByPackageId(pkg.id);

      expect(result).toEqual([]);
    });

    describe('when the package has no distributions', () => {
      it('returns an empty array', async () => {
        const result = await repository.findByPackageId(
          createPackageId(uuidv4()),
        );

        expect(result).toEqual([]);
      });
    });
  });

  describe('findLatestByPackageAndMarketplace', () => {
    it('returns the most-recent distribution for the (package, marketplace) pair', async () => {
      await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      // Insert a small wait so createdAt differs.
      await new Promise((resolve) => setTimeout(resolve, 10));
      const latest = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );

      const result = await repository.findLatestByPackageAndMarketplace(
        pkg.id,
        marketplace.id,
      );

      expect(result?.id).toEqual(latest.id);
    });

    describe('when no distribution targets the pair', () => {
      it('returns null', async () => {
        const result = await repository.findLatestByPackageAndMarketplace(
          pkg.id,
          marketplace.id,
        );

        expect(result).toBeNull();
      });
    });

    it('ignores distributions from other (package, marketplace) pairs', async () => {
      const ours = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: otherMarketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: otherPackage.id,
          authorId: user.id,
        }),
      );

      const result = await repository.findLatestByPackageAndMarketplace(
        pkg.id,
        marketplace.id,
      );

      expect(result?.id).toEqual(ours.id);
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
        }),
      );
      await repository.deleteById(distribution.id);

      const result = await repository.findLatestByPackageAndMarketplace(
        pkg.id,
        marketplace.id,
      );

      expect(result).toBeNull();
    });
  });

  describe('findLatestSuccessfulByPackageAndMarketplace', () => {
    describe('when both success and non-success rows exist', () => {
      let latest: MarketplaceDistribution;
      let older: MarketplaceDistribution;
      let result: MarketplaceDistribution | null;

      beforeEach(async () => {
        // First, an in-progress row that must be ignored.
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );
        // Then a success-state row.
        older = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );
        // Wait so createdAt orderings are distinct.
        await new Promise((resolve) => setTimeout(resolve, 10));
        latest = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );

        result = await repository.findLatestSuccessfulByPackageAndMarketplace(
          pkg.id,
          marketplace.id,
        );
      });

      it('returns the most recent success-state row for the pair', () => {
        expect(result?.id).toEqual(latest.id);
      });

      it('does not return any earlier success-state row', () => {
        expect(result?.id).not.toEqual(older.id);
      });
    });

    describe('when no success-state distribution exists', () => {
      it('returns null even if other statuses exist', async () => {
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.failure,
          }),
        );

        const result =
          await repository.findLatestSuccessfulByPackageAndMarketplace(
            pkg.id,
            marketplace.id,
          );

        expect(result).toBeNull();
      });
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.success,
        }),
      );
      await repository.deleteById(distribution.id);

      const result =
        await repository.findLatestSuccessfulByPackageAndMarketplace(
          pkg.id,
          marketplace.id,
        );

      expect(result).toBeNull();
    });
  });

  describe('findActiveByPackageId', () => {
    it('returns only success-state distributions for the package', async () => {
      const liveA = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.success,
        }),
      );
      const liveB = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: otherMarketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.success,
        }),
      );
      // Non-success row — must be excluded.
      await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.to_be_removed,
        }),
      );

      const result = await repository.findActiveByPackageId(pkg.id);

      expect(result.map((row) => row.id).sort()).toEqual(
        [liveA.id, liveB.id].sort(),
      );
    });

    describe('when no success-state distribution exists', () => {
      it('returns an empty array', async () => {
        const result = await repository.findActiveByPackageId(pkg.id);
        expect(result).toEqual([]);
      });
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.success,
        }),
      );
      await repository.deleteById(distribution.id);

      const result = await repository.findActiveByPackageId(pkg.id);

      expect(result).toEqual([]);
    });
  });

  describe('findPendingRemovalsByMarketplaceId', () => {
    describe('with mixed status and marketplace rows', () => {
      let pending: MarketplaceDistribution;
      let result: MarketplaceDistribution[];

      beforeEach(async () => {
        pending = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.to_be_removed,
          }),
        );
        // Other status — must be excluded.
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );
        // Pending on a different marketplace — must be excluded.
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: otherMarketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.to_be_removed,
          }),
        );

        result = await repository.findPendingRemovalsByMarketplaceId(
          marketplace.id,
        );
      });

      it('returns exactly one row', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the pending row for the requested marketplace', () => {
        expect(result[0].id).toEqual(pending.id);
      });
    });

    describe('when no pending removal exists', () => {
      it('returns an empty array', async () => {
        const result = await repository.findPendingRemovalsByMarketplaceId(
          marketplace.id,
        );
        expect(result).toEqual([]);
      });
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.to_be_removed,
        }),
      );
      await repository.deleteById(distribution.id);

      const result = await repository.findPendingRemovalsByMarketplaceId(
        marketplace.id,
      );

      expect(result).toEqual([]);
    });
  });

  describe('findPendingMergesByMarketplaceId', () => {
    describe('with mixed status and marketplace rows', () => {
      let pendingMerge: MarketplaceDistribution;
      let result: MarketplaceDistribution[];

      beforeEach(async () => {
        pendingMerge = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.pending_merge,
          }),
        );
        // Other status — must be excluded.
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );
        // Pending merge on a different marketplace — must be excluded.
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: otherMarketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.pending_merge,
          }),
        );

        result = await repository.findPendingMergesByMarketplaceId(
          marketplace.id,
        );
      });

      it('returns exactly one row', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the pending-merge row for the requested marketplace', () => {
        expect(result[0].id).toEqual(pendingMerge.id);
      });
    });

    describe('when no pending merge exists', () => {
      it('returns an empty array', async () => {
        const result = await repository.findPendingMergesByMarketplaceId(
          marketplace.id,
        );
        expect(result).toEqual([]);
      });
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.pending_merge,
        }),
      );
      await repository.deleteById(distribution.id);

      const result = await repository.findPendingMergesByMarketplaceId(
        marketplace.id,
      );

      expect(result).toEqual([]);
    });
  });

  describe('findSuccessfulByMarketplaceId', () => {
    describe('with mixed status and marketplace rows', () => {
      let success: MarketplaceDistribution;
      let result: MarketplaceDistribution[];

      beforeEach(async () => {
        success = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );
        // Non-success — must be excluded.
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.to_be_removed,
          }),
        );
        // Success on a different marketplace — must be excluded.
        await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: otherMarketplace.id,
            packageId: otherPackage.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );

        result = await repository.findSuccessfulByMarketplaceId(marketplace.id);
      });

      it('returns exactly one row', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the success row for the requested marketplace', () => {
        expect(result[0].id).toEqual(success.id);
      });
    });

    describe('when no success-state distribution exists', () => {
      it('returns an empty array', async () => {
        const result = await repository.findSuccessfulByMarketplaceId(
          marketplace.id,
        );
        expect(result).toEqual([]);
      });
    });

    it('excludes soft-deleted distributions', async () => {
      const distribution = await repository.add(
        marketplaceDistributionFactory({
          organizationId: organization.id,
          marketplaceId: marketplace.id,
          packageId: pkg.id,
          authorId: user.id,
          status: DistributionStatus.success,
        }),
      );
      await repository.deleteById(distribution.id);

      const result = await repository.findSuccessfulByMarketplaceId(
        marketplace.id,
      );

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    describe('when status is set to success with side-channel fields', () => {
      let refreshed: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );

        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.success,
          prUrl: 'https://example.com/pr/1',
          gitCommit: 'abc123',
          contentHash: 'hash-1',
        });

        refreshed = await repository.findById(distribution.id);
      });

      it('writes the success status', async () => {
        expect(refreshed?.status).toBe(DistributionStatus.success);
      });

      it('writes the prUrl', async () => {
        expect(refreshed?.prUrl).toBe('https://example.com/pr/1');
      });

      it('writes the gitCommit', async () => {
        expect(refreshed?.gitCommit).toBe('abc123');
      });

      it('writes the contentHash', async () => {
        expect(refreshed?.contentHash).toBe('hash-1');
      });

      it('leaves error falsy', async () => {
        expect(refreshed?.error).toBeFalsy();
      });

      it('leaves failureReason falsy', async () => {
        expect(refreshed?.failureReason).toBeFalsy();
      });

      it('leaves publishConfirmedAt falsy', async () => {
        expect(refreshed?.publishConfirmedAt).toBeFalsy();
      });
    });

    describe('when a pending_merge row is promoted to success with publishConfirmedAt', () => {
      const confirmedAt = new Date('2026-06-10T12:00:00Z');
      let refreshed: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.pending_merge,
          }),
        );

        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.success,
          publishConfirmedAt: confirmedAt,
        });

        refreshed = await repository.findById(distribution.id);
      });

      it('writes the success status', async () => {
        expect(refreshed?.status).toBe(DistributionStatus.success);
      });

      it('writes the publishConfirmedAt stamp', async () => {
        expect(refreshed?.publishConfirmedAt).toEqual(confirmedAt);
      });
    });

    describe('when status is set to failure with error and failureReason', () => {
      const failureReason: PublishFailureReason = 'name_conflict_unmanaged';
      let refreshed: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );

        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.failure,
          error: 'collision',
          failureReason,
        });

        refreshed = await repository.findById(distribution.id);
      });

      it('writes the failure status', async () => {
        expect(refreshed?.status).toBe(DistributionStatus.failure);
      });

      it('writes the error message', async () => {
        expect(refreshed?.error).toBe('collision');
      });

      it('writes the failure reason', async () => {
        expect(refreshed?.failureReason).toBe(failureReason);
      });
    });

    describe('when patch fields are omitted on a follow-up update', () => {
      let refreshed: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
          }),
        );

        // First update sets prUrl + contentHash
        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.success,
          prUrl: 'https://example.com/pr/1',
          contentHash: 'hash-1',
        });

        // Second update changes status only — prUrl + contentHash must remain.
        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.no_changes,
        });

        refreshed = await repository.findById(distribution.id);
      });

      it('updates the status to the new value', async () => {
        expect(refreshed?.status).toBe(DistributionStatus.no_changes);
      });

      it('preserves the previously written prUrl', async () => {
        expect(refreshed?.prUrl).toBe('https://example.com/pr/1');
      });

      it('preserves the previously written contentHash', async () => {
        expect(refreshed?.contentHash).toBe('hash-1');
      });
    });

    describe('when the target distribution does not exist', () => {
      it('throws', async () => {
        await expect(
          repository.updateStatus(createMarketplaceDistributionId(uuidv4()), {
            status: DistributionStatus.failure,
          }),
        ).rejects.toThrow();
      });
    });

    describe('removal lifecycle transitions', () => {
      it('transitions success → to_be_removed', async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );

        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.to_be_removed,
        });

        const refreshed = await repository.findById(distribution.id);
        expect(refreshed?.status).toBe(DistributionStatus.to_be_removed);
      });

      it('transitions to_be_removed → success (cancellation)', async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.to_be_removed,
          }),
        );

        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.success,
        });

        const refreshed = await repository.findById(distribution.id);
        expect(refreshed?.status).toBe(DistributionStatus.success);
      });

      it('transitions to_be_removed → removed (terminal)', async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.to_be_removed,
          }),
        );

        await repository.updateStatus(distribution.id, {
          status: DistributionStatus.removed,
        });

        const refreshed = await repository.findById(distribution.id);
        expect(refreshed?.status).toBe(DistributionStatus.removed);
      });
    });
  });

  describe('updateRemovalRequestedAt', () => {
    describe('when a removal request marker is set', () => {
      let refreshed: MarketplaceDistribution | null;
      const requestedAt = new Date('2026-06-10T12:00:00.000Z');

      beforeEach(async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
          }),
        );

        await repository.updateRemovalRequestedAt(distribution.id, requestedAt);

        refreshed = await repository.findById(distribution.id);
      });

      it('persists the removalRequestedAt timestamp', async () => {
        expect(refreshed?.removalRequestedAt).toEqual(requestedAt);
      });

      it('leaves the status untouched', async () => {
        expect(refreshed?.status).toBe(DistributionStatus.success);
      });
    });

    describe('when the marker is cleared', () => {
      let refreshed: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distribution = await repository.add(
          marketplaceDistributionFactory({
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            packageId: pkg.id,
            authorId: user.id,
            status: DistributionStatus.success,
            removalRequestedAt: new Date('2026-06-10T12:00:00.000Z'),
          }),
        );

        await repository.updateRemovalRequestedAt(distribution.id, null);

        refreshed = await repository.findById(distribution.id);
      });

      it('nulls the removalRequestedAt timestamp', async () => {
        expect(refreshed?.removalRequestedAt).toBeNull();
      });
    });

    describe('when the target distribution does not exist', () => {
      it('throws', async () => {
        await expect(
          repository.updateRemovalRequestedAt(
            createMarketplaceDistributionId(uuidv4()),
            new Date('2026-06-10T12:00:00.000Z'),
          ),
        ).rejects.toThrow();
      });
    });
  });
});
