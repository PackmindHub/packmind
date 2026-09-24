import { v4 as uuidv4 } from 'uuid';
import {
  AIProvider,
  createAIProviderId,
  createOrganizationId,
  LLMProvider,
  OrganizationId,
} from '@packmind/types';
import { Configuration, EncryptionService } from '@packmind/node-utils';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { AIProviderSchema } from '../schemas/AIProviderSchema';
import { AIProviderRepository } from './AIProviderRepository';
import { StoredAIProvider } from '../../domain/repositories/IAIProviderRepository';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const mockConfiguration = Configuration as jest.Mocked<typeof Configuration>;

describe('AIProviderRepository', () => {
  const fixture = createTestDatasourceFixture([AIProviderSchema]);

  let repository: AIProviderRepository;
  let organizationId: OrganizationId;

  beforeAll(async () => {
    mockConfiguration.getConfig.mockResolvedValue(
      '12345678901234567890123456789012',
    );
    await fixture.initialize();
  });

  beforeEach(() => {
    repository = new AIProviderRepository(
      fixture.datasource.getRepository<AIProvider>(AIProviderSchema),
      stubLogger(),
    );
    organizationId = createOrganizationId(uuidv4());
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when the stored API key is readable', () => {
    let stored: StoredAIProvider | null;

    beforeEach(async () => {
      await repository.save(organizationId, {
        provider: LLMProvider.OPENAI,
        apiKey: 'sk-readable',
        model: 'gpt-4',
        fastestModel: 'gpt-4-mini',
      });

      stored = await repository.get(organizationId);
    });

    it('returns the decrypted API key', () => {
      expect(stored?.config).toEqual(
        expect.objectContaining({ apiKey: 'sk-readable' }),
      );
    });

    it('does not flag the secrets as unreadable', () => {
      expect(stored?.secretsUnreadable).toBeUndefined();
    });
  });

  describe('when the stored API key cannot be decrypted', () => {
    let stored: StoredAIProvider | null;

    beforeEach(async () => {
      // A well-formed envelope this instance's key cannot open, as after a
      // key change.
      await fixture.datasource.getRepository(AIProviderSchema).save({
        id: createAIProviderId(uuidv4()),
        organizationId,
        config: {
          provider: LLMProvider.OPENAI,
          apiKey: new EncryptionService('another-key').encrypt('sk-lost'),
          model: 'gpt-4',
          fastestModel: 'gpt-4-mini',
        },
      });

      stored = await repository.get(organizationId);
    });

    it('still returns the configuration', () => {
      expect(stored?.config).toEqual(
        expect.objectContaining({
          provider: LLMProvider.OPENAI,
          model: 'gpt-4',
        }),
      );
    });

    it('empties the unreadable API key', () => {
      expect(stored?.config).toEqual(expect.objectContaining({ apiKey: '' }));
    });

    it('flags the secrets as unreadable', () => {
      expect(stored?.secretsUnreadable).toBe(true);
    });

    describe('when the admin saves a new API key', () => {
      beforeEach(async () => {
        await repository.save(organizationId, {
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-fresh',
          model: 'gpt-4',
          fastestModel: 'gpt-4-mini',
        });

        stored = await repository.get(organizationId);
      });

      it('returns the new API key', () => {
        expect(stored?.config).toEqual(
          expect.objectContaining({ apiKey: 'sk-fresh' }),
        );
      });

      it('no longer flags the secrets as unreadable', () => {
        expect(stored?.secretsUnreadable).toBeUndefined();
      });
    });
  });
});
