import { stubLogger } from '@packmind/test-utils';
import { createUserId } from '@packmind/types';
import { TrialActivationService } from './TrialActivationService';
import { ITrialActivationRepository } from '../../domain/repositories/ITrialActivationRepository';
import { IJwtService } from './ApiKeyService';
import { PackmindLogger } from '@packmind/logger';

describe('TrialActivationService', () => {
  let service: TrialActivationService;
  let mockTrialActivationRepository: jest.Mocked<ITrialActivationRepository>;
  let mockJwtService: jest.Mocked<IJwtService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const mockUserId = createUserId('user-123');

  beforeEach(() => {
    mockTrialActivationRepository = {
      add: jest.fn(),
      findByToken: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findLatestByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ITrialActivationRepository>;

    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as jest.Mocked<IJwtService>;

    stubbedLogger = stubLogger();

    service = new TrialActivationService(
      mockTrialActivationRepository,
      mockJwtService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTrialActivationToken', () => {
    describe('when generating a token successfully', () => {
      const signedToken = 'signed-jwt-token';

      beforeEach(() => {
        mockJwtService.sign.mockReturnValue(signedToken);
        mockTrialActivationRepository.add.mockImplementation(async (ta) => ta);
      });

      it('signs JWT with userId and expiration', async () => {
        await service.generateTrialActivationToken(mockUserId);

        expect(mockJwtService.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUserId,
            type: 'trial_activation',
            exp: expect.any(Number),
          }),
        );
      });

      it('saves the trial activation to the repository', async () => {
        await service.generateTrialActivationToken(mockUserId);

        expect(mockTrialActivationRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUserId,
            token: signedToken,
          }),
        );
      });

      it('returns the saved trial activation', async () => {
        const result = await service.generateTrialActivationToken(mockUserId);

        expect(result).toEqual(
          expect.objectContaining({
            userId: mockUserId,
            token: signedToken,
            expirationDate: expect.any(Date),
          }),
        );
      });

      it('sets expiration date to 5 minutes from now', async () => {
        const result = await service.generateTrialActivationToken(mockUserId);
        const afterCall = Date.now();

        const expectedMaxExpiration = afterCall + 5 * 60 * 1000;

        expect(result.expirationDate.getTime()).toBeLessThanOrEqual(
          expectedMaxExpiration,
        );
      });
    });

    describe('when repository fails to add', () => {
      beforeEach(() => {
        mockJwtService.sign.mockReturnValue('signed-token');
        mockTrialActivationRepository.add.mockRejectedValue(
          new Error('Database error'),
        );
      });

      it('throws the error', async () => {
        await expect(
          service.generateTrialActivationToken(mockUserId),
        ).rejects.toThrow('Database error');
      });
    });
  });

  describe('findByToken', () => {
    it('delegates to repository', async () => {
      const token = 'test-token' as unknown as ReturnType<
        typeof import('@packmind/types').createTrialActivationToken
      >;
      mockTrialActivationRepository.findByToken.mockResolvedValue(null);

      await service.findByToken(token);

      expect(mockTrialActivationRepository.findByToken).toHaveBeenCalledWith(
        token,
      );
    });
  });

  describe('findLatestByUserId', () => {
    it('delegates to repository', async () => {
      mockTrialActivationRepository.findLatestByUserId.mockResolvedValue(null);

      await service.findLatestByUserId(mockUserId);

      expect(
        mockTrialActivationRepository.findLatestByUserId,
      ).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('delete', () => {
    it('delegates to repository', async () => {
      const mockTrialActivation = {
        id: 'ta-123' as unknown as ReturnType<
          typeof import('@packmind/types').createTrialActivationTokenId
        >,
        userId: mockUserId,
        token: 'token' as unknown as ReturnType<
          typeof import('@packmind/types').createTrialActivationToken
        >,
        expirationDate: new Date(),
      };

      await service.delete(mockTrialActivation);

      expect(mockTrialActivationRepository.delete).toHaveBeenCalledWith(
        mockTrialActivation.id,
      );
    });
  });

  describe('validateTokenForUser', () => {
    const mockToken = 'test-token' as unknown as ReturnType<
      typeof import('@packmind/types').createTrialActivationToken
    >;

    describe('when token is not found', () => {
      beforeEach(() => {
        mockTrialActivationRepository.findByToken.mockResolvedValue(null);
      });

      it('returns valid: false', async () => {
        const result = await service.validateTokenForUser(
          mockToken,
          mockUserId,
        );

        expect(result).toEqual({ valid: false });
      });
    });

    describe('when token belongs to a different user', () => {
      beforeEach(() => {
        const differentUserId = createUserId('different-user');
        mockTrialActivationRepository.findByToken.mockResolvedValue({
          id: 'ta-123' as unknown as ReturnType<
            typeof import('@packmind/types').createTrialActivationTokenId
          >,
          userId: differentUserId,
          token: mockToken,
          expirationDate: new Date(Date.now() + 60000),
        });
      });

      it('returns valid: false', async () => {
        const result = await service.validateTokenForUser(
          mockToken,
          mockUserId,
        );

        expect(result).toEqual({ valid: false });
      });
    });

    describe('when token has expired', () => {
      beforeEach(() => {
        mockTrialActivationRepository.findByToken.mockResolvedValue({
          id: 'ta-123' as unknown as ReturnType<
            typeof import('@packmind/types').createTrialActivationTokenId
          >,
          userId: mockUserId,
          token: mockToken,
          expirationDate: new Date(Date.now() - 60000),
        });
      });

      it('returns valid: false', async () => {
        const result = await service.validateTokenForUser(
          mockToken,
          mockUserId,
        );

        expect(result).toEqual({ valid: false });
      });
    });

    describe('when token is valid', () => {
      const mockTrialActivation = {
        id: 'ta-123' as unknown as ReturnType<
          typeof import('@packmind/types').createTrialActivationTokenId
        >,
        userId: mockUserId,
        token: mockToken,
        expirationDate: new Date(Date.now() + 60000),
      };

      beforeEach(() => {
        mockTrialActivationRepository.findByToken.mockResolvedValue(
          mockTrialActivation,
        );
      });

      it('returns valid: true with trialActivation', async () => {
        const result = await service.validateTokenForUser(
          mockToken,
          mockUserId,
        );

        expect(result).toEqual({
          valid: true,
          trialActivation: mockTrialActivation,
        });
      });
    });
  });
});
