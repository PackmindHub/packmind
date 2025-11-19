import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  GetRagLabConfigurationCommand,
  createOrganizationId,
  createUserId,
  createRagLabConfigurationId,
  RagLabConfiguration,
  DEFAULT_RAG_LAB_CONFIGURATION,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IRagLabConfigurationRepository } from '../../../domain/repositories/IRagLabConfigurationRepository';
import { GetRagLabConfigurationUseCase } from './GetRagLabConfigurationUseCase';

describe('GetRagLabConfigurationUseCase', () => {
  let useCase: GetRagLabConfigurationUseCase;
  let mockRepository: jest.Mocked<IRagLabConfigurationRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockRepository = {
      findByOrganizationId: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findById: jest.fn(),
    } as jest.Mocked<IRagLabConfigurationRepository>;

    stubbedLogger = stubLogger();

    useCase = new GetRagLabConfigurationUseCase(mockRepository, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('returns existing configuration when found', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const configId = createRagLabConfigurationId(uuidv4());

      const mockConfig: RagLabConfiguration = {
        id: configId,
        organizationId,
        embeddingModel: 'text-embedding-3-large',
        embeddingDimensions: 3072,
        includeCodeBlocks: true,
        maxTextLength: 1000,
      };

      const command: GetRagLabConfigurationCommand = {
        organizationId,
        userId,
      };

      mockRepository.findByOrganizationId.mockResolvedValue(mockConfig);

      const result = await useCase.execute(command);

      expect(mockRepository.findByOrganizationId).toHaveBeenCalledWith(
        organizationId,
      );
      expect(result.configuration).toEqual(mockConfig);
      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'RAG Lab configuration found',
        expect.objectContaining({ organizationId, configId }),
      );
    });

    it('returns default configuration when none exists', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      const command: GetRagLabConfigurationCommand = {
        organizationId,
        userId,
      };

      mockRepository.findByOrganizationId.mockResolvedValue(null);

      const result = await useCase.execute(command);

      expect(mockRepository.findByOrganizationId).toHaveBeenCalledWith(
        organizationId,
      );
      expect(result.configuration.embeddingModel).toBe(
        DEFAULT_RAG_LAB_CONFIGURATION.embeddingModel,
      );
      expect(result.configuration.embeddingDimensions).toBe(
        DEFAULT_RAG_LAB_CONFIGURATION.embeddingDimensions,
      );
      expect(result.configuration.organizationId).toBe(organizationId);
      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'No RAG Lab configuration found, returning default configuration',
        expect.objectContaining({ organizationId }),
      );
    });

    it('logs correctly throughout the process', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      const command: GetRagLabConfigurationCommand = {
        organizationId,
        userId,
      };

      mockRepository.findByOrganizationId.mockResolvedValue(null);

      await useCase.execute(command);

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Getting RAG Lab configuration',
        expect.objectContaining({ organizationId, userId }),
      );
    });
  });
});
