import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  UpdateRagLabConfigurationCommand,
  createOrganizationId,
  createUserId,
  createRagLabConfigurationId,
  RagLabConfiguration,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IRagLabConfigurationRepository } from '../../../domain/repositories/IRagLabConfigurationRepository';
import { UpdateRagLabConfigurationUseCase } from './UpdateRagLabConfigurationUseCase';

describe('UpdateRagLabConfigurationUseCase', () => {
  let useCase: UpdateRagLabConfigurationUseCase;
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

    useCase = new UpdateRagLabConfigurationUseCase(
      mockRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('updates existing configuration', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const configId = createRagLabConfigurationId(uuidv4());

      const existingConfig: RagLabConfiguration = {
        id: configId,
        organizationId,
        embeddingModel: 'text-embedding-3-small',
        embeddingDimensions: 1536,
        includeCodeBlocks: false,
        maxTextLength: null,
      };

      const command: UpdateRagLabConfigurationCommand = {
        organizationId,
        userId,
        embeddingModel: 'text-embedding-3-large',
        embeddingDimensions: 3072,
        includeCodeBlocks: true,
        maxTextLength: 1000,
      };

      mockRepository.findByOrganizationId.mockResolvedValue(existingConfig);
      mockRepository.add.mockResolvedValue(existingConfig);

      const result = await useCase.execute(command);

      expect(mockRepository.findByOrganizationId).toHaveBeenCalledWith(
        organizationId,
      );
      expect(mockRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: configId,
          organizationId,
          embeddingModel: 'text-embedding-3-large',
          embeddingDimensions: 3072,
          includeCodeBlocks: true,
          maxTextLength: 1000,
        }),
      );
      expect(result.embeddingModel).toBe('text-embedding-3-large');
      expect(result.embeddingDimensions).toBe(3072);
      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'RAG Lab configuration updated',
        expect.objectContaining({ organizationId, configId }),
      );
    });

    it('creates new configuration when none exists', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      const command: UpdateRagLabConfigurationCommand = {
        organizationId,
        userId,
        embeddingModel: 'text-embedding-3-large',
        embeddingDimensions: 3072,
        includeCodeBlocks: true,
        maxTextLength: 1000,
      };

      mockRepository.findByOrganizationId.mockResolvedValue(null);
      mockRepository.add.mockResolvedValue({
        id: createRagLabConfigurationId(uuidv4()),
        organizationId,
        embeddingModel: 'text-embedding-3-large',
        embeddingDimensions: 3072,
        includeCodeBlocks: true,
        maxTextLength: 1000,
      });

      const result = await useCase.execute(command);

      expect(mockRepository.findByOrganizationId).toHaveBeenCalledWith(
        organizationId,
      );
      expect(mockRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          embeddingModel: 'text-embedding-3-large',
          embeddingDimensions: 3072,
          includeCodeBlocks: true,
          maxTextLength: 1000,
        }),
      );
      expect(result.embeddingModel).toBe('text-embedding-3-large');
      expect(result.embeddingDimensions).toBe(3072);
      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'RAG Lab configuration created',
        expect.objectContaining({ organizationId }),
      );
    });

    it('logs correctly throughout the process', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      const command: UpdateRagLabConfigurationCommand = {
        organizationId,
        userId,
        embeddingModel: 'text-embedding-3-large',
        embeddingDimensions: 3072,
        includeCodeBlocks: true,
        maxTextLength: 1000,
      };

      mockRepository.findByOrganizationId.mockResolvedValue(null);
      mockRepository.add.mockResolvedValue({
        id: createRagLabConfigurationId(uuidv4()),
        organizationId,
        embeddingModel: 'text-embedding-3-large',
        embeddingDimensions: 3072,
        includeCodeBlocks: true,
        maxTextLength: 1000,
      });

      await useCase.execute(command);

      expect(stubbedLogger.info).toHaveBeenCalledWith(
        'Updating RAG Lab configuration',
        expect.objectContaining({
          organizationId,
          userId,
          embeddingModel: 'text-embedding-3-large',
          embeddingDimensions: 3072,
        }),
      );
    });
  });
});
