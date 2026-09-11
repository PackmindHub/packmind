import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  LLMProvider,
  SaveLLMConfigurationCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { SaveLLMConfigurationUseCase } from './SaveLLMConfigurationUseCase';
import { IAIProviderRepository } from '../../../domain/repositories/IAIProviderRepository';

describe('SaveLLMConfigurationUseCase', () => {
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-456');

  let useCase: SaveLLMConfigurationUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockConfigurationRepository: jest.Mocked<IAIProviderRepository>;

  const adminUser = userFactory({
    id: userId,
    email: 'admin@example.com',
    memberships: [
      {
        userId,
        organizationId,
        role: 'admin',
      },
    ],
  });

  const memberUser = userFactory({
    id: userId,
    email: 'member@example.com',
    memberships: [
      {
        userId,
        organizationId,
        role: 'member',
      },
    ],
  });

  const organization = organizationFactory({ id: organizationId });

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockConfigurationRepository = {
      save: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
    };

    useCase = new SaveLLMConfigurationUseCase(
      mockAccountsPort,
      mockConfigurationRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCommand = (
    overrides?: Partial<SaveLLMConfigurationCommand>,
  ): SaveLLMConfigurationCommand => ({
    userId,
    organizationId,
    config: {
      provider: LLMProvider.OPENAI,
      apiKey: 'sk-test-key-123',
      model: 'gpt-4',
      fastestModel: 'gpt-4-mini',
    },
    ...overrides,
  });

  describe('when user is an admin', () => {
    beforeEach(() => {
      mockAccountsPort.getUserById.mockResolvedValue(adminUser);
      mockAccountsPort.getOrganizationById.mockResolvedValue(organization);
    });

    it('saves the configuration successfully', async () => {
      mockConfigurationRepository.save.mockResolvedValue();

      const result = await useCase.execute(createCommand());

      expect(result.success).toBe(true);
    });

    it('returns success message', async () => {
      mockConfigurationRepository.save.mockResolvedValue();

      const result = await useCase.execute(createCommand());

      expect(result.message).toBe('LLM configuration saved successfully');
    });

    it('calls repository with correct parameters', async () => {
      mockConfigurationRepository.save.mockResolvedValue();
      const command = createCommand();

      await useCase.execute(command);

      expect(mockConfigurationRepository.save).toHaveBeenCalledWith(
        organizationId,
        command.config,
      );
    });
  });

  describe('when user is not an admin', () => {
    beforeEach(async () => {
      mockAccountsPort.getUserById.mockResolvedValue(memberUser);
      mockAccountsPort.getOrganizationById.mockResolvedValue(organization);

      try {
        await useCase.execute(createCommand());
      } catch {
        // Expected to throw
      }
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute(createCommand())).rejects.toThrow(
        OrganizationAdminRequiredError,
      );
    });

    it('does not save the configuration', () => {
      expect(mockConfigurationRepository.save).not.toHaveBeenCalled();
    });
  });
});
