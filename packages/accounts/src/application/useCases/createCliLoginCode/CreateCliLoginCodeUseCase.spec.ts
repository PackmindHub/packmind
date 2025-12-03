import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { createUserId, createOrganizationId } from '@packmind/types';
import { CreateCliLoginCodeUseCase } from './CreateCliLoginCodeUseCase';
import { ICliLoginCodeRepository } from '../../../domain/repositories/ICliLoginCodeRepository';
import {
  CliLoginCode,
  CLI_LOGIN_CODE_EXPIRATION_MINUTES,
} from '../../../domain/entities/CliLoginCode';

describe('CreateCliLoginCodeUseCase', () => {
  let useCase: CreateCliLoginCodeUseCase;
  let mockRepository: jest.Mocked<ICliLoginCodeRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-456');

  beforeEach(() => {
    mockRepository = {
      add: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
    } as jest.Mocked<ICliLoginCodeRepository>;

    stubbedLogger = stubLogger();

    useCase = new CreateCliLoginCodeUseCase(mockRepository, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('with valid command', () => {
      it('creates a CLI login code with correct properties', async () => {
        const savedCode: CliLoginCode = {
          id: 'code-id' as CliLoginCode['id'],
          code: 'ABCD1234EF' as CliLoginCode['code'],
          userId,
          organizationId,
          expiresAt: new Date(
            Date.now() + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000,
          ),
        };

        mockRepository.add.mockResolvedValue(savedCode);

        const result = await useCase.execute({ userId, organizationId });

        expect(result.code).toBe('ABCD1234EF');
        expect(result.expiresAt).toBeInstanceOf(Date);
      });

      it('sets expiration time based on CLI_LOGIN_CODE_EXPIRATION_MINUTES', async () => {
        const beforeExecution = Date.now();

        const savedCode: CliLoginCode = {
          id: 'code-id' as CliLoginCode['id'],
          code: 'ABCD1234EF' as CliLoginCode['code'],
          userId,
          organizationId,
          expiresAt: new Date(
            Date.now() + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000,
          ),
        };

        mockRepository.add.mockResolvedValue(savedCode);

        const result = await useCase.execute({ userId, organizationId });

        const afterExecution = Date.now();
        const expectedMinTime =
          beforeExecution + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000;
        const expectedMaxTime =
          afterExecution + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000;

        expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
          expectedMinTime,
        );
        expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxTime);
      });

      it('calls repository.add with correct parameters', async () => {
        const savedCode: CliLoginCode = {
          id: 'code-id' as CliLoginCode['id'],
          code: 'ABCD1234EF' as CliLoginCode['code'],
          userId,
          organizationId,
          expiresAt: new Date(),
        };

        mockRepository.add.mockResolvedValue(savedCode);

        await useCase.execute({ userId, organizationId });

        expect(mockRepository.add).toHaveBeenCalledTimes(1);
        expect(mockRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            organizationId,
          }),
        );
      });

      it('logs info on successful creation', async () => {
        const savedCode: CliLoginCode = {
          id: 'code-id' as CliLoginCode['id'],
          code: 'ABCD1234EF' as CliLoginCode['code'],
          userId,
          organizationId,
          expiresAt: new Date(),
        };

        mockRepository.add.mockResolvedValue(savedCode);

        await useCase.execute({ userId, organizationId });

        expect(stubbedLogger.info).toHaveBeenCalledWith(
          'CLI login code created',
          expect.objectContaining({
            userId,
            organizationId,
          }),
        );
      });
    });

    describe('when repository fails', () => {
      it('propagates repository errors', async () => {
        const error = new Error('Database connection failed');
        mockRepository.add.mockRejectedValue(error);

        await expect(
          useCase.execute({ userId, organizationId }),
        ).rejects.toThrow('Database connection failed');
      });
    });
  });
});
