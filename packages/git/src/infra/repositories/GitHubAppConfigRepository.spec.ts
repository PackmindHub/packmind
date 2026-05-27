import { GitHubAppConfigRepository } from './GitHubAppConfigRepository';
import { GitHubAppConfigSchema } from '../schemas/GitHubAppConfigSchema';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

describe('GitHubAppConfigRepository', () => {
  const fixture = createTestDatasourceFixture([GitHubAppConfigSchema]);

  let repository: GitHubAppConfigRepository;
  let logger: jest.Mocked<PackmindLogger>;

  beforeAll(async () => {
    mockConfiguration.getConfig.mockResolvedValue(
      '12345678901234567890123456789012',
    );
    await fixture.initialize();
  });

  beforeEach(() => {
    logger = stubLogger();
    repository = new GitHubAppConfigRepository(
      fixture.datasource.getRepository(GitHubAppConfigSchema),
      logger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  const configInput = {
    appId: 12345,
    slug: 'my-app',
    htmlUrl: 'https://github.com/apps/my-app',
    clientId: 'Iv1.abc123',
    clientSecret: 'plain-client-secret',
    privateKey: 'plain-private-key',
    webhookSecret: 'plain-webhook-secret',
  };

  describe('when saving and retrieving a config', () => {
    it('returns decrypted clientSecret after save and findActive', async () => {
      await repository.save(configInput);
      const found = await repository.findActive();
      expect(found?.clientSecret).toBe('plain-client-secret');
    });

    it('returns decrypted privateKey after save and findActive', async () => {
      await repository.save(configInput);
      const found = await repository.findActive();
      expect(found?.privateKey).toBe('plain-private-key');
    });

    it('returns decrypted webhookSecret after save and findActive', async () => {
      await repository.save(configInput);
      const found = await repository.findActive();
      expect(found?.webhookSecret).toBe('plain-webhook-secret');
    });

    it('stores encrypted clientSecret in database', async () => {
      await repository.save(configInput);
      const raw = await fixture.datasource
        .getRepository(GitHubAppConfigSchema)
        .findOne({ where: {} });
      expect(raw?.clientSecret).not.toBe('plain-client-secret');
    });

    it('stores encrypted privateKey in database', async () => {
      await repository.save(configInput);
      const raw = await fixture.datasource
        .getRepository(GitHubAppConfigSchema)
        .findOne({ where: {} });
      expect(raw?.privateKey).not.toBe('plain-private-key');
    });

    it('stores encrypted webhookSecret in database', async () => {
      await repository.save(configInput);
      const raw = await fixture.datasource
        .getRepository(GitHubAppConfigSchema)
        .findOne({ where: {} });
      expect(raw?.webhookSecret).not.toBe('plain-webhook-secret');
    });

    it('stores plaintext clientId in database', async () => {
      await repository.save(configInput);
      const raw = await fixture.datasource
        .getRepository(GitHubAppConfigSchema)
        .findOne({ where: {} });
      expect(raw?.clientId).toBe('Iv1.abc123');
    });

    it('stores plaintext slug in database', async () => {
      await repository.save(configInput);
      const raw = await fixture.datasource
        .getRepository(GitHubAppConfigSchema)
        .findOne({ where: {} });
      expect(raw?.slug).toBe('my-app');
    });
  });

  describe('findActive', () => {
    it('returns null when no config exists', async () => {
      const result = await repository.findActive();
      expect(result).toBeNull();
    });

    it('returns the most recently created config', async () => {
      await repository.save({ ...configInput, slug: 'first-app' });
      await repository.save({ ...configInput, slug: 'second-app' });

      const found = await repository.findActive();
      expect(found?.slug).toBe('second-app');
    });
  });

  describe('deleteActive', () => {
    it('soft-deletes the active config so findActive returns null', async () => {
      await repository.save(configInput);
      await repository.deleteActive();
      const found = await repository.findActive();
      expect(found).toBeNull();
    });

    it('does not throw when no active config exists', async () => {
      await expect(repository.deleteActive()).resolves.not.toThrow();
    });
  });
});
