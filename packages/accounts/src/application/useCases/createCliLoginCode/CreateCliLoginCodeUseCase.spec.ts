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

    useCase = new CreateCliLoginCodeUseCase(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('with valid command', () => {
      let savedCode: CliLoginCode;

      beforeEach(() => {
        savedCode = {
          id: 'code-id' as CliLoginCode['id'],
          code: 'ABCD1234EF' as CliLoginCode['code'],
          userId,
          organizationId,
          expiresAt: new Date(
            Date.now() + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000,
          ),
        };

        mockRepository.add.mockResolvedValue(savedCode);
      });

      it('returns the generated code', async () => {
        const result = await useCase.execute({ userId, organizationId });

        expect(result.code).toBe('ABCD1234EF');
      });

      it('returns a Date for expiresAt', async () => {
        const result = await useCase.execute({ userId, organizationId });

        expect(result.expiresAt).toBeInstanceOf(Date);
      });

      it('sets expiration time at or after expected minimum', async () => {
        const beforeExecution = Date.now();

        const result = await useCase.execute({ userId, organizationId });

        const expectedMinTime =
          beforeExecution + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000;

        expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
          expectedMinTime,
        );
      });

      it('sets expiration time at or before expected maximum', async () => {
        const result = await useCase.execute({ userId, organizationId });

        const afterExecution = Date.now();
        const expectedMaxTime =
          afterExecution + CLI_LOGIN_CODE_EXPIRATION_MINUTES * 60 * 1000;

        expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxTime);
      });

      it('calls repository.add exactly once', async () => {
        await useCase.execute({ userId, organizationId });

        expect(mockRepository.add).toHaveBeenCalledTimes(1);
      });

      it('calls repository.add with userId and organizationId', async () => {
        await useCase.execute({ userId, organizationId });

        expect(mockRepository.add).toHaveBeenCalledWith(
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
