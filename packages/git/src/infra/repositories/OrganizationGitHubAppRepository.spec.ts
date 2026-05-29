import { OrganizationGitHubAppRepository } from './OrganizationGitHubAppRepository';
import { OrganizationGitHubAppSchema } from '../schemas/OrganizationGitHubAppSchema';
import { Repository } from 'typeorm';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createOrganizationGitHubAppId,
  OrganizationGitHubApp,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { organizationGitHubAppFactory } from '../../../test';
import { createOrganizationId, Organization } from '@packmind/types';
import { OrganizationSchema } from '@packmind/accounts';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

describe('OrganizationGitHubAppRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationGitHubAppSchema,
    OrganizationSchema,
  ]);

  let repository: OrganizationGitHubAppRepository;
  let organizationRepository: Repository<Organization>;
  let logger: jest.Mocked<PackmindLogger>;
  let testOrganization: Organization;

  beforeAll(async () => {
    mockConfiguration.getConfig.mockResolvedValue(
      '12345678901234567890123456789012',
    );
    await fixture.initialize();
  });

  beforeEach(async () => {
    logger = stubLogger();

    repository = new OrganizationGitHubAppRepository(
      fixture.datasource.getRepository<OrganizationGitHubApp>(
        OrganizationGitHubAppSchema,
      ),
      logger,
    );

    organizationRepository =
      fixture.datasource.getRepository(OrganizationSchema);

    testOrganization = await organizationRepository.save({
      id: createOrganizationId(uuidv4()),
      name: 'Test Organization',
      slug: 'test-organization',
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  itHandlesSoftDelete<OrganizationGitHubApp>({
    entityFactory: () =>
      organizationGitHubAppFactory({
        organizationId: testOrganization.id,
      }),
    getRepository: () => repository,
    queryDeletedEntity: async (id) =>
      fixture.datasource.getRepository(OrganizationGitHubAppSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  describe('when storing and retrieving an app with encrypted fields', () => {
    let app: ReturnType<typeof organizationGitHubAppFactory>;
    let foundApp: Awaited<ReturnType<typeof repository.findById>>;
    let rawRow: Awaited<
      ReturnType<ReturnType<typeof fixture.datasource.getRepository>['findOne']>
    >;

    beforeEach(async () => {
      app = organizationGitHubAppFactory({
        organizationId: testOrganization.id,
        appClientSecret: 'plain-client-secret',
        appPrivateKey:
          '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        appWebhookSecret: 'plain-webhook-secret',
      });
      await repository.add(app);

      foundApp = await repository.findById(app.id);

      rawRow = await fixture.datasource
        .getRepository(OrganizationGitHubAppSchema)
        .findOne({ where: { id: app.id } });
    });

    it('retrieves decrypted app with correct properties', () => {
      expect(foundApp).toMatchObject({
        id: app.id,
        organizationId: app.organizationId,
        appSlug: app.appSlug,
        appClientSecret: 'plain-client-secret',
        appWebhookSecret: 'plain-webhook-secret',
      });
    });

    it('stores appClientSecret encrypted in database', () => {
      expect(rawRow?.appClientSecret).not.toBe('plain-client-secret');
    });

    it('stores appPrivateKey encrypted in database', () => {
      expect(rawRow?.appPrivateKey).not.toBe(
        '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
      );
    });

    it('stores appWebhookSecret encrypted in database', () => {
      expect(rawRow?.appWebhookSecret).not.toBe('plain-webhook-secret');
    });

    it('stores encrypted fields in 3-part envelope format', () => {
      const parts = rawRow?.appClientSecret?.split(':');
      expect(parts?.length).toBe(3);
    });
  });

  describe('when finding an app by organization ID', () => {
    let app: ReturnType<typeof organizationGitHubAppFactory>;
    let foundApp: Awaited<ReturnType<typeof repository.findByOrganizationId>>;

    beforeEach(async () => {
      app = organizationGitHubAppFactory({
        organizationId: testOrganization.id,
      });
      await repository.add(app);

      foundApp = await repository.findByOrganizationId(testOrganization.id);
    });

    it('returns the app for the given organization', () => {
      expect(foundApp?.id).toBe(app.id);
    });
  });

  describe('when finding the active app by organization ID', () => {
    let activeApp: ReturnType<typeof organizationGitHubAppFactory>;

    beforeEach(async () => {
      activeApp = organizationGitHubAppFactory({
        organizationId: testOrganization.id,
        revokedAt: null,
      });
      await repository.add(activeApp);
    });

    it('returns the active app', async () => {
      const found = await repository.findActiveByOrganizationId(
        testOrganization.id,
      );
      expect(found?.id).toBe(activeApp.id);
    });

    describe('when the app has been revoked', () => {
      beforeEach(async () => {
        await repository.markRevoked(testOrganization.id);
      });

      it('returns null for active lookup after revocation', async () => {
        const found = await repository.findActiveByOrganizationId(
          testOrganization.id,
        );
        expect(found).toBeNull();
      });
    });
  });

  describe('when marking an app as revoked', () => {
    let app: ReturnType<typeof organizationGitHubAppFactory>;

    beforeEach(async () => {
      app = organizationGitHubAppFactory({
        organizationId: testOrganization.id,
        revokedAt: null,
      });
      await repository.add(app);
      await repository.markRevoked(testOrganization.id);
    });

    it('sets revokedAt on the row', async () => {
      const raw = await fixture.datasource
        .getRepository(OrganizationGitHubAppSchema)
        .findOne({ where: { id: app.id } });

      expect(raw?.revokedAt).not.toBeNull();
    });

    it('excludes the row from active lookup', async () => {
      const found = await repository.findActiveByOrganizationId(
        testOrganization.id,
      );
      expect(found).toBeNull();
    });
  });

  describe('when upserting for an organization with an existing active app', () => {
    let firstApp: ReturnType<typeof organizationGitHubAppFactory>;
    let secondApp: ReturnType<typeof organizationGitHubAppFactory>;
    let upsertedApp: OrganizationGitHubApp;

    beforeEach(async () => {
      firstApp = organizationGitHubAppFactory({
        organizationId: testOrganization.id,
        appSlug: 'first-app',
      });
      await repository.add(firstApp);

      secondApp = organizationGitHubAppFactory({
        id: createOrganizationGitHubAppId(uuidv4()),
        organizationId: testOrganization.id,
        appSlug: 'second-app',
      });
      upsertedApp = await repository.upsertForOrganization(secondApp);
    });

    it('returns the new app after upsert', () => {
      expect(upsertedApp.appSlug).toBe('second-app');
    });

    it('marks the old app as revoked', async () => {
      const raw = await fixture.datasource
        .getRepository(OrganizationGitHubAppSchema)
        .findOne({ where: { id: firstApp.id } });

      expect(raw?.revokedAt).not.toBeNull();
    });

    it('makes the new app the active record', async () => {
      const active = await repository.findActiveByOrganizationId(
        testOrganization.id,
      );
      expect(active?.id).toBe(upsertedApp.id);
    });
  });

  it('returns null when no app exists for the organization', async () => {
    const found = await repository.findActiveByOrganizationId(
      createOrganizationId(uuidv4()),
    );
    expect(found).toBeNull();
  });

  it('returns null for a non-existent ID', async () => {
    const found = await repository.findById(
      createOrganizationGitHubAppId(uuidv4()),
    );
    expect(found).toBeNull();
  });
});
