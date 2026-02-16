import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { createUserId, createUserMetadataId } from '@packmind/types';
import { IUserMetadataRepository } from '../../domain/repositories/IUserMetadataRepository';
import { UserMetadataService } from './UserMetadataService';

describe('UserMetadataService', () => {
  let service: UserMetadataService;
  let mockRepository: jest.Mocked<IUserMetadataRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId('user-1');

  beforeEach(() => {
    mockRepository = {
      findByUserId: jest.fn(),
      add: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IUserMetadataRepository>;

    stubbedLogger = stubLogger();

    service = new UserMetadataService(mockRepository, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addSocialProvider', () => {
    describe('when user has no metadata yet', () => {
      it('creates metadata with the provider', async () => {
        mockRepository.findByUserId.mockResolvedValue(null);
        mockRepository.add.mockImplementation(async (m) => m);

        await service.addSocialProvider(userId, 'GoogleOAuth');

        expect(mockRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            socialProviders: ['GoogleOAuth'],
            onboardingCompleted: false,
          }),
        );
      });
    });

    describe('when user has metadata without this provider', () => {
      it('appends the provider', async () => {
        const existing = {
          id: createUserMetadataId('meta-1'),
          userId,
          onboardingCompleted: true,
          socialProviders: ['GitHubOAuth'],
        };
        mockRepository.findByUserId.mockResolvedValue(existing);
        mockRepository.save.mockImplementation(async (m) => m);

        await service.addSocialProvider(userId, 'GoogleOAuth');

        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            socialProviders: ['GitHubOAuth', 'GoogleOAuth'],
          }),
        );
      });
    });

    describe('when user already has this provider', () => {
      it('does not duplicate the provider', async () => {
        const existing = {
          id: createUserMetadataId('meta-1'),
          userId,
          onboardingCompleted: true,
          socialProviders: ['GoogleOAuth'],
        };
        mockRepository.findByUserId.mockResolvedValue(existing);

        await service.addSocialProvider(userId, 'GoogleOAuth');

        expect(mockRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
