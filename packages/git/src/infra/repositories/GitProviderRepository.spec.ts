import { GitProviderRepository } from './GitProviderRepository';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { itHandlesSoftDelete } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createGitProviderId,
  GitProvider,
} from '../../domain/entities/GitProvider';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { gitProviderFactory, gitlabProviderFactory } from '../../../test';
import {
  createOrganizationId,
  OrganizationSchema,
  Organization,
} from '@packmind/accounts';

// Mock Configuration for encryption key
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

describe('GitProviderRepository', () => {
  let datasource: DataSource;
  let gitProviderRepository: GitProviderRepository;
  let organizationRepository: Repository<Organization>;
  let logger: jest.Mocked<PackmindLogger>;
  let testOrganization: Organization;

  beforeEach(async () => {
    // Mock the encryption key (must be 32 characters for AES-256)
    mockConfiguration.getConfig.mockResolvedValue(
      '12345678901234567890123456789012',
    );

    logger = stubLogger();
    datasource = await makeTestDatasource([
      GitProviderSchema,
      GitRepoSchema,
      OrganizationSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    gitProviderRepository = new GitProviderRepository(
      datasource.getRepository<GitProvider>(GitProviderSchema),
      logger,
    );

    organizationRepository = datasource.getRepository(OrganizationSchema);

    // Create test organization for foreign key constraints
    testOrganization = await organizationRepository.save({
      id: createOrganizationId(uuidv4()),
      name: 'Test Organization',
      slug: 'test-organization',
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  itHandlesSoftDelete<GitProvider>({
    entityFactory: () =>
      gitProviderFactory({
        organizationId: testOrganization.id,
      }),
    getRepository: () => gitProviderRepository,
    queryDeletedEntity: async (id) =>
      datasource.getRepository(GitProviderSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  it('can store and retrieve git provider with encryption', async () => {
    const gitProvider = gitProviderFactory({
      organizationId: testOrganization.id,
      token: 'plain-text-token',
    });
    await gitProviderRepository.add(gitProvider);

    const foundGitProvider = await gitProviderRepository.findById(
      gitProvider.id,
    );
    expect(foundGitProvider).toMatchObject({
      id: gitProvider.id,
      source: gitProvider.source,
      organizationId: gitProvider.organizationId,
      url: gitProvider.url,
      token: 'plain-text-token', // Should be decrypted
    });

    // Verify that the token is actually encrypted in the database
    const rawProvider = await datasource
      .getRepository(GitProviderSchema)
      .findOne({
        where: { id: gitProvider.id },
      });
    expect(rawProvider?.token).not.toBe('plain-text-token');
    expect(rawProvider?.token).toBeDefined();
  });

  it('can find git providers by organization ID', async () => {
    const gitProvider1 = gitProviderFactory({
      organizationId: testOrganization.id,
    });
    const gitProvider2 = gitProviderFactory({
      organizationId: testOrganization.id,
    });
    await gitProviderRepository.add(gitProvider1);
    await gitProviderRepository.add(gitProvider2);

    const foundGitProviders = await gitProviderRepository.findByOrganizationId(
      testOrganization.id,
    );
    expect(foundGitProviders).toHaveLength(2);
    expect(foundGitProviders.map((p) => p.id)).toContain(gitProvider1.id);
    expect(foundGitProviders.map((p) => p.id)).toContain(gitProvider2.id);
  });

  it('can list all git providers', async () => {
    const gitProvider1 = gitProviderFactory({
      organizationId: testOrganization.id,
    });
    const gitProvider2 = gitProviderFactory({
      organizationId: testOrganization.id,
    });
    await gitProviderRepository.add(gitProvider1);
    await gitProviderRepository.add(gitProvider2);

    const allGitProviders = await gitProviderRepository.list();
    expect(allGitProviders).toHaveLength(2);
    expect(allGitProviders.map((p) => p.id)).toContain(gitProvider1.id);
    expect(allGitProviders.map((p) => p.id)).toContain(gitProvider2.id);
  });

  it('can list git providers by organization ID', async () => {
    const gitProvider = gitProviderFactory({
      organizationId: testOrganization.id,
    });
    await gitProviderRepository.add(gitProvider);

    const gitProvidersByOrg = await gitProviderRepository.list(
      testOrganization.id,
    );
    expect(gitProvidersByOrg).toHaveLength(1);
    expect(gitProvidersByOrg[0]).toMatchObject({
      id: gitProvider.id,
      source: gitProvider.source,
      organizationId: gitProvider.organizationId,
    });
  });

  it('can update git provider with token encryption', async () => {
    const gitProvider = gitProviderFactory({
      organizationId: testOrganization.id,
      token: 'original-token',
    });
    await gitProviderRepository.add(gitProvider);

    const updatedProvider = await gitProviderRepository.update(gitProvider.id, {
      token: 'updated-token',
      url: 'https://updated.example.com',
    });

    expect(updatedProvider).toMatchObject({
      id: gitProvider.id,
      token: 'updated-token', // Should be decrypted
      url: 'https://updated.example.com',
    });

    // Verify that the updated token is encrypted in the database
    const rawProvider = await datasource
      .getRepository(GitProviderSchema)
      .findOne({
        where: { id: gitProvider.id },
      });
    expect(rawProvider?.token).not.toBe('updated-token');
    expect(rawProvider?.token).toBeDefined();
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

  it('throws error for missing encryption key configuration', async () => {
    mockConfiguration.getConfig.mockResolvedValueOnce(null);

    const gitProvider = gitProviderFactory({
      organizationId: testOrganization.id,
      token: 'some-token',
    });

    await expect(gitProviderRepository.add(gitProvider)).rejects.toThrow(
      'ENCRYPTION_KEY not found in configuration',
    );
  });

  it('can store and retrieve GitLab provider with encryption', async () => {
    const gitlabProvider = gitlabProviderFactory({
      organizationId: testOrganization.id,
      token: 'glpat-plain-text-token',
    });
    await gitProviderRepository.add(gitlabProvider);

    const foundGitlabProvider = await gitProviderRepository.findById(
      gitlabProvider.id,
    );
    expect(foundGitlabProvider).toMatchObject({
      id: gitlabProvider.id,
      source: gitlabProvider.source,
      organizationId: gitlabProvider.organizationId,
      url: gitlabProvider.url,
      token: 'glpat-plain-text-token', // Should be decrypted
    });

    // Verify that the GitLab token is actually encrypted in the database
    const rawProvider = await datasource
      .getRepository(GitProviderSchema)
      .findOne({
        where: { id: gitlabProvider.id },
      });
    expect(rawProvider?.token).not.toBe('glpat-plain-text-token');
    expect(rawProvider?.token).toBeDefined();
    expect(rawProvider?.source).toBe('gitlab');
  });

  it('can store and retrieve self-hosted GitLab provider with custom URL', async () => {
    const selfHostedGitlabProvider = gitlabProviderFactory({
      organizationId: testOrganization.id,
      token: 'glpat-self-hosted-token',
      url: 'https://gitlab.company.com/api/v4',
    });
    await gitProviderRepository.add(selfHostedGitlabProvider);

    const foundGitlabProvider = await gitProviderRepository.findById(
      selfHostedGitlabProvider.id,
    );
    expect(foundGitlabProvider).toMatchObject({
      id: selfHostedGitlabProvider.id,
      source: selfHostedGitlabProvider.source,
      organizationId: selfHostedGitlabProvider.organizationId,
      url: 'https://gitlab.company.com/api/v4',
      token: 'glpat-self-hosted-token', // Should be decrypted
    });

    // Verify that the self-hosted GitLab URL is stored correctly
    const rawProvider = await datasource
      .getRepository(GitProviderSchema)
      .findOne({
        where: { id: selfHostedGitlabProvider.id },
      });
    expect(rawProvider?.url).toBe('https://gitlab.company.com/api/v4');
    expect(rawProvider?.source).toBe('gitlab');
    expect(rawProvider?.token).not.toBe('glpat-self-hosted-token');
    expect(rawProvider?.token).toBeDefined();
  });

  it('can update GitLab provider URL for self-hosted instance', async () => {
    const gitlabProvider = gitlabProviderFactory({
      organizationId: testOrganization.id,
      token: 'glpat-original-token',
      url: 'https://gitlab.com',
    });
    await gitProviderRepository.add(gitlabProvider);

    const updatedProvider = await gitProviderRepository.update(
      gitlabProvider.id,
      {
        url: 'https://gitlab.enterprise.com/api/v4',
        token: 'glpat-updated-token',
      },
    );

    expect(updatedProvider).toMatchObject({
      id: gitlabProvider.id,
      source: 'gitlab',
      url: 'https://gitlab.enterprise.com/api/v4',
      token: 'glpat-updated-token', // Should be decrypted
    });

    // Verify that the updated URL and token are stored correctly
    const rawProvider = await datasource
      .getRepository(GitProviderSchema)
      .findOne({
        where: { id: gitlabProvider.id },
      });
    expect(rawProvider?.url).toBe('https://gitlab.enterprise.com/api/v4');
    expect(rawProvider?.source).toBe('gitlab');
    expect(rawProvider?.token).not.toBe('glpat-updated-token');
    expect(rawProvider?.token).toBeDefined();
  });
});
