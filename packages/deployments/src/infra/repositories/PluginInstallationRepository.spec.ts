import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  PluginInstallationRepository,
  normalizeRepoSlug,
} from './PluginInstallationRepository';
import { MarketplaceRepository } from './MarketplaceRepository';
import { PluginInstallationSchema } from '../schemas/PluginInstallationSchema';
import { MarketplaceSchema } from '../schemas/MarketplaceSchema';
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
  GitProvider,
  GitRepo,
  Marketplace,
  Organization,
  PluginInstallation,
  User,
  createOrganizationId,
  createPluginInstallationId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { marketplaceFactory } from './__factories__/marketplaceFactory';
import { UpsertHeartbeatInput } from '../../domain/repositories/IPluginInstallationRepository';

describe('PluginInstallationRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    UserSchema,
    UserOrganizationMembershipSchema,
    OrganizationGitHubAppSchema,
    GitProviderSchema,
    GitRepoSchema,
    MarketplaceSchema,
    PluginInstallationSchema,
  ]);

  let repository: PluginInstallationRepository;
  let marketplaceRepository: MarketplaceRepository;
  let organizationRepo: Repository<Organization>;
  let userRepo: Repository<User>;
  let gitProviderRepo: Repository<GitProvider>;
  let gitRepoRepo: Repository<GitRepo>;
  let rawInstallationRepo: Repository<PluginInstallation>;
  let logger: jest.Mocked<PackmindLogger>;

  let organization: Organization;
  let user: User;
  let gitProvider: GitProvider;
  let gitRepo: GitRepo;
  let marketplace: Marketplace;

  const NOW = new Date('2026-06-01T10:00:00.000Z');
  const LATER = new Date('2026-06-15T10:00:00.000Z');

  // Use real UUIDs for userId (uuid column in pg-mem)
  const USER_UUID_A = uuidv4();
  const USER_UUID_UPGRADE = uuidv4();
  const USER_UUID_MERGE = uuidv4();
  const USER_UUID_EDGE2 = uuidv4();

  const createOrganization = async () =>
    organizationRepo.save({
      id: createOrganizationId(uuidv4()),
      name: `Org ${uuidv4()}`,
      slug: `org-${uuidv4()}`,
    });

  function makeInput(
    overrides: Partial<UpsertHeartbeatInput> = {},
  ): UpsertHeartbeatInput {
    return {
      id: createPluginInstallationId(uuidv4()),
      organizationId: organization.id,
      marketplaceId: marketplace.id,
      pluginSlug: 'test-plugin',
      packageId: null,
      installedVersion: null,
      scope: 'user',
      userId: null,
      anonymousIdHash: null,
      anonymousEmailMasked: null,
      repoRemoteUrl: null,
      now: NOW,
      ...overrides,
    };
  }

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    logger = stubLogger();
    repository = new PluginInstallationRepository(
      fixture.datasource.getRepository(PluginInstallationSchema),
      logger,
    );
    marketplaceRepository = new MarketplaceRepository(
      fixture.datasource.getRepository(MarketplaceSchema),
      logger,
    );

    organizationRepo = fixture.datasource.getRepository(OrganizationSchema);
    userRepo = fixture.datasource.getRepository(UserSchema);
    gitProviderRepo = fixture.datasource.getRepository(GitProviderSchema);
    gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
    rawInstallationRepo = fixture.datasource.getRepository(
      PluginInstallationSchema,
    );

    organization = await createOrganization();
    user = await userRepo.save(userFactory({ memberships: [] }));
    gitProvider = await gitProviderRepo.save(
      gitProviderFactory({ organizationId: organization.id }),
    );
    gitRepo = await gitRepoRepo.save(
      gitRepoFactory({ providerId: gitProvider.id, type: 'marketplace' }),
    );
    marketplace = await marketplaceRepository.add(
      marketplaceFactory({
        organizationId: organization.id,
        gitRepoId: gitRepo.id,
        addedBy: user.id,
        trackingToken: uuidv4(),
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  // ---------------------------------------------------------------------------
  // Basic create
  // ---------------------------------------------------------------------------

  describe('upsertHeartbeat', () => {
    describe('when no row exists for the unique key', () => {
      it('inserts a new row and returns created=true', async () => {
        const input = makeInput({
          anonymousIdHash: 'abc123hash',
          scope: 'user',
        });

        const result = await repository.upsertHeartbeat(input);

        expect(result.created).toBe(true);
      });

      it('persists the correct pluginSlug', async () => {
        const input = makeInput({ anonymousIdHash: 'abc123hash' });

        const result = await repository.upsertHeartbeat(input);

        expect(result.installation.pluginSlug).toBe('test-plugin');
      });

      it('sets createdAt to now', async () => {
        const input = makeInput({ anonymousIdHash: 'abc123hash' });

        const result = await repository.upsertHeartbeat(input);

        expect(result.installation.createdAt).toEqual(NOW);
      });

      it('sets updatedAt to now', async () => {
        const input = makeInput({ anonymousIdHash: 'abc123hash' });

        const result = await repository.upsertHeartbeat(input);

        expect(result.installation.updatedAt).toEqual(NOW);
      });
    });

    // -------------------------------------------------------------------------
    // Absent-field key rule: identity-less heartbeats collapse into one row
    // -------------------------------------------------------------------------

    describe('when identity fields are absent (identity-less heartbeat)', () => {
      it('uses empty string as identityKey', async () => {
        const input = makeInput({
          userId: null,
          anonymousIdHash: null,
          scope: 'user',
        });

        await repository.upsertHeartbeat(input);

        const rows = await rawInstallationRepo.find();
        expect(rows[0].identityKey).toBe('');
      });

      it('collapses two identity-less heartbeats into one row', async () => {
        const input1 = makeInput({
          userId: null,
          anonymousIdHash: null,
          scope: 'user',
        });
        const input2 = makeInput({
          id: createPluginInstallationId(uuidv4()),
          userId: null,
          anonymousIdHash: null,
          scope: 'user',
          now: LATER,
        });

        await repository.upsertHeartbeat(input1);
        await repository.upsertHeartbeat(input2);

        const rows = await rawInstallationRepo.find();
        expect(rows).toHaveLength(1);
      });
    });

    describe('when repo fields are absent for project scope', () => {
      it('uses empty string as repoKey', async () => {
        const input = makeInput({
          scope: 'project',
          userId: USER_UUID_A,
          repoRemoteUrl: null,
        });

        await repository.upsertHeartbeat(input);

        const rows = await rawInstallationRepo.find();
        expect(rows[0].repoKey).toBe('');
      });
    });

    describe('when user scope is used', () => {
      it('always sets repoKey to empty string regardless of repo fields', async () => {
        const input = makeInput({
          scope: 'user',
          userId: USER_UUID_A,
          repoRemoteUrl: 'https://github.com/acme/frontend.git',
        });

        await repository.upsertHeartbeat(input);

        const rows = await rawInstallationRepo.find();
        expect(rows[0].repoKey).toBe('');
      });

      it('does not track the repository (repoRemoteUrl is null)', async () => {
        const input = makeInput({
          scope: 'user',
          userId: USER_UUID_A,
          repoRemoteUrl: 'https://github.com/acme/frontend.git',
        });

        await repository.upsertHeartbeat(input);

        const rows = await rawInstallationRepo.find();
        expect(rows[0].repoRemoteUrl).toBeNull();
      });
    });

    describe('when project scope is used', () => {
      it('tracks the repository (repoRemoteUrl is persisted)', async () => {
        const input = makeInput({
          scope: 'project',
          userId: USER_UUID_A,
          repoRemoteUrl: 'https://github.com/acme/frontend.git',
        });

        await repository.upsertHeartbeat(input);

        const rows = await rawInstallationRepo.find();
        expect(rows[0].repoRemoteUrl).toBe(
          'https://github.com/acme/frontend.git',
        );
      });
    });

    // -------------------------------------------------------------------------
    // lastSeen bump
    // -------------------------------------------------------------------------

    describe('when the same heartbeat arrives again (lastSeen bump)', () => {
      let firstResult: Awaited<ReturnType<typeof repository.upsertHeartbeat>>;
      let secondResult: Awaited<ReturnType<typeof repository.upsertHeartbeat>>;

      beforeEach(async () => {
        firstResult = await repository.upsertHeartbeat(
          makeInput({ anonymousIdHash: 'hash-repeat' }),
        );
        secondResult = await repository.upsertHeartbeat(
          makeInput({
            id: createPluginInstallationId(uuidv4()),
            anonymousIdHash: 'hash-repeat',
            now: LATER,
          }),
        );
      });

      it('does not create a new row', async () => {
        expect(secondResult.created).toBe(false);
      });

      it('preserves createdAt', () => {
        expect(secondResult.installation.createdAt).toEqual(
          firstResult.installation.createdAt,
        );
      });

      it('bumps updatedAt', () => {
        expect(secondResult.installation.updatedAt).toEqual(LATER);
      });

      it('keeps exactly one row in the database', async () => {
        const rows = await rawInstallationRepo.find();
        expect(rows).toHaveLength(1);
      });
    });

    // -------------------------------------------------------------------------
    // installedVersion
    // -------------------------------------------------------------------------

    describe('installedVersion', () => {
      describe('when a heartbeat reports an installed version', () => {
        it('persists the reported version on insert', async () => {
          const input = makeInput({
            anonymousIdHash: 'hash-version',
            installedVersion: '0.1.0',
          });

          const result = await repository.upsertHeartbeat(input);

          expect(result.installation.installedVersion).toBe('0.1.0');
        });
      });

      describe('when a later heartbeat reports a different version', () => {
        let secondResult: Awaited<
          ReturnType<typeof repository.upsertHeartbeat>
        >;

        beforeEach(async () => {
          await repository.upsertHeartbeat(
            makeInput({
              anonymousIdHash: 'hash-upgrade-version',
              installedVersion: '0.1.0',
            }),
          );
          secondResult = await repository.upsertHeartbeat(
            makeInput({
              id: createPluginInstallationId(uuidv4()),
              anonymousIdHash: 'hash-upgrade-version',
              installedVersion: '0.2.0',
              now: LATER,
            }),
          );
        });

        it('refreshes installedVersion to the latest reported value', () => {
          expect(secondResult.installation.installedVersion).toBe('0.2.0');
        });

        it('keeps exactly one row in the database', async () => {
          const rows = await rawInstallationRepo.find();
          expect(rows).toHaveLength(1);
        });
      });

      describe('when the heartbeat omits a version', () => {
        it('stores null', async () => {
          const input = makeInput({
            anonymousIdHash: 'hash-no-version',
            installedVersion: null,
          });

          const result = await repository.upsertHeartbeat(input);

          expect(result.installation.installedVersion).toBeNull();
        });
      });
    });

    // -------------------------------------------------------------------------
    // Anonymous → attributed upgrade
    // -------------------------------------------------------------------------

    describe('anonymous to attributed upgrade', () => {
      const ANON_HASH = 'sha256-anon-hash';
      const USER_ID = USER_UUID_UPGRADE;

      describe('when an anonymous row exists and an attributed heartbeat arrives', () => {
        let anonResult: Awaited<ReturnType<typeof repository.upsertHeartbeat>>;
        let upgradeResult: Awaited<
          ReturnType<typeof repository.upsertHeartbeat>
        >;

        beforeEach(async () => {
          anonResult = await repository.upsertHeartbeat(
            makeInput({ anonymousIdHash: ANON_HASH }),
          );
          upgradeResult = await repository.upsertHeartbeat(
            makeInput({
              id: createPluginInstallationId(uuidv4()),
              userId: USER_ID,
              anonymousIdHash: ANON_HASH,
              now: LATER,
            }),
          );
        });

        it('does not create a new row', () => {
          expect(upgradeResult.created).toBe(false);
        });

        it('preserves createdAt from the anonymous row', () => {
          expect(upgradeResult.installation.createdAt).toEqual(
            anonResult.installation.createdAt,
          );
        });

        it('upgrades identityKey to userId', async () => {
          const rows = await rawInstallationRepo.find();
          expect(rows[0].identityKey).toBe(USER_ID);
        });

        it('keeps exactly one row in the database', async () => {
          const rows = await rawInstallationRepo.find();
          expect(rows).toHaveLength(1);
        });
      });
    });

    // -------------------------------------------------------------------------
    // Edge case 1: both attributed + anonymous rows exist (merge)
    // -------------------------------------------------------------------------

    describe('edge case 1: merge when both attributed and anonymous rows exist', () => {
      const ANON_HASH = 'sha256-merge-hash';
      const USER_ID = USER_UUID_MERGE;
      const EARLIER = new Date('2026-05-01T10:00:00.000Z');

      describe('when credentials expired causing an anonymous row after an attributed one', () => {
        let mergeResult: Awaited<ReturnType<typeof repository.upsertHeartbeat>>;

        beforeEach(async () => {
          // Attributed row created first
          await repository.upsertHeartbeat(
            makeInput({
              userId: USER_ID,
              anonymousIdHash: ANON_HASH,
              now: NOW,
            }),
          );

          // Anonymous row created separately (simulating expired credentials)
          // Insert directly to bypass the upgrade path
          const anonRow = {
            id: createPluginInstallationId(uuidv4()),
            organizationId: organization.id,
            marketplaceId: marketplace.id,
            pluginSlug: 'test-plugin',
            packageId: null,
            scope: 'user' as const,
            userId: null,
            anonymousIdHash: ANON_HASH,
            anonymousEmailMasked: null,
            identityKey: ANON_HASH,
            repoRemoteUrl: null,
            repoKey: '',
            createdAt: EARLIER,
            updatedAt: EARLIER,
            deletedAt: null,
            deletedBy: null,
          };
          await rawInstallationRepo.save(anonRow);

          // Now re-authenticated heartbeat arrives
          mergeResult = await repository.upsertHeartbeat(
            makeInput({
              id: createPluginInstallationId(uuidv4()),
              userId: USER_ID,
              anonymousIdHash: ANON_HASH,
              now: LATER,
            }),
          );
        });

        it('keeps exactly one row after merge', async () => {
          const rows = await rawInstallationRepo.find();
          expect(rows).toHaveLength(1);
        });

        it('does not create a new row', () => {
          expect(mergeResult.created).toBe(false);
        });

        it('preserves the earliest createdAt', () => {
          expect(mergeResult.installation.createdAt).toEqual(EARLIER);
        });

        it('updates updatedAt to the latest value', () => {
          expect(mergeResult.installation.updatedAt).toEqual(LATER);
        });
      });
    });

    // -------------------------------------------------------------------------
    // Edge case 2: anonymous heartbeat matches attributed row's anonymousIdHash
    // -------------------------------------------------------------------------

    describe('edge case 2: anonymous heartbeat bumps attributed row with matching hash', () => {
      const ANON_HASH = 'sha256-attr-hash';
      const USER_ID = USER_UUID_EDGE2;

      describe('when an attributed row exists and an anonymous heartbeat with the same hash arrives', () => {
        let anonBumpResult: Awaited<
          ReturnType<typeof repository.upsertHeartbeat>
        >;

        beforeEach(async () => {
          await repository.upsertHeartbeat(
            makeInput({
              userId: USER_ID,
              anonymousIdHash: ANON_HASH,
              now: NOW,
            }),
          );

          // Anonymous heartbeat with same hash (e.g. credentials were not available)
          anonBumpResult = await repository.upsertHeartbeat(
            makeInput({
              id: createPluginInstallationId(uuidv4()),
              userId: null,
              anonymousIdHash: ANON_HASH,
              now: LATER,
            }),
          );
        });

        it('does not create a new row', () => {
          expect(anonBumpResult.created).toBe(false);
        });

        it('bumps the attributed row updatedAt', () => {
          expect(anonBumpResult.installation.updatedAt).toEqual(LATER);
        });

        it('keeps exactly one row in the database', async () => {
          const rows = await rawInstallationRepo.find();
          expect(rows).toHaveLength(1);
        });

        it('attributed row retains userId', async () => {
          const rows = await rawInstallationRepo.find();
          expect(rows[0].userId).toBe(USER_ID);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // listByMarketplace
  // ---------------------------------------------------------------------------

  describe('listByMarketplace', () => {
    describe('when marketplace has no installs', () => {
      it('returns an empty array', async () => {
        const result = await repository.listByMarketplace(marketplace.id);

        expect(result).toEqual([]);
      });
    });

    describe('when marketplace has multiple installs', () => {
      let result: PluginInstallation[];

      beforeEach(async () => {
        await repository.upsertHeartbeat(
          makeInput({ anonymousIdHash: 'hash-a', pluginSlug: 'plugin-a' }),
        );
        await repository.upsertHeartbeat(
          makeInput({ anonymousIdHash: 'hash-b', pluginSlug: 'plugin-b' }),
        );

        result = await repository.listByMarketplace(marketplace.id);
      });

      it('returns all installs for the marketplace', () => {
        expect(result).toHaveLength(2);
      });

      it('returns rows with the correct marketplaceId', () => {
        expect(result.every((r) => r.marketplaceId === marketplace.id)).toBe(
          true,
        );
      });
    });

    describe('when another marketplace exists', () => {
      let otherMarketplace: Marketplace;
      let result: PluginInstallation[];

      beforeEach(async () => {
        const otherGitRepo = await gitRepoRepo.save(
          gitRepoFactory({ providerId: gitProvider.id, type: 'marketplace' }),
        );
        otherMarketplace = await marketplaceRepository.add(
          marketplaceFactory({
            organizationId: organization.id,
            gitRepoId: otherGitRepo.id,
            addedBy: user.id,
          }),
        );

        await repository.upsertHeartbeat(
          makeInput({ anonymousIdHash: 'hash-mine' }),
        );
        await repository.upsertHeartbeat(
          makeInput({
            marketplaceId: otherMarketplace.id,
            anonymousIdHash: 'hash-other',
          }),
        );

        result = await repository.listByMarketplace(marketplace.id);
      });

      it('returns only installs for the requested marketplace', () => {
        expect(result).toHaveLength(1);
      });

      it('excludes installs from the other marketplace', () => {
        expect(result[0].marketplaceId).toBe(marketplace.id);
      });
    });
  });
});

describe('normalizeRepoSlug', () => {
  describe('when given null or empty', () => {
    it('returns null for null', () => {
      expect(normalizeRepoSlug(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(normalizeRepoSlug(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(normalizeRepoSlug('')).toBeNull();
    });
  });

  describe('when given HTTPS URLs', () => {
    it('normalizes a github https URL', () => {
      expect(normalizeRepoSlug('https://github.com/acme/frontend.git')).toBe(
        'acme/frontend',
      );
    });

    it('normalizes a gitlab https URL', () => {
      expect(normalizeRepoSlug('https://gitlab.com/group/subgroup.git')).toBe(
        'group/subgroup',
      );
    });

    it('normalizes a URL without .git suffix', () => {
      expect(normalizeRepoSlug('https://github.com/acme/billing')).toBe(
        'acme/billing',
      );
    });
  });

  describe('when given SSH URLs', () => {
    it('normalizes a github SSH URL', () => {
      expect(normalizeRepoSlug('git@github.com:acme/frontend.git')).toBe(
        'acme/frontend',
      );
    });

    it('normalizes an SSH URL without .git suffix', () => {
      expect(normalizeRepoSlug('git@github.com:acme/billing')).toBe(
        'acme/billing',
      );
    });
  });

  describe('when given a malformed URL', () => {
    it('returns null', () => {
      expect(normalizeRepoSlug('not-a-url')).toBeNull();
    });
  });
});
