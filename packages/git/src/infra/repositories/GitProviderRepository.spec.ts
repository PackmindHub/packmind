import { GitProviderRepository } from './GitProviderRepository';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { Repository } from 'typeorm';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { createGitProviderId, GitProvider } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { gitProviderFactory, gitlabProviderFactory } from '../../../test';
import { createOrganizationId, Organization } from '@packmind/types';
import { OrganizationSchema } from '@packmind/accounts';

// Mock Configuration for encryption key
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

describe('GitProviderRepository', () => {
  const fixture = createTestDatasourceFixture([
    GitProviderSchema,
    GitRepoSchema,
    OrganizationSchema,
  ]);

  let gitProviderRepository: GitProviderRepository;
  let organizationRepository: Repository<Organization>;
  let logger: jest.Mocked<PackmindLogger>;
  let testOrganization: Organization;

  beforeAll(async () => {
    // Mock the encryption key (must be 32 characters for AES-256)
    mockConfiguration.getConfig.mockResolvedValue(
      '12345678901234567890123456789012',
    );
    await fixture.initialize();
  });

  beforeEach(async () => {
    logger = stubLogger();

    gitProviderRepository = new GitProviderRepository(
      fixture.datasource.getRepository<GitProvider>(GitProviderSchema),
      logger,
    );

    organizationRepository =
      fixture.datasource.getRepository(OrganizationSchema);

    // Create test organization for foreign key constraints
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

  itHandlesSoftDelete<GitProvider>({
    entityFactory: () =>
      gitProviderFactory({
        organizationId: testOrganization.id,
      }),
    getRepository: () => gitProviderRepository,
    queryDeletedEntity: async (id) =>
      fixture.datasource.getRepository(GitProviderSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  describe('when storing and retrieving git provider with encryption', () => {
    let gitProvider: ReturnType<typeof gitProviderFactory>;
    let foundGitProvider: Awaited<
      ReturnType<typeof gitProviderRepository.findById>
    >;
    let rawProvider: Awaited<
      ReturnType<ReturnType<typeof fixture.datasource.getRepository>['findOne']>
    >;

    beforeEach(async () => {
      gitProvider = gitProviderFactory({
        organizationId: testOrganization.id,
        token: 'plain-text-token',
      });
      await gitProviderRepository.add(gitProvider);

      foundGitProvider = await gitProviderRepository.findById(gitProvider.id);

      rawProvider = await fixture.datasource
        .getRepository(GitProviderSchema)
        .findOne({
          where: { id: gitProvider.id },
        });
    });

    it('retrieves decrypted provider with correct properties', async () => {
      expect(foundGitProvider).toMatchObject({
        id: gitProvider.id,
        source: gitProvider.source,
        organizationId: gitProvider.organizationId,
        url: gitProvider.url,
        token: 'plain-text-token',
      });
    });

    it('stores encrypted token in database', async () => {
      expect(rawProvider?.token).not.toBe('plain-text-token');
    });

    it('stores defined token value in database', async () => {
      expect(rawProvider?.token).toBeDefined();
    });
  });

  describe('when finding git providers by organization ID', () => {
    let gitProvider1: ReturnType<typeof gitProviderFactory>;
    let gitProvider2: ReturnType<typeof gitProviderFactory>;
    let foundGitProviders: Awaited<
      ReturnType<typeof gitProviderRepository.findByOrganizationId>
    >;

    beforeEach(async () => {
      gitProvider1 = gitProviderFactory({
        organizationId: testOrganization.id,
      });
      gitProvider2 = gitProviderFactory({
        organizationId: testOrganization.id,
      });
      await gitProviderRepository.add(gitProvider1);
      await gitProviderRepository.add(gitProvider2);

      foundGitProviders = await gitProviderRepository.findByOrganizationId(
        testOrganization.id,
      );
    });

    it('returns correct number of providers', async () => {
      expect(foundGitProviders).toHaveLength(2);
    });

    it('includes first provider in results', async () => {
      expect(foundGitProviders.map((p) => p.id)).toContain(gitProvider1.id);
    });

    it('includes second provider in results', async () => {
      expect(foundGitProviders.map((p) => p.id)).toContain(gitProvider2.id);
    });
  });

  describe('when listing all git providers', () => {
    let gitProvider1: ReturnType<typeof gitProviderFactory>;
    let gitProvider2: ReturnType<typeof gitProviderFactory>;
    let allGitProviders: Awaited<ReturnType<typeof gitProviderRepository.list>>;

    beforeEach(async () => {
      gitProvider1 = gitProviderFactory({
        organizationId: testOrganization.id,
      });
      gitProvider2 = gitProviderFactory({
        organizationId: testOrganization.id,
      });
      await gitProviderRepository.add(gitProvider1);
      await gitProviderRepository.add(gitProvider2);

      allGitProviders = await gitProviderRepository.list();
    });

    it('returns correct number of providers', async () => {
      expect(allGitProviders).toHaveLength(2);
    });

    it('includes first provider in results', async () => {
      expect(allGitProviders.map((p) => p.id)).toContain(gitProvider1.id);
    });

    it('includes second provider in results', async () => {
      expect(allGitProviders.map((p) => p.id)).toContain(gitProvider2.id);
    });
  });

  describe('when listing git providers by organization ID', () => {
    let gitProvider: ReturnType<typeof gitProviderFactory>;
    let gitProvidersByOrg: Awaited<
      ReturnType<typeof gitProviderRepository.list>
    >;

    beforeEach(async () => {
      gitProvider = gitProviderFactory({
        organizationId: testOrganization.id,
      });
      await gitProviderRepository.add(gitProvider);

      gitProvidersByOrg = await gitProviderRepository.list(testOrganization.id);
    });

    it('returns correct number of providers', async () => {
      expect(gitProvidersByOrg).toHaveLength(1);
    });

    it('returns provider with correct properties', async () => {
      expect(gitProvidersByOrg[0]).toMatchObject({
        id: gitProvider.id,
        source: gitProvider.source,
        organizationId: gitProvider.organizationId,
      });
    });
  });

  describe('when updating git provider with token encryption', () => {
    let gitProvider: ReturnType<typeof gitProviderFactory>;
    let updatedProvider: Awaited<
      ReturnType<typeof gitProviderRepository.update>
    >;
    let rawProvider: Awaited<
      ReturnType<ReturnType<typeof fixture.datasource.getRepository>['findOne']>
    >;

    beforeEach(async () => {
      gitProvider = gitProviderFactory({
        organizationId: testOrganization.id,
        token: 'original-token',
      });
      await gitProviderRepository.add(gitProvider);

      updatedProvider = await gitProviderRepository.update(gitProvider.id, {
        token: 'updated-token',
        url: 'https://updated.example.com',
      });

      rawProvider = await fixture.datasource
        .getRepository(GitProviderSchema)
        .findOne({
          where: { id: gitProvider.id },
        });
    });

    it('returns updated provider with decrypted token', async () => {
      expect(updatedProvider).toMatchObject({
        id: gitProvider.id,
        token: 'updated-token',
        url: 'https://updated.example.com',
      });
    });

    it('stores encrypted token in database', async () => {
      expect(rawProvider?.token).not.toBe('updated-token');
    });

    it('stores defined token value in database', async () => {
      expect(rawProvider?.token).toBeDefined();
    });
  });

  it('throws error for non-existent provider during update', async () => {
    const nonExistentId = uuidv4();

    await expect(
      gitProviderRepository.update(nonExistentId, { url: 'new-url' }),
    ).rejects.toThrow(`Git provider with id ${nonExistentId} not found`);
  });

  it('returns null for non-existent provider ID', async () => {
    const nonExistentId = uuidv4();
    const foundGitProvider = await gitProviderRepository.findById(
      createGitProviderId(nonExistentId),
    );
    expect(foundGitProvider).toBeNull();
  });

  it('handles provider without token correctly', async () => {
    const gitProvider = gitProviderFactory({
      organizationId: testOrganization.id,
      token: null,
    });
    await gitProviderRepository.add(gitProvider);

    const foundGitProvider = await gitProviderRepository.findById(
      gitProvider.id,
    );
    expect(foundGitProvider).toMatchObject({
      id: gitProvider.id,
      source: gitProvider.source,
      token: null,
    });
  });

  describe('when configuration is missing', () => {
    it('uses default encryption key', async () => {
      mockConfiguration.getConfig.mockResolvedValueOnce(null);

      const gitProvider = gitProviderFactory({
        organizationId: testOrganization.id,
        token: 'some-token',
      });

      await gitProviderRepository.add(gitProvider);

      const foundGitProvider = await gitProviderRepository.findById(
        gitProvider.id,
      );
      expect(foundGitProvider).toMatchObject({
        id: gitProvider.id,
        source: gitProvider.source,
        organizationId: gitProvider.organizationId,
        token: 'some-token', // Should be decrypted successfully using default key
      });
    });
  });

  describe('when storing and retrieving GitLab provider with encryption', () => {
    let gitlabProvider: ReturnType<typeof gitlabProviderFactory>;
    let foundGitlabProvider: Awaited<
      ReturnType<typeof gitProviderRepository.findById>
    >;
    let rawProvider: Awaited<
      ReturnType<ReturnType<typeof fixture.datasource.getRepository>['findOne']>
    >;

    beforeEach(async () => {
      gitlabProvider = gitlabProviderFactory({
        organizationId: testOrganization.id,
        token: 'glpat-plain-text-token',
      });
      await gitProviderRepository.add(gitlabProvider);

      foundGitlabProvider = await gitProviderRepository.findById(
        gitlabProvider.id,
      );

      rawProvider = await fixture.datasource
        .getRepository(GitProviderSchema)
        .findOne({
          where: { id: gitlabProvider.id },
        });
    });

    it('retrieves decrypted GitLab provider with correct properties', async () => {
      expect(foundGitlabProvider).toMatchObject({
        id: gitlabProvider.id,
        source: gitlabProvider.source,
        organizationId: gitlabProvider.organizationId,
        url: gitlabProvider.url,
        token: 'glpat-plain-text-token',
      });
    });

    it('stores encrypted GitLab token in database', async () => {
      expect(rawProvider?.token).not.toBe('glpat-plain-text-token');
    });

    it('stores defined token value in database', async () => {
      expect(rawProvider?.token).toBeDefined();
    });

    it('stores correct source type in database', async () => {
      expect(rawProvider?.source).toBe('gitlab');
    });
  });

  describe('when storing and retrieving self-hosted GitLab provider with custom URL', () => {
    let selfHostedGitlabProvider: ReturnType<typeof gitlabProviderFactory>;
    let foundGitlabProvider: Awaited<
      ReturnType<typeof gitProviderRepository.findById>
    >;
    let rawProvider: Awaited<
      ReturnType<ReturnType<typeof fixture.datasource.getRepository>['findOne']>
    >;

    beforeEach(async () => {
      selfHostedGitlabProvider = gitlabProviderFactory({
        organizationId: testOrganization.id,
        token: 'glpat-self-hosted-token',
        url: 'https://gitlab.company.com/api/v4',
      });
      await gitProviderRepository.add(selfHostedGitlabProvider);

      foundGitlabProvider = await gitProviderRepository.findById(
        selfHostedGitlabProvider.id,
      );

      rawProvider = await fixture.datasource
        .getRepository(GitProviderSchema)
        .findOne({
          where: { id: selfHostedGitlabProvider.id },
        });
    });

    it('retrieves decrypted self-hosted GitLab provider with correct properties', async () => {
      expect(foundGitlabProvider).toMatchObject({
        id: selfHostedGitlabProvider.id,
        source: selfHostedGitlabProvider.source,
        organizationId: selfHostedGitlabProvider.organizationId,
        url: 'https://gitlab.company.com/api/v4',
        token: 'glpat-self-hosted-token',
      });
    });

    it('stores correct self-hosted URL in database', async () => {
      expect(rawProvider?.url).toBe('https://gitlab.company.com/api/v4');
    });

    it('stores correct source type in database', async () => {
      expect(rawProvider?.source).toBe('gitlab');
    });

    it('stores encrypted token in database', async () => {
      expect(rawProvider?.token).not.toBe('glpat-self-hosted-token');
    });

    it('stores defined token value in database', async () => {
      expect(rawProvider?.token).toBeDefined();
    });
  });

  describe('when updating GitLab provider URL for self-hosted instance', () => {
    let gitlabProvider: ReturnType<typeof gitlabProviderFactory>;
    let updatedProvider: Awaited<
      ReturnType<typeof gitProviderRepository.update>
    >;
    let rawProvider: Awaited<
      ReturnType<ReturnType<typeof fixture.datasource.getRepository>['findOne']>
    >;

    beforeEach(async () => {
      gitlabProvider = gitlabProviderFactory({
        organizationId: testOrganization.id,
        token: 'glpat-original-token',
        url: 'https://gitlab.com',
      });
      await gitProviderRepository.add(gitlabProvider);

      updatedProvider = await gitProviderRepository.update(gitlabProvider.id, {
        url: 'https://gitlab.enterprise.com/api/v4',
        token: 'glpat-updated-token',
      });

      rawProvider = await fixture.datasource
        .getRepository(GitProviderSchema)
        .findOne({
          where: { id: gitlabProvider.id },
        });
    });

    it('returns updated GitLab provider with decrypted token', async () => {
      expect(updatedProvider).toMatchObject({
        id: gitlabProvider.id,
        source: 'gitlab',
        url: 'https://gitlab.enterprise.com/api/v4',
        token: 'glpat-updated-token',
      });
    });

    it('stores updated URL in database', async () => {
      expect(rawProvider?.url).toBe('https://gitlab.enterprise.com/api/v4');
    });

    it('stores correct source type in database', async () => {
      expect(rawProvider?.source).toBe('gitlab');
    });

    it('stores encrypted token in database', async () => {
      expect(rawProvider?.token).not.toBe('glpat-updated-token');
    });

    it('stores defined token value in database', async () => {
      expect(rawProvider?.token).toBeDefined();
    });
  });
});
