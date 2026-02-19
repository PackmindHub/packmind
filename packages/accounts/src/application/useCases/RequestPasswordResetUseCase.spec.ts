import { RequestPasswordResetUseCase } from './RequestPasswordResetUseCase';
import { UserService } from '../services/UserService';
import { UserMetadataService } from '../services/UserMetadataService';
import { PasswordResetTokenService } from '../services/PasswordResetTokenService';
import { stubLogger } from '@packmind/test-utils';
import { userFactory } from '../../../test/userFactory';
import { createUserMetadataId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

describe('RequestPasswordResetUseCase', () => {
  let useCase: RequestPasswordResetUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockPasswordResetTokenService: jest.Mocked<PasswordResetTokenService>;
  let mockUserMetadataService: jest.Mocked<UserMetadataService>;

  beforeEach(() => {
    mockUserService = {
      getUserByEmailCaseInsensitive: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockPasswordResetTokenService = {
      createPasswordResetToken: jest.fn(),
      sendSocialLoginReminderEmail: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetTokenService>;

    mockUserMetadataService = {
      getOrCreateMetadata: jest.fn(),
    } as unknown as jest.Mocked<UserMetadataService>;

    useCase = new RequestPasswordResetUseCase(
      mockUserService,
      mockPasswordResetTokenService,
      mockUserMetadataService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is social-only (passwordHash is null)', () => {
    let result: { success: boolean };

    beforeEach(async () => {
      const socialUser = userFactory({
        passwordHash: null,
        active: true,
      });
      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
        socialUser,
      );
      mockUserMetadataService.getOrCreateMetadata.mockResolvedValue({
        id: createUserMetadataId(uuidv4()),
        userId: socialUser.id,
        onboardingCompleted: false,
        socialProviders: ['GoogleOAuth'],
      });

      result = await useCase.execute({ email: socialUser.email });
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('does not create a password reset token', () => {
      expect(
        mockPasswordResetTokenService.createPasswordResetToken,
      ).not.toHaveBeenCalled();
    });

    it('sends social login reminder email with provider display names', () => {
      expect(
        mockPasswordResetTokenService.sendSocialLoginReminderEmail,
      ).toHaveBeenCalledWith(expect.any(String), ['google']);
    });
  });

  describe('when user is social-only with multiple providers', () => {
    beforeEach(async () => {
      const socialUser = userFactory({
        passwordHash: null,
        active: true,
      });
      mockUserService.getUserByEmailCaseInsensitive.mockResolvedValue(
        socialUser,
      );
      mockUserMetadataService.getOrCreateMetadata.mockResolvedValue({
        id: createUserMetadataId(uuidv4()),
        userId: socialUser.id,
        onboardingCompleted: false,
        socialProviders: ['GoogleOAuth', 'MicrosoftOAuth'],
      });

      await useCase.execute({ email: socialUser.email });
    });

    it('sends social login reminder email with all provider display names', () => {
      expect(
        mockPasswordResetTokenService.sendSocialLoginReminderEmail,
      ).toHaveBeenCalledWith(expect.any(String), ['google', 'microsoft']);
    });
  });
});
