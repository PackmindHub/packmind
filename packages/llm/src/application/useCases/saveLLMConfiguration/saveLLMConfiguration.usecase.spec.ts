import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  LLMProvider,
  SaveLLMConfigurationCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { ILLMConfigurationRepository } from '../../../domain/repositories/ILLMConfigurationRepository';
import { SaveLLMConfigurationUseCase } from './saveLLMConfiguration.usecase';

describe('SaveLLMConfigurationUseCase', () => {
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-456');

  let useCase: SaveLLMConfigurationUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockConfigurationRepository: jest.Mocked<ILLMConfigurationRepository>;

  const adminUser = {
    id: userId,
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'admin' as const,
      },
    ],
  };

  const memberUser = {
    id: userId,
    email: 'member@example.com',
    passwordHash: 'hashed-password',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  };

  const organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  };

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
    beforeEach(() => {
      mockAccountsPort.getUserById.mockResolvedValue(memberUser);
      mockAccountsPort.getOrganizationById.mockResolvedValue(organization);
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute(createCommand())).rejects.toThrow(
        OrganizationAdminRequiredError,
      );
    });

    it('does not save the configuration', async () => {
      await expect(useCase.execute(createCommand())).rejects.toThrow();

      expect(mockConfigurationRepository.save).not.toHaveBeenCalled();
    });
  });
});
