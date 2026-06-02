import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MarketplaceRepository } from './MarketplaceRepository';
import { MarketplaceSchema } from '../schemas/MarketplaceSchema';
import { marketplaceFactory } from './__factories__/marketplaceFactory';
import { GitRepoSchema, GitProviderSchema } from '@packmind/git';
import { gitProviderFactory, gitRepoFactory } from '@packmind/git/test';
import {
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  UserSchema,
} from '@packmind/accounts';
import { userFactory } from '@packmind/accounts/test';
import {
  GitProvider,
  GitRepo,
  Marketplace,
  Organization,
  OrganizationId,
  User,
  createMarketplaceId,
  createOrganizationId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';

describe('MarketplaceRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    UserSchema,
    UserOrganizationMembershipSchema,
    GitProviderSchema,
    GitRepoSchema,
    MarketplaceSchema,
  ]);

  let repository: MarketplaceRepository;
  let organizationRepo: Repository<Organization>;
  let userRepo: Repository<User>;
  let gitProviderRepo: Repository<GitProvider>;
  let gitRepoRepo: Repository<GitRepo>;
  let marketplaceRepo: Repository<Marketplace>;
  let logger: jest.Mocked<PackmindLogger>;

  let organization: Organization;
  let otherOrganization: Organization;
  let user: User;
  let gitProvider: GitProvider;
  let gitRepo: GitRepo;
  let otherGitRepo: GitRepo;
  // Soft-delete spec needs a never-used (org, gitRepo) pair so the
  // unique partial index doesn't collide with rows from other tests.
  let softDeleteGitRepoId: GitRepo['id'];
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
    repository = new MarketplaceRepository(
      fixture.datasource.getRepository(MarketplaceSchema),
      logger,
    );

    organizationRepo = fixture.datasource.getRepository(OrganizationSchema);
    userRepo = fixture.datasource.getRepository(UserSchema);
    gitProviderRepo = fixture.datasource.getRepository(GitProviderSchema);
    gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
    marketplaceRepo = fixture.datasource.getRepository(MarketplaceSchema);

    organization = await createOrganization('primary');
    otherOrganization = await createOrganization('other');

    // userFactory seeds a `memberships` array referencing a fresh
    // organization id that doesn't exist in the fixture; we clear it so
    // TypeORM does not cascade-insert into UserOrganizationMembership.
    // Only the `addedBy` FK on `marketplaces` matters here.
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

    const softDeleteRepo = await gitRepoRepo.save(
      gitRepoFactory({ providerId: gitProvider.id, type: 'marketplace' }),
    );
    softDeleteGitRepoId = softDeleteRepo.id;
    const softDeleteOrg = await createOrganization('soft-delete');
    softDeleteOrganizationId = softDeleteOrg.id;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  itHandlesSoftDelete<Marketplace>({
    entityFactory: () =>
      marketplaceFactory({
        organizationId: softDeleteOrganizationId,
        gitRepoId: softDeleteGitRepoId,
        addedBy: user.id,
      }),
    getRepository: () => repository,
    queryDeletedEntity: async (id) =>
      marketplaceRepo.findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  describe('add', () => {
    it('inserts a marketplace row', async () => {
      const marketplace = marketplaceFactory({
        organizationId: organization.id,
        gitRepoId: gitRepo.id,
        addedBy: user.id,
      });

      const saved = await repository.add(marketplace);

      expect(saved).toMatchObject({
        id: marketplace.id,
        organizationId: organization.id,
        gitRepoId: gitRepo.id,
        addedBy: user.id,
        state: 'healthy',
      });
    });

    describe('persists the descriptor and pluginCount', () => {
      let marketplace: Marketplace;
      let found: Marketplace | null;

      beforeEach(async () => {
        marketplace = marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: gitRepo.id,
          addedBy: user.id,
          pluginCount: 7,
        });

        await repository.add(marketplace);
        found = await repository.findById(marketplace.id);
      });

      it('persists the descriptor', () => {
        expect(found?.descriptor).toEqual(marketplace.descriptor);
      });

      it('persists the pluginCount', () => {
        expect(found?.pluginCount).toBe(7);
      });
    });
  });

  describe('findByOrganizationId', () => {
    describe('returns marketplaces linked to the organization', () => {
      let marketplaceA: Marketplace;
      let marketplaceB: Marketplace;
      let result: Marketplace[];

      beforeEach(async () => {
        marketplaceA = marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: gitRepo.id,
          addedBy: user.id,
        });
        marketplaceB = marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: otherGitRepo.id,
          addedBy: user.id,
        });
        await repository.add(marketplaceA);
        await repository.add(marketplaceB);

        result = await repository.findByOrganizationId(organization.id);
      });

      it('returns both marketplaces', () => {
        expect(result).toHaveLength(2);
      });

      it('returns the marketplaces of the organization', () => {
        expect(result.map((m) => m.id).sort()).toEqual(
          [marketplaceA.id, marketplaceB.id].sort(),
        );
      });
    });

    describe('excludes marketplaces from other organizations', () => {
      let ours: Marketplace;
      let result: Marketplace[];

      beforeEach(async () => {
        ours = marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: gitRepo.id,
          addedBy: user.id,
        });
        const theirs = marketplaceFactory({
          organizationId: otherOrganization.id,
          gitRepoId: otherGitRepo.id,
          addedBy: user.id,
        });
        await repository.add(ours);
        await repository.add(theirs);

        result = await repository.findByOrganizationId(organization.id);
      });

      it('returns only one marketplace', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the marketplace of the organization', () => {
        expect(result[0].id).toEqual(ours.id);
      });
    });

    it('excludes soft-deleted marketplaces', async () => {
      const marketplace = await repository.add(
        marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: gitRepo.id,
          addedBy: user.id,
        }),
      );
      await repository.deleteById(marketplace.id);

      const result = await repository.findByOrganizationId(organization.id);

      expect(result).toHaveLength(0);
    });

    describe('when the organization has no marketplaces', () => {
      it('returns an empty array', async () => {
        const result = await repository.findByOrganizationId(organization.id);

        expect(result).toEqual([]);
      });
    });
  });

  describe('findByOrganizationAndGitRepo', () => {
    it('returns the marketplace matching the (org, gitRepo) pair', async () => {
      const marketplace = marketplaceFactory({
        organizationId: organization.id,
        gitRepoId: gitRepo.id,
        addedBy: user.id,
      });
      await repository.add(marketplace);

      const result = await repository.findByOrganizationAndGitRepo(
        organization.id,
        gitRepo.id,
      );

      expect(result?.id).toEqual(marketplace.id);
    });

    describe('when the gitRepo is linked to a different organization', () => {
      it('returns null', async () => {
        await repository.add(
          marketplaceFactory({
            organizationId: otherOrganization.id,
            gitRepoId: gitRepo.id,
            addedBy: user.id,
          }),
        );

        const result = await repository.findByOrganizationAndGitRepo(
          organization.id,
          gitRepo.id,
        );

        expect(result).toBeNull();
      });
    });

    describe('when the marketplace has been soft-deleted', () => {
      it('returns null', async () => {
        const marketplace = await repository.add(
          marketplaceFactory({
            organizationId: organization.id,
            gitRepoId: gitRepo.id,
            addedBy: user.id,
          }),
        );
        await repository.deleteById(marketplace.id);

        const result = await repository.findByOrganizationAndGitRepo(
          organization.id,
          gitRepo.id,
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('findByOrganizationAndId', () => {
    describe('when it belongs to the organization', () => {
      it('returns the marketplace', async () => {
        const marketplace = marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: gitRepo.id,
          addedBy: user.id,
        });
        await repository.add(marketplace);

        const result = await repository.findByOrganizationAndId(
          organization.id,
          marketplace.id,
        );

        expect(result?.id).toEqual(marketplace.id);
      });
    });

    describe('when the marketplace belongs to a different organization', () => {
      it('returns null', async () => {
        const marketplace = marketplaceFactory({
          organizationId: otherOrganization.id,
          gitRepoId: otherGitRepo.id,
          addedBy: user.id,
        });
        await repository.add(marketplace);

        const result = await repository.findByOrganizationAndId(
          organization.id,
          marketplace.id,
        );

        expect(result).toBeNull();
      });
    });

    describe('when the marketplace id does not exist', () => {
      it('returns null', async () => {
        const result = await repository.findByOrganizationAndId(
          organization.id,
          createMarketplaceId(uuidv4()),
        );

        expect(result).toBeNull();
      });
    });

    it('excludes soft-deleted marketplaces', async () => {
      const marketplace = await repository.add(
        marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: gitRepo.id,
          addedBy: user.id,
        }),
      );
      await repository.deleteById(marketplace.id);

      const result = await repository.findByOrganizationAndId(
        organization.id,
        marketplace.id,
      );

      expect(result).toBeNull();
    });
  });

  describe('findAllForReconciliation', () => {
    it('returns all marketplaces across organizations', async () => {
      const marketplaceA = marketplaceFactory({
        organizationId: organization.id,
        gitRepoId: gitRepo.id,
        addedBy: user.id,
      });
      const marketplaceB = marketplaceFactory({
        organizationId: otherOrganization.id,
        gitRepoId: otherGitRepo.id,
        addedBy: user.id,
      });
      await repository.add(marketplaceA);
      await repository.add(marketplaceB);

      const result = await repository.findAllForReconciliation();

      expect(result.map((m) => m.id).sort()).toEqual(
        [marketplaceA.id, marketplaceB.id].sort(),
      );
    });

    it('excludes soft-deleted marketplaces', async () => {
      const alive = await repository.add(
        marketplaceFactory({
          organizationId: organization.id,
          gitRepoId: gitRepo.id,
          addedBy: user.id,
        }),
      );
      const deleted = await repository.add(
        marketplaceFactory({
          organizationId: otherOrganization.id,
          gitRepoId: otherGitRepo.id,
          addedBy: user.id,
        }),
      );
      await repository.deleteById(deleted.id);

      const result = await repository.findAllForReconciliation();

      expect(result.map((m) => m.id)).toEqual([alive.id]);
    });
  });

  describe('updateState', () => {
    describe('when descriptor/pluginCount are omitted', () => {
      let marketplace: Marketplace;
      let validatedAt: Date;
      let refreshed: Marketplace | null;

      beforeEach(async () => {
        marketplace = await repository.add(
          marketplaceFactory({
            organizationId: organization.id,
            gitRepoId: gitRepo.id,
            addedBy: user.id,
            state: 'healthy',
          }),
        );
        validatedAt = new Date('2026-03-15T10:00:00.000Z');

        await repository.updateState(marketplace.id, {
          state: 'unreachable',
          lastValidatedAt: validatedAt,
        });

        refreshed = await repository.findById(marketplace.id);
      });

      it('updates state', () => {
        expect(refreshed?.state).toBe('unreachable');
      });

      it('updates lastValidatedAt', () => {
        expect(refreshed?.lastValidatedAt).toEqual(validatedAt);
      });

      it('leaves the descriptor untouched', () => {
        expect(refreshed?.descriptor).toEqual(marketplace.descriptor);
      });

      it('leaves the pluginCount untouched', () => {
        expect(refreshed?.pluginCount).toBe(marketplace.pluginCount);
      });
    });

    describe('when descriptor and pluginCount are supplied (drift case)', () => {
      let validatedAt: Date;
      let newDescriptor: {
        vendor: 'anthropic';
        name: string;
        version: string;
        plugins: { slug: string; name: string; version?: string }[];
        raw: { changed: boolean };
      };
      let refreshed: Marketplace | null;

      beforeEach(async () => {
        const marketplace = await repository.add(
          marketplaceFactory({
            organizationId: organization.id,
            gitRepoId: gitRepo.id,
            addedBy: user.id,
            state: 'healthy',
            pluginCount: 2,
          }),
        );
        validatedAt = new Date('2026-04-01T12:00:00.000Z');
        newDescriptor = {
          vendor: 'anthropic' as const,
          name: 'updated-marketplace',
          version: '2.0.0',
          plugins: [
            { slug: 'plugin-one', name: 'Plugin One', version: '2.0.0' },
            { slug: 'plugin-three', name: 'Plugin Three' },
            { slug: 'plugin-four', name: 'Plugin Four' },
          ],
          raw: { changed: true },
        };

        await repository.updateState(marketplace.id, {
          state: 'drift',
          lastValidatedAt: validatedAt,
          descriptor: newDescriptor,
          pluginCount: newDescriptor.plugins.length,
        });

        refreshed = await repository.findById(marketplace.id);
      });

      it('updates state', () => {
        expect(refreshed?.state).toBe('drift');
      });

      it('updates lastValidatedAt', () => {
        expect(refreshed?.lastValidatedAt).toEqual(validatedAt);
      });

      it('updates descriptor', () => {
        expect(refreshed?.descriptor).toEqual(newDescriptor);
      });

      it('updates pluginCount', () => {
        expect(refreshed?.pluginCount).toBe(3);
      });
    });

    describe('when the target marketplace does not exist', () => {
      it('throws', async () => {
        await expect(
          repository.updateState(createMarketplaceId(uuidv4()), {
            state: 'healthy',
            lastValidatedAt: new Date(),
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('unique (organizationId, gitRepoId) partial index', () => {
    describe('re-linking a (org, gitRepo) pair after soft-delete', () => {
      let initial: Marketplace;
      let relinked: Marketplace;
      let activeForRepo: Marketplace | null;

      beforeEach(async () => {
        initial = await repository.add(
          marketplaceFactory({
            organizationId: organization.id,
            gitRepoId: gitRepo.id,
            addedBy: user.id,
          }),
        );
        await repository.deleteById(initial.id);

        relinked = await repository.add(
          marketplaceFactory({
            organizationId: organization.id,
            gitRepoId: gitRepo.id,
            addedBy: user.id,
          }),
        );

        activeForRepo = await repository.findByOrganizationAndGitRepo(
          organization.id,
          gitRepo.id,
        );
      });

      it('creates a new marketplace distinct from the soft-deleted one', () => {
        expect(relinked.id).not.toEqual(initial.id);
      });

      it('returns the re-linked marketplace as active for the repo', () => {
        expect(activeForRepo?.id).toEqual(relinked.id);
      });
    });
  });
});
